# Author check of the real smoke helpers with harmless local child fixtures.
# This is diagnostic coverage, not an installer smoke or model evaluation.
$ErrorActionPreference = 'Stop'
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$smokePath = Join-Path $repoRoot 'scripts/smoke-install.ps1'
$tokens = $null
$parseErrors = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($smokePath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count -ne 0) { throw 'Smoke script parse failed' }
$functions = @($ast.FindAll({
    param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
    $node.Name -in @('Write-Pass', 'Invoke-InstallerStep', 'Invoke-ExpectedFailure')
}, $false))
if ($functions.Count -ne 3) { throw 'Required smoke helpers missing' }
foreach ($function in $functions) { Invoke-Expression $function.Extent.Text }

$tempParent = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd('\', '/')
$ownedRoot = Join-Path $tempParent ('craftroster-smoke-diagnostics-' + [Guid]::NewGuid().ToString('N'))
$script:InstallerPowerShell = (Get-Command powershell.exe -CommandType Application).Source
$script:Installer = Join-Path $ownedRoot 'harmless-child.ps1'
$encoding = [System.Text.UTF8Encoding]::new($false)
$checks = @()
try {
    New-Item -ItemType Directory -Path $ownedRoot | Out-Null
    foreach ($exitCode in @(23, -1073741819)) {
        [System.IO.File]::WriteAllText($script:Installer, "exit $exitCode`n", $encoding)
        foreach ($helper in @('Invoke-InstallerStep', 'Invoke-ExpectedFailure')) {
            $caught = $null
            try {
                if ($helper -eq 'Invoke-InstallerStep') {
                    Invoke-InstallerStep -Label 'synthetic silent failure' -InstallerArgs @() | Out-Null
                } else {
                    Invoke-ExpectedFailure -Label 'synthetic silent failure' -ExpectedMessage 'required-marker' -InstallerArgs @()
                }
            } catch { $caught = $_.Exception.Message }
            $hex = '0x{0:X8}' -f [int]$exitCode
            if (-not $caught -or -not $caught.Contains("exit code $exitCode ($hex); captured 0 output line(s)")) {
                throw "Missing exact silent-child diagnostic for ${helper}: $caught"
            }
            $checks += [pscustomobject]@{ helper = $helper; requestedExit = $exitCode; diagnostic = $caught }
        }
    }
    # A supplied error code resembling an NTSTATUS is not a real access violation.
    [System.IO.File]::WriteAllText($script:Installer, "Write-Output 'required-marker'`nexit 1`n", $encoding)
    Invoke-ExpectedFailure -Label 'expected refusal still accepted' -ExpectedMessage 'required-marker' -InstallerArgs @()
    [System.IO.File]::WriteAllText($script:Installer, "Write-Output 'required-marker'`nexit 0`n", $encoding)
    $caught = $null
    try { Invoke-ExpectedFailure -Label 'zero-exit control' -ExpectedMessage 'required-marker' -InstallerArgs @() }
    catch { $caught = $_.Exception.Message }
    if ($caught -ne 'zero-exit control unexpectedly succeeded') { throw 'Zero-exit failure control was accepted' }
    $success = Invoke-InstallerStep -Label 'successful child still accepted' -InstallerArgs @()
    if ($success.ExitCode -ne 0 -or ($success.Output -join '') -cne 'required-marker') { throw 'Successful child output changed' }
} finally {
    $resolved = [System.IO.Path]::GetFullPath($ownedRoot)
    if ([System.IO.Path]::GetDirectoryName($resolved) -cne $tempParent -or
        -not [System.IO.Path]::GetFileName($resolved).StartsWith('craftroster-smoke-diagnostics-')) {
        throw "Refusing unexpected cleanup root: $resolved"
    }
    if (Test-Path -LiteralPath $resolved) {
        if (((Get-Item -Force -LiteralPath $resolved).Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw 'Refusing diagnostic root reparse point'
        }
        Remove-Item -Recurse -Force -LiteralPath $resolved
    }
}
[pscustomobject]@{
    hostVersion = $PSVersionTable.PSVersion.ToString()
    smokeSha256 = (Get-FileHash -LiteralPath $smokePath -Algorithm SHA256).Hash.ToLowerInvariant()
    syntheticFailureChecks = $checks
    expectedRefusalAccepted = $true
    zeroExitRefusalRejected = $true
    successfulChildPreserved = $true
    cleaned = -not (Test-Path -LiteralPath $ownedRoot)
    actualNativeCrashSimulated = $false
    modelCalls = 0
} | ConvertTo-Json -Depth 5

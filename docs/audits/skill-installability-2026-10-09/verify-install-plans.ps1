param([string]$PowerShellExecutable = 'pwsh.exe')
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../../..')).Path
$installer = Join-Path $repoRoot 'scripts/install.ps1'
$hostExecutable = (Get-Command $PowerShellExecutable -CommandType Application -ErrorAction Stop).Source
$catalog = Get-Content -LiteralPath (Join-Path $repoRoot 'skills.json') -Raw | ConvertFrom-Json
$sourceFiles = @('skills.json', 'scripts/data/install-skill-dependencies.tsv', 'scripts/install.ps1')
$sourceHashes = @($sourceFiles | ForEach-Object { @{ file = $_; sha256 = (Get-FileHash -LiteralPath (Join-Path $repoRoot $_) -Algorithm SHA256).Hash.ToLowerInvariant() } })
$byName = @{}
foreach ($skill in $catalog.skills) { $byName[$skill.name] = $skill }
function Get-RequiredPlan {
    param([string[]]$Seeds)
    $selected = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    function Visit-Required {
        param([string]$Name)
        if (-not $selected.Add($Name)) { return }
        foreach ($dependency in $byName[$Name].dependencies) {
            if ($dependency.kind -ceq 'required') { Visit-Required -Name $dependency.name }
        }
    }
    foreach ($seed in $Seeds) { Visit-Required -Name $seed }
    return @($selected | Sort-Object)
}
$cases = @()
foreach ($target in @('codex', 'claude', 'cursor', 'copilot', 'opencode')) {
    foreach ($name in @('document-to-markdown', 'threejs-capture-recording', 'threejs-webxr-accessibility',
        'frontend-code-review', 'python-packaging-release', 'web-page-design-to-code', 'website-redesign-to-code')) {
        $cases += @{ Label = "$target / $name"; Target = $target; Name = $name; Seeds = @($name) }
    }
}
foreach ($category in $catalog.categories.id) {
    $seeds = @($catalog.skills | Where-Object category -CEQ $category | ForEach-Object name)
    $cases += @{ Label = "category / $category"; Target = 'claude'; Category = $category; Seeds = $seeds }
}
$cases += @{ Label = 'project / XR'; Target = 'project'; Name = 'threejs-webxr-accessibility'; Seeds = @('threejs-webxr-accessibility') }
$taskTemp = Join-Path ([System.IO.Path]::GetTempPath()) ('craftroster-current-plans-' + [guid]::NewGuid().ToString('N'))
$results = @()
foreach ($case in $cases) {
    $destination = Join-Path $taskTemp ([guid]::NewGuid().ToString('N'))
    $arguments = @('-NoProfile', '-File', $installer, '-Target', $case.Target, '-Type', 'skill',
        '-SourceDir', $repoRoot, '-InstallDir', $destination, '-DryRun')
    if ($case.Name) { $arguments += @('-Name', $case.Name) } else { $arguments += @('-Category', $case.Category) }
    $output = @(& $hostExecutable @arguments 2>&1 | ForEach-Object { $_.ToString() })
    if ($LASTEXITCODE -ne 0) { throw "Installer failed: $($case.Label)`n$($output -join "`n")" }
    $names = @($output | ForEach-Object { if ($_ -match '^DRY-RUN install Skill ([a-z0-9-]+) -> ') { $Matches[1] } })
    $observed = @($names | Sort-Object -Unique)
    $expected = @(Get-RequiredPlan -Seeds $case.Seeds)
    if (($observed -join ',') -cne ($expected -join ',')) { throw "Unexpected closure: $($case.Label): $($observed -join ',') vs $($expected -join ',')" }
    $copies = if ($case.Target -ceq 'project') { 2 } else { 1 }
    if ($names.Count -ne $expected.Count * $copies) { throw "Wrong planned profile/package count: $($case.Label)" }
    if (Test-Path -LiteralPath $destination) { throw "Dry run wrote destination: $destination" }
    $results += @{ label = $case.Label; target = $case.Target; seeds = $case.Seeds; expected = $expected;
        observed = $observed; plannedCopies = $names.Count; destinationWritten = $false; output = $output; exitCode = 0 }
    Write-Host "PASS $($case.Label): $($observed.Count) unique packages"
}
if (Test-Path -LiteralPath $taskTemp) { throw 'Dry-run fixture unexpectedly created its root' }
foreach ($sourceIdentity in $sourceHashes) {
    if ((Get-FileHash -LiteralPath (Join-Path $repoRoot $sourceIdentity.file) -Algorithm SHA256).Hash.ToLowerInvariant() -cne $sourceIdentity.sha256) { throw "Source changed during installer verification: $($sourceIdentity.file)" }
}
$record = @{ schemaVersion = 1; status = 'passed'; mode = 'current-catalog-installer-dry-run';
    host = $hostExecutable; cases = $results; source = $repoRoot; sourceHashes = $sourceHashes; globalInstallation = $false;
    limits = @('Checks installer plans without writing destination packages. Actual ownership/placement mutations are covered by isolated smoke tests.',
        'No host discovery or model activation was executed.') }
$outputJson = $record | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'remediation-install-plans.json'), $outputJson, [System.Text.UTF8Encoding]::new($false))
Write-Host "Current catalog install plans passed: $($results.Count) cases"

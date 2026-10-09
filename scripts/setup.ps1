# Interactive CraftRoster setup for Windows PowerShell 5.1 and PowerShell 7.
# The parameter-driven install.ps1 remains the automation entry point.

[CmdletBinding(PositionalBinding = $false)]
param(
    [string]$SourceDir,
    [string]$InstallDir,
    [string]$Repo = "HsinPu/CraftRoster",
    [string]$Branch = "main",
    [switch]$DryRun,
    [switch]$Force,
    [Alias("h")]
    [switch]$Help
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false) } catch {}
$repoWasExplicit = $PSBoundParameters.ContainsKey("Repo")
$sourceWasExplicit = $PSBoundParameters.ContainsKey("SourceDir")
$installDirWasExplicit = $PSBoundParameters.ContainsKey("InstallDir")
$setupTempRoot = $null
$setupTempParent = $null
$setupTempLeaf = $null
$setupExitCode = 0

function Show-SetupUsage {
    Write-Host @"
CraftRoster interactive setup

Usage:
  .\scripts\setup.ps1 [-SourceDir path] [-InstallDir path] [-Repo owner/name] [-Branch branch] [-DryRun] [-Force]

Choose a platform, installation scope, and all Skills and Agents or usage categories.
The project (all platforms) option
installs directly into a project without another scope question.
Enter accepts the displayed default. Type q at any prompt to cancel.
Category numbers may be separated by commas or spaces. Invalid answers get
at most three attempts; end-of-input fails immediately without accepting a default.

-SourceDir uses a local checkout. Otherwise one GitHub archive is downloaded.
-InstallDir is a direct destination for user global installs or the project root for current project installs.
-DryRun shows the complete backend plan without asking to write it.
-Force is forwarded to the existing installer, including required dependencies.

For non-interactive automation or individual names, use scripts/install.ps1.
"@
}

function Read-SetupAnswer {
    param([string]$Prompt)
    try {
        if ([Console]::IsInputRedirected) {
            Write-Host "$Prompt`: " -NoNewline
            $answer = [Console]::ReadLine()
            Write-Host ""
        } else {
            $answer = Read-Host -Prompt $Prompt
        }
    } catch {
        throw "Interactive input is unavailable. Run setup in a console or redirect an answers file; use install.ps1 for automation. $($_.Exception.Message)"
    }
    if ($null -eq $answer) {
        throw "End of input while reading '$Prompt'. Setup stopped without accepting a default or confirmation."
    }
    $answer = $answer.Trim()
    if ($answer -ieq "q") {
        throw [System.OperationCanceledException]::new("Setup cancelled.")
    }
    return $answer
}

function Write-SetupInvalidAnswer {
    param([string]$Message, [int]$Attempt)
    Write-Host "Invalid answer: $Message" -ForegroundColor Yellow
    if ($Attempt -ge 3) { throw "Too many invalid answers (3). Setup stopped." }
    Write-Host "Please try again ($($Attempt + 1)/3)."
}

function Read-SetupChoice {
    param([string]$Prompt, [int]$Default, [int]$Maximum)
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        $answer = Read-SetupAnswer -Prompt $Prompt
        if ($answer -eq "") { return $Default }
        $number = 0
        if ($answer -cmatch '^[1-9][0-9]*$' -and
            [int]::TryParse($answer, [ref]$number) -and
            $number -ge 1 -and $number -le $Maximum) {
            return $number
        }
        Write-SetupInvalidAnswer -Message "Enter a number from 1 to $Maximum, Enter for $Default, or q to cancel." -Attempt $attempt
    }
}

function Read-SetupConfirmation {
    param([string]$Prompt)
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        $answer = Read-SetupAnswer -Prompt $Prompt
        if ($answer -eq "" -or $answer -ieq "n") { return $false }
        if ($answer -ieq "y") { return $true }
        Write-SetupInvalidAnswer -Message "Enter y or n, Enter for n, or q to cancel." -Attempt $attempt
    }
}

function Get-SetupNormalizedPath {
    param([string]$Path)
    $fullPath = [System.IO.Path]::GetFullPath($Path)
    $pathRoot = [System.IO.Path]::GetPathRoot($fullPath)
    $trimmedPath = $fullPath.TrimEnd([char[]]@(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    ))
    # Preserve drive and UNC roots; only non-root paths lose trailing separators.
    if ($trimmedPath.Length -le $pathRoot.Length) { return $fullPath }
    return $trimmedPath
}

function Get-SetupFullPath {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) { throw "A directory path cannot be empty." }
    $pathProvider = $null
    $pathDrive = $null
    $fullPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path, [ref]$pathProvider, [ref]$pathDrive)
    if ($pathProvider.Name -ne "FileSystem") { throw "A directory path must use the FileSystem provider: $Path" }
    return Get-SetupNormalizedPath -Path $fullPath
}

function Read-SetupProjectRoot {
    param([string]$DefaultRoot)
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        $answer = Read-SetupAnswer -Prompt "Project root [$DefaultRoot] (q to cancel)"
        if ($answer -eq "") { return $DefaultRoot }
        try {
            $root = Get-SetupFullPath -Path $answer
            if ((Test-Path -LiteralPath $root) -and -not (Test-Path -LiteralPath $root -PathType Container)) {
                throw "Project root must be a directory: $root"
            }
            return $root
        } catch {
            Write-SetupInvalidAnswer -Message $_.Exception.Message -Attempt $attempt
        }
    }
}

function Get-SetupBundleRows {
    param([string]$RepoRoot)
    $indexPath = Join-Path $RepoRoot 'scripts\data\install-bundles.tsv'
    if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf) -or
        ((Get-Item -Force -LiteralPath $indexPath).Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
        throw "Install bundle index not found or not a regular file: $indexPath. Update SourceDir or branch."
    }
    $relationPath = Join-Path $RepoRoot 'scripts\data\install-agent-skill-dependencies.tsv'
    if (-not (Test-Path -LiteralPath $relationPath -PathType Leaf) -or
        ((Get-Item -Force -LiteralPath $relationPath).Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
        throw "Agent Skill dependency index not found or not a regular file: $relationPath. Update SourceDir or branch."
    }
    try { $lines = [System.IO.File]::ReadAllLines($indexPath, [System.Text.UTF8Encoding]::new($false, $true)) } catch {
        throw "Install bundle index is not valid UTF-8: $indexPath"
    }
    $header = [string]::Join([char]9, @('bundle', 'title', 'description', 'type', 'name'))
    if ($lines.Count -lt 2 -or $lines[0] -cne $header) { throw "Install bundle index has an invalid header: $indexPath" }
    $agentRoot = Join-Path $RepoRoot 'agents'
    $skillRoot = Join-Path $RepoRoot 'skills'
    if (-not (Test-Path -LiteralPath $agentRoot -PathType Container) -or
        -not (Test-Path -LiteralPath $skillRoot -PathType Container)) {
        throw 'Bundled setup requires canonical agents and skills catalogs in the source checkout.'
    }
    $agents = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $skills = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    foreach ($file in @(Get-ChildItem -LiteralPath $agentRoot -File -Filter '*.md')) { $null = $agents.Add($file.BaseName) }
    foreach ($folder in @(Get-ChildItem -LiteralPath $skillRoot -Directory)) {
        if (Test-Path -LiteralPath (Join-Path $folder.FullName 'SKILL.md') -PathType Leaf) { $null = $skills.Add($folder.Name) }
    }
    $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $coveredAgents = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $coveredSkills = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $definitions = @{}
    $rows = [System.Collections.Generic.List[object]]::new()
    for ($lineIndex = 1; $lineIndex -lt $lines.Count; $lineIndex++) {
        $parts = @($lines[$lineIndex] -split '\t', 0)
        if ($parts.Count -ne 5) { throw "Install bundle index row $($lineIndex + 1) must contain exactly five fields." }
        $id, $title, $description, $componentType, $name = $parts
        if ($id -cnotmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$' -or $id -ceq 'all' -or
            $name -cnotmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$' -or $componentType -cnotin @('skill', 'agent') -or
            [string]::IsNullOrWhiteSpace($title) -or [string]::IsNullOrWhiteSpace($description) -or
            $title -match '[\x00-\x1f\x7f]' -or $description -match '[\x00-\x1f\x7f]') {
            throw "Install bundle index row $($lineIndex + 1) contains an invalid value."
        }
        if (-not $seen.Add("$id|$componentType|$name")) { throw "Duplicate bundle member: $id -> $componentType $name" }
        if ($definitions.ContainsKey($id)) {
            if ($definitions[$id].Title -cne $title -or $definitions[$id].Description -cne $description) {
                throw "Bundle '$id' has inconsistent title or description."
            }
        } else { $definitions[$id] = @{ Title = $title; Description = $description } }
        if ($componentType -ceq 'agent') {
            if (-not $agents.Contains($name)) { throw "Unknown Agent in bundle '$id': $name" }
            $null = $coveredAgents.Add($name)
        } else {
            if (-not $skills.Contains($name)) { throw "Unknown Skill in bundle '$id': $name" }
            $null = $coveredSkills.Add($name)
        }
        $rows.Add([pscustomobject]@{ Bundle = $id; Title = $title; Description = $description; Type = $componentType; Name = $name })
    }
    foreach ($name in $agents) {
        if (-not $coveredAgents.Contains($name)) { throw "Install bundle index does not cover Agent: $name" }
    }
    foreach ($name in $skills) {
        if (-not $coveredSkills.Contains($name)) { throw "Install bundle index does not cover Skill: $name" }
    }
    return @($rows.ToArray())
}

function Read-SetupBundles {
    param([object[]]$Rows)
    $definitions = @{}
    $ids = [System.Collections.Generic.List[string]]::new()
    foreach ($row in $Rows) {
        if (-not $definitions.ContainsKey($row.Bundle)) {
            $ids.Add($row.Bundle)
            $definitions[$row.Bundle] = @{ Title = $row.Title; Skills = 0; Agents = 0 }
        }
        if ($row.Type -ceq 'skill') { $definitions[$row.Bundle].Skills++ } else { $definitions[$row.Bundle].Agents++ }
    }
    Write-Host ''
    Write-Host 'Usage categories:'
    for ($index = 0; $index -lt $ids.Count; $index++) {
        $id = $ids[$index]
        $definition = $definitions[$id]
        Write-Host "  $($index + 1)) $($definition.Title) ($id) (Skills: $($definition.Skills), Agents: $($definition.Agents))"
    }
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        $answer = Read-SetupAnswer -Prompt 'Usage categories (comma/space-separated numbers, q to cancel)'
        if ($answer -cnotmatch '^[1-9][0-9]*(?:(?:\s*,\s*|\s+)[1-9][0-9]*)*$') {
            Write-SetupInvalidAnswer -Message 'Choose category numbers separated by commas or spaces without empty entries. Enter does not select all.' -Attempt $attempt
            continue
        }
        $selected = [System.Collections.Generic.List[string]]::new()
        $seen = [System.Collections.Generic.HashSet[int]]::new()
        $valid = $true
        foreach ($token in @($answer -split '[,\s]+')) {
            $number = 0
            if (-not [int]::TryParse($token, [ref]$number) -or $number -gt $ids.Count) { $valid = $false; break }
            if ($seen.Add($number)) { $selected.Add($ids[$number - 1]) }
        }
        if ($valid) { return ,$selected.ToArray() }
        Write-SetupInvalidAnswer -Message "Category numbers must be between 1 and $($ids.Count)." -Attempt $attempt
    }
}

function Get-SetupPowerShellExecutable {
    $executableName = if ($PSVersionTable.PSEdition -eq "Desktop") { "powershell.exe" } else {
        if ([Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT) { "pwsh.exe" } else { "pwsh" }
    }
    $executable = Join-Path $PSHOME $executableName
    if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) {
        throw "Cannot find the current PowerShell executable: $executable. Run setup using Windows PowerShell 5.1 or PowerShell 7."
    }
    return $executable
}

function Assert-SetupBackendSupport {
    param([string]$BackendPath, [string]$Target, [string]$ProjectPlatform)
    $requirement = 'Bundled setup requires a newer installer backend with Bundle and AgentSkillPolicy; update SourceDir or branch.'
    $backendTokens = $null
    $backendParseErrors = $null
    try {
        $backendAst = [System.Management.Automation.Language.Parser]::ParseFile($BackendPath, [ref]$backendTokens, [ref]$backendParseErrors)
    } catch { throw "$requirement Cannot parse the source installer: $($_.Exception.Message)" }
    if ($backendParseErrors.Count -gt 0) {
        throw "$requirement The source installer has a parse error: $($backendParseErrors[0].Message)"
    }
    $parameters = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)
    if ($backendAst -and $backendAst.ParamBlock) {
        foreach ($parameter in $backendAst.ParamBlock.Parameters) { $null = $parameters.Add($parameter.Name.VariablePath.UserPath) }
    }
    if (-not $parameters.Contains('Bundle') -or -not $parameters.Contains('AgentSkillPolicy')) { throw $requirement }
    if ($Target -eq 'project' -and $ProjectPlatform -ne 'all' -and -not $parameters.Contains('ProjectPlatform')) {
        throw "Selected project platform '$ProjectPlatform' requires a newer installer backend with ProjectPlatform; update SourceDir or branch."
    }
}

function ConvertTo-SetupProcessArgument {
    param([AllowEmptyString()][string]$Argument)
    # Windows argv quoting: double backslashes before quotes and at a quoted end.
    # PowerShell 5.1's native call operator does not protect a trailing backslash.
    $escaped = [regex]::Replace($Argument, '(\\*)"', '$1$1\"')
    $escaped = [regex]::Replace($escaped, '(\\+)$', '$1$1')
    return '"' + $escaped + '"'
}

function Invoke-SetupBackend {
    param(
        [string]$PowerShellExecutable,
        [string]$BackendPath,
        [string]$RepoRoot,
        [string]$Target,
        [string]$ProjectPlatform,
        [string]$BundleSelection,
        [string]$Destination,
        [bool]$AutoDelegation,
        [bool]$Preview
    )
    $BackendPath = Get-SetupNormalizedPath -Path $BackendPath
    $RepoRoot = Get-SetupNormalizedPath -Path $RepoRoot
    if ($Destination) { $Destination = Get-SetupNormalizedPath -Path $Destination }
    $backendArguments = @("-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", $BackendPath,
        "-SourceDir", $RepoRoot, "-Target", $Target, "-Type", "bundle", "-Bundle", $BundleSelection,
        "-AgentSkillPolicy", "recommended", "-Branch", $Branch)
    # Preserve the backend's default-repository legacy ownership compatibility.
    if ($repoWasExplicit) { $backendArguments += @("-Repo", $Repo) }
    if ($Target -eq "project" -and $ProjectPlatform -ne "all") { $backendArguments += @("-ProjectPlatform", $ProjectPlatform) }
    if ($Destination) { $backendArguments += @("-InstallDir", $Destination) }
    if ($AutoDelegation) { $backendArguments += "-EnableAutoDelegation" }
    if ($Force) { $backendArguments += "-Force" }
    if ($Preview) { $backendArguments += "-DryRun" }
    $batchLabel = "bundle / $BundleSelection"
    Write-Host ""
    Write-Host "==> $(if ($Preview) { 'Preview' } else { 'Install' }) $batchLabel"
    $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
    $startInfo.FileName = $PowerShellExecutable
    $startInfo.WorkingDirectory = $callerRoot
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.StandardOutputEncoding = [System.Text.UTF8Encoding]::new($false)
    $startInfo.StandardErrorEncoding = [System.Text.UTF8Encoding]::new($false)
    if ($startInfo.PSObject.Properties["ArgumentList"]) {
        foreach ($argument in $backendArguments) { $startInfo.ArgumentList.Add($argument) }
    } else {
        $startInfo.Arguments = (@($backendArguments | ForEach-Object {
            ConvertTo-SetupProcessArgument -Argument $_
        }) -join " ")
    }
    $backendProcess = [System.Diagnostics.Process]::new()
    $backendProcess.StartInfo = $startInfo
    $backendStarted = $false
    try {
        $backendStarted = $backendProcess.Start()
        if (-not $backendStarted) { throw "Could not start the source installer." }
        # Drain stderr concurrently while forwarding each stdout line, including
        # when this wrapper itself runs with redirected output and no console.
        $backendErrorTask = $backendProcess.StandardError.ReadToEndAsync()
        while ($null -ne ($backendLine = $backendProcess.StandardOutput.ReadLine())) {
            Write-Host $backendLine
        }
        $backendProcess.WaitForExit()
        $backendErrorText = $backendErrorTask.GetAwaiter().GetResult()
        if ($backendErrorText) { Write-Host $backendErrorText.TrimEnd() -ForegroundColor Red }
        $backendExitCode = $backendProcess.ExitCode
    } finally {
        if ($backendStarted -and -not $backendProcess.HasExited) { $backendProcess.Kill() }
        $backendProcess.Dispose()
    }
    if ($backendExitCode -ne 0) {
        $phase = if ($Preview) { "preflight" } else { "installation" }
        $detail = if ($Preview) { "No installation package has started." } else { "Earlier packages may already be installed; see the backend's completed and pending list." }
        throw "Backend $phase failed for $batchLabel (exit $backendExitCode). $detail"
    }
}

function Remove-SetupTemporarySource {
    param([string]$OwnedRoot, [string]$TempParent, [string]$ExpectedLeaf)
    if (-not $OwnedRoot -or -not (Test-Path -LiteralPath $OwnedRoot)) { return }
    $absoluteParent = [System.IO.Path]::GetFullPath($TempParent)
    $absoluteRoot = [System.IO.Path]::GetFullPath($OwnedRoot)
    $expectedRoot = [System.IO.Path]::GetFullPath((Join-Path $absoluteParent $ExpectedLeaf))
    $parentPrefix = $absoluteParent
    if (-not $parentPrefix.EndsWith([System.IO.Path]::DirectorySeparatorChar.ToString()) -and
        -not $parentPrefix.EndsWith([System.IO.Path]::AltDirectorySeparatorChar.ToString())) {
        $parentPrefix += [System.IO.Path]::DirectorySeparatorChar
    }
    if (-not $absoluteRoot.StartsWith($parentPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or
        -not [string]::Equals($absoluteRoot, $expectedRoot, [System.StringComparison]::OrdinalIgnoreCase) -or
        $ExpectedLeaf -cnotmatch '^craftroster-setup-[0-9a-f]{32}$') {
        throw "Refusing to clean a temporary directory outside this setup's owned root: $absoluteRoot"
    }
    $rootItem = Get-Item -Force -LiteralPath $absoluteRoot
    if (($rootItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Refusing to recursively clean a linked temporary root: $absoluteRoot"
    }
    Remove-Item -Recurse -Force -LiteralPath $absoluteRoot
}

try {
    if ($Help) { Show-SetupUsage; exit 0 }
    if ($Repo -cnotmatch '^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$') {
        throw "Invalid GitHub repository '$Repo'. Expected owner/name."
    }
    if ($Branch -cnotmatch '^[A-Za-z0-9._/+_-]+$') {
        throw "Invalid GitHub branch '$Branch'. Use a branch name without whitespace, control characters, quotes, or backslashes."
    }
    $callerLocation = Get-Location
    if ($callerLocation.Provider.Name -ne "FileSystem") { throw "Setup must start in a filesystem directory." }
    $callerRoot = [System.IO.Path]::GetFullPath($callerLocation.ProviderPath)
    if ($sourceWasExplicit -and [string]::IsNullOrWhiteSpace($SourceDir)) { throw "-SourceDir cannot be empty." }
    if ($installDirWasExplicit) {
        $InstallDir = Get-SetupFullPath -Path $InstallDir
        if ((Test-Path -LiteralPath $InstallDir) -and -not (Test-Path -LiteralPath $InstallDir -PathType Container)) {
            throw "Install destination must be a directory: $InstallDir"
        }
    }
    $powerShellExecutable = Get-SetupPowerShellExecutable

    Write-Host "CraftRoster interactive setup"
    Write-Host "Enter accepts the displayed default. Type q at any prompt to cancel."
    Write-Host ""
    Write-Host "Platform:"
    Write-Host "  1) codex"
    Write-Host "  2) claude"
    Write-Host "  3) cursor"
    Write-Host "  4) copilot"
    Write-Host "  5) opencode"
    Write-Host "  6) project (all platforms)"
    $platformNumber = Read-SetupChoice -Prompt "Platform [1] (q to cancel)" -Default 1 -Maximum 6
    $selectedPlatform = @("codex", "claude", "cursor", "copilot", "opencode", "all platforms")[$platformNumber - 1]
    $projectPlatform = "all"
    $installationScope = "project"
    $target = "project"
    if ($platformNumber -ne 6) {
        Write-Host ""
        Write-Host "Installation scope:"
        Write-Host "  1) User global"
        Write-Host "  2) Current project"
        $scopeNumber = Read-SetupChoice -Prompt "Installation scope [1] (q to cancel)" -Default 1 -Maximum 2
        if ($scopeNumber -eq 1) {
            $installationScope = "global"
            $target = $selectedPlatform
        } else {
            $projectPlatform = $selectedPlatform
        }
    }
    if ($target -eq "project" -and -not $installDirWasExplicit) {
        $InstallDir = Read-SetupProjectRoot -DefaultRoot $callerRoot
    }
    Write-Host ""
    Write-Host "Installation mode:"
    Write-Host "  1) All Skills and Agents"
    Write-Host "  2) Select categories"
    $modeNumber = Read-SetupChoice -Prompt "Installation mode [1] (q to cancel)" -Default 1 -Maximum 2

    if ($SourceDir) {
        $repoRoot = Get-SetupFullPath -Path $SourceDir
        if (-not (Test-Path -LiteralPath $repoRoot -PathType Container)) { throw "Source directory not found: $repoRoot" }
    } else {
        $setupTempParent = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
        $setupTempLeaf = "craftroster-setup-$([Guid]::NewGuid().ToString('N'))"
        $newTempRoot = Join-Path $setupTempParent $setupTempLeaf
        New-Item -ItemType Directory -Path $newTempRoot | Out-Null
        $setupTempRoot = [System.IO.Path]::GetFullPath($newTempRoot)
        $archivePath = Join-Path $setupTempRoot "repository.zip"
        $extractRoot = Join-Path $setupTempRoot "source"
        New-Item -ItemType Directory -Path $extractRoot | Out-Null
        Write-Host "==> Downloading $Repo@$Branch (one source archive)"
        Invoke-WebRequest -UseBasicParsing -Uri "https://codeload.github.com/$Repo/zip/refs/heads/$Branch" -OutFile $archivePath
        Expand-Archive -LiteralPath $archivePath -DestinationPath $extractRoot
        $archiveRoots = @(Get-ChildItem -Force -LiteralPath $extractRoot)
        if ($archiveRoots.Count -ne 1 -or -not $archiveRoots[0].PSIsContainer) {
            throw "Expected one repository directory in the downloaded archive."
        }
        $repoRoot = $archiveRoots[0].FullName
    }
    $backendPath = Join-Path $repoRoot "scripts\install.ps1"
    if (-not (Test-Path -LiteralPath $backendPath -PathType Leaf)) { throw "Source installer not found: $backendPath" }
    Assert-SetupBackendSupport -BackendPath $backendPath -Target $target -ProjectPlatform $projectPlatform
    $bundleRows = @(Get-SetupBundleRows -RepoRoot $repoRoot)
    $bundleSelection = 'all'
    $selectedBundleIds = @()
    if ($modeNumber -eq 2) {
        $selectedBundleIds = Read-SetupBundles -Rows $bundleRows
        $bundleSelection = $selectedBundleIds -join ','
    }
    $autoDelegation = $false
    if ($installationScope -eq "global" -and $target -in @("codex", "opencode")) {
        Write-Host ""
        Write-Host "Proactive delegation installs the companion Skill and updates the platform's global instruction/config file."
        $autoDelegation = Read-SetupConfirmation -Prompt "Enable proactive Agent delegation? [y/N] (q to cancel)"
    }

    Write-Host ""
    Write-Host "Selected installation plan:"
    Write-Host "  Platform: $selectedPlatform"
    Write-Host "  Installation scope: $(if ($installationScope -eq 'project') { 'current project' } else { 'user global' })"
    Write-Host "  Source: $repoRoot ($Repo@$Branch)"
    Write-Host "  Installation mode: $(if ($modeNumber -eq 1) { 'all Skills and Agents' } else { 'selected usage categories' })"
    if ($modeNumber -eq 2) {
        foreach ($id in $selectedBundleIds) {
            $definition = @($bundleRows | Where-Object { $_.Bundle -ceq $id })[0]
            Write-Host "  Usage category: $($definition.Title) ($id)"
        }
    }
    Write-Host '  Agent-related Skills: required and recommended'
    if ($target -eq "project") {
        Write-Host "  Project root: $InstallDir"
    } elseif ($InstallDir) {
        Write-Host "  Requested destination: $InstallDir"
    }
    Write-Host "  Proactive Agent delegation: $(if ($autoDelegation) { 'enabled' } else { 'disabled' })"
    Write-Host "  Force replacement: $(if ($Force) { 'enabled' } else { 'disabled' })"
    Write-Host "The complete package will be checked before installation. The preview lists reasons, totals, and destinations."
    Invoke-SetupBackend -PowerShellExecutable $powerShellExecutable -BackendPath $backendPath -RepoRoot $repoRoot -Target $target -ProjectPlatform $projectPlatform -BundleSelection $bundleSelection -Destination $InstallDir -AutoDelegation $autoDelegation -Preview $true
    if ($DryRun) {
        Write-Host ""
        Write-Host "Dry run complete. No installation files were written." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Packages install sequentially after complete preflight; a later failure does not roll back earlier completed packages."
        $confirmed = Read-SetupConfirmation -Prompt "Install this plan? [y/N] (q to cancel)"
        if (-not $confirmed) { throw [System.OperationCanceledException]::new("Setup cancelled. No installation package was started.") }
        Invoke-SetupBackend -PowerShellExecutable $powerShellExecutable -BackendPath $backendPath -RepoRoot $repoRoot -Target $target -ProjectPlatform $projectPlatform -BundleSelection $bundleSelection -Destination $InstallDir -AutoDelegation $autoDelegation -Preview $false
        Write-Host ""
        Write-Host "CraftRoster setup complete." -ForegroundColor Green
    }
} catch [System.OperationCanceledException] {
    Write-Host $_.Exception.Message
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    $setupExitCode = 1
} finally {
    if ($setupTempRoot) {
        try {
            Remove-SetupTemporarySource -OwnedRoot $setupTempRoot -TempParent $setupTempParent -ExpectedLeaf $setupTempLeaf
        } catch {
            Write-Host "Error: Temporary source cleanup failed: $($_.Exception.Message)" -ForegroundColor Red
            $setupExitCode = 1
        }
    }
}
exit $setupExitCode

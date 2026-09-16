# CraftRoster installer for Windows.

param(
    [Alias("Agent")]
    [string]$Target,
    [ValidateSet("skill", "agent")]
    [string]$Type = "skill",
    [Alias("Skill")]
    [string]$Name,
    [string]$Category,
    [string]$Branch = "main",
    [string]$Repo = "HsinPu/CraftRoster",
    [string]$SourceDir,
    [string]$InstallDir,
    [switch]$EnableAutoDelegation,
    [switch]$DryRun,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$script:CanonicalRepository = "HsinPu/CraftRoster"
$script:LegacyRepository = "HsinPu/Autoverse-Ai-Agent-Skills"
$script:AllowLegacyRepositoryAlias = -not $PSBoundParameters.ContainsKey("Repo")
$script:LegacySkillDigestManifestPath = $null
$script:LegacySkillDigestAllowlist = $null
$script:JsonStringOptions = @{}
if ((Get-Command ConvertFrom-Json).Parameters.ContainsKey('DateKind')) {
    # Ownership timestamps are JSON strings, including on PowerShell 7.5+.
    $script:JsonStringOptions.DateKind = 'String'
}

try { [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new() } catch {}

function Write-Info { param([string]$Message) Write-Host "==> $Message" -ForegroundColor Cyan }
function Write-Success { param([string]$Message) Write-Host "OK  $Message" -ForegroundColor Green }
function Write-Fail { param([string]$Message) Write-Host "Error: $Message" -ForegroundColor Red }

function Show-Usage {
    Write-Host @"
CraftRoster installer

Usage:
  .\scripts\install.ps1 -Target <target> [-Type skill] [-Name <skill> | -Category <category>] [-InstallDir path] [-DryRun] [-Force]
  .\scripts\install.ps1 -Target <target> -Type agent [-Name <role> | -Category <category>] [-InstallDir path] [-EnableAutoDelegation] [-DryRun] [-Force]

Compatibility aliases:
  -Agent is an alias for -Target; -Skill is an alias for -Name.
  -SourceDir installs from a local checkout; otherwise the requested GitHub repo and branch are downloaded.
  -InstallDir is a direct destination for tool targets and the project root for the 'project' target.
  Omit -Name and -Category to install every available component of the selected Type.
  Skill installs include required dependencies; conditional and optional dependencies are not installed automatically.
  The source checkout must include scripts/data/install-skill-dependencies.tsv.

Skill targets:
  codex, claude, cursor, vscode, copilot, opencode, project

Agent targets:
  codex, claude, cursor, vscode, copilot, opencode, project

Examples:
  .\scripts\install.ps1 -Target codex -Name python-development
  .\scripts\install.ps1 -Agent codex -Skill python-development
  .\scripts\install.ps1 -Target codex -Type agent -Name code-reviewer
  .\scripts\install.ps1 -Target codex -Type skill -Category frontend-design
  .\scripts\install.ps1 -Target codex -Type agent -Category quality-assurance
  .\scripts\install.ps1 -Target codex -Type agent -EnableAutoDelegation
  .\scripts\install.ps1 -Target opencode -Type agent
  .\scripts\install.ps1 -Target project -Type agent -Name debugger -DryRun

Safety:
  Existing components are updated only when repo, component, name, and target metadata all match.
  Agent updates additionally require matching id and adapter metadata.
  Full Agent installs also install the subagent-architecture Skill.
  'project' installs cross-tool files below the current directory (or -InstallDir project root).
  'vscode' is an alias for 'copilot' and uses the same ownership metadata.
  Global auto-delegation is opt-in and never overwrites conflicting user instructions.
  Unknown same-named content is blocked unless -Force is provided.
  -Force also applies to required dependencies in the expanded installation plan.
"@
}

function Get-HomeDir {
    if ($env:USERPROFILE) { return $env:USERPROFILE }
    return [Environment]::GetFolderPath("UserProfile")
}

function Test-OwnershipRepositoryMatch {
    param([string]$ExistingRepo, [string]$ExpectedRepo)
    if ($ExistingRepo -ceq $ExpectedRepo) { return $true }
    return $script:AllowLegacyRepositoryAlias `
        -and $ExpectedRepo -ceq $script:CanonicalRepository `
        -and $ExistingRepo -ceq $script:LegacyRepository
}

function Test-OwnershipRepositoryNeedsMigration {
    param([string]$ExistingRepo, [string]$ExpectedRepo)
    return $script:AllowLegacyRepositoryAlias `
        -and $ExpectedRepo -ceq $script:CanonicalRepository `
        -and $ExistingRepo -ceq $script:LegacyRepository
}

function Get-ExactMetadataString {
    param($Metadata, [string]$Name)
    if (-not $Metadata) { return $null }
    $property = $Metadata.PSObject.Properties | Where-Object { $_.Name -ceq $Name } | Select-Object -First 1
    if (-not $property -or $property.Value -isnot [string]) { return $null }
    return $property.Value
}

function Get-CodexHome {
    if ($env:CODEX_HOME) { return $env:CODEX_HOME }
    return Join-Path (Get-HomeDir) ".codex"
}

function Get-CodexSkillRoot {
    param(
        [string]$SkillName,
        [string]$RepoName,
        [string]$IncomingSkillFile
    )
    $homeDir = Get-HomeDir
    $canonicalRoot = Join-Path (Get-CodexHome) "skills"
    if (-not $SkillName) { return $canonicalRoot }

    $alternateRoots = @(Join-Path $homeDir ".agents\skills")
    $defaultCodexRoot = Join-Path $homeDir ".codex\skills"
    if (-not [string]::Equals(
        [System.IO.Path]::GetFullPath($canonicalRoot),
        [System.IO.Path]::GetFullPath($defaultCodexRoot),
        [System.StringComparison]::OrdinalIgnoreCase
    )) {
        $alternateRoots += $defaultCodexRoot
    }
    $alternateRoots = @($alternateRoots | Where-Object {
        -not [string]::Equals(
            [System.IO.Path]::GetFullPath($_),
            [System.IO.Path]::GetFullPath($canonicalRoot),
            [System.StringComparison]::OrdinalIgnoreCase
        )
    } | Sort-Object -Unique)

    $canonicalTarget = Join-Path $canonicalRoot $SkillName
    $existingAlternateRoots = @($alternateRoots | Where-Object {
        Test-Path -LiteralPath (Join-Path $_ $SkillName)
    })
    if (Test-Path -LiteralPath $canonicalTarget) {
        if ($existingAlternateRoots.Count -gt 0) {
            throw "Codex Skill '$SkillName' exists in both canonical root '$canonicalRoot' and alternate root(s): $($existingAlternateRoots -join ', '). Remove or reconcile the duplicate before installing."
        }
        return $canonicalRoot
    }
    if ($existingAlternateRoots.Count -gt 1) {
        throw "Codex Skill '$SkillName' has multiple alternate copies: $($existingAlternateRoots -join ', '). Remove or reconcile the duplicate before installing."
    }

    $ownedAlternateRoots = @()
    foreach ($alternateRoot in $existingAlternateRoots) {
        $alternateTarget = Join-Path $alternateRoot $SkillName
        $metaPath = Join-Path $alternateTarget ".skill-meta.json"
        try {
            $plan = Get-InstallAction `
                -TargetPath $alternateTarget `
                -MetaPath $metaPath `
                -Label $SkillName `
                -RepoName $RepoName `
                -ExpectedComponent "skill" `
                -ExpectedName $SkillName `
                -ExpectedTarget "codex" `
                -LegacyIdentityPath (Join-Path $alternateTarget "SKILL.md") `
                -IncomingIdentityPath $IncomingSkillFile
            if ($plan.Action -in @("update", "repair", "migrate-update")) {
                $ownedAlternateRoots += $alternateRoot
            }
        } catch {
            # Alternate content without matching ownership is never adopted.
        }
    }
    if ($ownedAlternateRoots.Count -eq 1) { return $ownedAlternateRoots[0] }
    if ($existingAlternateRoots.Count -gt 0) {
        throw "Codex Skill '$SkillName' already exists in alternate root '$($existingAlternateRoots[0])' without matching CraftRoster ownership. Refusing to create a duplicate in canonical root '$canonicalRoot'."
    }
    return $canonicalRoot
}

function Get-ConfigHome {
    return $(if ($env:XDG_CONFIG_HOME) { $env:XDG_CONFIG_HOME } else { Join-Path (Get-HomeDir) ".config" })
}

function Get-OpenCodeConfigRoot {
    if ($env:OPENCODE_CONFIG_DIR) { return $env:OPENCODE_CONFIG_DIR }
    return Join-Path (Get-ConfigHome) "opencode"
}

function Resolve-TargetName {
    param([string]$TargetName, [string]$ComponentType)
    $normalized = $TargetName.Trim().ToLowerInvariant()
    $supported = @("codex", "claude", "cursor", "vscode", "copilot", "opencode", "project")
    if ($supported -notcontains $normalized) { throw "Unsupported $ComponentType target: $TargetName" }
    if ($normalized -eq "vscode") { return "copilot" }
    return $normalized
}

function Resolve-InstallPath {
    param(
        [string]$TargetName,
        [string]$ComponentType,
        [string]$ComponentName,
        [string]$RepoName,
        [string]$IncomingSkillFile
    )
    $homeDir = Get-HomeDir
    $codexHome = Get-CodexHome
    $openCodeRoot = Get-OpenCodeConfigRoot

    if ($ComponentType -eq "agent") {
        switch ($TargetName.ToLowerInvariant()) {
            "codex" { return Join-Path $codexHome "agents" }
            "claude" { return Join-Path $homeDir ".claude\agents" }
            "cursor" { return Join-Path $homeDir ".cursor\agents" }
            "copilot" { return Join-Path $homeDir ".copilot\agents" }
            "opencode" { return Join-Path $openCodeRoot "agents" }
            default { throw "Unsupported Agent target: $TargetName" }
        }
    }

    switch ($TargetName.ToLowerInvariant()) {
        "claude" { return Join-Path $homeDir ".claude\skills" }
        "cursor" { return Join-Path $homeDir ".cursor\skills" }
        "codex" { return Get-CodexSkillRoot -SkillName $ComponentName -RepoName $RepoName -IncomingSkillFile $IncomingSkillFile }
        "copilot" { return Join-Path $homeDir ".copilot\skills" }
        "opencode" { return Join-Path $openCodeRoot "skills" }
        default { throw "Unsupported Skill target: $TargetName" }
    }
}

function Get-ProjectRoot {
    param([string]$RequestedRoot)
    if ($RequestedRoot) { return [System.IO.Path]::GetFullPath($RequestedRoot) }
    return (Get-Location).Path
}

function Get-SkillInstallProfiles {
    param(
        [string]$TargetName,
        [string]$ComponentName,
        [string]$RequestedInstallDir,
        [string]$RepoName,
        [string]$IncomingSkillFile
    )
    if ($TargetName -eq "project") {
        $root = Get-ProjectRoot -RequestedRoot $RequestedInstallDir
        return @(
            @{ DestinationRoot = Join-Path $root ".agents\skills"; TargetName = "project"; LegacyTargets = @("codex-project") },
            @{ DestinationRoot = Join-Path $root ".claude\skills"; TargetName = "project"; LegacyTargets = @("claude-project") }
        )
    }
    $destinationRoot = if ($RequestedInstallDir) {
        [System.IO.Path]::GetFullPath($RequestedInstallDir)
    } else {
        Resolve-InstallPath -TargetName $TargetName -ComponentType "skill" -ComponentName $ComponentName -RepoName $RepoName -IncomingSkillFile $IncomingSkillFile
    }
    $legacyTargets = if ($TargetName -eq "copilot") { @("vscode") } else { @() }
    return ,@{ DestinationRoot = $destinationRoot; TargetName = $TargetName; LegacyTargets = $legacyTargets }
}

function Get-AgentInstallProfiles {
    param([string]$TargetName, [string]$RequestedInstallDir)
    if ($TargetName -eq "project") {
        $root = Get-ProjectRoot -RequestedRoot $RequestedInstallDir
        return @(
            @{ DestinationRoot = Join-Path $root ".codex\agents"; TargetName = "project"; Platform = "codex"; OutputSuffix = ".toml"; LegacyTargets = @("codex-project") },
            @{ DestinationRoot = Join-Path $root ".claude\agents"; TargetName = "project"; Platform = "claude"; OutputSuffix = ".md"; LegacyTargets = @("claude-project") },
            @{ DestinationRoot = Join-Path $root ".cursor\agents"; TargetName = "project"; Platform = "cursor"; OutputSuffix = ".md"; LegacyTargets = @("cursor-project") },
            @{ DestinationRoot = Join-Path $root ".github\agents"; TargetName = "project"; Platform = "copilot"; OutputSuffix = ".agent.md"; LegacyTargets = @("copilot-project", "vscode-project", "vscode") },
            @{ DestinationRoot = Join-Path $root ".opencode\agents"; TargetName = "project"; Platform = "opencode"; OutputSuffix = ".md"; LegacyTargets = @("opencode-project") }
        )
    }

    switch ($TargetName) {
        "codex" { $platform = "codex"; $outputSuffix = ".toml" }
        "claude" { $platform = "claude"; $outputSuffix = ".md" }
        "cursor" { $platform = "cursor"; $outputSuffix = ".md" }
        "copilot" { $platform = "copilot"; $outputSuffix = ".agent.md" }
        "opencode" { $platform = "opencode"; $outputSuffix = ".md" }
        default { throw "Unsupported Agent target: $TargetName" }
    }
    $destinationRoot = if ($RequestedInstallDir) {
        [System.IO.Path]::GetFullPath($RequestedInstallDir)
    } else {
        Resolve-InstallPath -TargetName $TargetName -ComponentType "agent"
    }
    $legacyTargets = if ($TargetName -eq "copilot") { @("vscode") } else { @() }
    return ,@{ DestinationRoot = $destinationRoot; TargetName = $TargetName; Platform = $platform; OutputSuffix = $outputSuffix; LegacyTargets = $legacyTargets }
}

function Test-ComponentName {
    param([string]$ComponentType, [string]$ComponentName)
    if ($ComponentType -eq "agent") {
        if (-not $ComponentName) { return }
        if ($ComponentName -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') {
            throw "Invalid Agent Name '$ComponentName'. Expected a lowercase hyphen-case role."
        }
        return
    }
    if (-not $ComponentName) { return }
    if ($ComponentName -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') {
        throw "Invalid Skill Name '$ComponentName'. Expected a lowercase hyphen-case catalog name."
    }
}

function Test-RepositoryCoordinate {
    param([string]$RepoName)
    if ($RepoName -notmatch '^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$') {
        throw "Invalid GitHub repository '$RepoName'. Expected owner/name using letters, numbers, dot, underscore, or hyphen."
    }
}

function Test-BranchName {
    param([string]$BranchName)
    if ($BranchName -notmatch '^[A-Za-z0-9._/+_-]+$') {
        throw "Invalid branch '$BranchName'. Use a GitHub branch name without whitespace, control characters, quotes, or backslashes."
    }
}

function Invoke-DownloadArchive {
    param([string]$RepoName, [string]$BranchName, [string]$Destination)
    Write-Info "Downloading $RepoName@$BranchName"
    Invoke-WebRequest -Uri "https://codeload.github.com/$RepoName/zip/refs/heads/$BranchName" -OutFile $Destination
}

function Get-ArchiveRoot {
    param([string]$ExtractDir)
    $roots = @(Get-ChildItem -Path $ExtractDir -Directory)
    if ($roots.Count -ne 1) { throw "Could not find a single extracted repository root in $ExtractDir" }
    return $roots[0].FullName
}

function Get-SkillSources {
    param([string]$RepoRoot, [string]$SkillName)
    $skillsRoot = Join-Path $RepoRoot "skills"
    if ($SkillName) {
        $skillPath = Join-Path $skillsRoot $SkillName
        if (-not (Test-Path (Join-Path $skillPath "SKILL.md"))) { $skillPath = Join-Path $RepoRoot $SkillName }
        if (-not (Test-Path (Join-Path $skillPath "SKILL.md"))) { throw "Skill not found in archive: $SkillName" }
        return @(Get-Item $skillPath)
    }
    $scanRoot = if (Test-Path $skillsRoot) { $skillsRoot } else { $RepoRoot }
    $skills = @(Get-ChildItem -Path $scanRoot -Directory |
        Where-Object { Test-Path (Join-Path $_.FullName "SKILL.md") } |
        Sort-Object Name)
    if ($skills.Count -eq 0) { throw "No Skill folders with SKILL.md were found in archive." }
    return $skills
}

function Get-AgentSources {
    param([string]$RepoRoot, [string]$Platform, [string]$OutputSuffix, [string]$AgentId)
    if ($Platform -notin @("codex", "claude", "cursor", "copilot", "opencode")) {
        throw "Unsupported Agent adapter platform: $Platform"
    }
    if (-not $OutputSuffix -or -not $OutputSuffix.StartsWith(".")) {
        throw "Invalid Agent output suffix for ${Platform}: $OutputSuffix"
    }
    $adapterRoot = Join-Path $RepoRoot "adapters\$Platform"

    if ($AgentId) {
        $sourcePath = Join-Path $adapterRoot "$AgentId$OutputSuffix"
        if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
            throw "Agent adapter not found in archive: $AgentId ($Platform)"
        }
        return ,@{
            Source = Get-Item -LiteralPath $sourcePath
            Id = $AgentId
            RuntimeName = $AgentId
            Platform = $Platform
            OutputSuffix = $OutputSuffix
        }
    }

    if (-not (Test-Path -LiteralPath $adapterRoot -PathType Container)) {
        throw "Agent adapter directory not found in archive: adapters/$Platform"
    }
    $sources = @(
        Get-ChildItem -LiteralPath $adapterRoot -File -Filter "*$OutputSuffix" |
            Sort-Object Name |
            ForEach-Object {
                $role = $_.Name.Substring(0, $_.Name.Length - $OutputSuffix.Length)
                @{
                    Source = $_
                    Id = $role
                    RuntimeName = $role
                    Platform = $Platform
                    OutputSuffix = $OutputSuffix
                }
            }
    )
    if ($sources.Count -eq 0) { throw "No Agent adapters were found for $Platform." }
    return $sources
}

function Get-InstallCategoryNames {
    param([string]$RepoRoot, [string]$ComponentType, [string]$CategoryName)
    $indexPath = Join-Path $RepoRoot "scripts\data\install-category-index.tsv"
    if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf)) {
        throw "Install category index not found: $indexPath"
    }

    try {
        $lines = [System.IO.File]::ReadAllLines($indexPath, [System.Text.UTF8Encoding]::new($false, $true))
    } catch {
        throw "Install category index is not valid UTF-8: $indexPath"
    }
    if ($lines.Count -lt 2 -or $lines[0] -cne "type`tcategory`tname") {
        throw "Install category index has an invalid header: $indexPath"
    }

    $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $available = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $selected = [System.Collections.Generic.List[string]]::new()
    for ($index = 1; $index -lt $lines.Count; $index++) {
        $parts = @($lines[$index] -split "`t", 0)
        if ($parts.Count -ne 3) {
            throw "Install category index row $($index + 1) must contain type, category, and name."
        }
        $rowType, $rowCategory, $rowName = $parts
        if ($rowType -notin @("skill", "agent") -or
            $rowCategory -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$' -or
            $rowName -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') {
            throw "Install category index row $($index + 1) contains an invalid value."
        }
        if (-not $seen.Add("$rowType`t$rowName")) {
            throw "Install category index contains duplicate $rowType name: $rowName"
        }
        if ($rowType -ceq $ComponentType) {
            $null = $available.Add($rowCategory)
            if ($rowCategory -ceq $CategoryName) { $selected.Add($rowName) }
        }
    }

    if ($selected.Count -eq 0) {
        $label = if ($ComponentType -ceq "skill") { "Skill" } else { "Agent" }
        $availableList = @($available | Sort-Object) -join ", "
        throw "Invalid $label category '$CategoryName'. Available $label categories: $availableList"
    }
    return @($selected)
}

function Get-SkillDependencyRows {
    param([string]$RepoRoot)
    $indexPath = Join-Path $RepoRoot "scripts\data\install-skill-dependencies.tsv"
    if (-not (Test-Path -LiteralPath $indexPath -PathType Leaf) -or
        ((Get-Item -Force -LiteralPath $indexPath).Attributes -band [System.IO.FileAttributes]::ReparsePoint)) {
        throw "Skill dependency index not found or not a regular file: $indexPath. Use the installer matching this source checkout."
    }
    try {
        $text = [System.Text.UTF8Encoding]::new($false, $true).GetString([System.IO.File]::ReadAllBytes($indexPath))
    } catch {
        throw "Skill dependency index is not valid UTF-8: $indexPath"
    }
    $lines = @($text -split "`n")
    if ($lines.Count -gt 1 -and $lines[-1] -ceq '') { $lines = @($lines[0..($lines.Count - 2)]) }
    if ($lines.Count -lt 1 -or $lines[0].TrimEnd("`r") -cne "skill`tdependency`tkind`twhen") {
        throw "Skill dependency index has an invalid header: $indexPath"
    }
    $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $checkedNames = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $rows = [System.Collections.Generic.List[object]]::new()
    for ($index = 1; $index -lt $lines.Count; $index++) {
        $parts = @($lines[$index].TrimEnd("`r") -split "`t", 0)
        if ($parts.Count -ne 4) { throw "Skill dependency index row $($index + 1) must contain skill, dependency, kind, and when." }
        $skillName, $dependencyName, $kind, $when = $parts
        if ($skillName -cnotmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$' -or
            $dependencyName -cnotmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$' -or
            $kind -cnotin @('required', 'conditional', 'optional') -or $when -match '[\r\n\x00]' -or
            ($kind -cne 'conditional' -and $when -cne '-') -or
            ($kind -ceq 'conditional' -and ([string]::IsNullOrWhiteSpace($when) -or $when -ceq '-'))) {
            throw "Skill dependency index row $($index + 1) contains an invalid value."
        }
        if ($skillName -ceq $dependencyName) { throw "Skill dependency index contains a self dependency: $skillName" }
        if (-not $seen.Add("$skillName`t$dependencyName")) { throw "Skill dependency index contains duplicate dependency: $skillName -> $dependencyName" }
        foreach ($componentName in @($skillName, $dependencyName)) {
            if ($checkedNames.Add($componentName)) { $null = @(Get-SkillSources -RepoRoot $RepoRoot -SkillName $componentName) }
        }
        $rows.Add([pscustomobject]@{ Skill = $skillName; Dependency = $dependencyName; Kind = $kind; When = $when })
    }
    return @($rows.ToArray())
}

function Expand-RequiredSkillSources {
    param([string]$RepoRoot, [object[]]$Sources, [object[]]$DependencyRows)
    $visiting = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $visited = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $selected = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $ordered = [System.Collections.Generic.List[object]]::new()
    foreach ($source in $Sources) { $null = $selected.Add($source.Name) }
    $visit = {
        param([string]$SkillName, [string[]]$Chain)
        if ($visited.Contains($SkillName)) { return }
        if (-not $visiting.Add($SkillName)) { throw "Required Skill dependency cycle: $((@($Chain) + $SkillName) -join ' -> ')" }
        foreach ($row in $DependencyRows) {
            if ($row.Skill -ceq $SkillName -and $row.Kind -ceq 'required') {
                & $visit $row.Dependency (@($Chain) + $SkillName)
            }
        }
        $null = $visiting.Remove($SkillName)
        $null = $visited.Add($SkillName)
        $ordered.Add(@(Get-SkillSources -RepoRoot $RepoRoot -SkillName $SkillName)[0])
    }
    foreach ($source in $Sources) { & $visit $source.Name @() }
    Write-Info "Selected $($selected.Count) Skill(s); added $($ordered.Count - $selected.Count) required dependency Skill(s)."
    foreach ($row in $DependencyRows) {
        if ($selected.Contains($row.Skill) -and $row.Kind -cne 'required' -and -not $visited.Contains($row.Dependency)) {
            if ($row.Kind -ceq 'conditional') {
                Write-Info "Conditional route not auto-installed: $($row.Skill) -> $($row.Dependency) ($($row.When))"
            } else {
                Write-Info "Optional dependency not auto-installed: $($row.Skill) -> $($row.Dependency)"
            }
        }
    }
    return @($ordered.ToArray())
}

function Assert-SkillDependencyPlan {
    param([object[]]$Plans, [object[]]$DependencyRows)
    foreach ($plan in $Plans) {
        foreach ($row in $DependencyRows) {
            if ($row.Skill -cne $plan.Source.Name -or $row.Kind -cne 'required') { continue }
            $dependencyPlan = @($Plans | Where-Object {
                $_.Source.Name -ceq $row.Dependency -and $_.ProfileIndex -eq $plan.ProfileIndex
            })
            if ($dependencyPlan.Count -ne 1) { throw "Required Skill dependency missing from installation plan: $($row.Skill) -> $($row.Dependency)" }
            $sourceRoot = [System.IO.Path]::GetFullPath($plan.Profile.DestinationRoot).TrimEnd('\', '/')
            $dependencyRoot = [System.IO.Path]::GetFullPath($dependencyPlan[0].Profile.DestinationRoot).TrimEnd('\', '/')
            if (-not [string]::Equals($sourceRoot, $dependencyRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
                throw "Required Skill dependency uses different roots: $($row.Skill) at '$sourceRoot' -> $($row.Dependency) at '$dependencyRoot'. Reconcile the existing Skill roots before installing; no duplicate or migration was created."
            }
        }
    }
}

function Test-TargetWithinRoot {
    param([string]$TargetPath, [string]$RootPath)
    $fullTarget = [System.IO.Path]::GetFullPath($TargetPath)
    $fullRoot = [System.IO.Path]::GetFullPath($RootPath).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
    return $fullTarget.StartsWith($fullRoot + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)
}

function Read-StrictUtf8Text {
    param([string]$Path, [string]$Label = "file", [switch]$AllowBom)
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $offset = 0
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        if (-not $AllowBom) {
            throw "Refusing to rewrite BOM-prefixed $Label at $Path. Remove the BOM or merge the change manually."
        }
        $offset = 3
    }
    try {
        return [System.Text.UTF8Encoding]::new($false, $true).GetString($bytes, $offset, $bytes.Length - $offset)
    } catch [System.Text.DecoderFallbackException] {
        throw "Refusing to rewrite $Label at $Path because it is not valid UTF-8."
    }
}

function Add-Sha256Bytes {
    param(
        [System.Security.Cryptography.HashAlgorithm]$Hasher,
        [byte[]]$Bytes,
        [int]$Count = -1
    )
    if ($Count -lt 0) { $Count = $Bytes.Length }
    if ($Count -gt 0) {
        $null = $Hasher.TransformBlock($Bytes, 0, $Count, $Bytes, 0)
    }
}

function Compare-Utf8ByteSequence {
    param([byte[]]$Left, [byte[]]$Right)
    $sharedLength = [Math]::Min($Left.Length, $Right.Length)
    for ($index = 0; $index -lt $sharedLength; $index++) {
        if ($Left[$index] -lt $Right[$index]) { return -1 }
        if ($Left[$index] -gt $Right[$index]) { return 1 }
    }
    if ($Left.Length -lt $Right.Length) { return -1 }
    if ($Left.Length -gt $Right.Length) { return 1 }
    return 0
}

function Get-SkillContentSha256 {
    param(
        [string]$RootPath,
        [string[]]$ExcludedRelativePaths = @(),
        [ValidateSet('craftroster-skill-content-v1', 'autoverse-skill-content-v1')]
        [string]$DigestNamespace = 'craftroster-skill-content-v1'
    )
    if (-not (Test-Path -LiteralPath $RootPath -PathType Container)) {
        throw "Cannot hash Skill content because the directory is missing: $RootPath"
    }

    $rootItem = Get-Item -Force -LiteralPath $RootPath
    if (($rootItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Refusing to hash linked Skill content: $RootPath"
    }
    $rootFullPath = [System.IO.Path]::GetFullPath($rootItem.FullName).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    )
    $rootPrefix = $rootFullPath + [System.IO.Path]::DirectorySeparatorChar
    $utf8 = [System.Text.UTF8Encoding]::new($false)
    $entries = @()

    foreach ($item in @(Get-ChildItem -Force -LiteralPath $rootFullPath -Recurse)) {
        if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Refusing to hash linked Skill content: $($item.FullName)"
        }
        if ($item.PSIsContainer) { continue }
        if ($item -isnot [System.IO.FileInfo]) {
            throw "Refusing to hash non-regular Skill content: $($item.FullName)"
        }
        $fullPath = [System.IO.Path]::GetFullPath($item.FullName)
        if (-not $fullPath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Refusing to hash Skill content outside its root: $fullPath"
        }
        $relativePath = $fullPath.Substring($rootPrefix.Length).Replace('\', '/')
        if ($relativePath -ceq '.skill-meta.json' -or $ExcludedRelativePaths -ccontains $relativePath) { continue }
        $entries += [pscustomobject]@{
            FullName = $fullPath
            RelativePath = $relativePath
            RelativePathBytes = $utf8.GetBytes($relativePath)
            Length = [int64]$item.Length
        }
    }

    # UTF-8 byte ordering is the cross-platform catalog contract. An insertion
    # sort keeps that ordering explicit instead of relying on the current locale.
    for ($index = 1; $index -lt $entries.Count; $index++) {
        $entry = $entries[$index]
        $position = $index - 1
        while ($position -ge 0 -and (Compare-Utf8ByteSequence -Left $entries[$position].RelativePathBytes -Right $entry.RelativePathBytes) -gt 0) {
            $entries[$position + 1] = $entries[$position]
            $position--
        }
        $entries[$position + 1] = $entry
    }

    $hasher = [System.Security.Cryptography.SHA256]::Create()
    try {
        $nullByte = [byte[]]@(0)
        Add-Sha256Bytes -Hasher $hasher -Bytes $utf8.GetBytes($DigestNamespace)
        Add-Sha256Bytes -Hasher $hasher -Bytes $nullByte
        foreach ($entry in $entries) {
            Add-Sha256Bytes -Hasher $hasher -Bytes $entry.RelativePathBytes
            Add-Sha256Bytes -Hasher $hasher -Bytes $nullByte
            $lengthBytes = [System.Text.Encoding]::ASCII.GetBytes($entry.Length.ToString([System.Globalization.CultureInfo]::InvariantCulture))
            Add-Sha256Bytes -Hasher $hasher -Bytes $lengthBytes
            Add-Sha256Bytes -Hasher $hasher -Bytes $nullByte

            $stream = [System.IO.File]::Open($entry.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
            try {
                $buffer = New-Object byte[] 65536
                $totalRead = [int64]0
                while (($read = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
                    Add-Sha256Bytes -Hasher $hasher -Bytes $buffer -Count $read
                    $totalRead += $read
                }
                if ($totalRead -ne $entry.Length) {
                    throw "Skill content changed while it was being hashed: $($entry.FullName)"
                }
            } finally {
                $stream.Dispose()
            }
            Add-Sha256Bytes -Hasher $hasher -Bytes $nullByte
        }
        $empty = New-Object byte[] 0
        $null = $hasher.TransformFinalBlock($empty, 0, 0)
        return (($hasher.Hash | ForEach-Object { $_.ToString('x2') }) -join '')
    } finally {
        $hasher.Dispose()
    }
}

function Get-LegacySkillDigestAllowlist {
    if ($script:LegacySkillDigestAllowlist) { return ,$script:LegacySkillDigestAllowlist }
    $manifestPath = $script:LegacySkillDigestManifestPath
    if (-not $manifestPath -or -not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
        throw "Verified legacy Skill digest manifest is missing: $manifestPath"
    }
    $manifestItem = Get-Item -Force -LiteralPath $manifestPath
    if (($manifestItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Verified legacy Skill digest manifest cannot be a linked file: $manifestPath"
    }

    $lines = [System.IO.File]::ReadAllLines($manifestItem.FullName, [System.Text.Encoding]::UTF8)
    if ($lines.Count -lt 6 -or
        $lines[0] -cne '# craftroster-verified-legacy-skill-content-v1' -or
        $lines[1] -cne '# digest-namespace: craftroster-skill-content-v1' -or
        $lines[2] -cnotmatch '\A# history-range: [0-9a-f]{40}\^\.\.[0-9a-f]{40}\z' -or
        $lines[3] -cnotmatch '\A# skills: (?<skills>[1-9][0-9]*)\z' -or
        $lines[4] -cnotmatch '\A# entries: (?<entries>[1-9][0-9]*)\z') {
        throw "Verified legacy Skill digest manifest has an invalid header: $manifestPath"
    }
    $expectedSkillCount = [int]([regex]::Match($lines[3], '[0-9]+$').Value)
    $expectedEntryCount = [int]([regex]::Match($lines[4], '[0-9]+$').Value)
    $allowlist = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $skills = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
    $previous = $null
    for ($index = 5; $index -lt $lines.Count; $index++) {
        $line = $lines[$index]
        $rowMatch = [regex]::Match($line, '\A(?<name>[a-z0-9]+(?:-[a-z0-9]+)*)\t(?<digest>[0-9a-f]{64})\z')
        if (-not $rowMatch.Success) {
            throw "Verified legacy Skill digest manifest has an invalid row at line $($index + 1): $manifestPath"
        }
        if ($null -ne $previous -and [System.StringComparer]::Ordinal.Compare($previous, $line) -ge 0) {
            throw "Verified legacy Skill digest manifest rows are not strictly sorted: $manifestPath"
        }
        if (-not $allowlist.Add($line)) {
            throw "Verified legacy Skill digest manifest contains a duplicate row: $manifestPath"
        }
        $null = $skills.Add($rowMatch.Groups['name'].Value)
        $previous = $line
    }
    if ($allowlist.Count -ne $expectedEntryCount -or $skills.Count -ne $expectedSkillCount) {
        throw "Verified legacy Skill digest manifest counts do not match its contents: $manifestPath"
    }
    $script:LegacySkillDigestAllowlist = $allowlist
    return ,$allowlist
}

$script:SkillSourceDigestCache = @{}

function Get-SkillSourceContentSha256 {
    param([string]$RootPath)
    $cacheKey = [System.IO.Path]::GetFullPath($RootPath)
    if ($script:SkillSourceDigestCache.ContainsKey($cacheKey)) {
        return $script:SkillSourceDigestCache[$cacheKey]
    }
    $digest = Get-SkillContentSha256 -RootPath $cacheKey
    $script:SkillSourceDigestCache[$cacheKey] = $digest
    return $digest
}

function Get-ExistingMeta {
    param([string]$MetaPath)
    if (-not (Test-Path -LiteralPath $MetaPath -PathType Leaf)) { return $null }
    $metaItem = Get-Item -Force -LiteralPath $MetaPath
    if (($metaItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Refusing to read linked CraftRoster metadata: $MetaPath"
    }
    try {
        $text = Read-StrictUtf8Text -Path $MetaPath -Label "CraftRoster metadata" -AllowBom
        $null = Assert-StrictJsonText -Text $text -Path $MetaPath
        $metadata = ConvertFrom-Json -InputObject $text @JsonStringOptions
        if ($metadata -isnot [System.Management.Automation.PSCustomObject]) {
            throw "metadata root is not a JSON object"
        }
        foreach ($propertyName in @('source', 'repo', 'branch', 'component', 'name', 'target', 'agent', 'id', 'adapter', 'contentSha256', 'installedAt', 'updatedAt')) {
            $property = $metadata.PSObject.Properties | Where-Object { $_.Name -ceq $propertyName } | Select-Object -First 1
            if ($property -and $property.Value -isnot [string]) {
                throw "metadata property '$propertyName' is not a string"
            }
        }
        $contentSha256 = $metadata.PSObject.Properties | Where-Object { $_.Name -ceq 'contentSha256' } | Select-Object -First 1
        if ($contentSha256 -and $contentSha256.Value -cnotmatch '\A[0-9a-f]{64}\z') {
            throw "metadata property 'contentSha256' is not a lowercase 64-character hexadecimal SHA-256"
        }
        return $metadata
    } catch {
        if ($Force) { return $null }
        throw "Existing CraftRoster metadata is invalid: $MetaPath ($($_.Exception.Message))"
    }
}

function Get-SkillFrontmatterValue {
    param([string]$SkillFile, [string]$FieldName)
    if (-not (Test-Path -LiteralPath $SkillFile -PathType Leaf)) { return $null }
    $item = Get-Item -Force -LiteralPath $SkillFile
    if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { return $null }
    $text = [System.IO.File]::ReadAllText($SkillFile)
    $frontmatter = [regex]::Match($text, '\A(?:\uFEFF)?---\r?\n(?<body>[\s\S]*?)\r?\n---')
    if (-not $frontmatter.Success) { return $null }
    $body = $frontmatter.Groups['body'].Value
    $field = [regex]::Match($body, '(?m)^' + [regex]::Escape($FieldName) + ':\s*(?<value>.+?)\s*$')
    if ($field.Success) {
        return $field.Groups['value'].Value.Trim().Trim('"').Trim("'")
    }
    if ($FieldName -ne 'source' -and $FieldName -notlike 'reference-*' -and $FieldName -ne 'previous-license') {
        return $null
    }

    $insideMetadata = $false
    foreach ($line in @($body -split '\r?\n')) {
        if (-not $insideMetadata) {
            if ($line -match '^metadata:\s*(?:#.*)?$') { $insideMetadata = $true }
            continue
        }
        if ($line -match '^\S') { break }
        if ($line -match '^\s+' + [regex]::Escape($FieldName) + ':\s*(?<value>.+?)\s*$') {
            return $Matches['value'].Trim().Trim('"').Trim("'")
        }
    }
    return $null
}

function Test-SkillFrontmatterIdentity {
    param(
        [string]$ExistingSkillFile,
        [string]$IncomingSkillFile,
        [string]$ExpectedName,
        [string]$ExistingRepo,
        [string]$RepoName
    )
    $existingName = Get-SkillFrontmatterValue -SkillFile $ExistingSkillFile -FieldName 'name'
    $existingSource = Get-SkillFrontmatterValue -SkillFile $ExistingSkillFile -FieldName 'source'
    $existingLicense = Get-SkillFrontmatterValue -SkillFile $ExistingSkillFile -FieldName 'license'
    $incomingName = Get-SkillFrontmatterValue -SkillFile $IncomingSkillFile -FieldName 'name'
    $incomingSource = Get-SkillFrontmatterValue -SkillFile $IncomingSkillFile -FieldName 'source'
    $incomingReferenceSource = Get-SkillFrontmatterValue -SkillFile $IncomingSkillFile -FieldName 'reference-source'
    $incomingLicense = Get-SkillFrontmatterValue -SkillFile $IncomingSkillFile -FieldName 'license'
    $incomingPreviousLicense = Get-SkillFrontmatterValue -SkillFile $IncomingSkillFile -FieldName 'previous-license'
    $sourceMatches = $existingSource -ceq $incomingSource -or (
        $incomingReferenceSource -and $existingSource -ceq $incomingReferenceSource
    )
    if (-not $sourceMatches -and
        (Test-OwnershipRepositoryNeedsMigration -ExistingRepo $ExistingRepo -ExpectedRepo $RepoName) -and
        $existingSource -ceq $script:LegacyRepository -and
        $incomingSource -ceq $script:CanonicalRepository) {
        $sourceMatches = $true
    }
    $licenseMatches = $existingLicense -ceq $incomingLicense -or (
        $incomingPreviousLicense -and $existingLicense -ceq $incomingPreviousLicense
    )
    return $existingName -ceq $ExpectedName `
        -and $incomingName -ceq $ExpectedName `
        -and [bool]$existingSource `
        -and $sourceMatches `
        -and [bool]$existingLicense `
        -and $licenseMatches
}

function Test-VerifiedLegacySkillWithoutDigest {
    param(
        [string]$ExistingSkillFile,
        [string]$IncomingSkillFile,
        [string]$ExpectedName,
        [string]$ExistingRepo,
        [string]$RepoName
    )
    if (-not (Test-OwnershipRepositoryNeedsMigration -ExistingRepo $ExistingRepo -ExpectedRepo $RepoName)) {
        return $false
    }
    if (-not (Test-SkillFrontmatterIdentity `
        -ExistingSkillFile $ExistingSkillFile `
        -IncomingSkillFile $IncomingSkillFile `
        -ExpectedName $ExpectedName `
        -ExistingRepo $ExistingRepo `
        -RepoName $RepoName)) {
        return $false
    }
    $existingRoot = Split-Path -Parent $ExistingSkillFile
    $contentSha256 = Get-SkillContentSha256 -RootPath $existingRoot
    return (Get-LegacySkillDigestAllowlist).Contains("$ExpectedName`t$contentSha256")
}

function Test-LegacySkillOwnership {
    param(
        [object]$ExistingMeta,
        [string]$ExistingSkillFile,
        [string]$IncomingSkillFile,
        [string]$RepoName,
        [string]$ExpectedName,
        [string]$ExpectedTarget,
        [string[]]$LegacyTargets,
        [ref]$UnverifiedMissingDigest
    )
    if (-not $ExistingMeta) { return $false }
    $existingRepo = Get-ExactMetadataString -Metadata $ExistingMeta -Name 'repo'
    $existingName = Get-ExactMetadataString -Metadata $ExistingMeta -Name 'name'
    $existingAgent = Get-ExactMetadataString -Metadata $ExistingMeta -Name 'agent'
    if (-not (Test-OwnershipRepositoryMatch -ExistingRepo $existingRepo -ExpectedRepo $RepoName)) { return $false }
    $componentProperty = $ExistingMeta.PSObject.Properties | Where-Object { $_.Name -ceq 'component' } | Select-Object -First 1
    $targetProperty = $ExistingMeta.PSObject.Properties | Where-Object { $_.Name -ceq 'target' } | Select-Object -First 1
    if ($componentProperty -or $targetProperty) { return $false }
    $targetMatches = $existingAgent -ceq $ExpectedTarget -or ($LegacyTargets -and $LegacyTargets -ccontains $existingAgent)
    if ($existingName -cne $ExpectedName -or -not $targetMatches) { return $false }
    $contentDigest = $ExistingMeta.PSObject.Properties | Where-Object { $_.Name -ceq 'contentSha256' } | Select-Object -First 1
    if ($contentDigest) {
        return Test-SkillFrontmatterIdentity `
            -ExistingSkillFile $ExistingSkillFile `
            -IncomingSkillFile $IncomingSkillFile `
            -ExpectedName $ExpectedName `
            -ExistingRepo $existingRepo `
            -RepoName $RepoName
    }
    $verified = Test-VerifiedLegacySkillWithoutDigest `
        -ExistingSkillFile $ExistingSkillFile `
        -IncomingSkillFile $IncomingSkillFile `
        -ExpectedName $ExpectedName `
        -ExistingRepo $existingRepo `
        -RepoName $RepoName
    if (-not $verified -and $UnverifiedMissingDigest) {
        $UnverifiedMissingDigest.Value = $true
    }
    return $verified
}

function Get-InstallAction {
    param(
        [string]$TargetPath,
        [string]$MetaPath,
        [string]$Label,
        [string]$RepoName,
        [string]$ExpectedComponent,
        [string]$ExpectedName,
        [string]$ExpectedTarget,
        [string]$ExpectedId,
        [string]$ExpectedAdapter,
        [string[]]$LegacyTargets,
        [string]$LegacyIdentityPath,
        [string]$IncomingIdentityPath
    )
    $targetExists = Test-Path -LiteralPath $TargetPath
    $unverifiedMissingSkillDigest = $false
    $metaExists = Test-Path -LiteralPath $MetaPath -PathType Leaf
    if (-not $targetExists -and -not $metaExists) { return @{ Action = "install"; ExistingMeta = $null } }
    $existingMeta = Get-ExistingMeta -MetaPath $MetaPath
    $existingRepo = Get-ExactMetadataString -Metadata $existingMeta -Name 'repo'
    $existingComponent = Get-ExactMetadataString -Metadata $existingMeta -Name 'component'
    $existingName = Get-ExactMetadataString -Metadata $existingMeta -Name 'name'
    $existingTarget = Get-ExactMetadataString -Metadata $existingMeta -Name 'target'
    $repositoryMatches = $existingMeta -and (Test-OwnershipRepositoryMatch -ExistingRepo $existingRepo -ExpectedRepo $RepoName)
    $repositoryNeedsMigration = $existingMeta -and (Test-OwnershipRepositoryNeedsMigration -ExistingRepo $existingRepo -ExpectedRepo $RepoName)
    $ownershipMatches = $existingMeta `
        -and $repositoryMatches `
        -and $existingComponent -ceq $ExpectedComponent `
        -and $existingName -ceq $ExpectedName `
        -and $existingTarget -ceq $ExpectedTarget
    if ($ExpectedComponent -eq 'agent') {
        $existingId = Get-ExactMetadataString -Metadata $existingMeta -Name 'id'
        $existingAdapter = Get-ExactMetadataString -Metadata $existingMeta -Name 'adapter'
        $ownershipMatches = $ownershipMatches `
            -and $ExpectedId `
            -and $existingId -ceq $ExpectedId `
            -and $ExpectedAdapter `
            -and $existingAdapter -ceq $ExpectedAdapter
    }
    if ($ownershipMatches) {
        $ownedAction = if ($repositoryNeedsMigration) {
            "migrate-update"
        } elseif ($targetExists) {
            "update"
        } else {
            "repair"
        }
        if ($ExpectedComponent -eq 'skill') {
            $contentDigest = $existingMeta.PSObject.Properties |
                Where-Object { $_.Name -ceq 'contentSha256' } |
                Select-Object -First 1
            if (-not $contentDigest) {
                if ($targetExists -and -not (Test-VerifiedLegacySkillWithoutDigest `
                    -ExistingSkillFile $LegacyIdentityPath `
                    -IncomingSkillFile $IncomingIdentityPath `
                    -ExpectedName $ExpectedName `
                    -ExistingRepo $existingRepo `
                    -RepoName $RepoName)) {
                    $ownershipMatches = $false
                    $unverifiedMissingSkillDigest = $true
                } else {
                    $ownedAction = "migrate-update"
                }
            }
        }
        if ($ownershipMatches) {
            return @{ Action = $ownedAction; ExistingMeta = $existingMeta }
        }
    }
    $legacyTargetMatches = $existingMeta `
        -and $repositoryMatches `
        -and $existingComponent -ceq $ExpectedComponent `
        -and $existingName -ceq $ExpectedName `
        -and $LegacyTargets `
        -and $LegacyTargets -ccontains $existingTarget
    if ($ExpectedComponent -eq 'agent') {
        $existingId = Get-ExactMetadataString -Metadata $existingMeta -Name 'id'
        $existingAdapter = Get-ExactMetadataString -Metadata $existingMeta -Name 'adapter'
        $legacyTargetMatches = $legacyTargetMatches `
            -and $ExpectedId `
            -and $existingId -ceq $ExpectedId `
            -and $ExpectedAdapter `
            -and $existingAdapter -ceq $ExpectedAdapter
    }
    if ($legacyTargetMatches) {
        $legacyTargetContentMatches = $ExpectedComponent -ne 'skill' -or -not $targetExists
        if (-not $legacyTargetContentMatches) {
            $contentDigest = $existingMeta.PSObject.Properties | Where-Object { $_.Name -ceq 'contentSha256' } | Select-Object -First 1
            $legacyTargetContentMatches = if ($contentDigest) {
                Test-SkillFrontmatterIdentity `
                    -ExistingSkillFile $LegacyIdentityPath `
                    -IncomingSkillFile $IncomingIdentityPath `
                    -ExpectedName $ExpectedName `
                    -ExistingRepo $existingRepo `
                    -RepoName $RepoName
            } else {
                Test-VerifiedLegacySkillWithoutDigest `
                    -ExistingSkillFile $LegacyIdentityPath `
                    -IncomingSkillFile $IncomingIdentityPath `
                    -ExpectedName $ExpectedName `
                    -ExistingRepo $existingRepo `
                    -RepoName $RepoName
            }
            if (-not $contentDigest -and -not $legacyTargetContentMatches) {
                $unverifiedMissingSkillDigest = $true
            }
        }
        if ($legacyTargetContentMatches) {
            return @{ Action = "migrate-update"; ExistingMeta = $existingMeta }
        }
    }
    if ($ExpectedComponent -eq 'skill' -and (Test-LegacySkillOwnership `
        -ExistingMeta $existingMeta `
        -ExistingSkillFile $LegacyIdentityPath `
        -IncomingSkillFile $IncomingIdentityPath `
        -RepoName $RepoName `
        -ExpectedName $ExpectedName `
        -ExpectedTarget $ExpectedTarget `
        -LegacyTargets $LegacyTargets `
        -UnverifiedMissingDigest ([ref]$unverifiedMissingSkillDigest))) {
        return @{ Action = "migrate-update"; ExistingMeta = $existingMeta }
    }
    if ($Force) { return @{ Action = "force-replace"; ExistingMeta = $existingMeta } }
    if ($unverifiedMissingSkillDigest) {
        throw "Refusing to migrate '$Label' because its metadata has no contentSha256 and its installed content does not match a verified legacy Skill release. Use -Force to overwrite intentionally."
    }
    if ($existingMeta -and $existingRepo -and -not $repositoryMatches) {
        throw "Refusing to replace '$Label' because it was installed from '$existingRepo', not '$RepoName'. Use -Force to overwrite intentionally."
    }
    if ($existingMeta -and $repositoryMatches) {
        $agentIdentity = if ($ExpectedComponent -eq 'agent') { ", id='$ExpectedId', and adapter='$ExpectedAdapter'" } else { "" }
        throw "Refusing to replace '$Label' because its ownership metadata does not match component='$ExpectedComponent', name='$ExpectedName', target='$ExpectedTarget'$agentIdentity. Use -Force to overwrite intentionally."
    }
    throw "Refusing to replace '$Label' because it has no matching CraftRoster metadata. Use -Force to overwrite intentionally."
}

function Get-SkillInstallPlan {
    param(
        [System.IO.DirectoryInfo]$Source,
        [string]$DestinationRoot,
        [string]$TargetName,
        [string[]]$LegacyTargets,
        [string]$RepoName
    )
    $targetPath = Join-Path $DestinationRoot $Source.Name
    if (-not (Test-TargetWithinRoot -TargetPath $targetPath -RootPath $DestinationRoot)) {
        throw "Refusing to write outside install directory: $targetPath"
    }
    $metaPath = Join-Path $targetPath ".skill-meta.json"
    $plan = Get-InstallAction `
        -TargetPath $targetPath `
        -MetaPath $metaPath `
        -Label $Source.Name `
        -RepoName $RepoName `
        -ExpectedComponent "skill" `
        -ExpectedName $Source.Name `
        -ExpectedTarget $TargetName `
        -LegacyTargets $LegacyTargets `
        -LegacyIdentityPath (Join-Path $targetPath "SKILL.md") `
        -IncomingIdentityPath (Join-Path $Source.FullName "SKILL.md")
    $targetExists = Test-Path -LiteralPath $targetPath
    $plan.ObservedTargetExists = [bool]$targetExists
    $plan.ObservedTargetSha256 = $null
    $plan.ObservedTargetSnapshot = $null
    if ($targetExists) {
        if (-not (Test-Path -LiteralPath $targetPath -PathType Container)) {
            throw "Refusing to replace Skill '$($Source.Name)' because its target is not a directory: $targetPath"
        }
        $plan.ObservedTargetSnapshot = Get-SkillDirectorySnapshot -Path $targetPath
        $plan.ObservedTargetSha256 = $plan.ObservedTargetSnapshot.ContentSha256
        $recordedDigest = if ($plan.ExistingMeta) {
            $plan.ExistingMeta.PSObject.Properties | Where-Object { $_.Name -ceq 'contentSha256' } | Select-Object -First 1
        } else { $null }
        if ($recordedDigest -and $plan.Action -in @('update', 'migrate-update') -and
            -not [string]::Equals($recordedDigest.Value, $plan.ObservedTargetSha256, [System.StringComparison]::OrdinalIgnoreCase)) {
            $legacyContentSha256 = Get-SkillContentSha256 `
                -RootPath $targetPath `
                -DigestNamespace 'autoverse-skill-content-v1'
            if ([string]::Equals($recordedDigest.Value, $legacyContentSha256, [System.StringComparison]::OrdinalIgnoreCase)) {
                $plan.Action = 'migrate-update'
            } elseif ($Force) {
                $plan.Action = 'force-replace'
            } else {
                throw "Refusing to update Skill '$($Source.Name)': installed Skill content has changed since the last CraftRoster install. Use -Force to reset it intentionally."
            }
        }
    }
    $plan.IncomingContentSha256 = Get-SkillSourceContentSha256 -RootPath $Source.FullName
    return $plan
}

function Assert-SkillTargetUnchanged {
    param([hashtable]$Plan, [string]$TargetPath, [string]$SkillName)
    $targetExists = Test-Path -LiteralPath $TargetPath
    if ([bool]$Plan.ObservedTargetExists -ne [bool]$targetExists) {
        throw "Refusing to commit Skill '$SkillName' because its target changed while the update was being staged."
    }
    if (-not $targetExists) { return $null }
    if (-not (Test-Path -LiteralPath $TargetPath -PathType Container)) {
        throw "Refusing to commit Skill '$SkillName' because its target is no longer a directory."
    }
    $currentSnapshot = Get-SkillDirectorySnapshot -Path $TargetPath
    if (-not (Test-SkillDirectorySnapshotMatch -Expected $Plan.ObservedTargetSnapshot -Actual $currentSnapshot)) {
        throw "Refusing to commit Skill '$SkillName' because its target changed while the update was being staged."
    }
    return $currentSnapshot
}

function Get-TestOnlySkillFault {
    $mode = [Environment]::GetEnvironmentVariable('CRAFTROSTER_INSTALLER_TEST_MODE', 'Process')
    $acknowledgement = [Environment]::GetEnvironmentVariable('CRAFTROSTER_INSTALLER_TEST_ACK', 'Process')
    $fault = [Environment]::GetEnvironmentVariable('CRAFTROSTER_INSTALLER_TEST_FAULT', 'Process')
    if ($null -eq $mode -and $null -eq $acknowledgement -and $null -eq $fault) { return $null }
    if ($mode -cne 'skill-atomic-swap' -or
        $acknowledgement -cne 'I_UNDERSTAND_THIS_IS_TEST_ONLY' -or
        $fault -cnotin @(
            'after-backup',
            'after-recheck-destination-appears',
            'after-recheck-target-replaced',
            'fresh-post-move-fail',
            'stage-path-collision'
        )) {
        throw "Invalid test-only Skill fault injection configuration."
    }
    return $fault
}

function Write-Utf8JsonFile {
    param([object]$Value, [string]$Path)
    $text = ($Value | ConvertTo-Json -Depth 5) + "`n"
    [System.IO.File]::WriteAllText($Path, $text, [System.Text.UTF8Encoding]::new($false))
}

function Initialize-SkillDirectoryNativeType {
    if ('CraftRosterSkillDirectoryNative' -as [type]) { return }
    Add-Type -TypeDefinition @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
using Microsoft.Win32.SafeHandles;

public static class CraftRosterSkillDirectoryNative
{
    private const uint FileShareRead = 0x00000001;
    private const uint FileShareWrite = 0x00000002;
    private const uint FileShareDelete = 0x00000004;
    private const uint OpenExisting = 3;
    private const uint FileFlagBackupSemantics = 0x02000000;
    private const uint FileFlagOpenReparsePoint = 0x00200000;

    [StructLayout(LayoutKind.Sequential)]
    private struct FileTime
    {
        public uint Low;
        public uint High;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct ByHandleFileInformation
    {
        public uint FileAttributes;
        public FileTime CreationTime;
        public FileTime LastAccessTime;
        public FileTime LastWriteTime;
        public uint VolumeSerialNumber;
        public uint FileSizeHigh;
        public uint FileSizeLow;
        public uint NumberOfLinks;
        public uint FileIndexHigh;
        public uint FileIndexLow;
    }

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafeFileHandle CreateFile(
        string fileName,
        uint desiredAccess,
        uint shareMode,
        IntPtr securityAttributes,
        uint creationDisposition,
        uint flagsAndAttributes,
        IntPtr templateFile
    );

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetFileInformationByHandle(
        SafeFileHandle handle,
        out ByHandleFileInformation information
    );

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true, EntryPoint = "CreateDirectoryW")]
    private static extern bool CreateDirectory(string path, IntPtr securityAttributes);

    public static string GetIdentity(string path)
    {
        using (SafeFileHandle handle = CreateFile(
            path,
            0,
            FileShareRead | FileShareWrite | FileShareDelete,
            IntPtr.Zero,
            OpenExisting,
            FileFlagBackupSemantics | FileFlagOpenReparsePoint,
            IntPtr.Zero
        ))
        {
            if (handle.IsInvalid)
                throw new Win32Exception(Marshal.GetLastWin32Error());

            ByHandleFileInformation information;
            if (!GetFileInformationByHandle(handle, out information))
                throw new Win32Exception(Marshal.GetLastWin32Error());

            return string.Format(
                "{0:x8}:{1:x8}{2:x8}",
                information.VolumeSerialNumber,
                information.FileIndexHigh,
                information.FileIndexLow
            );
        }
    }

    public static void CreateDirectoryExclusive(string path)
    {
        if (!CreateDirectory(path, IntPtr.Zero))
            throw new Win32Exception(Marshal.GetLastWin32Error());
    }
}
'@
}

function Get-SkillDirectoryIdentity {
    param([string]$Path)
    Initialize-SkillDirectoryNativeType
    return [CraftRosterSkillDirectoryNative]::GetIdentity([System.IO.Path]::GetFullPath($Path))
}

function New-ExclusiveSkillTransactionDirectory {
    param([string]$Path)
    Initialize-SkillDirectoryNativeType
    [CraftRosterSkillDirectoryNative]::CreateDirectoryExclusive([System.IO.Path]::GetFullPath($Path))
}

function New-SkillTransactionToken {
    $bytes = New-Object byte[] 32
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
        return (($bytes | ForEach-Object { $_.ToString('x2') }) -join '')
    } finally {
        $generator.Dispose()
    }
}

function Get-SkillOwnershipMetadataSnapshot {
    param([string]$RootPath)
    $metadataPath = Join-Path $RootPath '.skill-meta.json'
    if (-not (Test-Path -LiteralPath $metadataPath)) {
        return @{ Exists = $false; Sha256 = $null }
    }
    if (-not (Test-Path -LiteralPath $metadataPath -PathType Leaf)) {
        throw "Refusing to snapshot non-file Skill ownership metadata: $metadataPath"
    }
    $metadataItem = Get-Item -Force -LiteralPath $metadataPath
    if (($metadataItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
        throw "Refusing to snapshot linked Skill ownership metadata: $metadataPath"
    }
    return @{ Exists = $true; Sha256 = Get-FileSha256 -Path $metadataPath }
}

function Get-SkillDirectorySnapshot {
    param(
        [string]$Path,
        [string[]]$ExcludedRelativePaths = @()
    )
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        throw "Cannot snapshot missing Skill directory: $Path"
    }
    return @{
        Identity = Get-SkillDirectoryIdentity -Path $Path
        ContentSha256 = Get-SkillContentSha256 -RootPath $Path -ExcludedRelativePaths $ExcludedRelativePaths
        OwnershipMetadata = Get-SkillOwnershipMetadataSnapshot -RootPath $Path
    }
}

function Test-SkillDirectorySnapshotMatch {
    param([hashtable]$Expected, [hashtable]$Actual)
    if (-not $Expected -or -not $Actual) { return $false }
    if ($Expected.Identity -cne $Actual.Identity) { return $false }
    if (-not [string]::Equals($Expected.ContentSha256, $Actual.ContentSha256, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $false
    }
    if ([bool]$Expected.OwnershipMetadata.Exists -ne [bool]$Actual.OwnershipMetadata.Exists) { return $false }
    if ($Expected.OwnershipMetadata.Exists -and
        -not [string]::Equals($Expected.OwnershipMetadata.Sha256, $Actual.OwnershipMetadata.Sha256, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $false
    }
    return $true
}

function Test-SkillDirectoryMatchesSnapshot {
    param(
        [string]$Path,
        [hashtable]$ExpectedSnapshot,
        [string[]]$ExcludedRelativePaths = @()
    )
    try {
        $actual = Get-SkillDirectorySnapshot -Path $Path -ExcludedRelativePaths $ExcludedRelativePaths
        return Test-SkillDirectorySnapshotMatch -Expected $ExpectedSnapshot -Actual $actual
    } catch {
        return $false
    }
}

function Write-SkillTransactionMarker {
    param([string]$Path, [string]$Token)
    $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
    try {
        $bytes = [System.Text.UTF8Encoding]::new($false).GetBytes($Token)
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Flush($true)
    } finally {
        $stream.Dispose()
    }
}

function Test-SkillTransactionDirectory {
    param(
        [string]$Path,
        [string]$MarkerName,
        [string]$TransactionToken,
        [hashtable]$ExpectedSnapshot
    )
    try {
        if (-not (Test-Path -LiteralPath $Path -PathType Container)) { return $false }
        $rootItem = Get-Item -Force -LiteralPath $Path
        if (($rootItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { return $false }
        $markerPath = Join-Path $Path $MarkerName
        if (-not (Test-Path -LiteralPath $markerPath -PathType Leaf)) { return $false }
        $markerItem = Get-Item -Force -LiteralPath $markerPath
        if (($markerItem.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) { return $false }
        if (([System.IO.File]::ReadAllText($markerPath, [System.Text.Encoding]::UTF8)) -cne $TransactionToken) { return $false }
        return Test-SkillDirectoryMatchesSnapshot `
            -Path $Path `
            -ExpectedSnapshot $ExpectedSnapshot `
            -ExcludedRelativePaths @($MarkerName)
    } catch {
        return $false
    }
}

function Remove-VerifiedSkillDirectory {
    param(
        [string]$Path,
        [string]$QuarantinePath,
        [hashtable]$ExpectedSnapshot,
        [string]$MarkerName,
        [string]$TransactionToken
    )
    $isTransactionDirectory = [bool]$MarkerName
    $matchesBeforeMove = if ($isTransactionDirectory) {
        Test-SkillTransactionDirectory `
            -Path $Path `
            -MarkerName $MarkerName `
            -TransactionToken $TransactionToken `
            -ExpectedSnapshot $ExpectedSnapshot
    } else {
        Test-SkillDirectoryMatchesSnapshot -Path $Path -ExpectedSnapshot $ExpectedSnapshot
    }
    if (-not $matchesBeforeMove) {
        throw "Manual recovery required: refusing to delete an unrecognized directory at '$Path'."
    }
    if (Test-Path -LiteralPath $QuarantinePath) {
        throw "Manual recovery required: cleanup quarantine is occupied; preserved '$Path' and '$QuarantinePath'."
    }

    [System.IO.Directory]::Move($Path, $QuarantinePath)
    $matchesAfterMove = if ($isTransactionDirectory) {
        Test-SkillTransactionDirectory `
            -Path $QuarantinePath `
            -MarkerName $MarkerName `
            -TransactionToken $TransactionToken `
            -ExpectedSnapshot $ExpectedSnapshot
    } else {
        Test-SkillDirectoryMatchesSnapshot -Path $QuarantinePath -ExpectedSnapshot $ExpectedSnapshot
    }
    if (-not $matchesAfterMove) {
        throw "Manual recovery required: cleanup identity verification failed; preserved the directory at '$QuarantinePath'."
    }
    Remove-Item -Recurse -Force -LiteralPath $QuarantinePath
}

function Install-AtomicSkillDirectory {
    param(
        [System.IO.DirectoryInfo]$Source,
        [string]$DestinationRoot,
        [string]$TargetPath,
        [hashtable]$Plan,
        [hashtable]$Metadata
    )
    New-Item -ItemType Directory -Force -Path $DestinationRoot | Out-Null
    $suffix = [Guid]::NewGuid().ToString('N')
    $transactionToken = New-SkillTransactionToken
    # Keep transaction-only names short enough for Windows PowerShell 5.1,
    # which cannot address paths beyond MAX_PATH even when newer runtimes can.
    $markerName = '.cr-t-' + $suffix
    $stagePath = Join-Path $DestinationRoot ('.cr-s-' + $suffix)
    $backupPath = Join-Path $DestinationRoot ('.cr-b-' + $suffix)
    $failedPath = Join-Path $DestinationRoot ('.cr-f-' + $suffix)
    $stageCleanupPath = Join-Path $DestinationRoot ('.cr-cs-' + $suffix)
    $backupCleanupPath = Join-Path $DestinationRoot ('.cr-cb-' + $suffix)
    $failedCleanupPath = Join-Path $DestinationRoot ('.cr-cf-' + $suffix)
    foreach ($path in @($stagePath, $backupPath, $failedPath, $stageCleanupPath, $backupCleanupPath, $failedCleanupPath)) {
        if (-not (Test-TargetWithinRoot -TargetPath $path -RootPath $DestinationRoot)) {
            throw "Refusing to use an atomic Skill path outside the install directory: $path"
        }
    }
    $fault = Get-TestOnlySkillFault
    $stageSnapshot = $null
    $backupSnapshot = $null
    $backupMoved = $false
    $backupVerified = $false
    $committed = $false
    $failureMessage = $null
    try {
        if ($fault -ceq 'stage-path-collision') {
            $null = New-Item -ItemType Directory -Path $stagePath
            [System.IO.File]::WriteAllText(
                (Join-Path $stagePath 'CRAFTROSTER-STAGE-NEWCOMER.txt'),
                "test-only stage newcomer that must be preserved`n",
                [System.Text.UTF8Encoding]::new($false)
            )
        }
        try {
            New-ExclusiveSkillTransactionDirectory -Path $stagePath
        } catch {
            if (Test-Path -LiteralPath $stagePath) {
                throw "Manual recovery required: the atomic Skill stage path is occupied by an unrecognized newcomer at '$stagePath'."
            }
            throw
        }

        $stageIdentity = Get-SkillDirectoryIdentity -Path $stagePath
        Write-SkillTransactionMarker -Path (Join-Path $stagePath $markerName) -Token $transactionToken
        $stageSnapshot = Get-SkillDirectorySnapshot -Path $stagePath -ExcludedRelativePaths @($markerName)
        if ($stageSnapshot.Identity -cne $stageIdentity) {
            throw "Manual recovery required: the atomic Skill stage identity changed during creation at '$stagePath'."
        }

        # Copy into the exclusively-created directory so Copy-Item can never
        # adopt a pre-existing stage path. If copying fails mid-stream, the
        # last known snapshot will not match and cleanup fails closed.
        $stageSnapshot = $null
        foreach ($sourceItem in @(Get-ChildItem -Force -LiteralPath $Source.FullName)) {
            Copy-Item -Recurse -Force -LiteralPath $sourceItem.FullName -Destination $stagePath
        }
        $stageSnapshot = Get-SkillDirectorySnapshot -Path $stagePath -ExcludedRelativePaths @($markerName)
        if ($stageSnapshot.Identity -cne $stageIdentity -or
            -not (Test-SkillTransactionDirectory -Path $stagePath -MarkerName $markerName -TransactionToken $transactionToken -ExpectedSnapshot $stageSnapshot)) {
            throw "Manual recovery required: the atomic Skill stage changed while content was being copied at '$stagePath'."
        }
        $stagedDigest = $stageSnapshot.ContentSha256
        if (-not [string]::Equals($Plan.IncomingContentSha256, $stagedDigest, [System.StringComparison]::OrdinalIgnoreCase)) {
            throw "Skill source changed while '$($Source.Name)' was being staged."
        }
        $Metadata.contentSha256 = $stagedDigest
        Write-Utf8JsonFile -Value $Metadata -Path (Join-Path $stagePath '.skill-meta.json')
        $stageSnapshot = Get-SkillDirectorySnapshot -Path $stagePath -ExcludedRelativePaths @($markerName)
        if ($stageSnapshot.Identity -cne $stageIdentity -or
            -not (Test-SkillTransactionDirectory -Path $stagePath -MarkerName $markerName -TransactionToken $transactionToken -ExpectedSnapshot $stageSnapshot)) {
            throw "Manual recovery required: the atomic Skill stage changed while metadata was being written at '$stagePath'."
        }

        # This is the last read before the target rename. A concurrent content
        # or metadata edit must fail without deleting the user's current target.
        $preMoveTargetSnapshot = Assert-SkillTargetUnchanged -Plan $Plan -TargetPath $TargetPath -SkillName $Source.Name
        if ($Plan.ObservedTargetExists) {
            if ($fault -ceq 'after-recheck-target-replaced') {
                [System.IO.Directory]::Move($TargetPath, $failedPath)
                $null = New-Item -ItemType Directory -Path $TargetPath
                [System.IO.File]::WriteAllText(
                    (Join-Path $TargetPath 'CRAFTROSTER-REPLACEMENT-NEWCOMER.txt'),
                    "test-only replacement newcomer that must be preserved`n",
                    [System.Text.UTF8Encoding]::new($false)
                )
            }
            [System.IO.Directory]::Move($TargetPath, $backupPath)
            $backupMoved = $true
            if (-not (Test-SkillDirectoryMatchesSnapshot -Path $backupPath -ExpectedSnapshot $preMoveTargetSnapshot)) {
                throw "Manual recovery required: the directory moved to '$backupPath' does not match the pre-move Skill identity, content, and ownership metadata; it was preserved."
            }
            $backupSnapshot = $preMoveTargetSnapshot
            $backupVerified = $true
        }
        if ($backupVerified -and $fault -ceq 'after-backup') {
            throw "Injected test-only failure after Skill backup."
        }
        if ($fault -ceq 'after-recheck-destination-appears') {
            $null = New-Item -ItemType Directory -Path $TargetPath
            [System.IO.File]::WriteAllText(
                (Join-Path $TargetPath 'CRAFTROSTER-NEWCOMER.txt'),
                "test-only newcomer that must be preserved`n",
                [System.Text.UTF8Encoding]::new($false)
            )
        }
        [System.IO.Directory]::Move($stagePath, $TargetPath)
        if (-not (Test-SkillTransactionDirectory -Path $TargetPath -MarkerName $markerName -TransactionToken $transactionToken -ExpectedSnapshot $stageSnapshot)) {
            throw "Skill commit identity verification failed for '$($Source.Name)'."
        }
        if (-not $Plan.ObservedTargetExists -and $fault -ceq 'fresh-post-move-fail') {
            throw "Injected test-only failure after fresh Skill stage move."
        }
        Remove-Item -Force -LiteralPath (Join-Path $TargetPath $markerName)
        $committed = $true
        if ($backupMoved) {
            try {
                Remove-VerifiedSkillDirectory `
                    -Path $backupPath `
                    -QuarantinePath $backupCleanupPath `
                    -ExpectedSnapshot $backupSnapshot
            } catch {
                throw "Skill committed but backup cleanup failed; inspect the retained backup at '$backupPath'. $($_.Exception.Message)"
            }
            $backupMoved = $false
        }
    } catch {
        $originalFailure = $_
        $recoveryFailure = $null
        if (-not $committed -and $backupMoved) {
            if (-not $backupVerified -or -not (Test-Path -LiteralPath $backupPath)) {
                $recoveryFailure = "Manual recovery required: the unverified directory at '$backupPath' was preserved and was not treated as the original Skill backup."
            } else {
                try {
                    if (Test-Path -LiteralPath $TargetPath) {
                        if (-not (Test-SkillTransactionDirectory -Path $TargetPath -MarkerName $markerName -TransactionToken $transactionToken -ExpectedSnapshot $stageSnapshot)) {
                            throw "Manual recovery required: the Skill destination is occupied by an unrecognized newcomer at '$TargetPath'; the original backup was preserved at '$backupPath'."
                        }
                        [System.IO.Directory]::Move($TargetPath, $failedPath)
                        if (-not (Test-SkillTransactionDirectory -Path $failedPath -MarkerName $markerName -TransactionToken $transactionToken -ExpectedSnapshot $stageSnapshot)) {
                            throw "Manual recovery required: the failed Skill commit could not be safely quarantined; the original backup was preserved at '$backupPath'."
                        }
                    }
                    [System.IO.Directory]::Move($backupPath, $TargetPath)
                    if (-not (Test-SkillDirectoryMatchesSnapshot -Path $TargetPath -ExpectedSnapshot $backupSnapshot)) {
                        throw "Manual recovery required: the restored Skill does not match the original directory identity, content, and ownership metadata."
                    }
                    $backupMoved = $false
                    if (Test-Path -LiteralPath $failedPath) {
                        Remove-VerifiedSkillDirectory `
                            -Path $failedPath `
                            -QuarantinePath $failedCleanupPath `
                            -ExpectedSnapshot $stageSnapshot `
                            -MarkerName $markerName `
                            -TransactionToken $transactionToken
                    }
                } catch {
                    $recoveryFailure = $_.Exception.Message
                }
            }
        } elseif (-not $committed -and -not $Plan.ObservedTargetExists -and (Test-Path -LiteralPath $TargetPath)) {
            try {
                if (-not $stageSnapshot -or
                    -not (Test-SkillTransactionDirectory -Path $TargetPath -MarkerName $markerName -TransactionToken $transactionToken -ExpectedSnapshot $stageSnapshot)) {
                    throw "Manual recovery required: a fresh Skill install failed and the destination is not provably owned by this transaction; preserved '$TargetPath'."
                }
                [System.IO.Directory]::Move($TargetPath, $failedPath)
                if (-not (Test-SkillTransactionDirectory -Path $failedPath -MarkerName $markerName -TransactionToken $transactionToken -ExpectedSnapshot $stageSnapshot)) {
                    throw "Manual recovery required: the failed fresh Skill install could not be safely quarantined; preserved '$failedPath'."
                }
                Remove-VerifiedSkillDirectory `
                    -Path $failedPath `
                    -QuarantinePath $failedCleanupPath `
                    -ExpectedSnapshot $stageSnapshot `
                    -MarkerName $markerName `
                    -TransactionToken $transactionToken
            } catch {
                $recoveryFailure = $_.Exception.Message
            }
        }
        if ($recoveryFailure) {
            $failureMessage = "Atomic Skill update failed and recovery also failed: $($originalFailure.Exception.Message) Recovery error: $recoveryFailure"
            throw $failureMessage
        }
        $failureMessage = $originalFailure.Exception.Message
        throw $originalFailure
    } finally {
        if (Test-Path -LiteralPath $stagePath) {
            if (-not $stageSnapshot -or
                -not (Test-SkillTransactionDirectory -Path $stagePath -MarkerName $markerName -TransactionToken $transactionToken -ExpectedSnapshot $stageSnapshot)) {
                $cleanupMessage = "Manual recovery required: refusing to clean an unrecognized or changed atomic Skill stage at '$stagePath'."
                if ($failureMessage) {
                    throw "$failureMessage Cleanup error: $cleanupMessage"
                }
                throw $cleanupMessage
            }
            Remove-VerifiedSkillDirectory `
                -Path $stagePath `
                -QuarantinePath $stageCleanupPath `
                -ExpectedSnapshot $stageSnapshot `
                -MarkerName $markerName `
                -TransactionToken $transactionToken
        }
    }
}

function Install-Skill {
    param([System.IO.DirectoryInfo]$Source, [string]$DestinationRoot, [string]$TargetName, [string[]]$LegacyTargets, [string]$RepoName, [string]$BranchName, [hashtable]$Plan)
    $targetPath = Join-Path $DestinationRoot $Source.Name
    if (-not $Plan) { $Plan = Get-SkillInstallPlan -Source $Source -DestinationRoot $DestinationRoot -TargetName $TargetName -LegacyTargets $LegacyTargets -RepoName $RepoName }
    if ($DryRun) { Write-Host "DRY-RUN $($plan.Action) Skill $($Source.Name) -> $targetPath"; return }

    $now = (Get-Date).ToUniversalTime().ToString("o")
    $installedAt = if ($plan.ExistingMeta -and $plan.ExistingMeta.installedAt) { $plan.ExistingMeta.installedAt } else { $now }
    $metadata = @{
        source = $script:SourceKind; repo = $RepoName; branch = $BranchName; component = "skill"
        name = $Source.Name; target = $TargetName; installedAt = $installedAt; updatedAt = $now
    }
    Install-AtomicSkillDirectory -Source $Source -DestinationRoot $DestinationRoot -TargetPath $targetPath -Plan $plan -Metadata $metadata
    Write-Success "$($plan.Action) Skill $($Source.Name) -> $targetPath"
}

function Test-SkillInstall {
    param([System.IO.DirectoryInfo]$Source, [string]$DestinationRoot, [string]$TargetName, [string[]]$LegacyTargets, [string]$RepoName)
    Get-SkillInstallPlan -Source $Source -DestinationRoot $DestinationRoot -TargetName $TargetName -LegacyTargets $LegacyTargets -RepoName $RepoName | Out-Null
}

function Install-AtomicFile {
    param([string]$SourcePath, [string]$DestinationPath, [string]$Label)
    $parent = Split-Path -Parent $DestinationPath
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    $tempPath = Join-Path $parent (".craftroster-" + [Guid]::NewGuid().ToString('N') + ".tmp")
    $backupPath = Join-Path $parent (".craftroster-replaced-" + [Guid]::NewGuid().ToString('N') + ".bak")
    try {
        Copy-Item -LiteralPath $SourcePath -Destination $tempPath
        Assert-RegularInstallLeaf -Path $DestinationPath -Label $Label
        if (Test-Path -LiteralPath $DestinationPath -PathType Leaf) {
            [System.IO.File]::Replace($tempPath, $DestinationPath, $backupPath, $true)
            Remove-Item -Force -LiteralPath $backupPath -ErrorAction SilentlyContinue
        } else {
            [System.IO.File]::Move($tempPath, $DestinationPath)
        }
    } finally {
        if (Test-Path -LiteralPath $tempPath) { Remove-Item -Force -LiteralPath $tempPath }
    }
}

function Write-AtomicUtf8Text {
    param([string]$DestinationPath, [string]$Text, [string]$Label)
    $parent = Split-Path -Parent $DestinationPath
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    $tempPath = Join-Path $parent (".craftroster-" + [Guid]::NewGuid().ToString('N') + ".tmp")
    $backupPath = Join-Path $parent (".craftroster-replaced-" + [Guid]::NewGuid().ToString('N') + ".bak")
    try {
        [System.IO.File]::WriteAllText($tempPath, $Text, [System.Text.UTF8Encoding]::new($false))
        Assert-RegularInstallLeaf -Path $DestinationPath -Label $Label
        if (Test-Path -LiteralPath $DestinationPath -PathType Leaf) {
            [System.IO.File]::Replace($tempPath, $DestinationPath, $backupPath, $true)
            Remove-Item -Force -LiteralPath $backupPath -ErrorAction SilentlyContinue
        } else {
            [System.IO.File]::Move($tempPath, $DestinationPath)
        }
    } finally {
        if (Test-Path -LiteralPath $tempPath) { Remove-Item -Force -LiteralPath $tempPath }
    }
}

function Get-AgentInstallPlan {
    param(
        [string]$TargetPath,
        [string]$DestinationRoot,
        [string]$AgentId,
        [string]$RuntimeName,
        [string]$Platform,
        [string]$TargetName,
        [string[]]$LegacyTargets,
        [string]$RepoName
    )
    if (-not (Test-TargetWithinRoot -TargetPath $TargetPath -RootPath $DestinationRoot)) {
        throw "Refusing to write outside install directory: $TargetPath"
    }
    $metaPath = "$TargetPath.craftroster.json"
    $legacyMetaPath = "$TargetPath.autoverse.json"
    Assert-RegularInstallLeaf -Path $TargetPath -Label "Agent"
    Assert-RegularInstallLeaf -Path $metaPath -Label "Agent metadata"
    Assert-RegularInstallLeaf -Path $legacyMetaPath -Label "legacy Agent metadata"

    $ownershipMetaPath = $metaPath
    $usingLegacySidecar = $false
    if (-not (Test-Path -LiteralPath $metaPath) -and (Test-Path -LiteralPath $legacyMetaPath -PathType Leaf)) {
        $ownershipMetaPath = $legacyMetaPath
        $usingLegacySidecar = $true
    }
    $plan = Get-InstallAction `
        -TargetPath $TargetPath `
        -MetaPath $ownershipMetaPath `
        -Label $AgentId `
        -RepoName $RepoName `
        -ExpectedComponent "agent" `
        -ExpectedName $RuntimeName `
        -ExpectedTarget $TargetName `
        -ExpectedId $AgentId `
        -ExpectedAdapter $Platform `
        -LegacyTargets $LegacyTargets
    if (-not $usingLegacySidecar -and $plan.Action -ne 'force-replace' -and (Test-Path -LiteralPath $legacyMetaPath -PathType Leaf)) {
        try {
            $legacyPlan = Get-InstallAction `
                -TargetPath $TargetPath `
                -MetaPath $legacyMetaPath `
                -Label $AgentId `
                -RepoName $RepoName `
                -ExpectedComponent "agent" `
                -ExpectedName $RuntimeName `
                -ExpectedTarget $TargetName `
                -ExpectedId $AgentId `
                -ExpectedAdapter $Platform `
                -LegacyTargets $LegacyTargets
            if ($legacyPlan.Action -in @('update', 'repair', 'migrate-update')) {
                $usingLegacySidecar = $true
            }
        } catch {
            # A second, unrecognized sidecar is never deleted automatically.
        }
    }
    $plan.MetaPath = $metaPath
    if ($usingLegacySidecar -and $plan.Action -in @("update", "repair", "migrate-update")) {
        $plan.Action = "migrate-update"
        $plan.LegacyMetaPath = $legacyMetaPath
        $plan.LegacyMetaSha256 = Get-FileSha256 -Path $legacyMetaPath
    }
    return $plan
}

function Install-AgentProfile {
    param([System.IO.FileInfo]$Source, [string]$RuntimeName, [string]$AgentId, [string]$Platform, [string]$OutputSuffix, [string]$DestinationRoot, [string]$TargetName, [string[]]$LegacyTargets, [string]$RepoName, [string]$BranchName)
    $targetPath = Join-Path $DestinationRoot ($RuntimeName + $OutputSuffix)
    $plan = Get-AgentInstallPlan `
        -TargetPath $targetPath `
        -DestinationRoot $DestinationRoot `
        -AgentId $AgentId `
        -RuntimeName $RuntimeName `
        -Platform $Platform `
        -TargetName $TargetName `
        -LegacyTargets $LegacyTargets `
        -RepoName $RepoName
    $metaPath = $plan.MetaPath
    if ($DryRun) { Write-Host "DRY-RUN $($plan.Action) Agent $AgentId -> $targetPath"; return }

    $now = (Get-Date).ToUniversalTime().ToString("o")
    $installedAt = if ($plan.ExistingMeta -and $plan.ExistingMeta.installedAt) { $plan.ExistingMeta.installedAt } else { $now }
    $metadataText = @{
        source = $script:SourceKind; repo = $RepoName; branch = $BranchName; component = "agent"
        id = $AgentId; name = $RuntimeName; adapter = $Platform; target = $TargetName
        installedAt = $installedAt; updatedAt = $now
    } | ConvertTo-Json -Depth 3
    if (Test-Path -LiteralPath $targetPath -PathType Leaf) {
        Install-AtomicFile -SourcePath $Source.FullName -DestinationPath $targetPath -Label "Agent"
        Write-AtomicUtf8Text -DestinationPath $metaPath -Text ($metadataText + "`n") -Label "Agent metadata"
    } else {
        Write-AtomicUtf8Text -DestinationPath $metaPath -Text ($metadataText + "`n") -Label "Agent metadata"
        Install-AtomicFile -SourcePath $Source.FullName -DestinationPath $targetPath -Label "Agent"
    }
    if ($plan.LegacyMetaPath) {
        Assert-RegularInstallLeaf -Path $plan.LegacyMetaPath -Label "legacy Agent metadata"
        if (-not (Test-Path -LiteralPath $plan.LegacyMetaPath -PathType Leaf) -or
            (Get-FileSha256 -Path $plan.LegacyMetaPath) -cne $plan.LegacyMetaSha256) {
            throw "Agent $AgentId was upgraded, but its legacy ownership sidecar changed and was preserved at '$($plan.LegacyMetaPath)'."
        }
        Remove-Item -Force -LiteralPath $plan.LegacyMetaPath
    }
    Write-Success "$($plan.Action) Agent $AgentId -> $targetPath"
}

function Test-AgentProfileInstall {
    param([System.IO.FileInfo]$Source, [string]$RuntimeName, [string]$AgentId, [string]$Platform, [string]$OutputSuffix, [string]$DestinationRoot, [string]$TargetName, [string[]]$LegacyTargets, [string]$RepoName)
    $targetPath = Join-Path $DestinationRoot ($RuntimeName + $OutputSuffix)
    Get-AgentInstallPlan `
        -TargetPath $targetPath `
        -DestinationRoot $DestinationRoot `
        -AgentId $AgentId `
        -RuntimeName $RuntimeName `
        -Platform $Platform `
        -TargetName $TargetName `
        -LegacyTargets $LegacyTargets `
        -RepoName $RepoName | Out-Null
}

function Get-AutoDelegationGuidance {
    param([string]$RepoRoot)
    $guidancePath = Join-Path $RepoRoot "skills\subagent-architecture\references\global-auto-delegation.md"
    if (-not (Test-Path -LiteralPath $guidancePath -PathType Leaf)) {
        throw "Auto-delegation guidance is missing from the archive: $guidancePath"
    }
    $guidance = [System.IO.File]::ReadAllText($guidancePath).Trim()
    if (-not $guidance) { throw "Auto-delegation guidance is empty: $guidancePath" }
    if ($guidance.Contains("'''")) { throw "Auto-delegation guidance cannot contain a TOML multiline literal delimiter." }
    return $guidance
}

function Assert-RegularInstallLeaf {
    param([string]$Path, [string]$Label)
    $item = Get-Item -Force -LiteralPath $Path -ErrorAction SilentlyContinue
    if (-not $item) { return }
    if ($item.PSIsContainer -or (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)) {
        throw "Refusing to replace a non-regular or linked $Label file: $Path"
    }
}

function Assert-RegularConfigFile {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) { return }
    $item = Get-Item -Force -LiteralPath $Path
    if ($item.PSIsContainer -or (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0)) {
        throw "Refusing to replace a non-regular or linked config file: $Path"
    }
}

function Get-FileSha256 {
    param([string]$Path)
    $stream = [System.IO.File]::OpenRead($Path)
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        return ([System.BitConverter]::ToString($sha.ComputeHash($stream))).Replace('-', '')
    } finally {
        $sha.Dispose()
        $stream.Dispose()
    }
}

function Assert-StrictJsonText {
    param([string]$Text, [string]$Path)
    $state = @{ Text = $Text; Index = 0; Length = $Text.Length }
    $layout = @{
        RootOpen = -1
        RootClose = -1
        InstructionsArrayStart = -1
        InstructionsArrayEnd = -1
        HasInstructions = $false
        Instructions = @()
    }

    function Throw-StrictJsonError {
        param([string]$Reason)
        throw "Refusing to rewrite OpenCode config because $Path is not strict JSON: $Reason"
    }

    function Skip-JsonWhitespace {
        while ($state.Index -lt $state.Length -and " `t`r`n".IndexOf($state.Text[$state.Index]) -ge 0) {
            $state.Index = $state.Index + 1
        }
    }

    function Read-JsonString {
        if ($state.Index -ge $state.Length -or $state.Text[$state.Index] -ne '"') {
            Throw-StrictJsonError "expected a string at offset $($state.Index)"
        }
        $start = $state.Index
        $state.Index = $state.Index + 1
        while ($state.Index -lt $state.Length) {
            $character = $state.Text[$state.Index]
            $codePoint = [int][char]$character
            $state.Index = $state.Index + 1
            if ($character -eq '"') {
                $token = $state.Text.Substring($start, $state.Index - $start)
                try { $value = ConvertFrom-Json -InputObject $token @JsonStringOptions } catch {
                    Throw-StrictJsonError "invalid string at offset $start"
                }
                return @{ Type = "string"; Value = [string]$value; Start = $start; End = $state.Index }
            }
            if ($codePoint -lt 0x20) {
                Throw-StrictJsonError "unescaped control character in a string at offset $($state.Index - 1)"
            }
            if ($character -ne '\') { continue }
            if ($state.Index -ge $state.Length) { Throw-StrictJsonError "unfinished escape at offset $($state.Index - 1)" }
            $escape = $state.Text[$state.Index]
            $state.Index = $state.Index + 1
            if ('"\/bfnrt'.IndexOf($escape) -ge 0) { continue }
            if ($escape -ne 'u' -or $state.Index + 4 -gt $state.Length) {
                Throw-StrictJsonError "invalid escape at offset $($state.Index - 2)"
            }
            $hex = $state.Text.Substring($state.Index, 4)
            if ($hex -notmatch '\A[0-9A-Fa-f]{4}\z') {
                Throw-StrictJsonError "invalid Unicode escape at offset $($state.Index - 2)"
            }
            $state.Index = $state.Index + 4
        }
        Throw-StrictJsonError "unterminated string at offset $start"
    }

    function Read-JsonNumber {
        $start = $state.Index
        $match = [regex]::Match($state.Text.Substring($state.Index), '\A-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?')
        if (-not $match.Success) { Throw-StrictJsonError "invalid number at offset $start" }
        $state.Index = $state.Index + $match.Length
        if ($state.Index -lt $state.Length) {
            $next = $state.Text[$state.Index]
            if (" `t`r`n,]}".IndexOf($next) -lt 0) {
                Throw-StrictJsonError "invalid number terminator at offset $($state.Index)"
            }
        }
        return @{ Type = "number"; Start = $start; End = $state.Index }
    }

    function Read-JsonLiteral {
        param([string]$Literal, [string]$Type)
        $start = $state.Index
        if ($state.Index + $Literal.Length -gt $state.Length -or
            $state.Text.Substring($state.Index, $Literal.Length) -cne $Literal) {
            Throw-StrictJsonError "invalid $Type at offset $start"
        }
        $state.Index = $state.Index + $Literal.Length
        return @{ Type = $Type; Start = $start; End = $state.Index }
    }

    function Read-JsonArray {
        param([int]$Depth)
        $start = $state.Index
        $state.Index = $state.Index + 1
        $items = [System.Collections.ArrayList]::new()
        Skip-JsonWhitespace
        if ($state.Index -lt $state.Length -and $state.Text[$state.Index] -eq ']') {
            $state.Index = $state.Index + 1
            return @{ Type = "array"; Start = $start; End = $state.Index; Items = $items }
        }
        while ($true) {
            $item = Read-JsonValue -Depth ($Depth + 1)
            $null = $items.Add($item)
            Skip-JsonWhitespace
            if ($state.Index -lt $state.Length -and $state.Text[$state.Index] -eq ']') {
                $state.Index = $state.Index + 1
                return @{ Type = "array"; Start = $start; End = $state.Index; Items = $items }
            }
            if ($state.Index -ge $state.Length -or $state.Text[$state.Index] -ne ',') {
                Throw-StrictJsonError "expected a comma in an array at offset $($state.Index)"
            }
            $state.Index = $state.Index + 1
            Skip-JsonWhitespace
        }
    }

    function Read-JsonObject {
        param([int]$Depth)
        $start = $state.Index
        $state.Index = $state.Index + 1
        $keys = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::Ordinal)
        Skip-JsonWhitespace
        if ($state.Index -lt $state.Length -and $state.Text[$state.Index] -eq '}') {
            $state.Index = $state.Index + 1
            if ($Depth -eq 0) { $layout.RootOpen = $start; $layout.RootClose = $state.Index - 1 }
            return @{ Type = "object"; Start = $start; End = $state.Index }
        }
        while ($true) {
            $keyNode = Read-JsonString
            $key = [string]$keyNode.Value
            if (-not $keys.Add($key)) { Throw-StrictJsonError "duplicate key '$key'" }
            if ($Depth -eq 0 -and [string]::Equals($key, "instructions", [System.StringComparison]::OrdinalIgnoreCase) -and
                -not [string]::Equals($key, "instructions", [System.StringComparison]::Ordinal)) {
                Throw-StrictJsonError "case-conflicting Instructions key"
            }
            Skip-JsonWhitespace
            if ($state.Index -ge $state.Length -or $state.Text[$state.Index] -ne ':') {
                Throw-StrictJsonError "expected a colon after key '$key'"
            }
            $state.Index = $state.Index + 1
            Skip-JsonWhitespace
            $value = Read-JsonValue -Depth ($Depth + 1)
            if ($Depth -eq 0) {
                $layout.RootOpen = $start
                if ([string]::Equals($key, "instructions", [System.StringComparison]::Ordinal)) {
                    if ($value.Type -ne "array") { Throw-StrictJsonError "instructions is not an array" }
                    $instructionValues = @()
                    foreach ($item in $value.Items) {
                        if ($item.Type -ne "string") { Throw-StrictJsonError "instructions contains a non-string value" }
                        $instructionValues += [string]$item.Value
                    }
                    $layout.HasInstructions = $true
                    $layout.Instructions = $instructionValues
                    $layout.InstructionsArrayStart = $value.Start
                    $layout.InstructionsArrayEnd = $value.End - 1
                }
            }
            Skip-JsonWhitespace
            if ($state.Index -lt $state.Length -and $state.Text[$state.Index] -eq '}') {
                $state.Index = $state.Index + 1
                if ($Depth -eq 0) { $layout.RootClose = $state.Index - 1 }
                return @{ Type = "object"; Start = $start; End = $state.Index }
            }
            if ($state.Index -ge $state.Length -or $state.Text[$state.Index] -ne ',') {
                Throw-StrictJsonError "expected a comma in an object at offset $($state.Index)"
            }
            $state.Index = $state.Index + 1
            Skip-JsonWhitespace
        }
    }

    function Read-JsonValue {
        param([int]$Depth)
        if ($state.Index -ge $state.Length) { Throw-StrictJsonError "unexpected end of input" }
        $character = $state.Text[$state.Index]
        if ($character -eq '{') { return (Read-JsonObject -Depth $Depth) }
        if ($character -eq '[') { return (Read-JsonArray -Depth $Depth) }
        if ($character -eq '"') { return (Read-JsonString) }
        if ($character -eq 't') { return (Read-JsonLiteral -Literal "true" -Type "boolean") }
        if ($character -eq 'f') { return (Read-JsonLiteral -Literal "false" -Type "boolean") }
        if ($character -eq 'n') { return (Read-JsonLiteral -Literal "null" -Type "null") }
        if ($character -eq '-' -or [char]::IsDigit($character)) { return (Read-JsonNumber) }
        Throw-StrictJsonError "invalid value at offset $($state.Index)"
    }

    Skip-JsonWhitespace
    $root = Read-JsonValue -Depth 0
    Skip-JsonWhitespace
    if ($root.Type -ne "object") { Throw-StrictJsonError "root value is not an object" }
    if ($state.Index -ne $state.Length) { Throw-StrictJsonError "unexpected content at offset $($state.Index)" }
    return $layout
}

function Add-OpenCodeInstructionToJsonText {
    param([string]$Text, [hashtable]$Layout, [string]$InstructionPath, [int]$ExistingInstructionCount)
    $newLine = if ($Text.Contains("`r`n")) { "`r`n" } else { "`n" }
    $encodedPath = $InstructionPath | ConvertTo-Json -Compress
    if ($Layout.InstructionsArrayStart -ge 0) {
        if ($Layout.InstructionsArrayEnd -lt 0) { throw "Could not locate the end of the OpenCode instructions array." }
        $index = $Layout.InstructionsArrayEnd
        $separator = if ($ExistingInstructionCount -gt 0) { "," } else { "" }
        $insert = $separator + $newLine + "    " + $encodedPath + $newLine + "  "
        return $Text.Substring(0, $index) + $insert + $Text.Substring($index)
    }
    if ($Layout.RootOpen -lt 0 -or $Layout.RootClose -lt 0) { throw "OpenCode config must contain a JSON object." }
    $last = $Layout.RootClose - 1
    while ($last -gt $Layout.RootOpen -and [char]::IsWhiteSpace($Text[$last])) { $last-- }
    $hasProperties = $last -gt $Layout.RootOpen
    $index = $last + 1
    $separator = if ($hasProperties) { "," } else { "" }
    $insert = $separator + $newLine + "  `"instructions`": [" + $newLine + "    " + $encodedPath + $newLine + "  ]"
    return $Text.Substring(0, $index) + $insert + $Text.Substring($index)
}

function Test-CodexDeveloperInstructionsConflict {
    param([string]$Text)
    $assignmentOrDottedKey = '(?m)^\s*(?:developer_instructions|"developer_instructions"|''developer_instructions'')(?:\s*=|\s*\.)'
    $tableHeader = '(?m)^\s*\[{1,2}\s*(?:developer_instructions|"developer_instructions"|''developer_instructions'')(?:\s*\.|\s*\])'
    if ([regex]::IsMatch($Text, $assignmentOrDottedKey) -or [regex]::IsMatch($Text, $tableHeader)) { return $true }

    $quotedKeyPatterns = @(
        '(?m)^\s*(?<key>"(?:\\.|[^"\\\r\n])*")\s*(?:=|\.)',
        '(?m)^\s*\[{1,2}\s*(?<key>"(?:\\.|[^"\\\r\n])*")\s*(?:\.|\])'
    )
    foreach ($pattern in $quotedKeyPatterns) {
        foreach ($match in [regex]::Matches($Text, $pattern)) {
            $body = $match.Groups['key'].Value.Substring(1, $match.Groups['key'].Value.Length - 2)
            try {
                $decoded = [regex]::Replace($body, '\\u(?<short>[0-9A-Fa-f]{4})|\\U(?<long>[0-9A-Fa-f]{8})', {
                    param($unicodeMatch)
                    $hex = if ($unicodeMatch.Groups['short'].Success) { $unicodeMatch.Groups['short'].Value } else { $unicodeMatch.Groups['long'].Value }
                    return [char]::ConvertFromUtf32([Convert]::ToInt32($hex, 16))
                })
                $decoded = $decoded.Replace('\"', '"').Replace('\\', '\')
                if ([string]::Equals($decoded, 'developer_instructions', [System.StringComparison]::Ordinal)) { return $true }
            } catch {
                continue
            }
        }
    }
    return $false
}

function Get-RegexMatchLineNumbersText {
    param([string]$Text, [string]$Pattern)
    $lineNumbers = @()
    foreach ($match in [regex]::Matches($Text, $Pattern)) {
        $lineNumbers += 1 + [regex]::Matches($Text.Substring(0, $match.Index), "`n").Count
    }
    if ($lineNumbers.Count -eq 0) { return "none" }
    return ($lineNumbers -join ",")
}

function Get-CodexAutoDelegationPlan {
    param([string]$Guidance)
    $configPath = Join-Path (Get-CodexHome) "config.toml"
    Assert-RegularConfigFile -Path $configPath
    $exists = Test-Path -LiteralPath $configPath -PathType Leaf
    $originalHash = if ($exists) { Get-FileSha256 -Path $configPath } else { $null }
    $text = if ($exists) { Read-StrictUtf8Text -Path $configPath -Label "Codex config" } else { "" }
    if ($exists -and (Get-FileSha256 -Path $configPath) -cne $originalHash) {
        throw "Refusing to edit $configPath because it changed during installation planning. Run the installer again."
    }
    $startPattern = '(?m)^# CRAFTROSTER_AUTO_DELEGATION_START\s*$'
    $endPattern = '(?m)^# CRAFTROSTER_AUTO_DELEGATION_END\s*$'
    $legacyStartPattern = '(?m)^# AUTOVERSE_AUTO_DELEGATION_START\s*$'
    $legacyEndPattern = '(?m)^# AUTOVERSE_AUTO_DELEGATION_END\s*$'
    $startCount = [regex]::Matches($text, $startPattern).Count
    $endCount = [regex]::Matches($text, $endPattern).Count
    $legacyStartCount = [regex]::Matches($text, $legacyStartPattern).Count
    $legacyEndCount = [regex]::Matches($text, $legacyEndPattern).Count
    $startLines = Get-RegexMatchLineNumbersText -Text $text -Pattern $startPattern
    $endLines = Get-RegexMatchLineNumbersText -Text $text -Pattern $endPattern
    $legacyStartLines = Get-RegexMatchLineNumbersText -Text $text -Pattern $legacyStartPattern
    $legacyEndLines = Get-RegexMatchLineNumbersText -Text $text -Pattern $legacyEndPattern
    if ($startCount -ne $endCount -or $startCount -gt 1) {
        throw "Refusing to edit $configPath because its CraftRoster auto-delegation markers are incomplete or duplicated (START=$startCount at lines $startLines; END=$endCount at lines $endLines). Back up config.toml and reconcile only these reserved marker lines. If the file contains developer_instructions you need to preserve, rerun without -EnableAutoDelegation. -Force does not bypass this config safety check."
    }
    if ($legacyStartCount -ne $legacyEndCount -or $legacyStartCount -gt 1) {
        throw "Refusing to edit $configPath because its legacy auto-delegation markers are incomplete or duplicated (START=$legacyStartCount at lines $legacyStartLines; END=$legacyEndCount at lines $legacyEndLines). Back up config.toml and reconcile only these reserved marker lines. If the file contains developer_instructions you need to preserve, rerun without -EnableAutoDelegation. -Force does not bypass this config safety check."
    }
    if ($startCount -eq 1 -and $legacyStartCount -eq 1) {
        throw "Refusing to edit $configPath because it contains both CraftRoster and legacy auto-delegation blocks (CraftRoster START/END lines $startLines/$endLines; legacy START/END lines $legacyStartLines/$legacyEndLines). Back up config.toml and reconcile the duplicate guidance manually, or rerun without -EnableAutoDelegation. -Force does not bypass this config safety check."
    }
    if ($startCount -eq 1 -and -not [regex]::IsMatch($text, '\A# CRAFTROSTER_AUTO_DELEGATION_START\s*\r?\n')) {
        throw "Refusing to edit $configPath because the CraftRoster marker is at line $startLines instead of the start of the file. Back up config.toml and reconcile the managed block manually, or rerun without -EnableAutoDelegation. -Force does not bypass this config safety check."
    }
    if ($legacyStartCount -eq 1 -and -not [regex]::IsMatch($text, '\A# AUTOVERSE_AUTO_DELEGATION_START\s*\r?\n')) {
        throw "Refusing to edit $configPath because the legacy marker is at line $legacyStartLines instead of the start of the file. Back up config.toml and reconcile the managed block manually, or rerun without -EnableAutoDelegation. -Force does not bypass this config safety check."
    }

    $newLine = if ($text.Contains("`r`n")) { "`r`n" } else { "`n" }
    $normalizedGuidance = [regex]::Replace($Guidance, '\r?\n', $newLine)
    $block = @(
        "# CRAFTROSTER_AUTO_DELEGATION_START",
        "developer_instructions = '''",
        $normalizedGuidance,
        "'''",
        "# CRAFTROSTER_AUTO_DELEGATION_END"
    ) -join $newLine

    $isLegacyMigration = $legacyStartCount -eq 1
    if ($startCount -eq 1 -or $isLegacyMigration) {
        $managedPattern = if ($isLegacyMigration) {
            "(?s)\A# AUTOVERSE_AUTO_DELEGATION_START[^\S\r\n]*\r?\ndeveloper_instructions = '''\r?\n.*?\r?\n'''\r?\n# AUTOVERSE_AUTO_DELEGATION_END[^\S\r\n]*(?:\r?\n)?"
        } else {
            "(?s)\A# CRAFTROSTER_AUTO_DELEGATION_START[^\S\r\n]*\r?\ndeveloper_instructions = '''\r?\n.*?\r?\n'''\r?\n# CRAFTROSTER_AUTO_DELEGATION_END[^\S\r\n]*(?:\r?\n)?"
        }
        $managedMatch = [regex]::Match($text, $managedPattern)
        if (-not $managedMatch.Success) {
            $managedLabel = if ($isLegacyMigration) { "legacy" } else { "CraftRoster" }
            throw "Refusing to edit $configPath because its $managedLabel managed block has an unexpected structure. Back up config.toml and reconcile the block manually, or rerun without -EnableAutoDelegation. -Force does not bypass this config safety check."
        }
        if ([regex]::Matches($managedMatch.Value, "(?m)^'''[^\S\r\n]*\r?$").Count -ne 1) {
            $managedLabel = if ($isLegacyMigration) { "legacy" } else { "CraftRoster" }
            throw "Refusing to edit $configPath because its $managedLabel managed block has an unexpected structure. Back up config.toml and reconcile the block manually, or rerun without -EnableAutoDelegation. -Force does not bypass this config safety check."
        }
        $remainder = $text.Substring($managedMatch.Length)
        if (Test-CodexDeveloperInstructionsConflict -Text $remainder) {
            throw "Refusing to edit $configPath because it also defines developer_instructions outside the CraftRoster managed block. Merge the guidance manually, or rerun without -EnableAutoDelegation to preserve the existing instructions. -Force does not bypass this config safety check."
        }
        $newText = $block + $newLine + $remainder
    } else {
        if (Test-CodexDeveloperInstructionsConflict -Text $text) {
            throw "Refusing to edit $configPath because it already defines developer_instructions outside the CraftRoster managed block. Merge the guidance manually, or rerun without -EnableAutoDelegation to preserve the existing instructions. -Force does not bypass this config safety check."
        }
        $newText = if ($text) { $block + $newLine + $newLine + $text } else { $block + $newLine }
    }

    return @{
        Runtime = "Codex"
        ConfigPath = $configPath
        Existing = $exists
        OriginalHash = $originalHash
        Action = if ($isLegacyMigration) { "migrate-update" } elseif ($newText -ceq $text) { "unchanged" } elseif ($exists) { "update" } else { "install" }
        NewText = $newText
    }
}

function Get-OpenCodeAutoDelegationPlan {
    param([string]$InstructionPath)
    $configRoot = Get-OpenCodeConfigRoot
    $jsonPath = Join-Path $configRoot "opencode.json"
    $jsoncPath = Join-Path $configRoot "opencode.jsonc"
    Assert-RegularConfigFile -Path $jsonPath
    Assert-RegularConfigFile -Path $jsoncPath
    $hasJson = Test-Path -LiteralPath $jsonPath -PathType Leaf
    $hasJsonc = Test-Path -LiteralPath $jsoncPath -PathType Leaf
    if ($hasJson -and $hasJsonc) {
        throw "Refusing to edit OpenCode config because both opencode.json and opencode.jsonc exist in $configRoot. Add the CraftRoster instruction path manually."
    }
    if ($hasJsonc) {
        throw "Refusing to rewrite JSONC config $jsoncPath. Add '$InstructionPath' to its instructions array manually."
    }

    $portableInstructionPath = [System.IO.Path]::GetFullPath($InstructionPath).Replace('\', '/')
    if (-not $hasJson) {
        $newConfig = [ordered]@{
            '$schema' = 'https://opencode.ai/config.json'
            instructions = @($portableInstructionPath)
        }
        return @{
            Runtime = "OpenCode"
            ConfigPath = $jsonPath
            SiblingConfigPath = $jsoncPath
            Existing = $false
            OriginalHash = $null
            Action = "install"
            NewText = ($newConfig | ConvertTo-Json -Depth 20) + "`n"
        }
    }

    $originalHash = Get-FileSha256 -Path $jsonPath
    $text = Read-StrictUtf8Text -Path $jsonPath -Label "OpenCode config"
    if ((Get-FileSha256 -Path $jsonPath) -cne $originalHash) {
        throw "Refusing to edit $jsonPath because it changed during installation planning. Run the installer again."
    }
    $layout = Assert-StrictJsonText -Text $text -Path $jsonPath
    $instructions = @($layout.Instructions)
    if ($instructions | Where-Object { $_.Replace('\', '/') -ieq $portableInstructionPath }) {
        return @{ Runtime = "OpenCode"; ConfigPath = $jsonPath; SiblingConfigPath = $jsoncPath; Existing = $true; OriginalHash = $originalHash; Action = "unchanged"; NewText = $text }
    }
    $instructionCount = $instructions.Count
    $newText = Add-OpenCodeInstructionToJsonText -Text $text -Layout $layout -InstructionPath $portableInstructionPath -ExistingInstructionCount $instructionCount
    return @{
        Runtime = "OpenCode"
        ConfigPath = $jsonPath
        SiblingConfigPath = $jsoncPath
        Existing = $true
        OriginalHash = $originalHash
        Action = "update"
        NewText = $newText
    }
}

function Invoke-AutoDelegationPlan {
    param([hashtable]$Plan)
    if ($Plan.SiblingConfigPath -and (Test-Path -LiteralPath $Plan.SiblingConfigPath)) {
        throw "Refusing to apply OpenCode auto-delegation because a sibling config appeared: $($Plan.SiblingConfigPath)"
    }
    if ($Plan.Action -eq "unchanged") {
        if ($Plan.Existing) {
            Assert-RegularConfigFile -Path $Plan.ConfigPath
            if (-not (Test-Path -LiteralPath $Plan.ConfigPath -PathType Leaf) -or (Get-FileSha256 -Path $Plan.ConfigPath) -cne $Plan.OriginalHash) {
                throw "Refusing to confirm $($Plan.ConfigPath) because it changed after installation planning. Run the installer again."
            }
        } elseif (Test-Path -LiteralPath $Plan.ConfigPath) {
            throw "Refusing to confirm $($Plan.ConfigPath) because it appeared after installation planning. Run the installer again."
        }
        Write-Success "Auto-delegation already enabled for $($Plan.Runtime): $($Plan.ConfigPath)"
        return
    }
    if ($DryRun) {
        Write-Host "DRY-RUN $($Plan.Action) $($Plan.Runtime) auto-delegation -> $($Plan.ConfigPath)"
        return
    }

    if ($Plan.Existing) {
        Assert-RegularConfigFile -Path $Plan.ConfigPath
        if (-not (Test-Path -LiteralPath $Plan.ConfigPath -PathType Leaf) -or (Get-FileSha256 -Path $Plan.ConfigPath) -cne $Plan.OriginalHash) {
            throw "Refusing to replace $($Plan.ConfigPath) because it changed after installation planning. Run the installer again."
        }
    } elseif (Test-Path -LiteralPath $Plan.ConfigPath) {
        throw "Refusing to create $($Plan.ConfigPath) because it appeared after installation planning. Run the installer again."
    }
    if ($Plan.SiblingConfigPath -and (Test-Path -LiteralPath $Plan.SiblingConfigPath)) {
        throw "Refusing to apply OpenCode auto-delegation because a sibling config appeared: $($Plan.SiblingConfigPath)"
    }

    $parent = Split-Path -Parent $Plan.ConfigPath
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    $tempPath = "$($Plan.ConfigPath).craftroster-$([Guid]::NewGuid().ToString('N')).tmp"
    try {
        [System.IO.File]::WriteAllText($tempPath, $Plan.NewText, [System.Text.UTF8Encoding]::new($false))
        if ($Plan.Existing) {
            Assert-RegularConfigFile -Path $Plan.ConfigPath
            if (-not (Test-Path -LiteralPath $Plan.ConfigPath -PathType Leaf) -or (Get-FileSha256 -Path $Plan.ConfigPath) -cne $Plan.OriginalHash) {
                throw "Refusing to replace $($Plan.ConfigPath) because it changed after installation planning. Run the installer again."
            }
            if ($Plan.SiblingConfigPath -and (Test-Path -LiteralPath $Plan.SiblingConfigPath)) {
                throw "Refusing to apply OpenCode auto-delegation because a sibling config appeared: $($Plan.SiblingConfigPath)"
            }
            $backupPath = "$($Plan.ConfigPath).craftroster-backup-$((Get-Date).ToUniversalTime().ToString('yyyyMMddHHmmssfff'))-$([Guid]::NewGuid().ToString('N'))"
            [System.IO.File]::Replace($tempPath, $Plan.ConfigPath, $backupPath, $true)
            if ((Get-FileSha256 -Path $backupPath) -cne $Plan.OriginalHash) {
                $rejectedPath = "$($Plan.ConfigPath).craftroster-rejected-$([Guid]::NewGuid().ToString('N')).tmp"
                [System.IO.File]::Replace($backupPath, $Plan.ConfigPath, $rejectedPath, $true)
                Remove-Item -Force -LiteralPath $rejectedPath -ErrorAction SilentlyContinue
                throw "Refusing to keep the new $($Plan.Runtime) config because the destination changed during atomic replacement. The concurrent version was restored."
            }
            Write-Info "Backup: $backupPath"
        } else {
            if (Test-Path -LiteralPath $Plan.ConfigPath) {
                throw "Refusing to create $($Plan.ConfigPath) because it appeared after installation planning. Run the installer again."
            }
            if ($Plan.SiblingConfigPath -and (Test-Path -LiteralPath $Plan.SiblingConfigPath)) {
                throw "Refusing to apply OpenCode auto-delegation because a sibling config appeared: $($Plan.SiblingConfigPath)"
            }
            [System.IO.File]::Move($tempPath, $Plan.ConfigPath)
        }
    } finally {
        if (Test-Path -LiteralPath $tempPath) { Remove-Item -Force -LiteralPath $tempPath }
    }
    Write-Success "$($Plan.Action) $($Plan.Runtime) auto-delegation -> $($Plan.ConfigPath)"
}

try {
    if (-not $Target) { Show-Usage; throw "Target is required." }
    if ($Name -and $Category) { throw "Name and Category cannot be used together." }
    Test-RepositoryCoordinate -RepoName $Repo
    Test-BranchName -BranchName $Branch
    $Target = Resolve-TargetName -TargetName $Target -ComponentType $Type
    if ($EnableAutoDelegation -and $Type -ne "agent") {
        throw "EnableAutoDelegation is only supported with -Type agent."
    }
    if ($EnableAutoDelegation -and $Target -notin @("codex", "opencode")) {
        throw "EnableAutoDelegation only supports the global Agent targets 'codex' and 'opencode'."
    }
    Test-ComponentName -ComponentType $Type -ComponentName $Name
    if ($Category -and $Category -notmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') {
        throw "Invalid Category '$Category'. Expected a lowercase hyphen-case category."
    }
    $tempRoot = $null
    $script:SourceKind = if ($SourceDir) { "local-checkout" } else { "github-archive" }

    try {
        if ($SourceDir) {
            $repoRoot = (Resolve-Path -LiteralPath $SourceDir).Path
        } else {
            $tempRoot = Join-Path ([System.IO.Path]::GetTempPath()) "craftroster-$Type-$([Guid]::NewGuid().ToString('N'))"
            $archivePath = Join-Path $tempRoot "repo.zip"
            $extractDir = Join-Path $tempRoot "repo"
            New-Item -ItemType Directory -Force -Path $tempRoot, $extractDir | Out-Null
            Invoke-DownloadArchive -RepoName $Repo -BranchName $Branch -Destination $archivePath
            Expand-Archive -Path $archivePath -DestinationPath $extractDir -Force
            $repoRoot = Get-ArchiveRoot $extractDir
        }
        $script:LegacySkillDigestManifestPath = Join-Path $repoRoot 'scripts\data\legacy-skill-content-sha256.tsv'
        $script:LegacySkillDigestAllowlist = $null
        $categoryNames = if ($Category) {
            @(Get-InstallCategoryNames -RepoRoot $repoRoot -ComponentType $Type -CategoryName $Category)
        } else {
            @()
        }
        if ($Category) {
            Write-Info "Selected $($categoryNames.Count) $Type component(s) from category '$Category'"
        }
        if ($Type -eq "agent") {
            $agentProfiles = @(Get-AgentInstallProfiles -TargetName $Target -RequestedInstallDir $InstallDir)
            foreach ($profile in $agentProfiles) {
                Write-Info "Agent destination ($($profile.Platform)): $($profile.DestinationRoot)"
            }

            # Build and preflight the complete cross-profile plan before any writes occur.
            $agentPlans = @()
            foreach ($profile in $agentProfiles) {
                $profileSources = @(Get-AgentSources -RepoRoot $repoRoot -Platform $profile.Platform -OutputSuffix $profile.OutputSuffix -AgentId $Name)
                if ($Category) {
                    $profileSources = @($profileSources | Where-Object { $categoryNames -ccontains $_.Id })
                    if ($profileSources.Count -ne $categoryNames.Count) {
                        throw "Agent category '$Category' does not match the available $($profile.Platform) adapter inventory."
                    }
                }
                foreach ($agentSource in $profileSources) {
                    Test-AgentProfileInstall -Source $agentSource.Source -RuntimeName $agentSource.RuntimeName -AgentId $agentSource.Id -Platform $agentSource.Platform -OutputSuffix $agentSource.OutputSuffix -DestinationRoot $profile.DestinationRoot -TargetName $profile.TargetName -LegacyTargets $profile.LegacyTargets -RepoName $Repo
                    $agentPlans += @{ Source = $agentSource; Profile = $profile }
                }
            }

            $isFullInstall = (-not $Name) -and (-not $Category)
            $installCompanionSkill = $isFullInstall -or $EnableAutoDelegation
            $companionSource = $null
            $companionProfiles = @()
            $companionPlans = @()
            if ($installCompanionSkill) {
                $companionSource = @(Get-SkillSources -RepoRoot $repoRoot -SkillName "subagent-architecture")[0]
                $dependencyRows = @(Get-SkillDependencyRows -RepoRoot $repoRoot)
                $companionSources = @(Expand-RequiredSkillSources -RepoRoot $repoRoot -Sources @($companionSource) -DependencyRows $dependencyRows)
                $companionInstallDir = if ($Target -eq "project") { $InstallDir } else { $null }
                foreach ($source in $companionSources) {
                    $sourceProfiles = @(Get-SkillInstallProfiles -TargetName $Target -ComponentName $source.Name -RequestedInstallDir $companionInstallDir -RepoName $Repo -IncomingSkillFile (Join-Path $source.FullName "SKILL.md"))
                    if ($source.Name -ceq $companionSource.Name) { $companionProfiles = $sourceProfiles }
                    for ($profileIndex = 0; $profileIndex -lt $sourceProfiles.Count; $profileIndex++) {
                        $companionPlans += @{ Source = $source; Profile = $sourceProfiles[$profileIndex]; ProfileIndex = $profileIndex }
                    }
                }
                Assert-SkillDependencyPlan -Plans $companionPlans -DependencyRows $dependencyRows
                foreach ($companionPlan in $companionPlans) {
                    $source = $companionPlan.Source
                    $profile = $companionPlan.Profile
                    $companionPlan.InstallPlan = Get-SkillInstallPlan -Source $source -DestinationRoot $profile.DestinationRoot -TargetName $profile.TargetName -LegacyTargets $profile.LegacyTargets -RepoName $Repo
                    Write-Info "Companion Skill destination: $($profile.DestinationRoot)"
                }
            }

            $autoDelegationPlan = $null
            if ($EnableAutoDelegation) {
                $guidance = Get-AutoDelegationGuidance -RepoRoot $repoRoot
                if ($Target -eq "codex") {
                    $autoDelegationPlan = Get-CodexAutoDelegationPlan -Guidance $guidance
                } else {
                    $instructionPath = Join-Path $companionProfiles[0].DestinationRoot "subagent-architecture\references\global-auto-delegation.md"
                    $autoDelegationPlan = Get-OpenCodeAutoDelegationPlan -InstructionPath $instructionPath
                }
            }

            if ($installCompanionSkill) {
                foreach ($companionPlan in $companionPlans) {
                    $source = $companionPlan.Source
                    $profile = $companionPlan.Profile
                    Install-Skill -Source $source -DestinationRoot $profile.DestinationRoot -TargetName $profile.TargetName -LegacyTargets $profile.LegacyTargets -RepoName $Repo -BranchName $Branch -Plan $companionPlan.InstallPlan
                }
            }
            Write-Info "$(if ($DryRun) { 'Planning' } else { 'Installing' }) $($agentPlans.Count) Agent profile(s) for $Target"
            foreach ($agentPlan in $agentPlans) {
                $agentSource = $agentPlan.Source
                $profile = $agentPlan.Profile
                Install-AgentProfile -Source $agentSource.Source -RuntimeName $agentSource.RuntimeName -AgentId $agentSource.Id -Platform $agentSource.Platform -OutputSuffix $agentSource.OutputSuffix -DestinationRoot $profile.DestinationRoot -TargetName $profile.TargetName -LegacyTargets $profile.LegacyTargets -RepoName $Repo -BranchName $Branch
            }
            if ($autoDelegationPlan) { Invoke-AutoDelegationPlan -Plan $autoDelegationPlan }
        } else {
            $sources = @(Get-SkillSources -RepoRoot $repoRoot -SkillName $Name)
            if ($Category) {
                $sources = @($sources | Where-Object { $categoryNames -ccontains $_.Name })
                if ($sources.Count -ne $categoryNames.Count) {
                    throw "Skill category '$Category' does not match the available Skill inventory."
                }
            }
            $dependencyRows = @(Get-SkillDependencyRows -RepoRoot $repoRoot)
            $sources = @(Expand-RequiredSkillSources -RepoRoot $repoRoot -Sources $sources -DependencyRows $dependencyRows)
            $skillPlans = @()
            foreach ($source in $sources) {
                $sourceProfiles = @(Get-SkillInstallProfiles -TargetName $Target -ComponentName $source.Name -RequestedInstallDir $InstallDir -RepoName $Repo -IncomingSkillFile (Join-Path $source.FullName "SKILL.md"))
                for ($profileIndex = 0; $profileIndex -lt $sourceProfiles.Count; $profileIndex++) {
                    $skillPlans += @{ Source = $source; Profile = $sourceProfiles[$profileIndex]; ProfileIndex = $profileIndex }
                }
            }
            Assert-SkillDependencyPlan -Plans $skillPlans -DependencyRows $dependencyRows
            @($skillPlans | ForEach-Object { $_.Profile.DestinationRoot } | Sort-Object -Unique) |
                ForEach-Object { Write-Info "Skill destination: $_" }
            foreach ($skillPlan in $skillPlans) {
                $source = $skillPlan.Source
                $profile = $skillPlan.Profile
                $skillPlan.InstallPlan = Get-SkillInstallPlan -Source $source -DestinationRoot $profile.DestinationRoot -TargetName $profile.TargetName -LegacyTargets $profile.LegacyTargets -RepoName $Repo
            }
            Write-Info "$(if ($DryRun) { 'Planning' } else { 'Installing' }) $($skillPlans.Count) Skill profile(s) for $Target"
            foreach ($skillPlan in $skillPlans) {
                $source = $skillPlan.Source
                $profile = $skillPlan.Profile
                Install-Skill -Source $source -DestinationRoot $profile.DestinationRoot -TargetName $profile.TargetName -LegacyTargets $profile.LegacyTargets -RepoName $Repo -BranchName $Branch -Plan $skillPlan.InstallPlan
            }
        }

        if ($DryRun) { Write-Success "Dry run complete." } else { Write-Success "CraftRoster $Type install complete." }
    } finally {
        if ($tempRoot -and (Test-Path -LiteralPath $tempRoot)) { Remove-Item -Recurse -Force -LiteralPath $tempRoot }
    }
} catch {
    Write-Fail $_.Exception.Message
    exit 1
}

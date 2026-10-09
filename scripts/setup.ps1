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

Choose a platform, Skills / Agents / both, and all components or categories.
Enter accepts the displayed default. Type q at any prompt to cancel.
Category numbers may be separated by commas or spaces. Invalid answers get
at most three attempts; end-of-input fails immediately without accepting a default.

-SourceDir uses a local checkout. Otherwise one GitHub archive is downloaded.
-InstallDir is a direct destination for tool targets or the project root for project.
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

function Get-SetupCategoryRows {
    param([string]$RepoRoot)
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
    for ($lineIndex = 1; $lineIndex -lt $lines.Count; $lineIndex++) {
        $parts = @($lines[$lineIndex] -split "`t", 0)
        if ($parts.Count -ne 3 -or $parts[0] -cnotin @("skill", "agent") -or
            $parts[1] -cnotmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$' -or
            $parts[2] -cnotmatch '^[a-z0-9]+(?:-[a-z0-9]+)*$') {
            throw "Install category index row $($lineIndex + 1) contains an invalid type, category, or name."
        }
        if (-not $seen.Add("$($parts[0])`t$($parts[2])")) {
            throw "Install category index contains duplicate $($parts[0]) name: $($parts[2])"
        }
        [pscustomobject]@{ Type = $parts[0]; Category = $parts[1]; Name = $parts[2] }
    }
}

function Read-SetupCategories {
    param([object[]]$Rows, [string]$ComponentType)
    $label = if ($ComponentType -eq "skill") { "Skills" } else { "Agents" }
    $counts = @{}
    foreach ($row in $Rows) {
        if ($row.Type -ceq $ComponentType) {
            if (-not $counts.ContainsKey($row.Category)) { $counts[$row.Category] = 0 }
            $counts[$row.Category]++
        }
    }
    if ($counts.Count -eq 0) { throw "No $label categories were found in the install category index." }
    [string[]]$categoryIds = @($counts.Keys)
    [Array]::Sort($categoryIds, [System.StringComparer]::Ordinal)
    Write-Host ""
    Write-Host "$label categories:"
    Write-Host "  0) All $label ($(@($Rows | Where-Object { $_.Type -ceq $ComponentType }).Count))"
    for ($categoryIndex = 0; $categoryIndex -lt $categoryIds.Count; $categoryIndex++) {
        $categoryId = $categoryIds[$categoryIndex]
        Write-Host "  $($categoryIndex + 1)) $categoryId ($($counts[$categoryId]))"
    }
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        $answer = Read-SetupAnswer -Prompt "$label categories [0 = all] (comma/space-separated numbers, q to cancel)"
        if ($answer -eq "" -or $answer -ceq "0") {
            return [pscustomobject]@{ All = $true; Categories = @() }
        }
        # Require the complete line; empty comma tokens and mixed 'all' are invalid.
        if ($answer -cnotmatch '^[1-9][0-9]*(?:(?:\s*,\s*|\s+)[1-9][0-9]*)*$') {
            Write-SetupInvalidAnswer -Message "Enter 0 alone for all, or category numbers separated by commas or spaces without empty entries." -Attempt $attempt
            continue
        }
        $selected = @()
        $seenNumbers = [System.Collections.Generic.HashSet[int]]::new()
        $valid = $true
        foreach ($token in @($answer -split '[,\s]+')) {
            $number = 0
            if (-not [int]::TryParse($token, [ref]$number) -or $number -gt $categoryIds.Count) {
                $valid = $false
                break
            }
            if ($seenNumbers.Add($number)) { $selected += $categoryIds[$number - 1] }
        }
        if ($valid) { return [pscustomobject]@{ All = $false; Categories = @($selected) } }
        Write-SetupInvalidAnswer -Message "Category numbers must be between 1 and $($categoryIds.Count); use 0 alone for all." -Attempt $attempt
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
        [object]$Batch,
        [string]$Destination,
        [bool]$AutoDelegation,
        [bool]$Preview
    )
    $BackendPath = Get-SetupNormalizedPath -Path $BackendPath
    $RepoRoot = Get-SetupNormalizedPath -Path $RepoRoot
    if ($Destination) { $Destination = Get-SetupNormalizedPath -Path $Destination }
    $backendArguments = @("-NoLogo", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", $BackendPath,
        "-SourceDir", $RepoRoot, "-Target", $Target, "-Type", $Batch.Type, "-Branch", $Branch)
    # Preserve the backend's default-repository legacy ownership compatibility.
    if ($repoWasExplicit) { $backendArguments += @("-Repo", $Repo) }
    if ($Batch.Category) { $backendArguments += @("-Category", $Batch.Category) }
    if ($Destination) { $backendArguments += @("-InstallDir", $Destination) }
    if ($AutoDelegation -and $Batch.Type -eq "agent") { $backendArguments += "-EnableAutoDelegation" }
    if ($Force) { $backendArguments += "-Force" }
    if ($Preview) { $backendArguments += "-DryRun" }
    $batchLabel = "$($Batch.Type) / $(if ($Batch.Category) { $Batch.Category } else { 'all' })"
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
        $detail = if ($Preview) { "No installation batch has started." } else { "Earlier batches may already be installed." }
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
    Write-Host "  6) project"
    $platformNumber = Read-SetupChoice -Prompt "Platform [1] (q to cancel)" -Default 1 -Maximum 6
    $target = @("codex", "claude", "cursor", "copilot", "opencode", "project")[$platformNumber - 1]
    Write-Host ""
    Write-Host "Content:"
    Write-Host "  1) Skills"
    Write-Host "  2) Agents"
    Write-Host "  3) Skills and Agents"
    $contentNumber = Read-SetupChoice -Prompt "Content [3] (q to cancel)" -Default 3 -Maximum 3
    $types = switch ($contentNumber) { 1 { @("skill") } 2 { @("agent") } 3 { @("skill", "agent") } }

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
    $categoryRows = @(Get-SetupCategoryRows -RepoRoot $repoRoot)
    $selections = @{}
    $batches = @()
    foreach ($componentType in $types) {
        $selection = Read-SetupCategories -Rows $categoryRows -ComponentType $componentType
        $selections[$componentType] = $selection
        if ($selection.All) {
            $batches += [pscustomobject]@{ Type = $componentType; Category = $null }
        } else {
            foreach ($category in $selection.Categories) {
                $batches += [pscustomobject]@{ Type = $componentType; Category = $category }
            }
        }
    }
    if ($target -eq "project" -and -not $installDirWasExplicit) {
        $InstallDir = Read-SetupProjectRoot -DefaultRoot $callerRoot
    }
    $autoDelegation = $false
    if ($types -contains "agent" -and $target -in @("codex", "opencode")) {
        Write-Host ""
        Write-Host "Proactive delegation installs the companion Skill and updates the platform's global instruction/config file."
        $autoDelegation = Read-SetupConfirmation -Prompt "Enable proactive Agent delegation? [y/N] (q to cancel)"
    }

    Write-Host ""
    Write-Host "Selected installation plan:"
    Write-Host "  Platform: $target"
    Write-Host "  Source: $repoRoot ($Repo@$Branch)"
    foreach ($componentType in $types) {
        $label = if ($componentType -eq "skill") { "Skills" } else { "Agents" }
        $selection = $selections[$componentType]
        $categoryLabel = if ($selection.All) { "all" } else { $selection.Categories -join ", " }
        Write-Host "  $label`: $categoryLabel"
    }
    if ($InstallDir) { Write-Host "  Requested destination$(if ($target -eq 'project') { ' project root' }): $InstallDir" }
    Write-Host "  Proactive Agent delegation: $(if ($autoDelegation) { 'enabled' } else { 'disabled' })"
    Write-Host "  Force replacement: $(if ($Force) { 'enabled' } else { 'disabled' })"
    Write-Host "All selected batches will be checked before installation. Backend previews list destinations and required/companion Skills."
    foreach ($batch in $batches) {
        Invoke-SetupBackend -PowerShellExecutable $powerShellExecutable -BackendPath $backendPath -RepoRoot $repoRoot -Target $target -Batch $batch -Destination $InstallDir -AutoDelegation $autoDelegation -Preview $true
    }
    if ($DryRun) {
        Write-Host ""
        Write-Host "Dry run complete. No installation files were written." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "Batches install sequentially; a later failure does not roll back earlier completed batches."
        $confirmed = Read-SetupConfirmation -Prompt "Install this plan? [y/N] (q to cancel)"
        if (-not $confirmed) { throw [System.OperationCanceledException]::new("Setup cancelled. No installation batch was started.") }
        foreach ($batch in $batches) {
            Invoke-SetupBackend -PowerShellExecutable $powerShellExecutable -BackendPath $backendPath -RepoRoot $repoRoot -Target $target -Batch $batch -Destination $InstallDir -AutoDelegation $autoDelegation -Preview $false
        }
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

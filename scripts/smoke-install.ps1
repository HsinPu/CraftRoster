# Isolated installer smoke test for Windows and GitHub Actions.

param([string]$PowerShellExecutable = 'powershell.exe', [switch]$DependenciesOnly)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
$script:InstallerPowerShell = (Get-Command $PowerShellExecutable -CommandType Application -ErrorAction Stop).Source

function Write-Pass {
    param([string]$Message)
    Write-Host "PASS $Message" -ForegroundColor Green
}

function Assert-Equal {
    param($Actual, $Expected, [string]$Label)
    if ($Actual -cne $Expected) {
        throw "$Label expected $Expected, got $Actual"
    }
}

function Get-Sha256Hex {
    param([string]$Path)
    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $hasher = [System.Security.Cryptography.SHA256]::Create()
        try {
            return (($hasher.ComputeHash($stream) | ForEach-Object { $_.ToString('X2') }) -join '')
        } finally {
            $hasher.Dispose()
        }
    } finally {
        $stream.Dispose()
    }
}

function Assert-FileContentMatches {
    param([string]$ActualPath, [string]$ExpectedPath, [string]$Label)
    if (-not (Test-Path -LiteralPath $ActualPath -PathType Leaf)) {
        throw "$Label is missing: $ActualPath"
    }
    if (-not (Test-Path -LiteralPath $ExpectedPath -PathType Leaf)) {
        throw "$Label source is missing: $ExpectedPath"
    }
    $actualHash = Get-Sha256Hex -Path $ActualPath
    $expectedHash = Get-Sha256Hex -Path $ExpectedPath
    Assert-Equal $actualHash $expectedHash "$Label content hash"
}

function Assert-OwnershipMetadata {
    param(
        [string]$Path,
        [string]$ExpectedRepo,
        [string]$ExpectedComponent,
        [string]$ExpectedName,
        [string]$ExpectedTarget,
        [string]$Label,
        [string]$ExpectedId,
        [string]$ExpectedAdapter
    )
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Label ownership metadata is missing: $Path"
    }
    try {
        $metadata = Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
    } catch {
        throw "$Label ownership metadata is invalid JSON: $Path ($($_.Exception.Message))"
    }
    Assert-Equal $metadata.source "local-checkout" "$Label metadata source"
    Assert-Equal $metadata.repo $ExpectedRepo "$Label metadata repo"
    Assert-Equal $metadata.branch "main" "$Label metadata branch"
    Assert-Equal $metadata.component $ExpectedComponent "$Label metadata component"
    Assert-Equal $metadata.name $ExpectedName "$Label metadata name"
    Assert-Equal $metadata.target $ExpectedTarget "$Label metadata target"
    if ($ExpectedComponent -eq "agent") {
        Assert-Equal $metadata.id $ExpectedId "$Label metadata id"
        Assert-Equal $metadata.adapter $ExpectedAdapter "$Label metadata adapter"
    } else {
        if ($metadata.contentSha256 -notmatch '\A[0-9a-f]{64}\z') {
            throw "$Label metadata contentSha256 is not a lowercase SHA-256"
        }
    }
}

function Write-Utf8NoBom {
    param([string]$Path, [string]$Text)
    [System.IO.File]::WriteAllText($Path, $Text, [System.Text.UTF8Encoding]::new($false))
}

function Write-SkillDependencyIndex {
    param([string]$SourceRoot, [string]$Rows = '')
    $dataRoot = Join-Path $SourceRoot "scripts\data"
    New-Item -ItemType Directory -Force -Path $dataRoot | Out-Null
    Write-Utf8NoBom -Path (Join-Path $dataRoot "install-skill-dependencies.tsv") -Text ("skill`tdependency`tkind`twhen`n" + $Rows)
}

function Set-MetadataString {
    param([string]$Path, [string]$Field, [string]$Value)
    $metadata = Get-Content -Raw -LiteralPath $Path | ConvertFrom-Json
    $property = $metadata.PSObject.Properties | Where-Object { $_.Name -ceq $Field } | Select-Object -First 1
    if ($property) {
        $property.Value = $Value
    } else {
        $metadata | Add-Member -NotePropertyName $Field -NotePropertyValue $Value
    }
    Write-Utf8NoBom -Path $Path -Text (($metadata | ConvertTo-Json -Depth 5) + "`n")
}

function Get-CanonicalSingleFileSkillSha256 {
    param(
        [string]$Path,
        [string]$RelativePath,
        [string]$DigestNamespace = 'craftroster-skill-content-v1'
    )
    $utf8 = [System.Text.UTF8Encoding]::new($false)
    $fileBytes = [System.IO.File]::ReadAllBytes($Path)
    $stream = [System.IO.MemoryStream]::new()
    try {
        foreach ($bytes in @(
            $utf8.GetBytes($DigestNamespace),
            [byte[]]@(0),
            $utf8.GetBytes($RelativePath.Replace('\', '/')),
            [byte[]]@(0),
            [System.Text.Encoding]::ASCII.GetBytes($fileBytes.Length.ToString([System.Globalization.CultureInfo]::InvariantCulture)),
            [byte[]]@(0),
            $fileBytes,
            [byte[]]@(0)
        )) {
            $stream.Write($bytes, 0, $bytes.Length)
        }
        $hasher = [System.Security.Cryptography.SHA256]::Create()
        try {
            return (($hasher.ComputeHash($stream.ToArray()) | ForEach-Object { $_.ToString('x2') }) -join '')
        } finally {
            $hasher.Dispose()
        }
    } finally {
        $stream.Dispose()
    }
}

function Assert-NoAtomicSkillArtifacts {
    param([string]$DestinationRoot, [string]$Label)
    $leftovers = @(Get-ChildItem -Force -LiteralPath $DestinationRoot -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -like '.craftroster-stage-*' -or
        $_.Name -like '.craftroster-backup-*' -or
        $_.Name -like '.craftroster-failed-*' -or
        $_.Name -like '.craftroster-cleanup-*' -or
        $_.Name -like '.cr-s-*' -or
        $_.Name -like '.cr-b-*' -or
        $_.Name -like '.cr-f-*' -or
        $_.Name -like '.cr-cs-*' -or
        $_.Name -like '.cr-cb-*' -or
        $_.Name -like '.cr-cf-*'
    })
    if ($leftovers.Count -gt 0) {
        throw "$Label left atomic Skill artifacts: $($leftovers.Name -join ', ')"
    }
}

function Invoke-InstallerStep {
    param([string]$Label, [string[]]$InstallerArgs)
    $output = @(
        & $script:InstallerPowerShell -NoProfile -ExecutionPolicy Bypass -File $script:Installer @InstallerArgs 2>&1 |
            ForEach-Object { $_.ToString() }
    )
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        $exitCodeHex = '0x{0:X8}' -f [int]$exitCode
        $tail = @($output | Select-Object -Last 12) -join [Environment]::NewLine
        throw "$Label failed with exit code $exitCode ($exitCodeHex); captured $($output.Count) output line(s)$([Environment]::NewLine)$tail"
    }
    Write-Pass $Label
    return [pscustomobject]@{ Output = $output; ExitCode = $exitCode }
}

function Invoke-ExpectedFailure {
    param([string]$Label, [string]$ExpectedMessage, [string[]]$InstallerArgs)
    $output = @(
        & $script:InstallerPowerShell -NoProfile -ExecutionPolicy Bypass -File $script:Installer @InstallerArgs 2>&1 |
            ForEach-Object { $_.ToString() }
    )
    $exitCode = $LASTEXITCODE
    $text = $output -join [Environment]::NewLine
    if ($exitCode -eq 0) { throw "$Label unexpectedly succeeded" }
    if ($text -notmatch [regex]::Escape($ExpectedMessage)) {
        $exitCodeHex = '0x{0:X8}' -f [int]$exitCode
        throw "$Label failed with exit code $exitCode ($exitCodeHex); captured $($output.Count) output line(s) without the expected message '$ExpectedMessage':$([Environment]::NewLine)$text"
    }
    Write-Pass $Label
}

function Assert-SafeSmokeRoot {
    param([string]$Path)
    $tempRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath()).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    )
    $resolved = [System.IO.Path]::GetFullPath($Path).TrimEnd(
        [System.IO.Path]::DirectorySeparatorChar,
        [System.IO.Path]::AltDirectorySeparatorChar
    )
    if (-not [string]::Equals([System.IO.Path]::GetDirectoryName($resolved), $tempRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to use smoke root outside the direct temp directory: $resolved"
    }
    if (-not [System.IO.Path]::GetFileName($resolved).StartsWith("craftroster-install-smoke-", [System.StringComparison]::Ordinal)) {
        throw "Refusing to use an unexpected smoke root: $resolved"
    }
    return $resolved
}

$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$script:Installer = Join-Path $repoRoot "scripts\install.ps1"
$expectedRepo = "HsinPu/CraftRoster"
$legacyRepo = "HsinPu/Autoverse-Ai-Agent-Skills"
$legacySkillFixture = Join-Path $repoRoot "tests\fixtures\legacy-skills\terminal-ops"
$expectedSkills = (Get-Content -Raw -LiteralPath (Join-Path $repoRoot "skills.json") | ConvertFrom-Json).skills.Count
$expectedAgents = (Get-Content -Raw -LiteralPath (Join-Path $repoRoot "agents.json") | ConvertFrom-Json).agents.Count
$smokeRoot = Assert-SafeSmokeRoot -Path (Join-Path ([System.IO.Path]::GetTempPath()) "craftroster-install-smoke-$([Guid]::NewGuid().ToString('N'))")
$projectRoot = Join-Path $smokeRoot "project"
$originalEnvironment = @{}
foreach ($name in @(
    "USERPROFILE", "HOME", "CODEX_HOME", "XDG_CONFIG_HOME", "OPENCODE_CONFIG_DIR", "LOCALAPPDATA",
    "CRAFTROSTER_INSTALLER_TEST_MODE", "CRAFTROSTER_INSTALLER_TEST_ACK", "CRAFTROSTER_INSTALLER_TEST_FAULT"
)) {
    $originalEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
}

try {
    New-Item -ItemType Directory -Path $projectRoot | Out-Null
    $env:USERPROFILE = Join-Path $smokeRoot "home"
    $env:HOME = $env:USERPROFILE
    $env:CODEX_HOME = Join-Path $env:USERPROFILE ".codex"
    $env:XDG_CONFIG_HOME = Join-Path $env:USERPROFILE ".config"
    $env:OPENCODE_CONFIG_DIR = Join-Path $env:XDG_CONFIG_HOME "opencode"
    $env:LOCALAPPDATA = Join-Path $smokeRoot "localappdata"
    New-Item -ItemType Directory -Force -Path $env:USERPROFILE, $env:LOCALAPPDATA | Out-Null

    Invoke-ExpectedFailure -Label "PowerShell strict repository coordinate" -ExpectedMessage "Invalid GitHub repository" -InstallerArgs @(
        "-Target", "codex", "-Type", "skill", "-Name", "terminal-ops", "-Repo", "owner/repo/extra", "-SourceDir", $repoRoot, "-DryRun"
    )
    Invoke-ExpectedFailure -Label "PowerShell strict branch name" -ExpectedMessage "Invalid branch" -InstallerArgs @(
        "-Target", "codex", "-Type", "skill", "-Name", "terminal-ops", "-Branch", "main branch", "-SourceDir", $repoRoot, "-DryRun"
    )

    $canonicalDigestExpected = "b2554ea43bb23e6a7765c32462897815f250cd749467357ddf4ac94478fec3dc"
    $canonicalSourceRoot = Join-Path $smokeRoot "canonical-digest-source"
    $canonicalSkillRoot = Join-Path $canonicalSourceRoot "skills\canonical-digest-fixture"
    $canonicalNestedRoot = Join-Path $canonicalSkillRoot "nested"
    $canonicalDestinationRoot = Join-Path $smokeRoot "canonical-digest-destination"
    New-Item -ItemType Directory -Force -Path $canonicalNestedRoot | Out-Null
    Write-SkillDependencyIndex -SourceRoot $canonicalSourceRoot
    Write-Utf8NoBom -Path (Join-Path $canonicalSkillRoot "SKILL.md") -Text "---`nname: canonical-digest-fixture`ndescription: Canonical digest fixture.`nlicense: Apache-2.0`n---`n"
    Write-Utf8NoBom -Path (Join-Path $canonicalNestedRoot "plain.txt") -Text "alpha`n"
    $canonicalNonAsciiName = ([char]0x8cc7).ToString() + ([char]0x6599).ToString() + ".txt"
    $canonicalNonAsciiContent = ([char]0x8de8).ToString() + ([char]0x5e73).ToString() + ([char]0x53f0).ToString() + "`n"
    Write-Utf8NoBom -Path (Join-Path $canonicalNestedRoot $canonicalNonAsciiName) -Text $canonicalNonAsciiContent
    [System.IO.File]::WriteAllBytes(
        (Join-Path $canonicalSkillRoot "binary.dat"),
        [byte[]]@(0, 1, 2, 10, 13, 255, 128, 65)
    )
    Invoke-InstallerStep -Label "canonical cross-platform Skill digest fixture" -InstallerArgs @(
        "-Target", "claude", "-Type", "skill", "-Name", "canonical-digest-fixture", "-SourceDir", $canonicalSourceRoot, "-InstallDir", $canonicalDestinationRoot
    ) | Out-Null
    $canonicalMetadata = Get-Content -Raw -LiteralPath (Join-Path $canonicalDestinationRoot "canonical-digest-fixture\.skill-meta.json") | ConvertFrom-Json
    Assert-Equal $canonicalMetadata.contentSha256 $canonicalDigestExpected "canonical nested/binary/non-ASCII Skill digest"
    Write-Pass "canonical nested, binary, and non-ASCII Skill digest"

    $dependencySource = Join-Path $smokeRoot "dependency-source"
    foreach ($fixtureName in @('root-skill', 'left-skill', 'right-skill', 'base-skill', 'conditional-skill', 'optional-skill', 'optional-base')) {
        $fixtureRoot = Join-Path $dependencySource "skills\$fixtureName"
        New-Item -ItemType Directory -Force -Path $fixtureRoot | Out-Null
        Write-Utf8NoBom -Path (Join-Path $fixtureRoot 'SKILL.md') -Text "---`nname: $fixtureName`ndescription: Dependency installation fixture.`nlicense: Apache-2.0`n---`n"
    }
    $proofRoot = Join-Path $dependencySource 'skills\base-skill\references'
    New-Item -ItemType Directory -Path $proofRoot | Out-Null
    Write-Utf8NoBom -Path (Join-Path $proofRoot 'proof.md') -Text "shared dependency evidence`n"
    [System.IO.File]::AppendAllText((Join-Path $dependencySource 'skills\left-skill\SKILL.md'), "Read [proof](../base-skill/references/proof.md).`n")
    $dependencyRows = "conditional-skill`troot-skill`tconditional`tOnly when root orchestration is requested.`nleft-skill`tbase-skill`trequired`t-`noptional-base`troot-skill`toptional`t-`noptional-skill`toptional-base`trequired`t-`nright-skill`tbase-skill`trequired`t-`nroot-skill`tconditional-skill`tconditional`tOnly when conditional output is requested.`nroot-skill`tleft-skill`trequired`t-`nroot-skill`toptional-skill`toptional`t-`nroot-skill`tright-skill`trequired`t-`n"
    Write-SkillDependencyIndex -SourceRoot $dependencySource -Rows $dependencyRows
    $dependencyIndexPath = Join-Path $dependencySource 'scripts\data\install-skill-dependencies.tsv'
    Write-Utf8NoBom -Path (Join-Path $dependencySource 'scripts\data\install-category-index.tsv') -Text "type`tcategory`tname`nskill`tlibrary`tbase-skill`nskill`tlibrary`tconditional-skill`nskill`tlibrary`tleft-skill`nskill`tlibrary`toptional-base`nskill`tlibrary`toptional-skill`nskill`tlibrary`tright-skill`nskill`tchosen`troot-skill`n"
    $dependencyDryRoot = Join-Path $smokeRoot 'dependency-dry-run'
    $dependencyDry = Invoke-InstallerStep -Label 'required dependency diamond dry run' -InstallerArgs @(
        '-Target', 'claude', '-Name', 'root-skill', '-SourceDir', $dependencySource, '-InstallDir', $dependencyDryRoot, '-DryRun'
    )
    $dependencyOrder = @($dependencyDry.Output | Where-Object { $_ -match '^DRY-RUN install Skill ' } | ForEach-Object { ($_ -split ' ')[3] })
    Assert-Equal ($dependencyOrder -join ',') 'base-skill,left-skill,right-skill,root-skill' 'dependency topological order and diamond deduplication'
    if (($dependencyDry.Output -join "`n") -notmatch 'Optional dependency not auto-installed: root-skill -> optional-skill') { throw 'Optional dependency was not explained in dry run' }
    if (Test-Path -LiteralPath $dependencyDryRoot) { throw 'Dependency dry run wrote the destination' }
    $dependencyProject = Join-Path $smokeRoot 'dependency-project'
    Invoke-InstallerStep -Label 'cross-category required dependencies in both project profiles' -InstallerArgs @(
        '-Target', 'project', '-Category', 'chosen', '-SourceDir', $dependencySource, '-InstallDir', $dependencyProject
    ) | Out-Null
    foreach ($relativeRoot in @('.agents\skills', '.claude\skills')) {
        $installedRoot = Join-Path $dependencyProject $relativeRoot
        Assert-Equal @(Get-ChildItem -LiteralPath $installedRoot -Directory).Count 4 'required closure count'
        Assert-FileContentMatches -ActualPath (Join-Path $installedRoot 'left-skill\..\base-skill\references\proof.md') -ExpectedPath (Join-Path $proofRoot 'proof.md') -Label 'installed sibling resource'
        foreach ($notSelected in @('conditional-skill', 'optional-skill', 'optional-base')) {
            if (Test-Path -LiteralPath (Join-Path $installedRoot $notSelected)) { throw "$notSelected was installed automatically" }
        }
    }
    Invoke-InstallerStep -Label 'matching owned dependencies update' -InstallerArgs @(
        '-Target', 'project', '-Name', 'root-skill', '-SourceDir', $dependencySource, '-InstallDir', $dependencyProject
    ) | Out-Null
    $fullDependency = Invoke-InstallerStep -Label 'full dependency inventory remains deduplicated' -InstallerArgs @(
        '-Target', 'claude', '-SourceDir', $dependencySource, '-InstallDir', $dependencyDryRoot, '-DryRun'
    )
    Assert-Equal @($fullDependency.Output | Where-Object { $_ -match '^DRY-RUN install Skill ' }).Count 7 'full dependency inventory count'

    $optionalExplicitRoot = Join-Path $smokeRoot 'optional-explicit'
    Invoke-InstallerStep -Label 'explicit optional target installs only its own required closure' -InstallerArgs @(
        '-Target', 'claude', '-Name', 'optional-skill', '-SourceDir', $dependencySource, '-InstallDir', $optionalExplicitRoot
    ) | Out-Null
    Assert-Equal @(Get-ChildItem -LiteralPath $optionalExplicitRoot -Directory).Count 2 'explicit optional target and required base count'
    foreach ($name in @('optional-skill', 'optional-base')) {
        Assert-FileContentMatches -ActualPath (Join-Path $optionalExplicitRoot "$name\SKILL.md") -ExpectedPath (Join-Path $dependencySource "skills\$name\SKILL.md") -Label "explicit $name"
    }
    if (Test-Path -LiteralPath (Join-Path $optionalExplicitRoot 'root-skill')) { throw 'Optional back-edge expanded the root' }

    $optionalForeignRoot = Join-Path $smokeRoot 'optional-foreign'
    $optionalForeign = Join-Path $optionalForeignRoot 'optional-skill'
    New-Item -ItemType Directory -Force -Path $optionalForeign | Out-Null
    Write-Utf8NoBom -Path (Join-Path $optionalForeign 'user.txt') -Text 'foreign optional content'
    Invoke-InstallerStep -Label 'force on owner preserves unselected optional foreign files' -InstallerArgs @(
        '-Target', 'claude', '-Name', 'root-skill', '-SourceDir', $dependencySource, '-InstallDir', $optionalForeignRoot, '-Force'
    ) | Out-Null
    Assert-Equal ([System.IO.File]::ReadAllText((Join-Path $optionalForeign 'user.txt'))) 'foreign optional content' 'foreign optional content preserved'
    Assert-Equal @(Get-ChildItem -Force -LiteralPath $optionalForeign).Count 1 'no optional metadata or source written'
    if (Test-Path -LiteralPath (Join-Path $optionalForeignRoot 'optional-base')) { throw 'Unselected optional required closure was installed' }

    $dependencyForeign = Join-Path $smokeRoot 'dependency-foreign'
    $foreignBase = Join-Path $dependencyForeign '.claude\skills\base-skill'
    New-Item -ItemType Directory -Force -Path $foreignBase | Out-Null
    Write-Utf8NoBom -Path (Join-Path $foreignBase 'user.txt') -Text 'foreign content'
    Invoke-ExpectedFailure -Label 'foreign dependency blocks every project profile' -ExpectedMessage 'no matching CraftRoster metadata' -InstallerArgs @(
        '-Target', 'project', '-Name', 'root-skill', '-SourceDir', $dependencySource, '-InstallDir', $dependencyForeign
    )
    if (Test-Path -LiteralPath (Join-Path $dependencyForeign '.agents')) { throw 'Foreign dependency left a partial first-profile install' }
    Assert-Equal ([System.IO.File]::ReadAllText((Join-Path $foreignBase 'user.txt'))) 'foreign content' 'foreign dependency preserved'

    $dependencyModified = Join-Path $smokeRoot 'dependency-modified'
    Invoke-InstallerStep -Label 'prepare owned dependency' -InstallerArgs @(
        '-Target', 'claude', '-Name', 'base-skill', '-SourceDir', $dependencySource, '-InstallDir', $dependencyModified
    ) | Out-Null
    $modifiedProof = Join-Path $dependencyModified 'base-skill\references\proof.md'
    Write-Utf8NoBom -Path $modifiedProof -Text 'local change'
    Invoke-ExpectedFailure -Label 'modified dependency blocks installation' -ExpectedMessage 'installed Skill content has changed since the last CraftRoster install' -InstallerArgs @(
        '-Target', 'claude', '-Name', 'root-skill', '-SourceDir', $dependencySource, '-InstallDir', $dependencyModified
    )
    Assert-Equal @(Get-ChildItem -LiteralPath $dependencyModified -Directory).Count 1 'modified dependency no partial install'
    Assert-Equal ([System.IO.File]::ReadAllText($modifiedProof)) 'local change' 'modified dependency preserved'
    Invoke-InstallerStep -Label 'explicit force resets modified dependency' -InstallerArgs @(
        '-Target', 'claude', '-Name', 'root-skill', '-SourceDir', $dependencySource, '-InstallDir', $dependencyModified, '-Force'
    ) | Out-Null
    Assert-FileContentMatches -ActualPath $modifiedProof -ExpectedPath (Join-Path $proofRoot 'proof.md') -Label 'forced dependency restored'

    $dependencyInvalidRoot = Join-Path $smokeRoot 'dependency-invalid'
    foreach ($invalid in @(
        @{ Label = 'required dependency cycle'; Rows = $dependencyRows + "base-skill`troot-skill`trequired`t-`n"; Message = 'Required Skill dependency cycle' },
        @{ Label = 'unknown dependency'; Rows = "root-skill`tmissing-skill`trequired`t-`n"; Message = 'Skill not found in archive: missing-skill' },
        @{ Label = 'unknown dependency owner'; Rows = "missing-skill`tbase-skill`trequired`t-`n"; Message = 'Skill not found in archive: missing-skill' },
        @{ Label = 'optional unknown target'; Rows = "root-skill`tmissing-skill`toptional`t-`n"; Message = 'Skill not found in archive: missing-skill' },
        @{ Label = 'optional condition prohibited'; Rows = "root-skill`toptional-skill`toptional`tSometimes`n"; Message = 'contains an invalid value' },
        @{ Label = 'unknown dependency kind'; Rows = "root-skill`tbase-skill`trecommended`t-`n"; Message = 'contains an invalid value' },
        @{ Label = 'self dependency'; Rows = "root-skill`troot-skill`trequired`t-`n"; Message = 'self dependency' },
        @{ Label = 'duplicate dependency'; Rows = $dependencyRows + "root-skill`tleft-skill`trequired`t-`n"; Message = 'duplicate dependency' },
        @{ Label = 'malformed dependency row'; Rows = "root-skill`tbase-skill`trequired`n"; Message = 'must contain skill, dependency, kind, and when' },
        @{ Label = 'extra dependency column'; Rows = "root-skill`tbase-skill`trequired`t-`textra`n"; Message = 'must contain skill, dependency, kind, and when' },
        @{ Label = 'empty dependency condition'; Rows = "root-skill`tbase-skill`tconditional`t`n"; Message = 'contains an invalid value' },
        @{ Label = 'invalid dependency condition'; Rows = "root-skill`tbase-skill`tconditional`t-`n"; Message = 'contains an invalid value' }
    )) {
        Write-SkillDependencyIndex -SourceRoot $dependencySource -Rows $invalid.Rows
        Invoke-ExpectedFailure -Label $invalid.Label -ExpectedMessage $invalid.Message -InstallerArgs @(
            '-Target', 'claude', '-Name', 'root-skill', '-SourceDir', $dependencySource, '-InstallDir', $dependencyInvalidRoot
        )
        if (Test-Path -LiteralPath $dependencyInvalidRoot) { throw "$($invalid.Label) wrote to the destination" }
    }
    Write-Utf8NoBom -Path $dependencyIndexPath -Text "skill`tdependency`tkind`n"
    Invoke-ExpectedFailure -Label 'invalid dependency header' -ExpectedMessage 'invalid header' -InstallerArgs @(
        '-Target', 'claude', '-Name', 'root-skill', '-SourceDir', $dependencySource, '-InstallDir', $dependencyInvalidRoot
    )
    if (Test-Path -LiteralPath $dependencyInvalidRoot) { throw 'Invalid dependency header wrote to the destination' }
    Remove-Item -LiteralPath $dependencyIndexPath
    Invoke-ExpectedFailure -Label 'missing dependency index refuses incomplete source' -ExpectedMessage 'Skill dependency index not found' -InstallerArgs @(
        '-Target', 'claude', '-Name', 'root-skill', '-SourceDir', $dependencySource, '-InstallDir', $dependencyInvalidRoot
    )
    if (Test-Path -LiteralPath $dependencyInvalidRoot) { throw 'Missing dependency index wrote to the destination' }
    Write-SkillDependencyIndex -SourceRoot $dependencySource -Rows $dependencyRows

    $alternateDependencyRoot = Join-Path $env:USERPROFILE '.agents\skills'
    Invoke-InstallerStep -Label 'prepare alternate-root owned dependency' -InstallerArgs @(
        '-Target', 'codex', '-Name', 'base-skill', '-SourceDir', $dependencySource, '-InstallDir', $alternateDependencyRoot
    ) | Out-Null
    Invoke-ExpectedFailure -Label 'required dependency split roots refuse before writes' -ExpectedMessage 'Required Skill dependency uses different roots' -InstallerArgs @(
        '-Target', 'codex', '-Name', 'root-skill', '-SourceDir', $dependencySource
    )
    if (Test-Path -LiteralPath (Join-Path $env:CODEX_HOME 'skills\root-skill')) { throw 'Split-root plan installed the requesting Skill' }
    if (Test-Path -LiteralPath (Join-Path $env:CODEX_HOME 'skills\base-skill')) { throw 'Split-root plan duplicated its dependency' }
    Assert-FileContentMatches -ActualPath (Join-Path $alternateDependencyRoot 'base-skill\references\proof.md') -ExpectedPath (Join-Path $proofRoot 'proof.md') -Label 'alternate-root dependency preserved'
    Write-Pass 'PowerShell dependency closure, references, conditional and optional selection, ownership, and placement'
    if ($DependenciesOnly) {
        Write-Host 'PowerShell dependency smoke passed; remaining installer scenarios not run.'
        return
    }

    $categoryIndex = @(Import-Csv -LiteralPath (Join-Path $repoRoot "scripts\data\install-category-index.tsv") -Delimiter "`t")
    $browserSkillCount = @($categoryIndex | Where-Object { $_.type -ceq "skill" -and $_.category -ceq "browser-automation" }).Count
    $financeAgentCount = @($categoryIndex | Where-Object { $_.type -ceq "agent" -and $_.category -ceq "finance" }).Count
    $categorySkillRoot = Join-Path $smokeRoot "category-skill-project"
    $categoryAgentRoot = Join-Path $smokeRoot "category-agent-project"
    New-Item -ItemType Directory -Path $categorySkillRoot, $categoryAgentRoot | Out-Null

    Invoke-ExpectedFailure -Label "Skill category and name conflict" -ExpectedMessage "Name and Category cannot be used together" -InstallerArgs @(
        "-Target", "project", "-Type", "skill", "-Name", "browser-automation", "-Category", "browser-automation", "-SourceDir", $repoRoot, "-InstallDir", $categorySkillRoot
    )
    Invoke-ExpectedFailure -Label "invalid Skill category" -ExpectedMessage "Available Skill categories" -InstallerArgs @(
        "-Target", "project", "-Type", "skill", "-Category", "missing-category", "-SourceDir", $repoRoot, "-InstallDir", $categorySkillRoot
    )
    $categoryDryRun = Invoke-InstallerStep -Label "project Skill category dry run" -InstallerArgs @(
        "-Target", "project", "-Type", "skill", "-Category", "browser-automation", "-SourceDir", $repoRoot, "-InstallDir", $categorySkillRoot, "-DryRun"
    )
    $categoryDryRunText = $categoryDryRun.Output -join [Environment]::NewLine
    if ($categoryDryRunText -notmatch [regex]::Escape("Selected $browserSkillCount skill component(s) from category 'browser-automation'")) {
        throw "Skill category dry run did not report the selected component count"
    }
    if (@(Get-ChildItem -Force -LiteralPath $categorySkillRoot).Count -ne 0) {
        throw "Skill category dry run wrote to the destination"
    }
    Invoke-InstallerStep -Label "project Skill category install" -InstallerArgs @(
        "-Target", "project", "-Type", "skill", "-Category", "browser-automation", "-SourceDir", $repoRoot, "-InstallDir", $categorySkillRoot
    ) | Out-Null
    foreach ($relativeRoot in @(".agents\skills", ".claude\skills")) {
        $installedCount = @(Get-ChildItem -LiteralPath (Join-Path $categorySkillRoot $relativeRoot) -Directory | Where-Object {
            Test-Path -LiteralPath (Join-Path $_.FullName "SKILL.md") -PathType Leaf
        }).Count
        Assert-Equal $installedCount ($browserSkillCount + 1) "$relativeRoot browser-automation category plus required Python baseline count"
        if (-not (Test-Path -LiteralPath (Join-Path $categorySkillRoot "$relativeRoot\python-development\SKILL.md") -PathType Leaf)) {
            throw "Browser category did not install the required Python baseline in $relativeRoot"
        }
    }

    Invoke-InstallerStep -Label "project Agent category install" -InstallerArgs @(
        "-Target", "project", "-Type", "agent", "-Category", "finance", "-SourceDir", $repoRoot, "-InstallDir", $categoryAgentRoot
    ) | Out-Null
    foreach ($profile in @(
        @{ Root = ".codex\agents"; Pattern = "*.toml" },
        @{ Root = ".claude\agents"; Pattern = "*.md" },
        @{ Root = ".cursor\agents"; Pattern = "*.md" },
        @{ Root = ".github\agents"; Pattern = "*.agent.md" },
        @{ Root = ".opencode\agents"; Pattern = "*.md" }
    )) {
        Assert-Equal @(Get-ChildItem -LiteralPath (Join-Path $categoryAgentRoot $profile.Root) -File -Filter $profile.Pattern).Count $financeAgentCount "$($profile.Root) finance category count"
    }
    if (Test-Path -LiteralPath (Join-Path $categoryAgentRoot ".agents\skills\subagent-architecture")) {
        throw "Agent category install unexpectedly installed the companion Skill"
    }
    Write-Pass "PowerShell Skill and Agent category installs"

    Invoke-InstallerStep -Label "project all Skills install" -InstallerArgs @(
        "-Target", "project", "-Type", "skill", "-SourceDir", $repoRoot, "-InstallDir", $projectRoot
    ) | Out-Null
    Invoke-InstallerStep -Label "project all Agents install" -InstallerArgs @(
        "-Target", "project", "-Type", "agent", "-SourceDir", $repoRoot, "-InstallDir", $projectRoot
    ) | Out-Null

    $projectSkillProfiles = @(
        @{ Name = "agents"; Root = ".agents\skills" },
        @{ Name = "claude"; Root = ".claude\skills" }
    )
    foreach ($profile in $projectSkillProfiles) {
        $relativeRoot = $profile.Root
        $root = Join-Path $projectRoot $relativeRoot
        $skillCount = @(Get-ChildItem -LiteralPath $root -Directory | Where-Object {
            Test-Path -LiteralPath (Join-Path $_.FullName "SKILL.md") -PathType Leaf
        }).Count
        $metadataCount = @(Get-ChildItem -LiteralPath $root -Recurse -File -Filter ".skill-meta.json").Count
        Assert-Equal $skillCount $expectedSkills "$relativeRoot Skill count"
        Assert-Equal $metadataCount $expectedSkills "$relativeRoot Skill metadata count"
        $representativeSkillRoot = Join-Path $root "terminal-ops"
        Assert-FileContentMatches `
            -ActualPath (Join-Path $representativeSkillRoot "SKILL.md") `
            -ExpectedPath (Join-Path $repoRoot "skills\terminal-ops\SKILL.md") `
            -Label "$($profile.Name) project Skill"
        Assert-OwnershipMetadata `
            -Path (Join-Path $representativeSkillRoot ".skill-meta.json") `
            -ExpectedRepo $expectedRepo `
            -ExpectedComponent "skill" `
            -ExpectedName "terminal-ops" `
            -ExpectedTarget "project" `
            -Label "$($profile.Name) project Skill"
    }

    $agentProfiles = @(
        @{ Name = "codex"; Root = ".codex\agents"; Pattern = "*.toml"; Adapter = "codex"; Suffix = ".toml" },
        @{ Name = "claude"; Root = ".claude\agents"; Pattern = "*.md"; Adapter = "claude"; Suffix = ".md" },
        @{ Name = "cursor"; Root = ".cursor\agents"; Pattern = "*.md"; Adapter = "cursor"; Suffix = ".md" },
        @{ Name = "copilot"; Root = ".github\agents"; Pattern = "*.agent.md"; Adapter = "copilot"; Suffix = ".agent.md" },
        @{ Name = "opencode"; Root = ".opencode\agents"; Pattern = "*.md"; Adapter = "opencode"; Suffix = ".md" }
    )
    foreach ($profile in $agentProfiles) {
        $root = Join-Path $projectRoot $profile.Root
        Assert-Equal @(Get-ChildItem -LiteralPath $root -File -Filter $profile.Pattern).Count $expectedAgents "$($profile.Name) Agent count"
        Assert-Equal @(Get-ChildItem -LiteralPath $root -File -Filter "*.craftroster.json").Count $expectedAgents "$($profile.Name) Agent metadata count"
        $representativeAgentPath = Join-Path $root ("code-reviewer" + $profile.Suffix)
        Assert-FileContentMatches `
            -ActualPath $representativeAgentPath `
            -ExpectedPath (Join-Path $repoRoot ("adapters\" + $profile.Adapter + "\code-reviewer" + $profile.Suffix)) `
            -Label "$($profile.Name) project Agent"
        Assert-OwnershipMetadata `
            -Path ($representativeAgentPath + ".craftroster.json") `
            -ExpectedRepo $expectedRepo `
            -ExpectedComponent "agent" `
            -ExpectedName "code-reviewer" `
            -ExpectedTarget "project" `
            -ExpectedId "code-reviewer" `
            -ExpectedAdapter $profile.Adapter `
            -Label "$($profile.Name) project Agent"
    }
    Write-Pass "project profile counts, ownership metadata, and adapter content"

    $skillUpdate = Invoke-InstallerStep -Label "project Skill update" -InstallerArgs @(
        "-Target", "project", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $projectRoot
    )
    Assert-Equal @($skillUpdate.Output | Where-Object { $_ -match '^OK\s+update Skill ' }).Count 2 "project Skill update count"

    $agentUpdate = Invoke-InstallerStep -Label "project Agent update" -InstallerArgs @(
        "-Target", "project", "-Type", "agent", "-Name", "code-reviewer", "-SourceDir", $repoRoot, "-InstallDir", $projectRoot
    )
    Assert-Equal @($agentUpdate.Output | Where-Object { $_ -match '^OK\s+update Agent ' }).Count 5 "project Agent update count"

    $repairFile = Join-Path $projectRoot ".codex\agents\code-reviewer.toml"
    Remove-Item -Force -LiteralPath $repairFile
    $repair = Invoke-InstallerStep -Label "project Agent repair" -InstallerArgs @(
        "-Target", "project", "-Type", "agent", "-Name", "code-reviewer", "-SourceDir", $repoRoot, "-InstallDir", $projectRoot
    )
    Assert-Equal @($repair.Output | Where-Object { $_ -match '^OK\s+repair Agent ' }).Count 1 "project Agent repair count"
    Assert-Equal @($repair.Output | Where-Object { $_ -match '^OK\s+update Agent ' }).Count 4 "project unaffected Agent update count"
    if (-not (Test-Path -LiteralPath $repairFile -PathType Leaf)) { throw "Repair did not restore $repairFile" }

    $globalProfiles = @(
        @{
            Label = "Codex"; RequestedTarget = "codex"; OwnershipTarget = "codex"
            SkillName = "todo-first"; SkillRoot = Join-Path $env:CODEX_HOME "skills"
            AgentName = "accessibility-expert"; AgentRoot = Join-Path $env:CODEX_HOME "agents"
            Adapter = "codex"; Suffix = ".toml"
        },
        @{
            Label = "Claude"; RequestedTarget = "claude"; OwnershipTarget = "claude"
            SkillName = "frontend-code-review"; SkillRoot = Join-Path $env:USERPROFILE ".claude\skills"
            AgentName = "accounting-controller"; AgentRoot = Join-Path $env:USERPROFILE ".claude\agents"
            Adapter = "claude"; Suffix = ".md"
        },
        @{
            Label = "Cursor"; RequestedTarget = "cursor"; OwnershipTarget = "cursor"
            SkillName = "agent-creator-design"; SkillRoot = Join-Path $env:USERPROFILE ".cursor\skills"
            AgentName = "agent-harness-optimizer"; AgentRoot = Join-Path $env:USERPROFILE ".cursor\agents"
            Adapter = "cursor"; Suffix = ".md"
        },
        @{
            Label = "VS Code alias"; RequestedTarget = "vscode"; OwnershipTarget = "copilot"
            SkillName = "ask-questions-if-underspecified"; SkillRoot = Join-Path $env:USERPROFILE ".copilot\skills"
            AgentName = "ai-engineer"; AgentRoot = Join-Path $env:USERPROFILE ".copilot\agents"
            Adapter = "copilot"; Suffix = ".agent.md"
        },
        @{
            Label = "Copilot"; RequestedTarget = "copilot"; OwnershipTarget = "copilot"
            SkillName = "answer-writing"; SkillRoot = Join-Path $env:USERPROFILE ".copilot\skills"
            AgentName = "ai-safety-evaluator"; AgentRoot = Join-Path $env:USERPROFILE ".copilot\agents"
            Adapter = "copilot"; Suffix = ".agent.md"
        },
        @{
            Label = "OpenCode"; RequestedTarget = "opencode"; OwnershipTarget = "opencode"
            SkillName = "code-refactoring"; SkillRoot = Join-Path $env:OPENCODE_CONFIG_DIR "skills"
            AgentName = "analytics-engineer"; AgentRoot = Join-Path $env:OPENCODE_CONFIG_DIR "agents"
            Adapter = "opencode"; Suffix = ".md"
        }
    )
    foreach ($profile in $globalProfiles) {
        $skillInstall = Invoke-InstallerStep -Label "$($profile.Label) global Skill install" -InstallerArgs @(
            "-Target", $profile.RequestedTarget, "-Type", "skill", "-Name", $profile.SkillName, "-SourceDir", $repoRoot
        )
        $expectedProfileSkillCount = if ($profile.SkillName -ceq 'frontend-code-review') { 2 } else { 1 }
        Assert-Equal @($skillInstall.Output | Where-Object { $_ -match '^OK\s+install Skill ' }).Count $expectedProfileSkillCount "$($profile.Label) Skill install count including required dependencies"
        if ($profile.SkillName -ceq 'frontend-code-review') {
            Assert-FileContentMatches -ActualPath (Join-Path $profile.SkillRoot 'code-review\SKILL.md') -ExpectedPath (Join-Path $repoRoot 'skills\code-review\SKILL.md') -Label 'global frontend review baseline'
        }
        $globalSkillRoot = Join-Path $profile.SkillRoot $profile.SkillName
        Assert-FileContentMatches `
            -ActualPath (Join-Path $globalSkillRoot "SKILL.md") `
            -ExpectedPath (Join-Path $repoRoot ("skills\" + $profile.SkillName + "\SKILL.md")) `
            -Label "$($profile.Label) global Skill"
        Assert-OwnershipMetadata `
            -Path (Join-Path $globalSkillRoot ".skill-meta.json") `
            -ExpectedRepo $expectedRepo `
            -ExpectedComponent "skill" `
            -ExpectedName $profile.SkillName `
            -ExpectedTarget $profile.OwnershipTarget `
            -Label "$($profile.Label) global Skill"
        $skillUpdate = Invoke-InstallerStep -Label "$($profile.Label) global Skill update" -InstallerArgs @(
            "-Target", $profile.RequestedTarget, "-Type", "skill", "-Name", $profile.SkillName, "-SourceDir", $repoRoot
        )
        Assert-Equal @($skillUpdate.Output | Where-Object { $_ -match '^OK\s+update Skill ' }).Count $expectedProfileSkillCount "$($profile.Label) Skill update count including required dependencies"
        Assert-FileContentMatches `
            -ActualPath (Join-Path $globalSkillRoot "SKILL.md") `
            -ExpectedPath (Join-Path $repoRoot ("skills\" + $profile.SkillName + "\SKILL.md")) `
            -Label "$($profile.Label) updated global Skill"
        Assert-OwnershipMetadata `
            -Path (Join-Path $globalSkillRoot ".skill-meta.json") `
            -ExpectedRepo $expectedRepo `
            -ExpectedComponent "skill" `
            -ExpectedName $profile.SkillName `
            -ExpectedTarget $profile.OwnershipTarget `
            -Label "$($profile.Label) updated global Skill"

        $agentInstall = Invoke-InstallerStep -Label "$($profile.Label) global Agent install" -InstallerArgs @(
            "-Target", $profile.RequestedTarget, "-Type", "agent", "-Name", $profile.AgentName, "-SourceDir", $repoRoot
        )
        Assert-Equal @($agentInstall.Output | Where-Object { $_ -match '^OK\s+install Agent ' }).Count 1 "$($profile.Label) Agent install count"
        $globalAgentPath = Join-Path $profile.AgentRoot ($profile.AgentName + $profile.Suffix)
        Assert-FileContentMatches `
            -ActualPath $globalAgentPath `
            -ExpectedPath (Join-Path $repoRoot ("adapters\" + $profile.Adapter + "\" + $profile.AgentName + $profile.Suffix)) `
            -Label "$($profile.Label) global Agent"
        Assert-OwnershipMetadata `
            -Path ($globalAgentPath + ".craftroster.json") `
            -ExpectedRepo $expectedRepo `
            -ExpectedComponent "agent" `
            -ExpectedName $profile.AgentName `
            -ExpectedTarget $profile.OwnershipTarget `
            -ExpectedId $profile.AgentName `
            -ExpectedAdapter $profile.Adapter `
            -Label "$($profile.Label) global Agent"
        $agentUpdate = Invoke-InstallerStep -Label "$($profile.Label) global Agent update" -InstallerArgs @(
            "-Target", $profile.RequestedTarget, "-Type", "agent", "-Name", $profile.AgentName, "-SourceDir", $repoRoot
        )
        Assert-Equal @($agentUpdate.Output | Where-Object { $_ -match '^OK\s+update Agent ' }).Count 1 "$($profile.Label) Agent update count"
        Assert-FileContentMatches `
            -ActualPath $globalAgentPath `
            -ExpectedPath (Join-Path $repoRoot ("adapters\" + $profile.Adapter + "\" + $profile.AgentName + $profile.Suffix)) `
            -Label "$($profile.Label) updated global Agent"
        Assert-OwnershipMetadata `
            -Path ($globalAgentPath + ".craftroster.json") `
            -ExpectedRepo $expectedRepo `
            -ExpectedComponent "agent" `
            -ExpectedName $profile.AgentName `
            -ExpectedTarget $profile.OwnershipTarget `
            -ExpectedId $profile.AgentName `
            -ExpectedAdapter $profile.Adapter `
            -Label "$($profile.Label) updated global Agent"
    }
    Write-Pass "global Skill and Agent install/update matrix"

    $skillCollisionRoot = Join-Path $smokeRoot "project-skill-collision"
    $foreignSkillParent = Join-Path $skillCollisionRoot ".claude\skills"
    New-Item -ItemType Directory -Force -Path $foreignSkillParent | Out-Null
    $foreignSkill = Join-Path $foreignSkillParent "python-development"
    New-Item -ItemType Directory -Path $foreignSkill | Out-Null
    $foreignSkillFile = Join-Path $foreignSkill "SKILL.md"
    $foreignSkillMeta = Join-Path $foreignSkill ".skill-meta.json"
    [System.IO.File]::WriteAllText($foreignSkillFile, "FOREIGN SKILL SENTINEL - CRAFTROSTER MUST NOT REPLACE THIS FILE`n", [System.Text.UTF8Encoding]::new($false))
    $foreignSkillHash = Get-Sha256Hex -Path $foreignSkillFile
    Invoke-ExpectedFailure -Label "project Skill ownership collision" -ExpectedMessage "no matching CraftRoster metadata" -InstallerArgs @(
        "-Target", "project", "-Type", "skill", "-Name", "python-development", "-SourceDir", $repoRoot, "-InstallDir", $skillCollisionRoot
    )
    Assert-Equal (Get-Sha256Hex -Path $foreignSkillFile) $foreignSkillHash "foreign Skill sentinel hash"
    if (Test-Path -LiteralPath $foreignSkillMeta) {
        throw "Skill collision added ownership metadata to the foreign sentinel"
    }
    if (Test-Path -LiteralPath (Join-Path $skillCollisionRoot ".agents\skills\python-development")) {
        throw "Skill collision left a partial first-profile install"
    }

    $agentCollisionRoot = Join-Path $smokeRoot "project-agent-collision"
    $foreignAgentParent = Join-Path $agentCollisionRoot ".opencode\agents"
    New-Item -ItemType Directory -Force -Path $foreignAgentParent | Out-Null
    $foreignAgent = Join-Path $foreignAgentParent "code-reviewer.md"
    $foreignAgentMeta = $foreignAgent + ".craftroster.json"
    [System.IO.File]::WriteAllText($foreignAgent, "FOREIGN AGENT SENTINEL - CRAFTROSTER MUST NOT REPLACE THIS FILE`n", [System.Text.UTF8Encoding]::new($false))
    $foreignAgentHash = Get-Sha256Hex -Path $foreignAgent
    Invoke-ExpectedFailure -Label "project Agent ownership collision" -ExpectedMessage "no matching CraftRoster metadata" -InstallerArgs @(
        "-Target", "project", "-Type", "agent", "-Name", "code-reviewer", "-SourceDir", $repoRoot, "-InstallDir", $agentCollisionRoot
    )
    Assert-Equal (Get-Sha256Hex -Path $foreignAgent) $foreignAgentHash "foreign Agent sentinel hash"
    if (Test-Path -LiteralPath $foreignAgentMeta) {
        throw "Agent collision added ownership metadata to the foreign sentinel"
    }
    foreach ($partial in @(
        ".codex\agents\code-reviewer.toml",
        ".claude\agents\code-reviewer.md",
        ".cursor\agents\code-reviewer.md",
        ".github\agents\code-reviewer.agent.md"
    )) {
        $partialPath = Join-Path $agentCollisionRoot $partial
        if ((Test-Path -LiteralPath $partialPath) -or (Test-Path -LiteralPath ($partialPath + ".craftroster.json"))) {
            throw "Agent collision left a partial profile install: $partial"
        }
    }

    $skillOwnershipRoot = Join-Path $smokeRoot "skill-ownership-matrix"
    Invoke-InstallerStep -Label "Skill ownership matrix baseline install" -InstallerArgs @(
        "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $skillOwnershipRoot
    ) | Out-Null
    $ownedSkillRoot = Join-Path $skillOwnershipRoot "terminal-ops"
    $ownedSkillFile = Join-Path $ownedSkillRoot "SKILL.md"
    $ownedSkillMeta = Join-Path $ownedSkillRoot ".skill-meta.json"
    $ownedSkillBaselineMeta = Get-Content -Raw -LiteralPath $ownedSkillMeta
    $ownedSkillBaselineHash = Get-Sha256Hex -Path $ownedSkillFile

    $skillMetadataCases = @(
        @{ Label = "repo mismatch"; Field = "repo"; Value = "foreign/repository"; Expected = "installed from" },
        @{ Label = "repo case mismatch"; Field = "repo"; Value = "hsinpu/craftroster"; Expected = "installed from" },
        @{ Label = "component mismatch"; Field = "component"; Value = "agent"; Expected = "ownership metadata does not match" },
        @{ Label = "component case mismatch"; Field = "component"; Value = "Skill"; Expected = "ownership metadata does not match" },
        @{ Label = "name mismatch"; Field = "name"; Value = "python-development"; Expected = "ownership metadata does not match" },
        @{ Label = "stored input alias target"; Field = "target"; Value = "vscode"; Expected = "ownership metadata does not match" }
    )
    foreach ($case in $skillMetadataCases) {
        Write-Utf8NoBom -Path $ownedSkillMeta -Text $ownedSkillBaselineMeta
        Set-MetadataString -Path $ownedSkillMeta -Field $case.Field -Value $case.Value
        Invoke-ExpectedFailure -Label ("Skill ownership " + $case.Label) -ExpectedMessage $case.Expected -InstallerArgs @(
            "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $skillOwnershipRoot
        )
        Assert-Equal (Get-Sha256Hex -Path $ownedSkillFile) $ownedSkillBaselineHash ("Skill ownership " + $case.Label + " content hash")
    }

    $missingDigestMetadata = $ownedSkillBaselineMeta | ConvertFrom-Json
    $missingDigestMetadata.PSObject.Properties.Remove("contentSha256")
    Write-Utf8NoBom -Path $ownedSkillMeta -Text (($missingDigestMetadata | ConvertTo-Json -Depth 5) + "`n")
    Invoke-ExpectedFailure -Label "Skill unverified missing content digest refusal" -ExpectedMessage "does not match a verified legacy Skill release" -InstallerArgs @(
        "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $skillOwnershipRoot
    )
    Assert-Equal (Get-Sha256Hex -Path $ownedSkillFile) $ownedSkillBaselineHash "unverified missing digest preserved Skill content"

    $legacyDigestMetadata = $ownedSkillBaselineMeta | ConvertFrom-Json
    $legacyDigestMetadata.contentSha256 = Get-CanonicalSingleFileSkillSha256 `
        -Path $ownedSkillFile `
        -RelativePath "SKILL.md" `
        -DigestNamespace 'autoverse-skill-content-v1'
    Write-Utf8NoBom -Path $ownedSkillMeta -Text (($legacyDigestMetadata | ConvertTo-Json -Depth 5) + "`n")
    $legacyDigestMigration = Invoke-InstallerStep -Label "Skill legacy digest namespace migration" -InstallerArgs @(
        "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $skillOwnershipRoot
    )
    Assert-Equal @($legacyDigestMigration.Output | Where-Object { $_ -match '^OK\s+migrate-update Skill ' }).Count 1 "Skill legacy digest migration count"
    Assert-OwnershipMetadata -Path $ownedSkillMeta -ExpectedRepo $expectedRepo -ExpectedComponent "skill" -ExpectedName "terminal-ops" -ExpectedTarget "claude" -Label "legacy digest migrated Skill"

    Write-Utf8NoBom -Path $ownedSkillMeta -Text $ownedSkillBaselineMeta
    Set-MetadataString -Path $ownedSkillMeta -Field "repo" -Value $legacyRepo
    Set-MetadataString -Path $ownedSkillMeta -Field "contentSha256" -Value $legacyDigestMetadata.contentSha256
    $skillRepositoryMigration = Invoke-InstallerStep -Label "Skill legacy repository migration" -InstallerArgs @(
        "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $skillOwnershipRoot
    )
    Assert-Equal @($skillRepositoryMigration.Output | Where-Object { $_ -match '^OK\s+migrate-update Skill ' }).Count 1 "Skill legacy repository migration count"
    Assert-OwnershipMetadata -Path $ownedSkillMeta -ExpectedRepo $expectedRepo -ExpectedComponent "skill" -ExpectedName "terminal-ops" -ExpectedTarget "claude" -Label "legacy repository migrated Skill"

    Write-Utf8NoBom -Path $ownedSkillMeta -Text $ownedSkillBaselineMeta
    Set-MetadataString -Path $ownedSkillMeta -Field "repo" -Value $legacyRepo
    Invoke-ExpectedFailure -Label "Skill explicit repository disables transition" -ExpectedMessage "installed from '$legacyRepo'" -InstallerArgs @(
        "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-Repo", $expectedRepo, "-SourceDir", $repoRoot, "-InstallDir", $skillOwnershipRoot
    )
    Assert-Equal (Get-Content -Raw -LiteralPath $ownedSkillMeta | ConvertFrom-Json).repo $legacyRepo "explicit repository refusal preserved legacy Skill owner"

    Write-Utf8NoBom -Path $ownedSkillMeta -Text "{`n"
    Invoke-ExpectedFailure -Label "Skill malformed ownership metadata" -ExpectedMessage "Existing CraftRoster metadata is invalid" -InstallerArgs @(
        "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $skillOwnershipRoot
    )
    Assert-Equal (Get-Sha256Hex -Path $ownedSkillFile) $ownedSkillBaselineHash "Skill malformed metadata content hash"

    Write-Utf8NoBom -Path $ownedSkillMeta -Text $ownedSkillBaselineMeta
    Set-MetadataString -Path $ownedSkillMeta -Field "repo" -Value "foreign/repository"
    $forcedSkill = Invoke-InstallerStep -Label "Skill explicit force replacement" -InstallerArgs @(
        "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $skillOwnershipRoot, "-Force"
    )
    Assert-Equal @($forcedSkill.Output | Where-Object { $_ -match '^OK\s+force-replace Skill ' }).Count 1 "Skill force replacement count"
    Assert-OwnershipMetadata -Path $ownedSkillMeta -ExpectedRepo $expectedRepo -ExpectedComponent "skill" -ExpectedName "terminal-ops" -ExpectedTarget "claude" -Label "forced Skill"

    $expectedTerminalOpsDigest = Get-CanonicalSingleFileSkillSha256 `
        -Path (Join-Path $repoRoot "skills\terminal-ops\SKILL.md") `
        -RelativePath "SKILL.md"
    $forcedMetadata = Get-Content -Raw -LiteralPath $ownedSkillMeta | ConvertFrom-Json
    Assert-Equal $forcedMetadata.contentSha256 $expectedTerminalOpsDigest "Skill canonical content digest"

    $localDriftFile = Join-Path $ownedSkillRoot "LOCAL-DRIFT.txt"
    Write-Utf8NoBom -Path $localDriftFile -Text "local customization that must not be overwritten`n"
    $driftFileHash = Get-Sha256Hex -Path $localDriftFile
    $driftSkillHash = Get-Sha256Hex -Path $ownedSkillFile
    $driftMetadataText = Get-Content -Raw -LiteralPath $ownedSkillMeta
    Invoke-ExpectedFailure -Label "Skill local content drift refusal" -ExpectedMessage "installed Skill content has changed since the last CraftRoster install" -InstallerArgs @(
        "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $skillOwnershipRoot
    )
    Assert-Equal (Get-Sha256Hex -Path $localDriftFile) $driftFileHash "drift refusal local file hash"
    Assert-Equal (Get-Sha256Hex -Path $ownedSkillFile) $driftSkillHash "drift refusal Skill hash"
    Assert-Equal (Get-Content -Raw -LiteralPath $ownedSkillMeta) $driftMetadataText "drift refusal metadata"
    Assert-NoAtomicSkillArtifacts -DestinationRoot $skillOwnershipRoot -Label "drift refusal"

    $forcedDriftReset = Invoke-InstallerStep -Label "Skill local drift force reset" -InstallerArgs @(
        "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $skillOwnershipRoot, "-Force"
    )
    Assert-Equal @($forcedDriftReset.Output | Where-Object { $_ -match '^OK\s+force-replace Skill ' }).Count 1 "Skill drift force replacement count"
    if (Test-Path -LiteralPath $localDriftFile) { throw "Skill force reset preserved the local drift file" }
    $resetMetadata = Get-Content -Raw -LiteralPath $ownedSkillMeta | ConvertFrom-Json
    Assert-Equal $resetMetadata.contentSha256 $expectedTerminalOpsDigest "force reset content digest"
    Assert-NoAtomicSkillArtifacts -DestinationRoot $skillOwnershipRoot -Label "force reset"

    $rollbackSentinel = Join-Path $ownedSkillRoot "ROLLBACK-SENTINEL.txt"
    Write-Utf8NoBom -Path $rollbackSentinel -Text "the original directory must return after an injected commit failure`n"
    $rollbackSentinelHash = Get-Sha256Hex -Path $rollbackSentinel
    $rollbackSkillHash = Get-Sha256Hex -Path $ownedSkillFile
    $rollbackMetadataText = Get-Content -Raw -LiteralPath $ownedSkillMeta
    $faultEnvironmentNames = @(
        "CRAFTROSTER_INSTALLER_TEST_MODE",
        "CRAFTROSTER_INSTALLER_TEST_ACK",
        "CRAFTROSTER_INSTALLER_TEST_FAULT"
    )
    $savedFaultEnvironment = @{}
    foreach ($name in $faultEnvironmentNames) {
        $savedFaultEnvironment[$name] = [Environment]::GetEnvironmentVariable($name, "Process")
    }
    try {
        $env:CRAFTROSTER_INSTALLER_TEST_MODE = "skill-atomic-swap"
        $env:CRAFTROSTER_INSTALLER_TEST_ACK = "invalid-acknowledgement"
        $env:CRAFTROSTER_INSTALLER_TEST_FAULT = "after-backup"
        Invoke-ExpectedFailure -Label "Skill fault injection strict gate" -ExpectedMessage "Invalid test-only Skill fault injection configuration" -InstallerArgs @(
            "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $skillOwnershipRoot, "-Force"
        )
        Assert-NoAtomicSkillArtifacts -DestinationRoot $skillOwnershipRoot -Label "invalid fault gate"

        $env:CRAFTROSTER_INSTALLER_TEST_ACK = "I_UNDERSTAND_THIS_IS_TEST_ONLY"
        Invoke-ExpectedFailure -Label "Skill atomic rollback after backup" -ExpectedMessage "Injected test-only failure after Skill backup" -InstallerArgs @(
            "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $skillOwnershipRoot, "-Force"
        )

        Assert-Equal (Get-Sha256Hex -Path $rollbackSentinel) $rollbackSentinelHash "atomic rollback sentinel hash before race"
        Assert-Equal (Get-Sha256Hex -Path $ownedSkillFile) $rollbackSkillHash "atomic rollback Skill hash before race"
        Assert-Equal (Get-Content -Raw -LiteralPath $ownedSkillMeta) $rollbackMetadataText "atomic rollback metadata before race"

        $env:CRAFTROSTER_INSTALLER_TEST_FAULT = "after-recheck-target-replaced"
        Invoke-ExpectedFailure -Label "Skill final-check replacement preserves foreign backup" -ExpectedMessage "Manual recovery required" -InstallerArgs @(
            "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $skillOwnershipRoot, "-Force"
        )
        if (Test-Path -LiteralPath $ownedSkillRoot) {
            throw "Skill final-check replacement unexpectedly recreated the destination"
        }
        $replacementBackups = @(Get-ChildItem -Force -LiteralPath $skillOwnershipRoot -Directory | Where-Object {
            $_.Name -like '.cr-b-*'
        })
        $replacementOriginals = @(Get-ChildItem -Force -LiteralPath $skillOwnershipRoot -Directory | Where-Object {
            $_.Name -like '.cr-f-*'
        })
        Assert-Equal $replacementBackups.Count 1 "Skill final-check replacement foreign backup count"
        Assert-Equal $replacementOriginals.Count 1 "Skill final-check replacement original count"
        $replacementBackup = $replacementBackups[0].FullName
        $replacementOriginal = $replacementOriginals[0].FullName
        if (-not (Test-Path -LiteralPath (Join-Path $replacementBackup "CRAFTROSTER-REPLACEMENT-NEWCOMER.txt") -PathType Leaf)) {
            throw "Skill final-check replacement deleted the foreign directory"
        }
        Assert-Equal (Get-Sha256Hex -Path (Join-Path $replacementOriginal "ROLLBACK-SENTINEL.txt")) $rollbackSentinelHash "Skill final-check replacement original sentinel hash"
        Assert-Equal (Get-Sha256Hex -Path (Join-Path $replacementOriginal "SKILL.md")) $rollbackSkillHash "Skill final-check replacement original Skill hash"
        Assert-Equal (Get-Content -Raw -LiteralPath (Join-Path $replacementOriginal ".skill-meta.json")) $rollbackMetadataText "Skill final-check replacement original metadata"
        Remove-Item -Recurse -Force -LiteralPath $replacementBackup
        [System.IO.Directory]::Move($replacementOriginal, $ownedSkillRoot)
        Assert-NoAtomicSkillArtifacts -DestinationRoot $skillOwnershipRoot -Label "final-check replacement recovery"

        $env:CRAFTROSTER_INSTALLER_TEST_FAULT = "after-recheck-destination-appears"
        Invoke-ExpectedFailure -Label "Skill destination race preserves newcomer" -ExpectedMessage "Manual recovery required" -InstallerArgs @(
            "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $skillOwnershipRoot, "-Force"
        )
        $newcomerSentinel = Join-Path $ownedSkillRoot "CRAFTROSTER-NEWCOMER.txt"
        if (-not (Test-Path -LiteralPath $newcomerSentinel -PathType Leaf)) {
            throw "Skill destination race removed the newcomer sentinel"
        }
        $raceBackups = @(Get-ChildItem -Force -LiteralPath $skillOwnershipRoot -Directory | Where-Object {
            $_.Name -like '.cr-b-*'
        })
        Assert-Equal $raceBackups.Count 1 "Skill destination race retained backup count"
        $raceBackup = $raceBackups[0].FullName
        Assert-Equal (Get-Sha256Hex -Path (Join-Path $raceBackup "ROLLBACK-SENTINEL.txt")) $rollbackSentinelHash "Skill destination race backup sentinel hash"
        Assert-Equal (Get-Sha256Hex -Path (Join-Path $raceBackup "SKILL.md")) $rollbackSkillHash "Skill destination race backup Skill hash"
        Assert-Equal (Get-Content -Raw -LiteralPath (Join-Path $raceBackup ".skill-meta.json")) $rollbackMetadataText "Skill destination race backup metadata"

        Remove-Item -Recurse -Force -LiteralPath $ownedSkillRoot
        [System.IO.Directory]::Move($raceBackup, $ownedSkillRoot)

        $freshPostMoveRoot = Join-Path $smokeRoot "fresh-post-move-fault"
        New-Item -ItemType Directory -Path $freshPostMoveRoot | Out-Null
        $env:CRAFTROSTER_INSTALLER_TEST_FAULT = "fresh-post-move-fail"
        Invoke-ExpectedFailure -Label "fresh Skill post-move failure cleans only transaction" -ExpectedMessage "Injected test-only failure after fresh Skill stage move" -InstallerArgs @(
            "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $freshPostMoveRoot
        )
        if (Test-Path -LiteralPath (Join-Path $freshPostMoveRoot "terminal-ops")) {
            throw "fresh Skill post-move failure left the transaction at its destination"
        }
        Assert-NoAtomicSkillArtifacts -DestinationRoot $freshPostMoveRoot -Label "fresh post-move failure"

        $stageCollisionRoot = Join-Path $smokeRoot "stage-collision-fault"
        New-Item -ItemType Directory -Path $stageCollisionRoot | Out-Null
        $env:CRAFTROSTER_INSTALLER_TEST_FAULT = "stage-path-collision"
        Invoke-ExpectedFailure -Label "Skill stage collision preserves newcomer" -ExpectedMessage "refusing to clean an unrecognized or changed atomic Skill stage" -InstallerArgs @(
            "-Target", "claude", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $stageCollisionRoot
        )
        if (Test-Path -LiteralPath (Join-Path $stageCollisionRoot "terminal-ops")) {
            throw "Skill stage collision unexpectedly installed the Skill"
        }
        $collisionStages = @(Get-ChildItem -Force -LiteralPath $stageCollisionRoot -Directory | Where-Object {
            $_.Name -like '.cr-s-*'
        })
        Assert-Equal $collisionStages.Count 1 "Skill stage collision retained newcomer count"
        $collisionStage = $collisionStages[0].FullName
        if (-not (Test-Path -LiteralPath (Join-Path $collisionStage "CRAFTROSTER-STAGE-NEWCOMER.txt") -PathType Leaf)) {
            throw "Skill stage collision deleted the newcomer sentinel"
        }
        Remove-Item -Recurse -Force -LiteralPath $collisionStage
        Assert-NoAtomicSkillArtifacts -DestinationRoot $stageCollisionRoot -Label "stage collision manual recovery"
    } finally {
        foreach ($name in $faultEnvironmentNames) {
            if ($null -eq $savedFaultEnvironment[$name]) {
                Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
            } else {
                Set-Item -LiteralPath "Env:$name" -Value $savedFaultEnvironment[$name]
            }
        }
    }
    Assert-Equal (Get-Sha256Hex -Path $rollbackSentinel) $rollbackSentinelHash "atomic rollback sentinel hash"
    Assert-Equal (Get-Sha256Hex -Path $ownedSkillFile) $rollbackSkillHash "atomic rollback Skill hash"
    Assert-Equal (Get-Content -Raw -LiteralPath $ownedSkillMeta) $rollbackMetadataText "atomic rollback metadata"
    Assert-NoAtomicSkillArtifacts -DestinationRoot $skillOwnershipRoot -Label "atomic rollback"
    Write-Pass "Skill digest, local drift refusal, force reset, and atomic rollback"

    $legacySkillRoot = Join-Path $smokeRoot "legacy-skill-migration"
    New-Item -ItemType Directory -Force -Path $legacySkillRoot | Out-Null
    Copy-Item -Recurse -LiteralPath $legacySkillFixture -Destination $legacySkillRoot
    $legacySkillTarget = Join-Path $legacySkillRoot "terminal-ops"
    $legacyTimestamp = "2026-01-01T00:00:00Z"
    $legacySkillMetadata = @{
        source = "local-checkout"
        repo = $legacyRepo
        branch = "main"
        name = "terminal-ops"
        agent = "vscode"
        installedAt = $legacyTimestamp
        updatedAt = $legacyTimestamp
    } | ConvertTo-Json -Depth 3
    Write-Utf8NoBom -Path (Join-Path $legacySkillTarget ".skill-meta.json") -Text ($legacySkillMetadata + "`n")
    $legacySkillFile = Join-Path $legacySkillTarget "SKILL.md"
    [System.IO.File]::AppendAllText($legacySkillFile, "`nLOCAL_DRIFT_SENTINEL`n", [System.Text.UTF8Encoding]::new($false))
    Invoke-ExpectedFailure -Label "legacy Skill schema local drift refusal" -ExpectedMessage "does not match a verified legacy Skill release" -InstallerArgs @(
        "-Target", "copilot", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $legacySkillRoot
    )
    Assert-Equal ([System.IO.File]::ReadAllText($legacySkillFile).Contains("LOCAL_DRIFT_SENTINEL")) $true "legacy Skill drift preservation"
    Copy-Item -Force -LiteralPath (Join-Path $legacySkillFixture "SKILL.md") -Destination $legacySkillFile
    $legacySkillMigration = Invoke-InstallerStep -Label "legacy Skill schema migration" -InstallerArgs @(
        "-Target", "copilot", "-Type", "skill", "-Name", "terminal-ops", "-SourceDir", $repoRoot, "-InstallDir", $legacySkillRoot
    )
    Assert-Equal @($legacySkillMigration.Output | Where-Object { $_ -match '^OK\s+migrate-update Skill ' }).Count 1 "legacy Skill schema migration count"
    Assert-OwnershipMetadata -Path (Join-Path $legacySkillTarget ".skill-meta.json") -ExpectedRepo $expectedRepo -ExpectedComponent "skill" -ExpectedName "terminal-ops" -ExpectedTarget "copilot" -Label "legacy schema migrated Skill"

    $agentOwnershipRoot = Join-Path $smokeRoot "agent-ownership-matrix"
    Invoke-InstallerStep -Label "Agent ownership matrix baseline install" -InstallerArgs @(
        "-Target", "claude", "-Type", "agent", "-Name", "code-reviewer", "-SourceDir", $repoRoot, "-InstallDir", $agentOwnershipRoot
    ) | Out-Null
    $ownedAgentFile = Join-Path $agentOwnershipRoot "code-reviewer.md"
    $ownedAgentMeta = $ownedAgentFile + ".craftroster.json"
    $legacyAgentMeta = $ownedAgentFile + ".autoverse.json"
    $ownedAgentBaselineMeta = Get-Content -Raw -LiteralPath $ownedAgentMeta
    $ownedAgentBaselineHash = Get-Sha256Hex -Path $ownedAgentFile

    Move-Item -LiteralPath $ownedAgentMeta -Destination $legacyAgentMeta
    Set-MetadataString -Path $legacyAgentMeta -Field "repo" -Value $legacyRepo
    $agentRepositoryMigration = Invoke-InstallerStep -Label "Agent legacy repository and sidecar migration" -InstallerArgs @(
        "-Target", "claude", "-Type", "agent", "-Name", "code-reviewer", "-SourceDir", $repoRoot, "-InstallDir", $agentOwnershipRoot
    )
    Assert-Equal @($agentRepositoryMigration.Output | Where-Object { $_ -match '^OK\s+migrate-update Agent ' }).Count 1 "Agent legacy repository migration count"
    Assert-OwnershipMetadata -Path $ownedAgentMeta -ExpectedRepo $expectedRepo -ExpectedComponent "agent" -ExpectedName "code-reviewer" -ExpectedTarget "claude" -ExpectedId "code-reviewer" -ExpectedAdapter "claude" -Label "legacy sidecar migrated Agent"
    if (Test-Path -LiteralPath $legacyAgentMeta) { throw "Agent migration retained the legacy sidecar" }

    Move-Item -LiteralPath $ownedAgentMeta -Destination $legacyAgentMeta
    Set-MetadataString -Path $legacyAgentMeta -Field "repo" -Value $legacyRepo
    Invoke-ExpectedFailure -Label "Agent explicit repository disables transition" -ExpectedMessage "installed from '$legacyRepo'" -InstallerArgs @(
        "-Target", "claude", "-Type", "agent", "-Name", "code-reviewer", "-Repo", $expectedRepo, "-SourceDir", $repoRoot, "-InstallDir", $agentOwnershipRoot
    )
    if (Test-Path -LiteralPath $ownedAgentMeta) { throw "Agent explicit repository refusal created canonical metadata" }
    Assert-Equal (Get-Content -Raw -LiteralPath $legacyAgentMeta | ConvertFrom-Json).repo $legacyRepo "Agent explicit repository refusal preserved legacy owner"
    Invoke-InstallerStep -Label "Agent transition after explicit repository refusal" -InstallerArgs @(
        "-Target", "claude", "-Type", "agent", "-Name", "code-reviewer", "-SourceDir", $repoRoot, "-InstallDir", $agentOwnershipRoot
    ) | Out-Null

    Move-Item -LiteralPath $ownedAgentMeta -Destination $legacyAgentMeta
    $canonicalRepositorySidecarMigration = Invoke-InstallerStep -Label "Agent canonical repository legacy sidecar migration" -InstallerArgs @(
        "-Target", "claude", "-Type", "agent", "-Name", "code-reviewer", "-SourceDir", $repoRoot, "-InstallDir", $agentOwnershipRoot
    )
    Assert-Equal @($canonicalRepositorySidecarMigration.Output | Where-Object { $_ -match '^OK\s+migrate-update Agent ' }).Count 1 "Agent canonical repository legacy sidecar migration count"
    if (Test-Path -LiteralPath $legacyAgentMeta) { throw "Agent canonical repository migration retained the legacy sidecar" }

    Copy-Item -LiteralPath $ownedAgentMeta -Destination $legacyAgentMeta
    $duplicateSidecarRecovery = Invoke-InstallerStep -Label "Agent verified duplicate legacy sidecar cleanup" -InstallerArgs @(
        "-Target", "claude", "-Type", "agent", "-Name", "code-reviewer", "-SourceDir", $repoRoot, "-InstallDir", $agentOwnershipRoot
    )
    Assert-Equal @($duplicateSidecarRecovery.Output | Where-Object { $_ -match '^OK\s+migrate-update Agent ' }).Count 1 "Agent duplicate sidecar cleanup count"
    if (Test-Path -LiteralPath $legacyAgentMeta) { throw "Agent duplicate sidecar recovery retained the verified legacy sidecar" }

    foreach ($case in @(
        @{ Label = "repo mismatch"; Field = "repo"; Value = "foreign/repository"; Expected = "installed from" },
        @{ Label = "repo case mismatch"; Field = "repo"; Value = "hsinpu/craftroster"; Expected = "installed from" },
        @{ Label = "stored input alias target"; Field = "target"; Value = "vscode"; Expected = "ownership metadata does not match" },
        @{ Label = "id mismatch"; Field = "id"; Value = "debugger"; Expected = "ownership metadata does not match" },
        @{ Label = "adapter mismatch"; Field = "adapter"; Value = "codex"; Expected = "ownership metadata does not match" }
    )) {
        Write-Utf8NoBom -Path $ownedAgentMeta -Text $ownedAgentBaselineMeta
        Set-MetadataString -Path $ownedAgentMeta -Field $case.Field -Value $case.Value
        Invoke-ExpectedFailure -Label ("Agent ownership " + $case.Label) -ExpectedMessage $case.Expected -InstallerArgs @(
            "-Target", "claude", "-Type", "agent", "-Name", "code-reviewer", "-SourceDir", $repoRoot, "-InstallDir", $agentOwnershipRoot
        )
        Assert-Equal (Get-Sha256Hex -Path $ownedAgentFile) $ownedAgentBaselineHash ("Agent ownership " + $case.Label + " content hash")
    }
    Write-Pass "ownership metadata mismatch, strict schema, transition, malformed metadata, and force matrix"

    $alternateCodexSkillRoot = Join-Path $env:USERPROFILE ".agents\skills"
    Invoke-InstallerStep -Label "Codex alternate-root transition fixture install" -InstallerArgs @(
        "-Target", "codex", "-Type", "skill", "-Name", "hotkey", "-SourceDir", $repoRoot, "-InstallDir", $alternateCodexSkillRoot
    ) | Out-Null
    $alternateCodexSkill = Join-Path $alternateCodexSkillRoot "hotkey"
    $alternateCodexMeta = Join-Path $alternateCodexSkill ".skill-meta.json"
    $alternateLegacyDigest = Get-CanonicalSingleFileSkillSha256 `
        -Path (Join-Path $alternateCodexSkill "SKILL.md") `
        -RelativePath "SKILL.md" `
        -DigestNamespace 'autoverse-skill-content-v1'
    Set-MetadataString -Path $alternateCodexMeta -Field "repo" -Value $legacyRepo
    Set-MetadataString -Path $alternateCodexMeta -Field "contentSha256" -Value $alternateLegacyDigest
    $alternateCodexMigration = Invoke-InstallerStep -Label "Codex alternate-root Skill migration" -InstallerArgs @(
        "-Target", "codex", "-Type", "skill", "-Name", "hotkey", "-SourceDir", $repoRoot
    )
    Assert-Equal @($alternateCodexMigration.Output | Where-Object { $_ -match '^OK\s+migrate-update Skill ' }).Count 1 "Codex alternate-root migration count"
    Assert-OwnershipMetadata -Path $alternateCodexMeta -ExpectedRepo $expectedRepo -ExpectedComponent "skill" -ExpectedName "hotkey" -ExpectedTarget "codex" -Label "Codex alternate-root migrated Skill"
    if (Test-Path -LiteralPath (Join-Path $env:CODEX_HOME "skills\hotkey")) {
        throw "Codex alternate-root migration created a duplicate in the canonical root"
    }

    $configPath = Join-Path $env:CODEX_HOME "config.toml"
    New-Item -ItemType Directory -Force -Path $env:CODEX_HOME | Out-Null
    Write-Utf8NoBom -Path $configPath -Text @"
# CRAFTROSTER_AUTO_DELEGATION_END
model = "test-model"

developer_instructions = '''
Existing instructions that must remain untouched.
'''
"@
    $malformedMarkerHash = Get-Sha256Hex -Path $configPath
    Invoke-ExpectedFailure -Label "Codex malformed auto-delegation marker diagnostics" -ExpectedMessage "START=0 at lines none; END=1 at lines 1" -InstallerArgs @(
        "-Target", "codex", "-Type", "agent", "-Name", "debugger", "-SourceDir", $repoRoot, "-EnableAutoDelegation", "-Force"
    )
    Assert-Equal (Get-Sha256Hex -Path $configPath) $malformedMarkerHash "Codex malformed marker refusal config hash"

    Write-Utf8NoBom -Path $configPath -Text @"
model = "test-model"

developer_instructions = '''
Existing instructions that must remain untouched.
'''
"@
    $existingInstructionsHash = Get-Sha256Hex -Path $configPath
    Invoke-ExpectedFailure -Label "Codex existing developer instructions recovery guidance" -ExpectedMessage "rerun without -EnableAutoDelegation" -InstallerArgs @(
        "-Target", "codex", "-Type", "agent", "-Name", "debugger", "-SourceDir", $repoRoot, "-EnableAutoDelegation", "-Force"
    )
    Assert-Equal (Get-Sha256Hex -Path $configPath) $existingInstructionsHash "Codex existing instructions refusal config hash"

    foreach ($ending in @(@{ Name = 'LF'; Value = "`n" }, @{ Name = 'CRLF'; Value = "`r`n" })) {
        $legacyConfigLines = @(
            '# AUTOVERSE_AUTO_DELEGATION_START',
            "developer_instructions = '''",
            'Legacy managed guidance that must be replaced.',
            "'''",
            '# AUTOVERSE_AUTO_DELEGATION_END',
            'model = "test-model"'
        )
        Write-Utf8NoBom -Path $configPath -Text ($legacyConfigLines -join $ending.Value)
        $codexMigration = Invoke-InstallerStep -Label "Codex $($ending.Name) legacy auto-delegation migration" -InstallerArgs @(
            "-Target", "codex", "-Type", "agent", "-Name", "debugger", "-SourceDir", $repoRoot, "-EnableAutoDelegation"
        )
        Assert-Equal @($codexMigration.Output | Where-Object { $_ -match '^OK\s+migrate-update Codex auto-delegation ' }).Count 1 "Codex legacy auto-delegation migration count"
        $migratedConfigText = Get-Content -Raw -LiteralPath $configPath
        Assert-Equal ([regex]::Matches($migratedConfigText, '(?m)^# AUTOVERSE_AUTO_DELEGATION_START\s*$').Count) 0 "Codex legacy marker removal count"
        Assert-Equal ([regex]::Matches($migratedConfigText, '(?m)^# CRAFTROSTER_AUTO_DELEGATION_START\s*$').Count) 1 "Codex migrated marker count"
        if ($migratedConfigText -cnotmatch 'model = "test-model"') { throw "Codex auto-delegation migration did not preserve the unmanaged config tail" }
    }
    $codexUpdate = Invoke-InstallerStep -Label "Codex auto-delegation update" -InstallerArgs @(
        "-Target", "codex", "-Type", "agent", "-Name", "debugger", "-SourceDir", $repoRoot, "-EnableAutoDelegation"
    )
    Assert-Equal @($codexUpdate.Output | Where-Object { $_ -match '^OK\s+update Agent ' }).Count 1 "Codex Agent update count"
    $configText = Get-Content -Raw -LiteralPath $configPath
    Assert-Equal ([regex]::Matches($configText, '(?m)^# CRAFTROSTER_AUTO_DELEGATION_START\s*$').Count) 1 "Codex auto-delegation block count"
    if (-not (Test-Path -LiteralPath (Join-Path $env:CODEX_HOME "agents\debugger.toml") -PathType Leaf)) {
        throw "Codex Agent was not installed in the isolated CODEX_HOME"
    }

    Write-Host "PowerShell installer smoke passed: $expectedSkills Skills, $expectedAgents Agents."
} finally {
    if (Test-Path -LiteralPath $smokeRoot) {
        $safeRoot = Assert-SafeSmokeRoot -Path $smokeRoot
        $item = Get-Item -Force -LiteralPath $safeRoot
        if (($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Refusing to clean a reparse-point smoke root: $safeRoot"
        }
        Remove-Item -Recurse -Force -LiteralPath $safeRoot
    }
    foreach ($name in $originalEnvironment.Keys) {
        if ($null -eq $originalEnvironment[$name]) {
            Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
        } else {
            Set-Item -LiteralPath "Env:$name" -Value $originalEnvironment[$name]
        }
    }
}

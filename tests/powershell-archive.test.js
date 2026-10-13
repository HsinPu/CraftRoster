#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

if (process.platform !== 'win32') {
  console.log('SKIP PowerShell archive regression: Windows filesystem and PowerShell runtimes required.');
  process.exit(0);
}
const flag = process.argv.indexOf('--powershell');
const powershell = flag >= 0 ? process.argv[flag + 1] : 'powershell.exe';
assert.ok(powershell, '--powershell requires an executable');
const root = path.resolve(__dirname, '..');
const temp = fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()), 'crzip-'));
const script = String.raw`
param([string]$Repo, [string]$Work)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
function Assert-Condition($Condition, [string]$Message) {
    if (-not $Condition) { throw "Assertion failed: $Message" }
}
function Get-Extractor([string]$File, [string]$FunctionName = 'Expand-InstallerSourceArchive') {
    $tokens = $null; $errors = $null
    $ast = [System.Management.Automation.Language.Parser]::ParseFile($File, [ref]$tokens, [ref]$errors)
    Assert-Condition ($errors.Count -eq 0) "Source parser errors: $File"
    $matches = @($ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $FunctionName }, $false))
    Assert-Condition ($matches.Count -eq 1) "Exactly one archive extractor: $File"
    return $matches[0].Extent.Text
}
$setup = Get-Extractor (Join-Path $Repo 'scripts/setup.ps1')
$install = Get-Extractor (Join-Path $Repo 'scripts/install.ps1')
Assert-Condition (($setup -replace '\r\n', [string][char]10) -ceq ($install -replace '\r\n', [string][char]10)) 'Bootstrap extractors must remain synchronized'
Write-Output 'PASS synchronized AST-extracted bootstrap functions'
function New-Zip([string]$File, $Entries) {
    $archive = [System.IO.Compression.ZipFile]::Open($File, [System.IO.Compression.ZipArchiveMode]::Create)
    try {
        foreach ($item in $Entries) {
            $entry = $archive.CreateEntry($item.Name)
            if ($item.ContainsKey('Attributes')) { $entry.ExternalAttributes = $item.Attributes }
            $stream = $entry.Open()
            try {
                $bytes = if ($item.ContainsKey('Bytes')) { $item.Bytes } else { [Text.Encoding]::UTF8.GetBytes('fixture') }
                $stream.Write($bytes, 0, $bytes.Length)
            } finally { $stream.Dispose() }
        }
    } finally { $archive.Dispose() }
}
$payload = [byte[]](0, 1, 2, 10, 13, 127, 128, 255)
$longRoot = 'CraftRoster-' + ('x' * 180)
$deep = ('d' * 70) + '/' + ('e' * 70) + '/' + ('f' * 70)
$cases = @(
    @{ Label = 'long branch root and excluded over-260 docs'; Entries = @(
        @{Name = "$longRoot/scripts/install.ps1"; Bytes = $payload},
        @{Name = "$longRoot/README.md"; Bytes = $payload},
        @{Name = "$longRoot/docs/$deep/evidence.md"},
        @{Name = "$longRoot/tests/ignored.js"},
        @{Name = "$longRoot/skills/drawing/SKILL.md"; Bytes = $payload},
        @{Name = "$longRoot/skills/drawing/docs/guide.md"; Bytes = $payload},
        @{Name = "$longRoot/skills/drawing/tests/check.js"; Bytes = $payload},
        @{Name = "$longRoot/skills/drawing/evals/eval.json"; Bytes = $payload},
        @{Name = "$longRoot/adapters/codex/artist.toml"; Bytes = $payload},
        @{Name = "$longRoot/agents/artist.md"; Bytes = $payload}
    ); Files = @('scripts/install.ps1', 'README.md', 'skills/drawing/SKILL.md', 'skills/drawing/docs/guide.md', 'skills/drawing/tests/check.js', 'skills/drawing/evals/eval.json', 'adapters/codex/artist.toml', 'agents/artist.md') },
    @{Label = 'flat Skill keeps complete resource subtree'; Entries = @(@{Name='branch/drawing/SKILL.md'; Bytes=$payload}, @{Name='branch/drawing/docs/guide.md'; Bytes=$payload}, @{Name='branch/drawing/tests/check.js'; Bytes=$payload}, @{Name='branch/drawing/evals/eval.json'; Bytes=$payload}, @{Name='branch/docs/ignored.md'}); Files=@('drawing/SKILL.md','drawing/docs/guide.md','drawing/tests/check.js','drawing/evals/eval.json')},
    @{Label = 'excluded docs traversal rejects before writes'; Bad = 'branch/docs/../escape.md'},
    @{Label = 'absolute path'; Bad = '/escape.md'},
    @{Label = 'UNC path'; Bad = '\\server\share\escape.md'},
    @{Label = 'drive path'; Bad = 'C:/escape.md'},
    @{Label = 'alternate data stream'; Bad = 'branch/docs/item.md:stream'},
    @{Label = 'control character'; Bad = 'branch/docs/bad~.md'; PatchControl=$true},
    @{Label = 'duplicate file'; Entries=@(@{Name='branch/scripts/a.ps1'}, @{Name='branch/scripts/a.ps1'}); Reject=$true},
    @{Label = 'case collision in excluded docs'; Entries=@(@{Name='branch/docs/A.md'}, @{Name='branch/docs/a.md'}); Reject=$true},
    @{Label = 'symlink in excluded docs'; Entries=@(@{Name='branch/docs/link'; Attributes=[int]0xA0000000}); Reject=$true},
    @{Label = 'archive reparse flag'; Entries=@(@{Name='branch/docs/link'; Attributes=0x400}); Reject=$true},
    @{Label = 'file parent conflict'; Entries=@(@{Name='branch/docs/p'}, @{Name='branch/docs/p/child.md'}); Reject=$true},
    @{Label = 'multiple roots'; Entries=@(@{Name='branch/scripts/a.ps1'}, @{Name='other/scripts/b.ps1'}); Reject=$true},
    @{Label = 'reserved Windows filename'; Bad='branch/docs/CON.md'},
    @{Label = 'trailing dot alias'; Bad='branch/docs/file.md.'},
    @{Label = 'empty archive'; Entries=@(); Reject=$true},
    @{Label = 'corrupt archive'; Corrupt=$true; Reject=$true},
    @{Label = 'nonempty destination'; Nonempty=$true; Reject=$true},
    @{Label = 'destination junction'; Junction=$true; Reject=$true},
    @{Label = 'selected long resource preflight'; Entries=@(@{Name="branch/skills/drawing/$deep/resource.md"}); Reject=($PSVersionTable.PSVersion.Major -lt 6); Long=$true}
)
$count = 1
foreach ($source in @(@{Name='setup'; Text=$setup}, @{Name='install'; Text=$install})) {
    . ([scriptblock]::Create($source.Text))
    $i = 0
    foreach ($case in $cases) {
        $i++
        $caseRoot = Join-Path $Work "$($source.Name)-$i"
        [void][IO.Directory]::CreateDirectory($caseRoot)
        $zip = Join-Path $caseRoot 'a.zip'
        $dest = Join-Path $caseRoot 'out'
        $entries = @(if ($case.ContainsKey('Entries')) { $case.Entries } else { @{Name='branch/scripts/good.ps1'; Bytes=$payload} })
        if ($case.ContainsKey('Bad')) { $entries += @{Name=$case.Bad}; $case.Reject=$true }
        if ($case.Corrupt) { [IO.File]::WriteAllBytes($zip, [byte[]](1,2,3,4)) } else { New-Zip $zip $entries }
        if ($case.PatchControl) { $raw = [IO.File]::ReadAllBytes($zip); for ($j=0; $j -lt $raw.Length; $j++) { if ($raw[$j] -eq 126) { $raw[$j]=1 } }; [IO.File]::WriteAllBytes($zip, $raw) }
        if ($case.Nonempty) { [void][IO.Directory]::CreateDirectory($dest); [IO.File]::WriteAllBytes((Join-Path $dest 'keep.bin'), $payload) }
        if ($case.Junction) {
            $target = Join-Path $caseRoot 'target'
            [void][IO.Directory]::CreateDirectory($target)
            $null = New-Item -ItemType Junction -Path $dest -Target $target
        }
        $failure = $null
        try { Expand-InstallerSourceArchive -ArchivePath $zip -DestinationPath $dest } catch { $failure = $_.Exception.Message }
        if ($case.Reject) {
            Assert-Condition ($null -ne $failure) "$($case.Label): must reject"
            Assert-Condition ($failure.StartsWith('Source archive extraction failed at ')) "$($case.Label): original extraction context must survive"
            if ($case.Nonempty) {
                Assert-Condition ([Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $dest 'keep.bin'))) -ceq [Convert]::ToBase64String($payload)) 'Existing destination payload unchanged'
                Assert-Condition ([IO.Directory]::GetFileSystemEntries($dest).Length -eq 1) 'No writes into nonempty destination'
            } elseif ($case.Junction) {
                Assert-Condition ([IO.Directory]::GetFileSystemEntries($target).Length -eq 0) 'No writes through destination junction'
                [IO.Directory]::Delete($dest)
            } else {
                Assert-Condition (-not [IO.Directory]::Exists($dest)) "$($case.Label): validation must finish before destination creation"
            }
        } else {
            Assert-Condition ($null -eq $failure) "$($case.Label): $failure"
            if ($case.Long) {
                Assert-Condition ([IO.File]::Exists((Join-Path $dest ("r/skills/drawing/$deep/resource.md")))) 'PS7 extracts selected long resources'
            } else {
                foreach ($file in $case.Files) {
                    $actual = [IO.File]::ReadAllBytes((Join-Path $dest ("r/$file")))
                    Assert-Condition ([Convert]::ToBase64String($actual) -ceq [Convert]::ToBase64String($payload)) "Byte identical payload: $file"
                }
                $actualFiles = @([IO.Directory]::GetFiles($dest, '*', [IO.SearchOption]::AllDirectories))
                Assert-Condition ($actualFiles.Count -eq $case.Files.Count) 'Only selected payload extracted'
                Assert-Condition (-not [IO.Directory]::Exists((Join-Path $dest 'r/docs'))) 'Top-level docs excluded'
                Assert-Condition (-not [IO.Directory]::Exists((Join-Path $dest 'r/tests'))) 'Top-level tests excluded'
            }
        }
        # Deletion proves the reader and every entry stream were disposed on both paths.
        [IO.File]::Delete($zip)
        Assert-Condition (-not [IO.File]::Exists($zip)) 'Archive reader disposed'
        $count++
        Write-Output "PASS $($source.Name): $($case.Label)"
    }
}
$installPath = Join-Path $Repo 'scripts/install.ps1'
$cleanupFunction = Get-Extractor $installPath 'Remove-InstallerTemporarySource'
. ([scriptblock]::Create($cleanupFunction))
$cleanParent = Join-Path $Work 'cleanup'
[void][IO.Directory]::CreateDirectory($cleanParent)
$ownedLeaf = 'craftroster-skill-' + [Guid]::NewGuid().ToString('N')
$ownedRoot = Join-Path $cleanParent $ownedLeaf
[void][IO.Directory]::CreateDirectory($ownedRoot)
[IO.File]::WriteAllBytes((Join-Path $ownedRoot 'payload.bin'), $payload)
Remove-InstallerTemporarySource -OwnedRoot $ownedRoot -TempParent $cleanParent -ExpectedLeaf $ownedLeaf
Assert-Condition (-not [IO.Directory]::Exists($ownedRoot)) 'Owned GUID root removed'
$count++; Write-Output 'PASS cleanup: owned GUID root removed'
foreach ($kind in @('wrong-root', 'invalid-leaf', 'junction')) {
    $leaf = if ($kind -eq 'invalid-leaf') { 'unowned' } else { 'craftroster-bundle-' + [Guid]::NewGuid().ToString('N') }
    $candidate = Join-Path $cleanParent $leaf
    if ($kind -eq 'junction') {
        $target = Join-Path $cleanParent 'preserved-target'
        [void][IO.Directory]::CreateDirectory($target)
        [IO.File]::WriteAllBytes((Join-Path $target 'keep.bin'), $payload)
        $null = New-Item -ItemType Junction -Path $candidate -Target $target
    } else { [void][IO.Directory]::CreateDirectory($candidate) }
    $expected = if ($kind -eq 'wrong-root') { 'craftroster-bundle-' + [Guid]::NewGuid().ToString('N') } else { $leaf }
    $failure = $null
    try { Remove-InstallerTemporarySource -OwnedRoot $candidate -TempParent $cleanParent -ExpectedLeaf $expected } catch { $failure = $_.Exception.Message }
    Assert-Condition ($null -ne $failure -and $failure.StartsWith('Refusing to clean')) "Cleanup guard rejects $kind"
    Assert-Condition ([IO.Directory]::Exists($candidate)) 'Rejected cleanup preserves destination'
    if ($kind -eq 'junction') {
        Assert-Condition ([Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $target 'keep.bin'))) -ceq [Convert]::ToBase64String($payload)) 'Cleanup preserves junction target'
        [IO.Directory]::Delete($candidate)
    }
    $count++; Write-Output "PASS cleanup: reject $kind"
}
# Exercise the real outer catch/finally, replacing only the download and cleanup
# functions in an owned copy. No network request or user's installation is touched.
$primaryZip = Join-Path $Work 'primary.zip'
New-Zip $primaryZip @(@{Name='branch/scripts/valid.ps1'}, @{Name='branch/docs/../escape.md'})
$copyText = [IO.File]::ReadAllText($installPath)
$downloadFunction = Get-Extractor $installPath 'Invoke-DownloadArchive'
$escapedZip = $primaryZip.Replace("'", "''")
$downloadStub = 'function Invoke-DownloadArchive { param([string]$RepoName, [string]$BranchName, [string]$Destination) [IO.File]::Copy(''' + $escapedZip + ''', $Destination) }'
$copyText = $copyText.Replace($downloadFunction, $downloadStub).Replace($cleanupFunction, 'function Remove-InstallerTemporarySource { param([string]$OwnedRoot, [string]$TempParent, [string]$ExpectedLeaf) throw "CLEANUP_FIXTURE_FAILURE" }')
$copyPath = Join-Path $Work 'fault-install.ps1'
[IO.File]::WriteAllText($copyPath, $copyText, (New-Object Text.UTF8Encoding($true)))
$childTemp = Join-Path $Work 'child-temp'
[void][IO.Directory]::CreateDirectory($childTemp)
$oldTemp = $env:TEMP; $oldTmp = $env:TMP
try {
    $env:TEMP=$childTemp; $env:TMP=$childTemp
    $exe = (Get-Process -Id $PID).Path
    $output = @(& $exe -NoProfile -ExecutionPolicy Bypass -File $copyPath -Target codex -Type skill -Name drawing -InstallDir (Join-Path $Work 'never-installed') 2>&1) -join [Environment]::NewLine
    $childExit = $LASTEXITCODE
} finally { $env:TEMP=$oldTemp; $env:TMP=$oldTmp }
Assert-Condition ($childExit -eq 1) 'Real installer preserves nonzero extraction exit'
Assert-Condition ($output.Contains('Temporary source cleanup also failed: CLEANUP_FIXTURE_FAILURE')) 'Secondary cleanup diagnostic retained'
Assert-Condition ($output.Contains("Error: Source archive extraction failed at 'branch/docs/../escape.md':")) 'Real installer preserves original archive entry failure'
Assert-Condition (-not [IO.Directory]::Exists((Join-Path $Work 'never-installed'))) 'Failed bootstrap never writes installation destination'
$count++; Write-Output 'PASS real installer: cleanup fault does not mask primary archive failure'
Write-Output "Archive regression: $count passed on PowerShell $($PSVersionTable.PSVersion)"
`;
try {
  const scriptPath = path.join(temp, 'run.ps1');
  fs.writeFileSync(scriptPath, script, 'utf8');
  const result = spawnSync(powershell, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Repo', root, '-Work', temp], { encoding: 'utf8', timeout: 180000, windowsHide: true });
  if (result.error) throw result.error;
  process.stdout.write(result.stdout || '');
  process.stderr.write(result.stderr || '');
  assert.equal(result.status, 0, 'PowerShell archive regression failed');
} finally {
  const resolved = path.resolve(temp);
  assert.ok(resolved.startsWith(path.resolve(fs.realpathSync.native(os.tmpdir())) + path.sep) && path.basename(resolved).startsWith('crzip-'), 'Cleanup restricted to owned test root');
  fs.rmSync(resolved, { recursive: true, force: true });
  assert.ok(!fs.existsSync(resolved), 'Owned fixture root removed');
}






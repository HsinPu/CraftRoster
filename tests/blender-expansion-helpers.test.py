"""Host subprocess regressions and opt-in isolated native Blender batch checks."""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import shutil
import sys
import unittest
import uuid
from unittest import mock

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
BATCH = ROOT / 'skills/blender-pipeline-automation/scripts/run_jobs.py'
INSPECTOR = ROOT / 'skills/blender-development/scripts/inspect_runtime.py'
SCRATCH = ROOT / '.work/blender-expansion/helper-test-temp'
spec = importlib.util.spec_from_file_location('expansion_jobs', BATCH)
jobs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(jobs)


@contextlib.contextmanager
def isolated_temp(prefix):
    """Use inherited workspace ACLs; Python 3.12's Windows 0700 temp ACL is
    inaccessible to this restricted runner even inside a writable root.
    """
    SCRATCH.mkdir(parents=True, exist_ok=True)
    path = SCRATCH / (prefix + uuid.uuid4().hex)
    path.mkdir()
    try:
        yield path
    finally:
        resolved = path.resolve()
        resolved.relative_to(SCRATCH.resolve())
        if resolved == SCRATCH.resolve() or not resolved.name.startswith(prefix):
            raise RuntimeError('Refusing cleanup outside uniquely owned fixture')
        shutil.rmtree(resolved)


class BatchTests(unittest.TestCase):
    def setUp(self):
        # Keep all fixtures under an explicit repo scratch root on restricted hosts.
        SCRATCH.mkdir(parents=True, exist_ok=True)
        self.temp = isolated_temp('host-')
        self.base = self.temp.__enter__().resolve()
        self.output = self.base / 'batch'
        self.script = self.base / 'job.py'
        self.source = self.base / 'source.blend'
        self.source.write_bytes(b'isolated source fixture')
        self.script.write_text(
            "import argparse\nfrom pathlib import Path\n"
            "p=argparse.ArgumentParser();p.add_argument('--output-dir');a=p.parse_args()\n"
            "out=Path(a.output_dir)/'nested/result.json';out.parent.mkdir();out.write_text('{\"ok\":true}')\n",
            encoding='utf-8')
        self.runner = self.base / 'trusted_runner.py'
        # Runs authored fixture code through a genuine subprocess, not canned results.
        self.runner.write_text(
            "import argparse,subprocess,sys\n"
            "p=argparse.ArgumentParser();p.add_argument('--blender');p.add_argument('--script');"
            "p.add_argument('--blend');p.add_argument('--timeout');p.add_argument('args',nargs=argparse.REMAINDER)\n"
            "a=p.parse_args();sys.exit(subprocess.call([sys.executable,a.script,*a.args[1:]]))\n",
            encoding='utf-8')

    def tearDown(self):
        self.temp.__exit__(None, None, None)

    def manifest(self, **updates):
        record = {'id': 'one', 'script': 'job.py', 'blend': 'source.blend',
                  'expected_outputs': ['nested/result.json']}
        record.update(updates)
        return {'schema_version': 1, 'jobs': [record]}

    def prepare(self, manifest=None):
        return jobs.prepare(manifest if manifest is not None else self.manifest(), self.base, self.output)

    def execute(self, **updates):
        job = self.prepare(self.manifest(**updates))[0]
        self.output.mkdir()
        return jobs.execute(job, sys.executable, self.runner, 10)

    def test_normal_subprocess_records_hashes_logs_and_preserved_source(self):
        original = self.source.read_bytes()
        result = self.execute()
        self.assertEqual(result['status'], 'pass', result)
        self.assertEqual(result['exit_code'], 0)
        output = self.output / 'one/nested/result.json'
        self.assertEqual(json.loads(output.read_text()), {'ok': True})
        self.assertEqual(result['outputs'][0]['sha256'], hashlib.sha256(output.read_bytes()).hexdigest())
        self.assertEqual(self.source.read_bytes(), original)
        self.assertEqual(result['source_sha256'], hashlib.sha256(original).hexdigest())
        self.assertEqual(result['script_sha256'], hashlib.sha256(self.script.read_bytes()).hexdigest())
        self.assertTrue((self.output / 'one/stdout.log').is_file())
        self.assertTrue((self.output / 'one/stderr.log').is_file())

    def test_empty_invalid_and_boolean_schema_manifests_rejected_without_writes(self):
        bad = [None, [], {}, {'schema_version': True, 'jobs': []},
               {'schema_version': 1, 'jobs': []}, {'schema_version': 1, 'jobs': {}},
               {'schema_version': 1, 'jobs': [], 'extra': 1}]
        for manifest in bad:
            with self.subTest(manifest=manifest), self.assertRaises(ValueError):
                jobs.prepare(manifest, self.base, self.output)
        for version in [True, 1.0, '1']:
            manifest = self.manifest()
            manifest['schema_version'] = version
            with self.subTest(version=version), self.assertRaises(ValueError):
                self.prepare(manifest)
        self.assertFalse(self.output.exists())

    def test_unknown_fields_duplicate_ids_and_reserved_ids_rejected(self):
        for record in [None, {'id': 'x'}, self.manifest(extra=True)['jobs'][0],
                       self.manifest(id='con')['jobs'][0], self.manifest(id='../x')['jobs'][0]]:
            with self.subTest(record=record), self.assertRaises(ValueError):
                self.prepare({'schema_version': 1, 'jobs': [record]})
        manifest = self.manifest()
        manifest['jobs'] *= 2
        with self.assertRaises(ValueError):
            self.prepare(manifest)

    def test_missing_inputs_bad_args_and_empty_expected_are_rejected(self):
        for change in [{'script': 'absent.py'}, {'blend': 'absent.blend'},
                       {'args': '--flag'}, {'args': [1]}, {'args': ['a\0b']},
                       {'expected_outputs': []}, {'expected_outputs': 'result.json'}]:
            with self.subTest(change=change), self.assertRaises((ValueError, OSError)):
                self.prepare(self.manifest(**change))

    def test_output_traversal_and_nonportable_names_rejected(self):
        for path in ['../outside.txt', '/absolute.txt', 'a/../b', './a', 'a\\b',
                     'C:/a', 'a//b', 'a/', 'a\0b', 'x?.txt', 'x\n.txt',
                     'nested/NUL.txt', 'nested/COM1', 'a./result', 'a /result']:
            with self.subTest(path=path), self.assertRaises(ValueError):
                self.prepare(self.manifest(expected_outputs=[path]))

    def test_output_aliases_log_collision_and_file_parent_conflicts_rejected(self):
        for paths in [['result.json', 'result.json'], ['A.json', 'a.json'],
                      ['stdout.log'], ['STDERR.LOG'], ['stdout.log/child'],
                      ['nested', 'nested/result'], ['nested/result', 'NESTED']]:
            with self.subTest(paths=paths), self.assertRaises(ValueError):
                self.prepare(self.manifest(expected_outputs=paths))

    def test_existing_output_is_never_reused_or_changed(self):
        self.output.mkdir()
        sentinel = self.output / 'keep'
        sentinel.write_bytes(b'keep')
        with self.assertRaises(ValueError):
            self.prepare()
        self.assertEqual(sentinel.read_bytes(), b'keep')

    def test_explicit_external_input_is_allowed_trusted_code_not_a_sandbox(self):
        manifest = self.manifest(script=str(self.script.resolve()))
        self.assertEqual(self.prepare(manifest)[0]['script'], self.script)

    def test_nonzero_exit_blocks_even_when_expected_file_exists(self):
        with self.script.open('a', encoding='utf-8') as stream:
            stream.write("raise SystemExit(7)\n")
        result = self.execute()
        self.assertEqual(result['exit_code'], 7)
        self.assertEqual(result['status'], 'fail')
        self.assertIn('process_failed', result['errors'])
        self.assertEqual(len(result['outputs']), 1)

    def test_successful_process_with_missing_empty_or_directory_output_fails(self):
        for expression in ["pass", "(out/'result').touch()", "(out/'result').mkdir()"]:
            with self.subTest(expression=expression):
                manifest = self.manifest(expected_outputs=['result'])
                job = self.prepare(manifest)[0]
                job['output'] = self.base / ('case'+str(len(list(self.base.glob('case*')))))
                self.script.write_text("import argparse\nfrom pathlib import Path\np=argparse.ArgumentParser();p.add_argument('--output-dir');out=Path(p.parse_args().output_dir)\n"+expression+'\n', encoding='utf-8')
                result = jobs.execute(job, sys.executable, self.runner, 10)
                self.assertEqual(result['exit_code'], 0)
                self.assertEqual(result['status'], 'fail')
                self.assertIn('invalid_output:result', result['errors'])

    def test_source_change_is_detected_even_with_valid_output_and_zero_exit(self):
        with self.script.open('a', encoding='utf-8') as stream:
            stream.write(f"Path({str(self.source)!r}).write_bytes(b'changed fixture')\n")
        result = self.execute()
        self.assertEqual(result['exit_code'], 0)
        self.assertIn('source_changed', result['errors'])
        self.assertEqual(result['status'], 'fail')

    def test_deleted_source_is_reported_instead_of_aborting_worker(self):
        with self.script.open('a', encoding='utf-8') as stream:
            stream.write(f"Path({str(self.source)!r}).unlink()\n")
        result = self.execute()
        self.assertIn('source_changed_or_unreadable', result['errors'])
        self.assertEqual(result['status'], 'fail')

    def test_input_disappearing_after_preflight_is_a_job_failure(self):
        job = self.prepare()[0]
        self.output.mkdir()
        self.script.unlink()
        result = jobs.execute(job, sys.executable, self.runner, 10)
        self.assertEqual(result['status'], 'fail')
        self.assertTrue(any('FileNotFoundError' in error for error in result['errors']))

    def test_job_directory_collision_does_not_abort_result(self):
        job = self.prepare()[0]
        self.output.mkdir()
        job['output'].mkdir()
        result = jobs.execute(job, sys.executable, self.runner, 10)
        self.assertEqual(result['status'], 'fail')
        self.assertTrue(any('FileExistsError' in error for error in result['errors']))

    def test_timeout_is_failed_with_logs(self):
        job = self.prepare()[0]
        self.output.mkdir()
        self.script.write_text('import time\ntime.sleep(5)\n', encoding='utf-8')
        # Mock the runner deadline only; a real timeout test lives on run_blender.
        with mock.patch.object(jobs.subprocess, 'run', side_effect=subprocess.TimeoutExpired('fixture', 1)):
            result = jobs.execute(job, sys.executable, self.runner, 1)
        self.assertEqual(result['status'], 'fail')
        self.assertTrue(any('TimeoutExpired' in e for e in result['errors']))

    def test_output_symlink_escape_fails_without_touching_external_target(self):
        external = self.base / 'external.txt'
        external.write_bytes(b'preserved')
        probe = self.base / 'link-probe'
        try:
            probe.symlink_to(external)
            probe.unlink()
        except OSError:
            self.skipTest('Host does not permit creation of symlink fixture')
        self.script.write_text("import argparse\nfrom pathlib import Path\np=argparse.ArgumentParser();p.add_argument('--output-dir');out=Path(p.parse_args().output_dir)\n"+f"(out/'result').symlink_to(Path({str(external)!r}))\n", encoding='utf-8')
        result = self.execute(expected_outputs=['result'])
        self.assertEqual(result['status'], 'fail')
        self.assertIn('invalid_output:result', result['errors'])
        self.assertEqual(external.read_bytes(), b'preserved')

    def test_cli_aggregates_process_failure_and_returns_nonzero(self):
        manifest = self.base / 'manifest.json'
        manifest.write_text(json.dumps(self.manifest()), encoding='utf-8')
        # Python is deliberately not Blender: the real isolated runner must fail.
        command = [sys.executable, str(BATCH), '--manifest', str(manifest),
                   '--output', str(self.output), '--blender', sys.executable, '--timeout', '10']
        result = subprocess.run(command, capture_output=True, text=True, timeout=30)
        self.assertEqual(result.returncode, 1, result.stderr)
        report = json.loads((self.output / 'batch-report.json').read_text(encoding='utf-8'))
        self.assertEqual(report['status'], 'fail')
        self.assertEqual(len(report['results']), 1)
        self.assertIn('process_failed', report['results'][0]['errors'])

    def test_main_retains_other_job_result_when_preflight_input_disappears(self):
        manifest = self.manifest()
        manifest['jobs'].append({**manifest['jobs'][0], 'id': 'two'})
        path = self.base / 'manifest.json'
        path.write_text(json.dumps(manifest), encoding='utf-8')
        real_prepare = jobs.prepare
        def disappearing(*args):
            prepared = real_prepare(*args)
            prepared[0]['script'] = self.base / 'vanished.py'
            return prepared
        with mock.patch.object(sys, 'argv', [str(BATCH), '--manifest', str(path), '--output',
                                           str(self.output), '--blender', sys.executable]), \
                mock.patch.object(jobs, 'prepare', side_effect=disappearing), \
                contextlib.redirect_stdout(io.StringIO()):
            code = jobs.main()
        self.assertEqual(code, 1)
        report = json.loads((self.output / 'batch-report.json').read_text(encoding='utf-8'))
        self.assertEqual([r['id'] for r in report['results']], ['one', 'two'])
        self.assertEqual(report['status'], 'fail')

    def test_symlink_loop_resolution_returns_structured_failure_without_writes(self):
        manifest = self.base / 'manifest.json'
        manifest.write_text(json.dumps(self.manifest()), encoding='utf-8')
        stdout = io.StringIO()
        with mock.patch.object(sys, 'argv', [str(BATCH), '--manifest', str(manifest), '--output',
                                           str(self.output), '--blender', sys.executable]), \
                mock.patch.object(Path, 'resolve', side_effect=RuntimeError('Symlink loop from fixture')), \
                contextlib.redirect_stdout(stdout):
            code = jobs.main()
        self.assertEqual(code, 1)
        self.assertEqual(json.loads(stdout.getvalue()), {'status': 'fail', 'error': 'Symlink loop from fixture'})
        self.assertFalse(self.output.exists())


@unittest.skipUnless(os.environ.get('BLENDER_BIN'), 'BLENDER_BIN not set: native batch test not run')
class NativeBatchTests(unittest.TestCase):
    def test_real_blender_timeout_is_aggregated_as_failed(self):
        with isolated_temp('native-timeout-') as base:
            (base / 'slow.py').write_text('import time\ntime.sleep(20)\n', encoding='utf-8')
            manifest = {'schema_version': 1, 'jobs': [
                {'id': 'slow', 'script': 'slow.py', 'expected_outputs': ['result.json']}]}
            path = base / 'manifest.json'
            path.write_text(json.dumps(manifest), encoding='utf-8')
            output = base / 'batch'
            result = subprocess.run([sys.executable, str(BATCH), '--manifest', str(path), '--output', str(output),
                                     '--blender', os.environ['BLENDER_BIN'], '--timeout', '1'],
                                    capture_output=True, text=True, timeout=30)
            self.assertEqual(result.returncode, 1, result.stdout+result.stderr)
            report = json.loads((output / 'batch-report.json').read_text(encoding='utf-8'))
            self.assertEqual(report['status'], 'fail')
            self.assertEqual(report['results'][0]['exit_code'], 124)
            self.assertIn('process_failed', report['results'][0]['errors'])
            self.assertIn('exceeded timeout', (output / 'slow/stderr.log').read_text(encoding='utf-8'))

    def test_isolated_real_blender_normal_exception_and_missing_output_aggregate(self):
        SCRATCH.mkdir(parents=True, exist_ok=True)
        with isolated_temp('native-') as temp:
            base = Path(temp).resolve()
            source = base / 'source.blend'
            blender = os.environ['BLENDER_BIN']
            create = subprocess.run([blender, '-b', '--factory-startup', '--disable-autoexec',
                                     '--python-exit-code', '1', '--python-expr',
                                     f"import bpy;bpy.ops.wm.save_as_mainfile(filepath={str(source)!r})"],
                                    capture_output=True, text=True, timeout=60)
            self.assertEqual(create.returncode, 0, create.stdout+create.stderr)
            before = hashlib.sha256(source.read_bytes()).hexdigest()
            normal = base / 'normal.py'
            normal.write_text("import argparse,runpy,sys\nfrom pathlib import Path\np=argparse.ArgumentParser();p.add_argument('--output-dir');a=p.parse_args(sys.argv[sys.argv.index('--')+1:])\nsys.argv=['inspect_runtime.py','--','--output',str(Path(a.output_dir)/'runtime.json')]\n"+f"runpy.run_path({str(INSPECTOR)!r},run_name='__main__')\n", encoding='utf-8')
            (base / 'failure.py').write_text("raise RuntimeError('intentional isolated failure')\n", encoding='utf-8')
            (base / 'missing.py').write_text("print('no output intentionally')\n", encoding='utf-8')
            manifest = {'schema_version': 1, 'jobs': [
                {'id': 'normal', 'blend': 'source.blend', 'script': 'normal.py', 'expected_outputs': ['runtime.json']},
                {'id': 'failure', 'blend': 'source.blend', 'script': 'failure.py', 'expected_outputs': ['result.json']},
                {'id': 'missing', 'blend': 'source.blend', 'script': 'missing.py', 'expected_outputs': ['result.json']}]}
            path = base / 'manifest.json'
            path.write_text(json.dumps(manifest), encoding='utf-8')
            output = base / 'batch'
            result = subprocess.run([sys.executable, str(BATCH), '--manifest', str(path), '--output', str(output),
                                     '--blender', blender, '--workers', '2', '--timeout', '45'],
                                    capture_output=True, text=True, timeout=150)
            self.assertEqual(result.returncode, 1, result.stdout+result.stderr)
            report = json.loads((output / 'batch-report.json').read_text(encoding='utf-8'))
            self.assertEqual(report['status'], 'fail')
            self.assertEqual([r['status'] for r in report['results']], ['pass', 'fail', 'fail'])
            self.assertIn('process_failed', report['results'][1]['errors'])
            self.assertEqual(report['results'][2]['exit_code'], 0)
            self.assertIn('invalid_output:result.json', report['results'][2]['errors'])
            runtime = json.loads((output / 'normal/runtime.json').read_text(encoding='utf-8'))
            self.assertTrue(runtime['background'])
            self.assertEqual(Path(runtime['source']).resolve(), source)
            self.assertEqual(runtime['object_counts'].get('MESH'), 1)
            self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), before)
            self.assertTrue(all(r['source_sha256'] == before for r in report['results']))


if __name__ == '__main__':
    unittest.main(verbosity=2)

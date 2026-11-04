"""Behavioral regressions for revision-bound Blender evidence helpers."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parents[1]
HELPERS = ROOT / 'skills/blender-asset-validation/scripts'
spec = importlib.util.spec_from_file_location('delivery', HELPERS / 'check_delivery.py')
delivery = importlib.util.module_from_spec(spec)
spec.loader.exec_module(delivery)


class DeliveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        def record(name):
            (self.base / name).write_bytes(name.encode())
            return {'path': name, 'sha256': hashlib.sha256(name.encode()).hexdigest()}
        self.m = {'schema_version': 1, 'source': record('source.blend'), 'contract': record('contract.json'), 'exports': [record('asset.glb')], 'technical_report': 'technical.json', 'visual_report': 'visual.json'}
        self.report = {'schema_version': 1, 'status': 'pass', 'source_sha256': self.m['source']['sha256'], 'contract_sha256': self.m['contract']['sha256'], 'findings': []}
        self.visual = dict(self.report, images=[record('review.png')])
        self.save()

    def tearDown(self):
        self.temp.cleanup()

    def save(self):
        for path, report in [('technical.json', self.report), ('visual.json', self.visual)]:
            (self.base / path).write_text(json.dumps(report))

    def check(self):
        return delivery.check(self.m, self.base)

    def test_complete_asset_keeps_engine_untested(self):
        report = self.check()
        self.assertTrue(report['ready'])
        self.assertEqual(report['statuses']['engine'], 'not_tested')

    def test_missing_export_blocks(self):
        (self.base / 'asset.glb').unlink()
        self.assertFalse(self.check()['ready'])

    def test_empty_exports_block(self):
        self.m['exports'] = []
        self.assertFalse(self.check()['ready'])

    def test_source_revision_invalidates_evidence(self):
        (self.base / 'source.blend').write_bytes(b'changed')
        self.assertFalse(self.check()['ready'])
        self.m['source']['sha256'] = hashlib.sha256(b'changed').hexdigest()
        self.assertFalse(self.check()['ready'])

    def test_changed_contract_blocks(self):
        self.visual['contract_sha256'] = '0' * 64
        self.save()
        self.assertFalse(self.check()['ready'])

    def test_stale_review_image_blocks(self):
        (self.base / 'review.png').write_bytes(b'new image')
        self.assertFalse(self.check()['ready'])

    def test_empty_images_block(self):
        self.visual['images'] = []
        self.save()
        self.assertFalse(self.check()['ready'])

    def test_unresolved_major_overrides_pass(self):
        self.visual['findings'] = [{'severity': 'major'}]
        self.save()
        self.assertFalse(self.check()['ready'])

    def test_changes_requested_blocks(self):
        self.visual['status'] = 'changes_requested'
        self.save()
        self.assertFalse(self.check()['ready'])

    def test_required_engine_missing_blocks(self):
        self.m['require_engine'] = True
        self.assertFalse(self.check()['ready'])

    def test_engine_report_requires_export_revision(self):
        self.m['require_engine'] = True
        self.m['engine_report'] = 'engine.json'
        engine = dict(self.report, engine='fixture-engine 1', checks=['fixture import completed'], exports=self.m['exports'])
        (self.base / 'engine.json').write_text(json.dumps(engine))
        self.assertTrue(self.check()['ready'])
        engine['exports'] = []
        (self.base / 'engine.json').write_text(json.dumps(engine))
        self.assertFalse(self.check()['ready'])

    def test_engine_boolean_is_strict(self):
        self.m['require_engine'] = 'false'
        with self.assertRaises(ValueError):
            self.check()

    def test_engine_rejects_empty_or_nontext_check_descriptions(self):
        self.m['require_engine'] = True
        self.m['engine_report'] = 'engine.json'
        for checks in ([None], [False], [''], ['   '], [{}], ['import passed', None], []):
            with self.subTest(checks=checks):
                engine = dict(self.report, engine='fixture-engine 1', checks=checks, exports=self.m['exports'])
                (self.base / 'engine.json').write_text(json.dumps(engine))
                self.assertFalse(self.check()['ready'])

    def test_runner_rejects_absent_script(self):
        runner = ROOT / 'skills/blender-development/scripts/run_blender.py'
        result = subprocess.run([sys.executable, str(runner), '--blender', sys.executable, '--script', str(self.base / 'absent.py')], capture_output=True)
        self.assertNotEqual(result.returncode, 0)


@unittest.skipUnless(os.environ.get('BLENDER_BIN'), 'Set BLENDER_BIN for actual native Blender checks')
class NativeTests(unittest.TestCase):
    def test_nonfinite_geometry_and_transform_are_rejected(self):
        runner = ROOT / 'skills/blender-development/scripts/run_blender.py'
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            contract = base / 'contract.json'
            contract.write_text(json.dumps({'schema_version': 1, 'objects': ['Asset']}))
            for case, corruption, expected in [
                ('geometry', "ob.data.vertices[3].co.x=float('nan')", 'nonfinite_geometry_or_units'),
                ('transform', "ob.location.x=float('nan')", 'nonfinite_transform'),
            ]:
                with self.subTest(case=case):
                    blend = base / (case + '.blend')
                    script = base / (case + '.py')
                    script.write_text("import bpy\nbpy.ops.mesh.primitive_cube_add()\nob=bpy.context.object\nob.name='Asset'\n" + corruption + "\nbpy.ops.wm.save_as_mainfile(filepath=" + repr(str(blend)) + ")\n", encoding='utf-8')
                    def run(job, *args):
                        return subprocess.run([sys.executable, str(runner), '--script', str(job), '--timeout', '90', *args], capture_output=True, text=True, timeout=100)
                    built = run(script)
                    self.assertEqual(built.returncode, 0, built.stdout + built.stderr)
                    original = hashlib.sha256(blend.read_bytes()).hexdigest()
                    output = base / (case + '.json')
                    checked = run(HELPERS / 'inspect_asset.py', '--blend', str(blend), '--', '--contract', str(contract), '--output', str(output))
                    self.assertNotEqual(checked.returncode, 0, checked.stdout + checked.stderr)
                    report = json.loads(output.read_text())
                    self.assertEqual(report['status'], 'fail')
                    self.assertIn(expected, [item['code'] for item in report['findings']])
                    self.assertEqual(original, hashlib.sha256(blend.read_bytes()).hexdigest())

    def test_native_inspection_scope_and_source_preservation(self):
        with tempfile.TemporaryDirectory() as directory:
            base = Path(directory)
            blend = base / 'asset.blend'
            build = base / 'build.py'
            build.write_text("import bpy\nbpy.ops.mesh.primitive_cube_add()\nob=bpy.context.object\nob.name='Asset'\nob.data.materials.append(bpy.data.materials.new('PBR'))\nmod=ob.modifiers.new('Bevel','BEVEL')\nmod.width=0.1\nmod.segments=1\nbpy.ops.wm.save_as_mainfile(filepath=" + repr(str(blend)) + ")\n", encoding='utf-8')
            runner = ROOT / 'skills/blender-development/scripts/run_blender.py'
            def run(script, *args):
                return subprocess.run([sys.executable, str(runner), '--script', str(script), '--timeout', '90', *args], capture_output=True, text=True, timeout=100)
            built = run(build)
            self.assertEqual(built.returncode, 0, built.stdout + built.stderr)
            original = hashlib.sha256(blend.read_bytes()).hexdigest()
            contract = base / 'contract.json'
            contract.write_text(json.dumps({'schema_version': 1, 'objects': ['Asset'], 'max_triangles': 50, 'require_uv': True, 'require_manifold': True}))
            output = base / 'report.json'
            def inspect():
                return run(HELPERS / 'inspect_asset.py', '--blend', str(blend), '--', '--contract', str(contract), '--output', str(output))
            checked = inspect()
            self.assertEqual(checked.returncode, 0, checked.stdout + checked.stderr)
            report = json.loads(output.read_text())
            self.assertEqual(report['metrics'][0]['triangles'], 44)
            self.assertEqual(report['metrics'][0]['dimensions_m'], [2, 2, 2])
            self.assertEqual(report['visual_status'], 'not_reviewed')
            self.assertEqual(hashlib.sha256(blend.read_bytes()).hexdigest(), original)
            self.assertNotEqual(inspect().returncode, 0, 'must not overwrite existing report')
            output.unlink()
            contract.write_text(json.dumps({'schema_version': 1, 'objects': ['Missing']}))
            self.assertNotEqual(inspect().returncode, 0)
            self.assertEqual(json.loads(output.read_text())['findings'][0]['code'], 'missing_object')
            output.unlink()
            contract.write_text(json.dumps({'schema_version': 1, 'objects': ['Asset'], 'require_skin_weights': True}))
            self.assertNotEqual(inspect().returncode, 0, 'unknown requested check must fail')
            self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()

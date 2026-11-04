"""Optional native Blender export and reference correction smoke, no external engine."""
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / 'tests/fixtures/blender-production/native_fixture.py'


@unittest.skipUnless(os.environ.get('BLENDER_BIN'), 'Set BLENDER_BIN for native production smoke')
class ProductionTests(unittest.TestCase):
    def setUp(self):
        persistent = os.environ.get('BLENDER_TEST_OUTPUT')
        self.temp = None if persistent else tempfile.TemporaryDirectory()
        self.output = Path(persistent or self.temp.name) / self._testMethodName
        self.output.mkdir(parents=True, exist_ok=True)
        print('ARTIFACTS', self.output, flush=True)

    def tearDown(self):
        if self.temp:
            self.temp.cleanup()

    def run_phase(self, phase):
        result = subprocess.run([os.environ['BLENDER_BIN'], '--background', '--factory-startup', '--disable-autoexec',
                                 '--python-exit-code', '1', '--python', str(FIXTURE), '--', phase, str(self.output)],
                                capture_output=True, text=True, timeout=180)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        return json.loads((self.output / (phase + '.json')).read_text())

    def test_animated_rig_export_fresh_import(self):
        built = self.run_phase('rig-build')
        source = self.output / 'rig-source.blend'
        original = hashlib.sha256(source.read_bytes()).hexdigest()
        with (self.output / 'rig.glb').open('rb') as stream:
            self.assertEqual(stream.read(4), b'glTF')
            stream.seek(12)
            length, kind = struct.unpack('<II', stream.read(8))
            self.assertEqual(kind, 0x4E4F534A)
            doc = json.loads(stream.read(length))
        self.assertIn('Wave', [clip['name'] for clip in doc['animations']])
        self.assertTrue(doc.get('skins'))
        clip = next(clip for clip in doc['animations'] if clip['name'] == 'Wave')
        durations = [doc['accessors'][sampler['input']]['max'][0] - doc['accessors'][sampler['input']]['min'][0] for sampler in clip['samplers']]
        self.assertTrue(durations)
        for duration in durations:
            self.assertAlmostEqual(duration, built['duration_seconds'], places=3)
        imported = self.run_phase('rig-import')
        self.assertIn('Root', imported['bones'])
        self.assertTrue(any('Wave' in name for name in imported['actions']))
        for initial, final in zip(built['rest_bounds'], imported['rest_bounds']):
            for a, b in zip(initial, final):
                self.assertAlmostEqual(a, b, places=3)
        for initial, final in zip(built['motion_bounds'], imported['motion_bounds']):
            for a, b in zip(initial, final):
                self.assertAlmostEqual(a, b, places=3)
        self.assertGreater(max(abs(a-b) for rowa, rowb in zip(imported['rest_bounds'], imported['motion_bounds']) for a,b in zip(rowa,rowb)), 0.1)
        self.assertTrue(all(abs(value - 1) < 0.001 for value in imported['rig_scale']))
        self.assertEqual(original, hashlib.sha256(source.read_bytes()).hexdigest())

    def test_reference_ratio_correction_and_reimport(self):
        report = self.run_phase('reference')
        before, after = report['records']
        self.assertGreater(abs(before['width_height_ratio'] - report['target_ratio']), 0.4)
        self.assertAlmostEqual(after['width_height_ratio'], report['target_ratio'], places=4)
        self.assertEqual(before['camera_position'], after['camera_position'])
        self.assertEqual(before['camera_ortho_scale'], after['camera_ortho_scale'])
        self.assertNotEqual((self.output / 'before.png').read_bytes(), (self.output / 'after.png').read_bytes())
        sources = {name: hashlib.sha256((self.output / name).read_bytes()).hexdigest() for name in ['before.blend', 'after.blend']}
        imported = self.run_phase('reference-import')
        for expected, actual in zip(after['dimensions_m'], imported['dimensions_m']):
            self.assertAlmostEqual(expected, actual, places=3)
        for name, digest in sources.items():
            self.assertEqual(digest, hashlib.sha256((self.output / name).read_bytes()).hexdigest())


if __name__ == '__main__':
    unittest.main()

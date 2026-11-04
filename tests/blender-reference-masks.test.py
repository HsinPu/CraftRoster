"""Behavioral regressions: real mask files and CLI, no Blender/Pillow requirement."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'skills/blender-reference-modeling/scripts/compare_reference_masks.py'


class MaskComparisonTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        self.source = self.record('asset.blend', b'fixture source revision; not a Blender runtime trial')

    def tearDown(self):
        self.temp.cleanup()

    def record(self, name, data):
        (self.base / name).write_bytes(data)
        return {'path': name, 'sha256': hashlib.sha256(data).hexdigest()}

    def mask(self, name, box=(8, 8, 16, 24), size=(32, 32), kind='json'):
        width, height = size
        x0, y0, x1, y1 = box
        rows = [''.join('1' if x0 <= x < x1 and y0 <= y < y1 else '0' for x in range(width)) for y in range(height)]
        if kind == 'pgm':
            data = ('P2\n# explicit binary mask\n%d %d\n255\n' % size + '\n'.join(' '.join('255' if c == '1' else '0' for c in row) for row in rows)).encode()
        else:
            data = json.dumps({'width': width, 'height': height, 'rows': rows}).encode()
        return self.record(name, data)

    def contract(self, reference, candidate, mode='registered'):
        out = {'schema_version': 1, 'mode': mode, 'source': self.source, 'reference': reference, 'candidate': candidate}
        if mode == 'registered':
            c = {'projection': 'orthographic', 'view': 'front', 'metres_per_pixel': [0.01, 0.01],
                 'axis_column': 16, 'ground_row': 28, 'pixel_aspect': [1, 1]}
            out['calibration'] = {'reference': dict(c), 'candidate': dict(c)}
        return out

    def run_cli(self, contract, output='report.json'):
        contract_path = self.base / 'contract.json'
        contract_path.write_text(json.dumps(contract), encoding='utf-8')
        result = subprocess.run([sys.executable, str(SCRIPT), '--contract', str(contract_path), '--output', str(self.base / output)], capture_output=True, text=True)
        return result, self.base / output

    def measured(self, contract, output='report.json'):
        result, path = self.run_cli(contract, output)
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(path.read_text())
        self.assertEqual(report['status'], 'measured')
        self.assertNotIn('pass', report)
        self.assertIn('visual approval', report['not_checked'])
        return report

    def test_translation_hidden_only_in_normalized_diagnostic(self):
        ref = self.mask('ref.json')
        cand = self.mask('cand.json', (12, 8, 20, 24))
        normalized = self.measured(self.contract(ref, cand, 'normalized'), 'norm.json')
        registered = self.measured(self.contract(ref, cand), 'world.json')
        self.assertEqual(normalized['metrics']['iou'], 1)
        self.assertAlmostEqual(registered['metrics']['iou'], 1 / 3)
        self.assertEqual(registered['normalization'], 'none')

    def test_scale_hidden_by_normalized_crop_but_registered_detected(self):
        ref = self.mask('ref.pgm', kind='pgm')
        cand = self.mask('cand.pgm', (10, 16, 14, 24), kind='pgm')
        normalized = self.measured(self.contract(ref, cand, 'normalized'), 'norm.json')
        registered = self.measured(self.contract(ref, cand), 'world.json')
        self.assertEqual(normalized['metrics']['iou'], 1)
        self.assertEqual(registered['metrics']['iou'], 0.25)
        self.assertTrue(any(v < 0 for v in registered['metrics']['band_width_difference_per_reference_height']))

    def test_matching_nonsquare_window_and_hashes(self):
        ref = self.mask('ref.json', size=(48, 32))
        contract = self.contract(ref, ref)
        for c in contract['calibration'].values():
            c['metres_per_pixel'] = [0.02, 0.01]
            c['pixel_aspect'] = [2, 1]
        report = self.measured(contract)
        self.assertEqual(report['metrics']['iou'], 1)
        self.assertEqual(report['reference_size'], [48, 32])
        self.assertEqual(report['source_sha256'], self.source['sha256'])
        self.assertEqual(report['contract_sha256'], hashlib.sha256((self.base / 'contract.json').read_bytes()).hexdigest())
        self.assertEqual(report['reference'], ref)

    def test_mismatched_calibration_and_dimensions_fail_without_report(self):
        ref = self.mask('ref.json')
        for mismatch in ('ground', 'view', 'size', 'aspect', 'missing'):
            with self.subTest(mismatch=mismatch):
                cand = self.mask('cand.json', size=(40, 32) if mismatch == 'size' else (32, 32))
                contract = self.contract(ref, cand)
                if mismatch == 'ground':
                    contract['calibration']['candidate']['ground_row'] = 27
                elif mismatch == 'view':
                    contract['calibration']['candidate']['view'] = 'back'
                elif mismatch == 'aspect':
                    contract['calibration']['candidate']['pixel_aspect'] = [2, 1]
                elif mismatch == 'missing':
                    del contract['calibration']
                result, path = self.run_cli(contract, mismatch + '.json')
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(path.exists())

    def test_empty_degenerate_full_or_shaded_masks_rejected(self):
        ref = self.mask('ref.json')
        for label, box in [('empty', (0, 0, 0, 0)), ('line', (8, 8, 9, 24)), ('full', (0, 0, 32, 32))]:
            cand = self.mask('cand.json', box)
            result, path = self.run_cli(self.contract(ref, cand), label + '.json')
            self.assertNotEqual(result.returncode, 0, label)
            self.assertFalse(path.exists())
        cand = self.record('shaded.pgm', b'P2\n2 2\n255\n0 128 255 0\n')
        result, path = self.run_cli(self.contract(ref, cand), 'shaded.json')
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('binary', result.stderr)
        self.assertFalse(path.exists())

    def test_nonfinite_nonpositive_and_bool_calibration_rejected(self):
        ref = self.mask('ref.json')
        for i, value in enumerate([float('nan'), float('inf'), 0, -1, True]):
            contract = self.contract(ref, ref)
            contract['calibration']['reference']['metres_per_pixel'] = [value, 0.01]
            result, path = self.run_cli(contract, 'invalid%d.json' % i)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse(path.exists())

    def test_stale_mask_or_source_hash_rejected(self):
        for label in ('mask', 'source'):
            ref = self.mask('ref.json')
            contract = self.contract(ref, ref)
            if label == 'mask':
                (self.base / 'ref.json').write_bytes(b'changed')
            else:
                (self.base / 'asset.blend').write_bytes(b'new saved source')
            result, path = self.run_cli(contract, label + '.json')
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('stale input hash', result.stderr)
            self.assertFalse(path.exists())

    def test_output_never_overwritten_and_input_not_changed(self):
        ref = self.mask('ref.json')
        contract = self.contract(ref, ref)
        self.measured(contract)
        output = self.base / 'report.json'
        before = output.read_bytes()
        result, _ = self.run_cli(contract)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(output.read_bytes(), before)
        result, _ = self.run_cli(contract, 'ref.json')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(hashlib.sha256((self.base / 'ref.json').read_bytes()).hexdigest(), ref['sha256'])

    def test_duplicate_contract_keys_rejected(self):
        path = self.base / 'contract.json'
        path.write_text('{"mode":"normalized","mode":"registered"}')
        result = subprocess.run([sys.executable, str(SCRIPT), '--contract', str(path), '--output', str(self.base / 'out.json')], capture_output=True, text=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('duplicate JSON key', result.stderr)

    @unittest.skipUnless(importlib.util.find_spec('PIL'), 'Pillow not installed; stdlib core cases still run')
    def test_saved_binary_png_and_shaded_png_rejection(self):
        from PIL import Image
        path = self.base / 'mask.png'
        image = Image.new('L', (32, 32), 0)
        image.paste(255, (8, 8, 16, 24))
        image.save(path)
        record = {'path': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
        report = self.measured(self.contract(record, record))
        self.assertEqual(report['metrics']['iou'], 1)
        image.putpixel((8, 8), 128)
        image.save(path)
        record['sha256'] = hashlib.sha256(path.read_bytes()).hexdigest()
        result, output = self.run_cli(self.contract(record, record), 'shaded.png.json')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()

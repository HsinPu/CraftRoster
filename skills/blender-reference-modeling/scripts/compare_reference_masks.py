"""Compare explicit foreground masks; diagnose silhouette, never approve appearance.

System Python, standard library for JSON or ASCII PGM (P2). Binary grayscale PNG
requires Pillow already installed in this interpreter. See majid-mask-comparison.md.
"""
import argparse
import hashlib
import io
import json
import math
from pathlib import Path
import re
import sys

MAX_PIXELS = 4_000_000
MAX_BYTES = 32_000_000
NORMALIZED_HEIGHT = 256


def digest(data):
    return hashlib.sha256(data).hexdigest()


def number(value, name, positive=False):
    if type(value) not in (int, float) or not math.isfinite(value):
        raise ValueError(name + ' must be finite numeric data')
    if positive and value <= 0:
        raise ValueError(name + ' must be positive')
    return float(value)


def dimensions(width, height):
    if type(width) is not int or type(height) is not int:
        raise ValueError('mask dimensions must be integers')
    if not (2 <= width <= 4096 and 2 <= height <= 4096):
        raise ValueError('mask dimensions must be 2..4096')
    if width * height > MAX_PIXELS:
        raise ValueError('mask exceeds pixel limit')


def checked_json(data):
    def reject_constant(value):
        raise ValueError('nonfinite JSON constant: ' + value)
    def unique(pairs):
        out = {}
        for key, value in pairs:
            if key in out:
                raise ValueError('duplicate JSON key: ' + key)
            out[key] = value
        return out
    return json.loads(data, parse_constant=reject_constant, object_pairs_hook=unique)


def read_record(record, base, mask=True):
    if not isinstance(record, dict) or set(record) != {'path', 'sha256'}:
        raise ValueError('file record requires exactly path and sha256')
    if not isinstance(record['path'], str) or not record['path'].strip():
        raise ValueError('file path must be nonblank')
    if not isinstance(record['sha256'], str) or not re.fullmatch('[0-9a-f]{64}', record['sha256']):
        raise ValueError('sha256 must be 64 lowercase hex characters')
    path = (base / record['path']).resolve()
    if not path.is_file() or path.stat().st_size <= 0 or (mask and path.stat().st_size > MAX_BYTES):
        raise ValueError('missing, empty or oversized input: ' + str(path))
    if not mask:
        hashed = hashlib.sha256()
        with path.open('rb') as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b''):
                hashed.update(chunk)
        if hashed.hexdigest() != record['sha256']:
            raise ValueError('stale input hash: ' + str(path))
        return path, None
    data = path.read_bytes()
    if digest(data) != record['sha256']:
        raise ValueError('stale input hash: ' + str(path))
    return path, data


def decode_mask(path, data):
    suffix = path.suffix.lower()
    if suffix == '.json':
        obj = checked_json(data)
        if not isinstance(obj, dict) or set(obj) != {'width', 'height', 'rows'}:
            raise ValueError('mask JSON requires width, height, rows')
        width, height = obj['width'], obj['height']
        dimensions(width, height)
        rows = obj['rows']
        if not isinstance(rows, list) or len(rows) != height:
            raise ValueError('mask row count differs from height')
        if any(not isinstance(r, str) or len(r) != width or set(r) - {'0', '1'} for r in rows):
            raise ValueError('mask rows must contain exactly width binary digits')
        mask = tuple(tuple(c == '1' for c in row) for row in rows)
    elif suffix == '.pgm':
        text = re.sub(r'#[^\r\n]*', '', data.decode('ascii'))
        parts = text.split()
        if len(parts) < 4 or parts[0] != 'P2':
            raise ValueError('only ASCII PGM P2 is supported')
        width, height, maximum = map(int, parts[1:4])
        dimensions(width, height)
        if not 1 <= maximum <= 65535 or len(parts) != 4 + width * height:
            raise ValueError('invalid PGM maximum or sample count')
        values = list(map(int, parts[4:]))
        if any(v not in (0, maximum) for v in values):
            raise ValueError('PGM must be binary foreground, not a shaded photograph')
        mask = tuple(tuple(v == maximum for v in values[y * width:(y + 1) * width]) for y in range(height))
    elif suffix == '.png':
        try:
            from PIL import Image
        except ImportError as exc:
            raise ValueError('PNG needs Pillow in this Python; supply JSON/P2 PGM or select an existing Pillow interpreter') from exc
        with Image.open(io.BytesIO(data)) as image:
            if image.format != 'PNG' or image.mode not in ('1', 'L'):
                raise ValueError('PNG must be explicit binary grayscale (mode 1 or L), not RGB/alpha artwork')
            width, height = image.size
            dimensions(width, height)
            values = list(image.convert('L').getdata())
            if any(v not in (0, 255) for v in values):
                raise ValueError('PNG must contain only 0 and 255 mask samples')
            mask = tuple(tuple(v == 255 for v in values[y * width:(y + 1) * width]) for y in range(height))
    else:
        raise ValueError('mask extension must be .json, .pgm or .png')
    box = bounds(mask)
    if box is None:
        raise ValueError('empty foreground mask')
    if box[2] - box[0] < 2 or box[3] - box[1] < 2:
        raise ValueError('degenerate foreground: needs two-dimensional extent')
    if sum(sum(row) for row in mask) == width * height:
        raise ValueError('unusable mask: no background pixels')
    return mask


def bounds(mask):
    left, top, right, bottom = len(mask[0]), len(mask), -1, -1
    for y, row in enumerate(mask):
        for x, value in enumerate(row):
            if value:
                left, right = min(left, x), max(right, x)
                top, bottom = min(top, y), max(bottom, y)
    return None if right < 0 else (left, top, right + 1, bottom + 1)


def normalize(mask):
    x0, y0, x1, y1 = bounds(mask)
    width, height = x1 - x0, y1 - y0
    scaled_width = max(1, round(width * NORMALIZED_HEIGHT / height))
    if scaled_width * NORMALIZED_HEIGHT > MAX_PIXELS:
        raise ValueError('normalized mask exceeds pixel limit')
    return tuple(tuple(mask[y0 + min(height - 1, y * height // NORMALIZED_HEIGHT)]
                           [x0 + min(width - 1, x * width // scaled_width)]
                       for x in range(scaled_width)) for y in range(NORMALIZED_HEIGHT))


def metrics(reference, candidate):
    width = max(len(reference[0]), len(candidate[0]))
    height = len(reference)
    if height != len(candidate):
        raise ValueError('comparison heights differ')
    def pixel(mask, x, y):
        offset = (width - len(mask[0])) // 2
        return mask[y][x - offset] if offset <= x < offset + len(mask[0]) else False
    intersection = union = 0
    for y in range(height):
        for x in range(width):
            a, b = pixel(reference, x, y), pixel(candidate, x, y)
            intersection += a and b
            union += a or b
    _, top, _, bottom = bounds(reference)
    extent = bottom - top
    def band_width(mask, y):
        xs = [x for x, value in enumerate(mask[y]) if value]
        return max(xs) - min(xs) + 1 if xs else 0
    bands = []
    for i in range(10):
        y = min(bottom - 1, top + int((i + 0.5) * extent / 10))
        bands.append((band_width(candidate, y) - band_width(reference, y)) / extent)
    return {'iou': intersection / union, 'intersection_pixels': intersection,
            'union_pixels': union, 'band_width_difference_per_reference_height': bands}


def calibration(value):
    keys = {'projection', 'view', 'metres_per_pixel', 'axis_column', 'ground_row', 'pixel_aspect'}
    if not isinstance(value, dict) or set(value) != keys:
        raise ValueError('registered calibration requires projection, view, metres_per_pixel, axis_column, ground_row, pixel_aspect')
    if value['projection'] != 'orthographic' or value['view'] not in ('front', 'back', 'left', 'right'):
        raise ValueError('only declared cardinal orthographic windows are supported')
    for key in ('metres_per_pixel', 'pixel_aspect'):
        pair = value[key]
        if not isinstance(pair, list) or len(pair) != 2:
            raise ValueError(key + ' requires two positive values')
        for item in pair:
            number(item, key, positive=True)
    number(value['axis_column'], 'axis_column')
    number(value['ground_row'], 'ground_row')
    # Physical pixel ratio must agree with the declared window sampling.
    m = value['metres_per_pixel']
    p = value['pixel_aspect']
    ratios = (m[0] / m[1], p[0] / p[1])
    if not all(math.isfinite(v) and v > 0 for v in ratios) or not math.isclose(*ratios, rel_tol=1e-9):
        raise ValueError('metres_per_pixel disagrees with pixel_aspect')
    return value


def compare(contract_path):
    raw = contract_path.read_bytes()
    if not 0 < len(raw) <= MAX_BYTES:
        raise ValueError('empty or oversized contract')
    obj = checked_json(raw)
    required = {'schema_version', 'mode', 'source', 'reference', 'candidate'}
    if not isinstance(obj, dict) or set(obj) - required - {'calibration'} or not required <= set(obj):
        raise ValueError('invalid contract keys')
    if type(obj['schema_version']) is not int or obj['schema_version'] != 1:
        raise ValueError('schema_version must be 1')
    if obj['mode'] not in ('normalized', 'registered'):
        raise ValueError('mode must be normalized or registered')
    base = contract_path.parent
    source_path, _ = read_record(obj['source'], base, mask=False)
    ref_path, ref_data = read_record(obj['reference'], base)
    cand_path, cand_data = read_record(obj['candidate'], base)
    ref, cand = decode_mask(ref_path, ref_data), decode_mask(cand_path, cand_data)
    if obj['mode'] == 'registered':
        c = obj.get('calibration')
        if not isinstance(c, dict) or set(c) != {'reference', 'candidate'}:
            raise ValueError('registered mode requires reference and candidate calibration')
        rc, cc = calibration(c['reference']), calibration(c['candidate'])
        if rc != cc or (len(ref), len(ref[0])) != (len(cand), len(cand[0])):
            raise ValueError('registered windows/calibration/image sizes must match exactly; resample explicitly before comparison')
        measured_ref, measured_cand = ref, cand
    else:
        if 'calibration' in obj:
            raise ValueError('normalized diagnostic does not accept world calibration')
        measured_ref, measured_cand = normalize(ref), normalize(cand)
    return {'schema_version': 1, 'status': 'measured', 'mode': obj['mode'],
            'contract_sha256': digest(raw), 'source_sha256': obj['source']['sha256'],
            'source_path': str(source_path), 'reference': dict(obj['reference']),
            'candidate': dict(obj['candidate']), 'calibration': obj.get('calibration'),
            'reference_size': [len(ref[0]), len(ref)], 'candidate_size': [len(cand[0]), len(cand)],
            'reference_foreground_box': list(bounds(ref)), 'candidate_foreground_box': list(bounds(cand)),
            'metrics': metrics(measured_ref, measured_cand),
            'normalization': 'independent bbox crop, nearest height 256, horizontal centering' if obj['mode'] == 'normalized' else 'none',
            'not_checked': ['calibration truth or actual Blender camera', 'depth or arbitrary 3D world scale',
                            'material/geometry quality', 'visual approval', 'target engine']}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--contract', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args(argv)
    try:
        if args.output.exists() or not args.output.parent.is_dir():
            raise ValueError('output must be a new path in an existing directory')
        report = compare(args.contract.resolve())
        # Exclusive creation also protects against a concurrent writer.
        with args.output.open('x', encoding='utf-8', newline='\n') as handle:
            json.dump(report, handle, indent=2, allow_nan=False)
            handle.write('\n')
    except (ValueError, OSError, TypeError, KeyError, OverflowError) as exc:
        print('mask comparison failed: ' + str(exc), file=sys.stderr)
        return 1
    print('Measured ' + report['mode'] + ' silhouette; no visual acceptance inferred.')
    return 0


if __name__ == '__main__':
    sys.exit(main())

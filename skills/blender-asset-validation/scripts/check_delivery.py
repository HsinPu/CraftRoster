"""Verify revision-bound delivery evidence. It cannot judge visual quality itself."""
import argparse
import hashlib
import json
from pathlib import Path
import sys


def check(manifest, base):
    errors = []
    def file_record(record, label):
        if not isinstance(record, dict) or not isinstance(record.get('path'), str) or not record['path'] or not isinstance(record.get('sha256'), str):
            errors.append(label + ': invalid file record')
            return False
        path = base / record['path']
        if not path.is_file() or path.stat().st_size == 0:
            errors.append(label + ': missing or empty file')
            return False
        if hashlib.sha256(path.read_bytes()).hexdigest() != record['sha256']:
            errors.append(label + ': stale hash')
            return False
        return True
    if not isinstance(manifest, dict) or manifest.get('schema_version') != 1:
        raise ValueError('Expected schema_version 1 manifest')
    for key in ('source', 'contract'):
        file_record(manifest.get(key), key)
    exports = manifest.get('exports')
    if not isinstance(exports, list) or not exports:
        errors.append('exports: nonempty file records required')
    else:
        for i, item in enumerate(exports):
            file_record(item, 'export ' + str(i))
    statuses = {}
    required_engine = manifest.get('require_engine', False)
    if not isinstance(required_engine, bool):
        raise ValueError('require_engine must be boolean')
    for kind in ('technical', 'visual', 'engine'):
        entry = manifest.get(kind + '_report')
        if kind == 'engine' and not entry and not required_engine:
            statuses[kind] = 'not_tested'
            continue
        try:
            report = json.loads((base / entry).read_text(encoding='utf-8'))
            if not isinstance(report, dict) or report.get('schema_version') != 1:
                raise ValueError('report must be schema_version 1 object')
            statuses[kind] = report.get('status', 'unverified')
            for key in ('source', 'contract'):
                record = manifest.get(key)
                expected = record.get('sha256') if isinstance(record, dict) else None
                if not expected or report.get(key + '_sha256') != expected:
                    errors.append(kind + ': stale ' + key + ' binding')
            if report.get('status') != 'pass':
                errors.append(kind + ': not passed')
            findings = report.get('findings', [])
            if not isinstance(findings, list) or any(not isinstance(f, dict) or f.get('severity') in ('blocker', 'major') for f in findings):
                errors.append(kind + ': unresolved or invalid findings')
            if kind == 'visual':
                images = report.get('images')
                if not isinstance(images, list) or not images:
                    errors.append('visual: reviewed images missing')
                else:
                    for i, image in enumerate(images):
                        file_record(image, 'visual image ' + str(i))
            if kind == 'engine':
                if report.get('exports') != exports:
                    errors.append('engine: stale export binding')
                checks = report.get('checks')
                if not isinstance(report.get('engine'), str) or not report['engine'].strip() or not isinstance(checks, list) or not checks or any(not isinstance(item, str) or not item.strip() for item in checks):
                    errors.append('engine: target and executed checks required')
        except (OSError, ValueError, TypeError):
            errors.append(kind + ': report missing or invalid')
            statuses[kind] = 'unverified'
    return {'schema_version': 1, 'ready': not errors, 'scope': 'engine_verified' if required_engine else 'asset_delivery',
            'statuses': statuses, 'errors': errors,
            'limits': 'Checks evidence bindings; visual judgment and engine testing must actually be performed by the named reviewers.'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True, type=Path)
    args = parser.parse_args()
    try:
        report = check(json.loads(args.manifest.read_text(encoding='utf-8')), args.manifest.resolve().parent)
        print(json.dumps(report))
        return 0 if report['ready'] else 1
    except (OSError, ValueError, TypeError) as error:
        print(json.dumps({'ready': False, 'errors': [str(error)]}))
        return 1


if __name__ == '__main__':
    sys.exit(main())

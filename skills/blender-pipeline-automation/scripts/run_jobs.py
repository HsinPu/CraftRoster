"""Execute explicit trusted Blender jobs with separate output directories and logs."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(manifest, base, output):
    if (not isinstance(manifest, dict) or set(manifest) != {'schema_version', 'jobs'}
            or type(manifest['schema_version']) is not int or manifest['schema_version'] != 1):
        raise ValueError('Expected schema_version 1 with only a jobs list')
    if not isinstance(manifest['jobs'], list) or not manifest['jobs']:
        raise ValueError('jobs must be a nonempty list')
    if output.exists():
        raise ValueError('Output root must be new; keep previous runs for comparison')
    seen, prepared = set(), []
    for record in manifest['jobs']:
        if not isinstance(record, dict) or set(record) - {'id', 'blend', 'script', 'args', 'expected_outputs'}:
            raise ValueError('Invalid or unknown job fields')
        identity = record.get('id')
        if not isinstance(identity, str) or not re.fullmatch(r'[a-z][a-z0-9_-]{0,63}', identity) or identity in seen:
            raise ValueError('Job ids must be unique lowercase slugs')
        seen.add(identity)
        if identity.upper().split('.')[0] in {'CON', 'PRN', 'AUX', 'NUL', *('COM'+str(n) for n in range(1,10)), *('LPT'+str(n) for n in range(1,10))}:
            raise ValueError('Reserved platform filename used as job id')
        script_value = record.get('script')
        if not isinstance(script_value, str) or not script_value:
            raise ValueError('Each job needs a script path')
        script = (base / script_value).resolve(strict=True)
        if not script.is_file() or script.suffix.lower() != '.py':
            raise ValueError('Job script must be an existing Python file')
        source = None
        if 'blend' in record:
            if not isinstance(record['blend'], str) or not record['blend']:
                raise ValueError('blend must be a path string')
            source = (base / record['blend']).resolve(strict=True)
            if not source.is_file() or source.suffix.lower() != '.blend':
                raise ValueError('Input must be an existing blend file')
        args = record.get('args', [])
        if not isinstance(args, list) or any(not isinstance(arg, str) or '\0' in arg for arg in args):
            raise ValueError('Job args must be strings without NUL')
        expected = record.get('expected_outputs')
        if not isinstance(expected, list) or not expected:
            raise ValueError('Each job needs nonempty expected_outputs')
        paths, occupied = [], {'stdout.log', 'stderr.log'}
        for name in expected:
            if (not isinstance(name, str) or not name
                    or any(char in name for char in '\\:<>"|?*\0')
                    or any(ord(char) < 32 for char in name)):
                raise ValueError('Expected output must be a relative slash-separated path')
            relative = Path(name)
            parts = name.split('/')
            if relative.is_absolute() or any(part in ('', '.', '..') for part in parts):
                raise ValueError('Expected output path escapes job directory')
            if any(part.endswith((' ', '.')) or part.split('.')[0].upper() in {
                    'CON', 'PRN', 'AUX', 'NUL', *('COM'+str(n) for n in range(1, 10)),
                    *('LPT'+str(n) for n in range(1, 10))} for part in parts):
                raise ValueError('Expected output uses a reserved platform filename')
            canonical = name.casefold()
            if any(canonical == other or canonical.startswith(other+'/')
                   or other.startswith(canonical+'/') for other in occupied):
                raise ValueError('Colliding or reserved output path')
            occupied.add(canonical)
            paths.append(name)
        prepared.append({'id': identity, 'script': script, 'source': source, 'args': args,
                         'expected': paths, 'output': output / identity})
    return prepared


def execute(job, blender, runner, timeout):
    started = time.monotonic()
    folder = job['output']
    before = None
    record = {'id': job['id'], 'script_sha256': None, 'source_sha256': None,
              'outputs': [], 'errors': []}
    arguments = [sys.executable, str(runner), '--blender', blender, '--script', str(job['script']),
                 '--timeout', str(timeout)]
    if job['source']:
        arguments += ['--blend', str(job['source'])]
    arguments += ['--', '--output-dir', str(folder), *job['args']]
    try:
        folder.mkdir()
        before = sha(job['source']) if job['source'] else None
        record['source_sha256'] = before
        record['script_sha256'] = sha(job['script'])
        with (folder/'stdout.log').open('wb') as stdout, (folder/'stderr.log').open('wb') as stderr:
            result = subprocess.run(arguments, stdout=stdout, stderr=stderr, shell=False, timeout=timeout+15)
        record['exit_code'] = result.returncode
        if result.returncode:
            record['errors'].append('process_failed')
    except (OSError, subprocess.TimeoutExpired) as error:
        record['errors'].append(type(error).__name__ + ': ' + str(error))
    if job['source'] and before is not None:
        try:
            if sha(job['source']) != before:
                record['errors'].append('source_changed')
        except OSError:
            record['errors'].append('source_changed_or_unreadable')
    for name in job['expected']:
        path = folder/name
        try:
            resolved = path.resolve(strict=True)
            resolved.relative_to(folder.resolve())
            if not resolved.is_file() or not resolved.stat().st_size:
                raise ValueError('missing or empty output')
            record['outputs'].append({'path': name, 'sha256': sha(resolved), 'bytes': resolved.stat().st_size})
        except (OSError, ValueError, RuntimeError):
            record['errors'].append('invalid_output:' + name)
    record['status'] = 'fail' if record['errors'] else 'pass'
    record['elapsed_seconds'] = round(time.monotonic()-started, 4)
    return record


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--blender', default=os.environ.get('BLENDER_BIN'), required=False)
    parser.add_argument('--workers', type=int, default=1)
    parser.add_argument('--timeout', type=int, default=300)
    args = parser.parse_args()
    try:
        if not 1 <= args.workers <= 8 or not 1 <= args.timeout <= 3600:
            raise ValueError('workers must be 1..8 and timeout 1..3600')
        if not args.blender or not Path(args.blender).is_file():
            raise ValueError('Use --blender or BLENDER_BIN with an existing executable')
        output = args.output.resolve()
        jobs = prepare(json.loads(args.manifest.read_text(encoding='utf-8')), args.manifest.resolve().parent, output)
        runner = Path(__file__).resolve().parents[2]/'blender-development/scripts/run_blender.py'
        if not runner.is_file():
            raise ValueError('Required blender-development runner is missing')
        output.mkdir(parents=True, exist_ok=False)
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            results = list(pool.map(lambda job: execute(job, str(Path(args.blender).resolve()), runner, args.timeout), jobs))
        report = {'schema_version': 1, 'status': 'pass' if all(r['status']=='pass' for r in results) else 'fail',
                  'results': results, 'limits': 'Process/source/output checks only; inspect technical, visual and engine evidence separately.'}
        with (output/'batch-report.json').open('x', encoding='utf-8', newline='\n') as stream:
            json.dump(report, stream, indent=2); stream.write('\n')
        print(json.dumps(report))
        return 0 if report['status']=='pass' else 1
    except (OSError, ValueError, TypeError, RuntimeError) as error:
        print(json.dumps({'status': 'fail', 'error': str(error)}))
        return 1


if __name__ == '__main__':
    sys.exit(main())

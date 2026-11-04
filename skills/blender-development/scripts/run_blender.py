"""Run a trusted script in an isolated background Blender process (not a sandbox)."""
import argparse
import os
from pathlib import Path
import shutil
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blender', default=os.environ.get('BLENDER_BIN') or shutil.which('blender'))
    parser.add_argument('--blend', type=Path)
    parser.add_argument('--script', required=True, type=Path)
    parser.add_argument('--timeout', type=int, default=300)
    parser.add_argument('args', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    if not args.blender or not Path(args.blender).is_file():
        parser.error('Blender executable missing: use --blender or BLENDER_BIN')
    if not 1 <= args.timeout <= 3600:
        parser.error('--timeout must be 1..3600 seconds')
    if not args.script.is_file() or (args.blend and not args.blend.is_file()):
        parser.error('Script and optional blend must be existing files')
    command = [str(Path(args.blender).resolve()), '--background', '--factory-startup', '--disable-autoexec']
    if args.blend:
        command.append(str(args.blend.resolve()))
    command.extend(['--python-exit-code', '1', '--python', str(args.script.resolve()), '--'])
    command.extend(args.args[1:] if args.args[:1] == ['--'] else args.args)
    try:
        return subprocess.run(command, shell=False, timeout=args.timeout).returncode
    except subprocess.TimeoutExpired:
        print('Blender exceeded timeout', file=sys.stderr)
        return 124
    except OSError as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())

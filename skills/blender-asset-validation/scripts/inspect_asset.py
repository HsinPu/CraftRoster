"""Read explicit asset objects in background Blender; write a NEW technical report."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def inspect(contract):
    import bpy
    import bmesh
    if not bpy.app.background or not bpy.data.filepath:
        raise ValueError('Use a saved .blend in background Blender')
    names = contract.get('objects')
    unknown = set(contract) - {'schema_version', 'objects', 'max_triangles', 'require_uv', 'require_manifold', 'require_materials'}
    if unknown:
        raise ValueError('Unsupported requested checks: ' + ', '.join(sorted(unknown)))
    if contract.get('schema_version') != 1 or not isinstance(names, list) or not names or any(not isinstance(n, str) or not n for n in names) or len(set(names)) != len(names):
        raise ValueError('Contract needs schema_version 1 and unique explicit objects')
    limit = contract.get('max_triangles')
    if limit is not None and (isinstance(limit, bool) or not isinstance(limit, int) or limit < 1):
        raise ValueError('max_triangles must be a positive integer')
    for key in ('require_uv', 'require_manifold', 'require_materials'):
        if key in contract and not isinstance(contract[key], bool):
            raise ValueError(key + ' must be boolean')
    issues, metrics = [], []
    graph = bpy.context.evaluated_depsgraph_get()
    for name in names:
        obj = bpy.data.objects.get(name)
        if obj is None:
            issues.append({'object': name, 'code': 'missing_object'})
            continue
        if obj.type != 'MESH':
            issues.append({'object': name, 'code': 'unsupported_object_type', 'type': obj.type})
            continue
        if any(not math.isfinite(value) for row in obj.matrix_world for value in row) or any(not math.isfinite(value) for value in obj.scale):
            issues.append({'object': name, 'code': 'nonfinite_transform'})
            continue
        if any(value <= 0 for value in obj.scale):
            issues.append({'object': name, 'code': 'non_positive_scale'})
        evaluated = obj.evaluated_get(graph)
        mesh = evaluated.to_mesh()
        try:
            mesh.calc_loop_triangles()
            points = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
            unit = bpy.context.scene.unit_settings.scale_length
            if any(not math.isfinite(value) for point in points for value in point) or not math.isfinite(unit) or unit <= 0:
                issues.append({'object': name, 'code': 'nonfinite_geometry_or_units'})
                continue
            dimensions = [(max(p[i] for p in points) - min(p[i] for p in points)) * unit for i in range(3)] if points else [0, 0, 0]
            if not points or not mesh.loop_triangles or any(not math.isfinite(v) for v in dimensions):
                issues.append({'object': name, 'code': 'empty_or_invalid_geometry'})
            uv = len(mesh.uv_layers)
            if contract.get('require_uv') and not uv:
                issues.append({'object': name, 'code': 'missing_uv'})
            bm = bmesh.new()
            try:
                bm.from_mesh(mesh)
                bad_edges = sum(not e.is_manifold for e in bm.edges)
            finally:
                bm.free()
            if contract.get('require_manifold') and bad_edges:
                issues.append({'object': name, 'code': 'non_manifold', 'edges': bad_edges})
            missing = []
            if contract.get('require_materials') and (not mesh.materials or any(mat is None for mat in mesh.materials)):
                issues.append({'object': name, 'code': 'missing_material'})
            for mat in mesh.materials:
                if mat and mat.node_tree:
                    for node in mat.node_tree.nodes:
                        image = getattr(node, 'image', None)
                        if image and image.source == 'FILE' and not image.packed_file and not Path(bpy.path.abspath(image.filepath, library=image.library)).is_file():
                            missing.append(image.name)
            if missing:
                issues.append({'object': name, 'code': 'missing_textures', 'images': sorted(set(missing))})
            metrics.append({'object': name, 'triangles': len(mesh.loop_triangles), 'materials': len(mesh.materials), 'uv_layers': uv, 'dimensions_m': dimensions, 'non_manifold_edges': bad_edges})
        finally:
            evaluated.to_mesh_clear()
    total = sum(m['triangles'] for m in metrics)
    if limit is not None and total > limit:
        issues.append({'code': 'triangle_budget', 'actual': total, 'limit': limit})
    return {'schema_version': 1, 'kind': 'blender-technical-inspection', 'blender_version': bpy.app.version_string,
            'source_sha256': digest(bpy.data.filepath), 'status': 'fail' if issues else 'pass',
            'metrics': metrics, 'findings': issues, 'visual_status': 'not_reviewed', 'engine_status': 'not_tested',
            'not_checked': ['visual_quality', 'engine_import', 'animation_playback', 'skin_weights', 'uv_overlap', 'texture_intent']}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--contract', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else None)
    if args.output.exists():
        parser.error('Report already exists; use a new revision path')
    report = inspect(json.loads(args.contract.read_text(encoding='utf-8')))
    report['contract_sha256'] = digest(args.contract)
    with args.output.open('x', encoding='utf-8') as stream:
        json.dump(report, stream, indent=2, allow_nan=False)
    print(json.dumps(report, allow_nan=False))
    return 0 if report['status'] == 'pass' else 1


if __name__ == '__main__':
    sys.exit(main())

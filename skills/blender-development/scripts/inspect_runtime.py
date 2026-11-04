"""Record the loaded Blender environment without changing scene or preferences."""
import argparse
import json
from pathlib import Path
import platform
import sys

import bpy


def collect():
    scene = bpy.context.scene
    props = lambda owner: set(owner.bl_rna.properties.keys())
    return {
        'schema_version': 1,
        'blender': bpy.app.version_string,
        'build_hash': bpy.app.build_hash.decode('ascii', errors='replace'),
        'python': platform.python_version(),
        'background': bpy.app.background,
        'source': bpy.data.filepath or None,
        'scene': scene.name,
        'render_engine': scene.render.engine,
        'units': {'system': scene.unit_settings.system, 'scale_length': scene.unit_settings.scale_length},
        'color': {'view': scene.view_settings.view_transform, 'look': scene.view_settings.look,
                  'display': scene.display_settings.display_device, 'exposure': scene.view_settings.exposure},
        'frames': {'start': scene.frame_start, 'end': scene.frame_end,
                   'fps': scene.render.fps, 'fps_base': scene.render.fps_base},
        'enabled_addons': sorted(bpy.context.preferences.addons.keys()),
        'object_counts': {kind: sum(ob.type == kind for ob in scene.objects)
                          for kind in sorted({ob.type for ob in scene.objects})},
        'api_presence': {
            'scene_compositing_node_group': 'compositing_node_group' in props(scene),
            'scene_node_tree': 'node_tree' in props(scene),
            'action_slots': 'slots' in props(bpy.types.Action),
            'legacy_action_fcurves': 'fcurves' in props(bpy.types.Action),
            'node_group_interface': 'interface' in props(bpy.types.NodeTree),
            'material_surface_render_method': 'surface_render_method' in props(bpy.types.Material),
            'image_media_type': 'media_type' in props(bpy.types.ImageFormatSettings),
            'shader_to_rgb_node_type': hasattr(bpy.types, 'ShaderNodeShaderToRGB'),
        },
        'not_tested': ['GPU device execution', 'MCP connectivity', 'optional exporters',
                       'renderer-specific node behavior', 'target engine compatibility'],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
    payload = json.dumps(collect(), indent=2, ensure_ascii=False) + '\n'
    if args.output:
        with args.output.open('x', encoding='utf-8', newline='\n') as stream:
            stream.write(payload)
    print(payload)


if __name__ == '__main__':
    main()

"""Synthetic production evidence; not a game-engine test or an art-quality benchmark."""
import json
import math
from pathlib import Path
import sys
import bpy
from mathutils import Vector

phase, directory = sys.argv[sys.argv.index('--') + 1:]
out = Path(directory)
out.mkdir(parents=True, exist_ok=True)


def bounds(obj, frame):
    bpy.context.scene.frame_set(frame)
    bpy.context.view_layer.update()
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    try:
        coords = [evaluated.matrix_world @ vertex.co for vertex in mesh.vertices]
        return [[min(v[i] for v in coords) for i in range(3)], [max(v[i] for v in coords) for i in range(3)]]
    finally:
        evaluated.to_mesh_clear()


def reset():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.context.scene.render.fps = 24
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 25


def material():
    mat = bpy.data.materials.new('FixtureTeal')
    mat.diffuse_color = (0.08, 0.5, 0.38, 1)
    return mat


if phase == 'rig-build':
    reset()
    bpy.ops.mesh.primitive_cube_add()
    rod = bpy.context.object
    rod.name = 'Rod'
    for vertex in rod.data.vertices:
        vertex.co.x *= 0.15
        vertex.co.y *= 0.15
        vertex.co.z = vertex.co.z + 1
    rod.data.materials.append(material())
    bpy.ops.object.armature_add()
    rig = bpy.context.object
    rig.name = 'Rig'
    rig.data.bones[0].name = 'Root'
    rod.parent = rig
    modifier = rod.modifiers.new('Skin', 'ARMATURE')
    modifier.object = rig
    group = rod.vertex_groups.new(name='Root')
    group.add(list(range(len(rod.data.vertices))), 1, 'REPLACE')
    bone = rig.pose.bones['Root']
    bone.rotation_mode = 'XYZ'
    for frame, angle in [(1, 0), (13, 0.65), (25, 0)]:
        bone.rotation_euler.x = angle
        bone.keyframe_insert(data_path='rotation_euler', frame=frame)
    rig.animation_data.action.name = 'Wave'
    first, middle = bounds(rod, 1), bounds(rod, 13)
    bpy.context.scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(out / 'rig-source.blend'))
    bpy.ops.object.select_all(action='DESELECT')
    rod.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(filepath=str(out / 'rig.glb'), export_format='GLB', use_selection=True,
                              export_animations=True, export_animation_mode='ACTIONS')
    report = {'bones': ['Root'], 'action': 'Wave', 'fps': 24, 'duration_seconds': 1,
              'rest_bounds': first, 'motion_bounds': middle, 'version': bpy.app.version_string}
elif phase == 'rig-import':
    reset()
    bpy.ops.import_scene.gltf(filepath=str(out / 'rig.glb'))
    rig = next(obj for obj in bpy.data.objects if obj.type == 'ARMATURE')
    # Importers may create helper meshes for bone display. Inspect the skinned
    # payload rather than whichever mesh happens to be first in global data.
    rod = next(obj for obj in bpy.data.objects if obj.type == 'MESH' and obj.find_armature() == rig)
    first, middle = bounds(rod, 1), bounds(rod, 13)
    report = {'bones': [bone.name for bone in rig.data.bones],
              'actions': [action.name for action in bpy.data.actions],
              'rest_bounds': first, 'motion_bounds': middle,
              'rig_scale': list(rig.scale), 'version': bpy.app.version_string}
elif phase == 'reference':
    reset()
    bpy.ops.mesh.primitive_cube_add()
    asset = bpy.context.object
    asset.name = 'ReferenceProp'
    asset.data.materials.append(material())
    # Synthetic orthographic drawing target: width 1m, height 2m (ratio .5).
    # The initial authored blockout is deliberately twice as wide.
    for vertex in asset.data.vertices:
        vertex.co.y *= 0.4
        vertex.co.z += 1
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = 384
    scene.render.resolution_y = 384
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'MATERIAL'
    scene.display.shading.background_type = 'WORLD'
    scene.world.color = (0.04, 0.04, 0.04)
    camera_data = bpy.data.cameras.new('FixedOrtho')
    camera = bpy.data.objects.new('FixedOrtho', camera_data)
    scene.collection.objects.link(camera)
    camera.location = (0, -7, 1)
    camera.rotation_euler = (Vector((0, 0, 1)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data.type = 'ORTHO'
    camera_data.ortho_scale = 3
    scene.camera = camera
    records = []
    for label, width_factor in [('before', 1), ('after', 0.5)]:
        if label == 'after':
            for vertex in asset.data.vertices:
                vertex.co.x *= width_factor
        bpy.context.view_layer.update()
        dims = list(asset.dimensions)
        scene.render.filepath = str(out / (label + '.png'))
        bpy.ops.render.render(write_still=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(out / (label + '.blend')))
        records.append({'revision': label, 'dimensions_m': dims, 'width_height_ratio': dims[0] / dims[2],
                        'camera_ortho_scale': camera_data.ortho_scale, 'camera_position': list(camera.location)})
    bpy.ops.object.select_all(action='DESELECT')
    asset.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(out / 'reference.glb'), export_format='GLB', use_selection=True)
    report = {'target_width_m': 1, 'target_height_m': 2, 'target_ratio': 0.5,
              'reference_kind': 'synthetic declared orthographic dimensions', 'records': records,
              'visual_judgment': 'not_performed', 'version': bpy.app.version_string}
elif phase == 'reference-import':
    reset()
    bpy.ops.import_scene.gltf(filepath=str(out / 'reference.glb'))
    asset = next(obj for obj in bpy.data.objects if obj.type == 'MESH')
    report = {'dimensions_m': list(asset.dimensions), 'bounds': bounds(asset, 1)}
else:
    raise ValueError(phase)
(out / (phase + '.json')).write_text(json.dumps(report, indent=2), encoding='utf-8')

import bpy,json,sys,hashlib
from pathlib import Path
root=Path(sys.argv[sys.argv.index('--')+1]);mode=sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
if mode=='export':
 image=bpy.data.images.new('Original',4,2,alpha=True)
 image.pixels[:]=[0.2,0.4,0.6,1.0]*8
 image.filepath_raw=str(root/'original.png');image.file_format='PNG';image.save()
 for i,name in enumerate(('Body','Other')):
  bpy.ops.mesh.primitive_cube_add(location=(i*3,0,0));ob=bpy.context.object;ob.name=name
  mat=bpy.data.materials.new(name);mat.use_nodes=True
  bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Metallic'].default_value=.37;bs.inputs['Roughness'].default_value=.61
  tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image
  mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);ob.data.materials.append(mat)
 bpy.ops.export_scene.gltf(filepath=str(root/'source.glb'),export_format='GLB')
 image=bpy.data.images.new('Candidate',4,2,alpha=True);image.pixels[:]=[0.8,0.1,0.05,1.0]*8
 image.filepath_raw=str(root/'candidate.png');image.file_format='PNG';image.save()
else:
 summaries={}
 for kind in ('source','candidate'):
  bpy.ops.wm.read_factory_settings(use_empty=True)
  bpy.ops.import_scene.gltf(filepath=str(root/(kind+'.glb')))
  summary={}
  for ob in bpy.context.scene.objects:
   if ob.type!='MESH':continue
   mat=ob.data.materials[0];bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
   tex=bs.inputs['Base Color'].links[0].from_node
   summary[mat.name]={'verts':[list(v.co) for v in ob.data.vertices],'matrix':[list(r) for r in ob.matrix_world],'polygons':[list(p.vertices) for p in ob.data.polygons],'metal':bs.inputs['Metallic'].default_value,'rough':bs.inputs['Roughness'].default_value,'pixel':list(tex.image.pixels[:4]),'size':list(tex.image.size)}
  summaries[kind]=summary
 for key in ('Body','Other'):
  for field in ('verts','matrix','polygons','metal','rough','size'):
   assert summaries['source'][key][field]==summaries['candidate'][key][field],(key,field)
 assert summaries['source']['Other']['pixel']==summaries['candidate']['Other']['pixel']
 assert summaries['source']['Body']['pixel']!=summaries['candidate']['Body']['pixel']
 (root/'native-report.json').write_text(json.dumps({'checks':'geometry matrices topology PBR dimensions unchanged; Body decoded image changed and Other unchanged','summaries':summaries,'blender':bpy.app.version_string},indent=2))
 print('NATIVE_REIMPORT_OK')

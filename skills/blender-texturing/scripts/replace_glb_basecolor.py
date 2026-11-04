"""Append an embedded base-color image for one selected GLB material, without reexport.

Standard-library only. Core GLB 2, one embedded buffer, PNG/JPEG. Unknown chunks,
extensions and URI resources are rejected conservatively before writing.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
import struct


def require(value, message):
    if not value:
        raise ValueError(message)


def integer(value):
    return isinstance(value, int) and not isinstance(value, bool)


def index(value, sequence, label):
    require(integer(value) and 0 <= value < len(sequence), 'Invalid ' + label)
    return sequence[value]


def walk(value):
    """Walk schema-bearing data, treating glTF extras as opaque application JSON."""
    if isinstance(value, dict):
        yield value
        for key, child in value.items():
            if key != 'extras':
                yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def parse(raw):
    require(len(raw) >= 28, 'Truncated GLB')
    require(struct.unpack_from('<III', raw) == (0x46546C67, 2, len(raw)), 'Invalid GLB 2 header')
    offset, chunks = 12, []
    while offset < len(raw):
        require(offset + 8 <= len(raw), 'Truncated chunk header')
        length, kind = struct.unpack_from('<II', raw, offset)
        require(length % 4 == 0 and offset + 8 + length <= len(raw), 'Invalid chunk length')
        chunks.append((kind, raw[offset + 8:offset + 8 + length]))
        offset += 8 + length
    require([k for k, _ in chunks] == [0x4E4F534A, 0x004E4942], 'Only JSON then BIN chunks supported')
    def unique(pairs):
        result = {}
        for key, value in pairs:
            require(key not in result, 'Duplicate JSON member')
            result[key] = value
        return result
    doc = json.loads(chunks[0][1], object_pairs_hook=unique,
                     parse_constant=lambda value: (_ for _ in ()).throw(ValueError('Nonfinite JSON')))
    validate(doc, chunks[1][1])
    return doc, chunks[1][1]


def validate(doc, binary):
    require(isinstance(doc, dict) and doc.get('asset', {}).get('version') == '2.0', 'Expected glTF 2.0')
    require(not doc.get('extensionsRequired'), 'Required extensions unsupported')
    require(set(doc.get('extensionsUsed', [])) <= {'KHR_texture_transform'}, 'Unsupported extension declaration')
    for item in walk(doc):
        require('uri' not in item, 'URI resources unsupported; no fetch performed')
        require(set(item.get('extensions', {})) <= {'KHR_texture_transform'}, 'Unsupported extension payload')
    buffers = doc.get('buffers', [])
    require(isinstance(buffers, list) and len(buffers) == 1, 'One embedded buffer required')
    length = buffers[0].get('byteLength')
    require(integer(length) and 0 <= length <= len(binary) and len(binary)-length <= 3, 'Invalid buffer length')
    views = doc.get('bufferViews', [])
    for view in views:
        require(view.get('buffer') == 0, 'Invalid view buffer')
        start, count = view.get('byteOffset', 0), view.get('byteLength')
        require(integer(start) and integer(count) and start >= 0 and count > 0 and start+count <= length, 'Invalid bufferView range')
        if 'byteStride' in view:
            require(integer(view['byteStride']) and 4 <= view['byteStride'] <= 252 and view['byteStride'] % 4 == 0, 'Invalid stride')
    accessors = doc.get('accessors', [])
    widths = {'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT2':4,'MAT3':9,'MAT4':16}
    sizes = {5120:1,5121:1,5122:2,5123:2,5125:4,5126:4}
    for accessor in accessors:
        require('sparse' not in accessor, 'Sparse accessors unsupported')
        view = index(accessor.get('bufferView'), views, 'accessor view')
        count, start = accessor.get('count'), accessor.get('byteOffset',0)
        require(integer(count) and count > 0 and integer(start) and start >= 0, 'Invalid accessor count/offset')
        component, typ = accessor.get('componentType'), accessor.get('type')
        require(component in sizes and typ in widths, 'Invalid accessor encoding')
        size = sizes[component]
        # Matrix columns align to four bytes even for byte/short components.
        dim = int(typ[-1]) if typ.startswith('MAT') else None
        element = dim*((dim*size+3)//4*4) if dim else widths[typ]*size
        stride = view.get('byteStride',element)
        require(stride >= element and start % size == 0 and (view.get('byteOffset',0)+start)%size == 0, 'Invalid accessor alignment')
        require(start+(count-1)*stride+element <= view['byteLength'], 'Accessor outside view')
    images, textures = doc.get('images', []), doc.get('textures', [])
    for image in images:
        index(image.get('bufferView'), views, 'image view')
        require(image.get('mimeType') in ('image/png','image/jpeg'), 'Unsupported embedded image type')
    for texture in textures:
        index(texture.get('source'), images, 'texture image')
        if 'sampler' in texture:
            index(texture['sampler'], doc.get('samplers',[]), 'sampler')
    for material in doc.get('materials',[]):
        for item in walk(material):
            for key, value in item.items():
                if key.endswith('Texture'):
                    require(isinstance(value,dict), 'Invalid texture info')
                    index(value.get('index'), textures, 'material texture')
    for mesh in doc.get('meshes',[]):
        for primitive in mesh.get('primitives',[]):
            for value in primitive.get('attributes',{}).values():
                index(value, accessors, 'attribute accessor')
            if 'indices' in primitive:
                index(primitive['indices'], accessors, 'indices accessor')
            if 'material' in primitive:
                index(primitive['material'],doc.get('materials',[]),'primitive material')
            for target in primitive.get('targets',[]):
                for value in target.values():
                    index(value,accessors,'morph accessor')
    nodes = doc.get('nodes',[])
    for node in nodes:
        for key, values in [('mesh',doc.get('meshes',[])),('skin',doc.get('skins',[])),('camera',doc.get('cameras',[]))]:
            if key in node:
                index(node[key],values,'node '+key)
        for child in node.get('children',[]):
            index(child,nodes,'child node')
    for scene in doc.get('scenes',[]):
        for node in scene.get('nodes',[]):
            index(node,nodes,'scene node')
    if 'scene' in doc:
        index(doc['scene'],doc.get('scenes',[]),'default scene')
    for skin in doc.get('skins',[]):
        for node in skin.get('joints',[]):
            index(node,nodes,'joint')
        if 'skeleton' in skin:
            index(skin['skeleton'],nodes,'skeleton')
        if 'inverseBindMatrices' in skin:
            index(skin['inverseBindMatrices'],accessors,'inverse bind accessor')
    for animation in doc.get('animations',[]):
        samplers=animation.get('samplers',[])
        for sampler in samplers:
            index(sampler.get('input'),accessors,'animation input')
            index(sampler.get('output'),accessors,'animation output')
        for channel in animation.get('channels',[]):
            index(channel.get('sampler'),samplers,'animation sampler')
            if 'node' in channel.get('target',{}):
                index(channel['target']['node'],nodes,'animation target')


def image_type(raw):
    if raw.startswith(b'\x89PNG\r\n\x1a\n'):
        require(len(raw) >= 33 and raw[12:16] == b'IHDR' and b'IEND' in raw[-16:], 'Truncated PNG')
        require(all(struct.unpack_from('>II',raw,16)), 'Invalid PNG dimensions')
        return 'image/png'
    if raw.startswith(b'\xff\xd8') and raw.endswith(b'\xff\xd9'):
        require(len(raw)>4, 'Truncated JPEG')
        return 'image/jpeg'
    raise ValueError('Expected PNG or JPEG signature; image decode/registration is a separate check')


def replace(source, replacement, output, *, material_name=None, material_index=None):
    source,replacement,output=map(Path,(source,replacement,output))
    require(output.resolve() not in (source.resolve(),replacement.resolve()) and not output.exists(), 'Output must be a new separate file')
    require((material_name is None) != (material_index is None), 'Select exactly one material name or index')
    original=source.read_bytes()
    doc,binary=parse(original)
    materials=doc.get('materials',[])
    if material_name is not None:
        matches=[i for i,m in enumerate(materials) if m.get('name')==material_name]
        require(len(matches)==1,'Material name missing or ambiguous')
        material_index=matches[0]
    material=index(material_index,materials,'selected material')
    info=material.get('pbrMetallicRoughness',{}).get('baseColorTexture')
    require(isinstance(info,dict),'Selected material needs an existing baseColorTexture')
    old_texture=index(info.get('index'),doc.get('textures',[]),'base color texture')
    payload=replacement.read_bytes()
    mime=image_type(payload)
    updated=copy.deepcopy(doc)
    # Append rather than splice: every original byte and old index remains intact,
    # including shared images, texture roles, skin/animation and unknown extras.
    start=len(binary)
    new_bin=binary+payload+b'\0'*(-len(payload)%4)
    updated.setdefault('bufferViews',[]).append({'buffer':0,'byteOffset':start,'byteLength':len(payload)})
    updated.setdefault('images',[]).append({'bufferView':len(updated['bufferViews'])-1,'mimeType':mime})
    texture=copy.deepcopy(old_texture)
    texture['source']=len(updated['images'])-1
    updated.setdefault('textures',[]).append(texture)
    updated['materials'][material_index]['pbrMetallicRoughness']['baseColorTexture']['index']=len(updated['textures'])-1
    updated['buffers'][0]['byteLength']=len(new_bin)
    validate(updated,new_bin)
    encoded=json.dumps(updated,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode('utf-8')
    encoded+=b' '*(-len(encoded)%4)
    result=struct.pack('<III',0x46546C67,2,28+len(encoded)+len(new_bin))
    result+=struct.pack('<II',len(encoded),0x4E4F534A)+encoded+struct.pack('<II',len(new_bin),0x004E4942)+new_bin
    checked,checked_bin=parse(result)
    require(checked==updated and checked_bin[:len(binary)]==binary,'Preservation check failed')
    require(source.read_bytes()==original,'Source changed while preparing output')
    output.parent.mkdir(parents=True,exist_ok=True)
    with output.open('xb') as stream:
        stream.write(result)
    return {'output':str(output),'material_index':material_index,'mimeType':mime,
            'source_sha256':hashlib.sha256(original).hexdigest(),'output_sha256':hashlib.sha256(result).hexdigest(),
            'original_BIN_prefix_byte_exact':True,'scope':'Embedded core GLB plus KHR_texture_transform; image decode, UV registration and visual acceptance remain separate'}


def main():
    cli = argparse.ArgumentParser(description='Replace one embedded GLB color image while retaining unrelated data.')
    for positional in ('source', 'replacement', 'output'):
        cli.add_argument(positional)
    material = cli.add_mutually_exclusive_group(required=True)
    material.add_argument('--material-name')
    material.add_argument('--material-index', type=int)
    args = cli.parse_args()
    report = replace(args.source, args.replacement, args.output,
                     material_name=args.material_name, material_index=args.material_index)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()

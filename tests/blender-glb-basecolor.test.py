"""Host-only GLB mutation regressions; no Blender or image decoder required."""
import copy
import importlib.util
import json
from pathlib import Path
import struct
import unittest
import zlib
import uuid
import shutil
import sys

sys.dont_write_bytecode = True

PATH=Path(__file__).resolve().parents[1]/'skills/blender-texturing/scripts/replace_glb_basecolor.py'
spec=importlib.util.spec_from_file_location('basecolor',PATH)
tool=importlib.util.module_from_spec(spec);spec.loader.exec_module(tool)


def png(color=b'\x20\x40\x80'):
    def chunk(kind,data):
        return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',1,1,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b'\0'+color))+chunk(b'IEND',b'')


def encode(doc,binary):
    text=json.dumps(doc).encode();text+=b' '*(-len(text)%4)
    binary+=b'\0'*(-len(binary)%4)
    return struct.pack('<III',0x46546c67,2,28+len(text)+len(binary))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(binary),0x004e4942)+binary


class Replacement(unittest.TestCase):
    def setUp(self):
        work=PATH.parents[3]/'.work'/'blender-glb-tests'
        work.mkdir(parents=True,exist_ok=True)
        self.root=work/uuid.uuid4().hex;self.root.mkdir()
        self.addCleanup(shutil.rmtree,self.root)
        self.src=self.root/'source.glb';self.img=self.root/'candidate.png';self.out=self.root/'new.glb'
        image=png();self.binary=b'GEOMETRY'+image+b'\0'*(-len(image)%4)
        self.doc={'asset':{'version':'2.0','extras':{'keep':'yes'}},'buffers':[{'byteLength':len(self.binary)}],
            'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':8},{'buffer':0,'byteOffset':8,'byteLength':len(image)}],
            'accessors':[{'bufferView':0,'componentType':5121,'count':8,'type':'SCALAR'}],
            'images':[{'bufferView':1,'mimeType':'image/png','extras':{'untouched':True}}],
            'samplers':[{'magFilter':9728,'wrapS':33071}], 'textures':[{'source':0,'sampler':0}],
            'extensionsUsed':['KHR_texture_transform'],
            'materials':[{'name':'Body','pbrMetallicRoughness':{'baseColorFactor':[.2,.3,.4,.8],'metallicFactor':.6,'roughnessFactor':.7,
                'baseColorTexture':{'index':0,'texCoord':1,'extensions':{'KHR_texture_transform':{'offset':[.1,.2],'scale':[2,2]}}}},'normalTexture':{'index':0,'scale':.5}},
                {'name':'Other','pbrMetallicRoughness':{'baseColorTexture':{'index':0}}}],
            'meshes':[{'primitives':[{'attributes':{'CUSTOM':0},'material':0}]}],
            'nodes':[{'mesh':0}],'scenes':[{'nodes':[0]}],'scene':0,'extras':{'vendor':'retained'}}
        self.write();self.img.write_bytes(png(b'\xff\x00\x00'))

    def write(self):
        self.src.write_bytes(encode(self.doc,self.binary))

    def test_shared_image_sampler_transform_and_payload(self):
        before=self.src.read_bytes()
        result=tool.replace(self.src,self.img,self.out,material_name='Body')
        doc,binary=tool.parse(self.out.read_bytes())
        self.assertEqual(self.src.read_bytes(),before);self.assertTrue(result['original_BIN_prefix_byte_exact'])
        self.assertEqual(binary[:len(self.binary)],self.binary)
        expected=copy.deepcopy(self.doc);expected['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']=1
        for key in ('materials','accessors','meshes','nodes','samplers','extras','asset'):
            self.assertEqual(doc[key],expected[key])
        self.assertEqual(doc['textures'][0],self.doc['textures'][0]);self.assertEqual(doc['textures'][1],{'source':1,'sampler':0})
        self.assertEqual(doc['images'][0],self.doc['images'][0]);self.assertEqual(doc['bufferViews'][:2],self.doc['bufferViews'])
        view=doc['bufferViews'][2]
        self.assertEqual(binary[view['byteOffset']:view['byteOffset']+view['byteLength']],self.img.read_bytes())

    def test_index_selection(self):
        tool.replace(self.src,self.img,self.out,material_index=1)
        doc,_=tool.parse(self.out.read_bytes());self.assertEqual(doc['materials'][0],self.doc['materials'][0])

    def test_opaque_extras_at_nested_schema_locations(self):
        metadata={'sourceTexture':'artist-original.png','uri':'catalog:original',
                  'extensions':{'artist_tag':True},
                  'nested':[{'normalTexture':'annotation','uri':'not-a-resource'}]}
        locations=[self.doc,self.doc['asset'],self.doc['materials'][0],
                   self.doc['materials'][0]['pbrMetallicRoughness'],
                   self.doc['materials'][0]['pbrMetallicRoughness']['baseColorTexture'],
                   self.doc['textures'][0],self.doc['images'][0],
                   self.doc['bufferViews'][0],self.doc['accessors'][0],
                   self.doc['meshes'][0]['primitives'][0],self.doc['nodes'][0]]
        for location in locations:
            location['extras']=copy.deepcopy(metadata)
        self.write();source=self.src.read_bytes()
        tool.replace(self.src,self.img,self.out,material_index=0)
        actual,binary=tool.parse(self.out.read_bytes())
        expected=copy.deepcopy(self.doc)
        expected['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']=1
        for key in ('asset','materials','meshes','accessors','nodes','extras'):
            self.assertEqual(actual[key],expected[key])
        self.assertEqual(actual['textures'][0],expected['textures'][0])
        self.assertEqual(actual['textures'][1]['extras'],metadata)
        self.assertEqual(actual['images'][0],expected['images'][0])
        self.assertEqual(actual['bufferViews'][:2],expected['bufferViews'])
        self.assertEqual(binary[:len(self.binary)],self.binary)
        self.assertEqual(self.src.read_bytes(),source)

    def test_jpeg_and_png_signatures_scope(self):
        # Binary helper identifies format; decoding/UV registration is explicitly external.
        self.img.write_bytes(b'\xff\xd8\xff\xe0\x00\x02\xff\xd9')
        tool.replace(self.src,self.img,self.out,material_index=0)
        doc,_=tool.parse(self.out.read_bytes());self.assertEqual(doc['images'][-1]['mimeType'],'image/jpeg')

    def test_unknown_chunks_duplicate_json_and_alignment(self):
        good=self.src.read_bytes()
        extra=good+struct.pack('<II',4,0x12345678)+b'keep'
        extra=extra[:8]+struct.pack('<I',len(extra))+extra[12:]
        self.src.write_bytes(extra);self.rejected()
        text=b'{"asset":{"version":"2.0"},"asset":{"version":"2.0"}}'
        text+=b' '*(-len(text)%4)
        raw=struct.pack('<III',0x46546c67,2,28+len(text))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',0,0x004e4942)
        self.src.write_bytes(raw);self.rejected()

    def rejected(self,**kwargs):
        before=self.src.read_bytes()
        with self.assertRaises((ValueError,KeyError,TypeError,IndexError)):
            tool.replace(self.src,self.img,self.out,**(kwargs or {'material_index':0}))
        self.assertFalse(self.out.exists());self.assertEqual(self.src.read_bytes(),before)

    def test_missing_ambiguous_and_no_selection(self):
        self.rejected(material_name='missing');self.doc['materials'][1]['name']='Body';self.write();self.rejected(material_name='Body')
        with self.assertRaises(ValueError):tool.replace(self.src,self.img,self.out)
        self.rejected(material_index=-1)

    def test_refuse_existing_output_and_input(self):
        self.out.write_bytes(b'keep')
        with self.assertRaises(ValueError):tool.replace(self.src,self.img,self.out,material_index=0)
        self.assertEqual(self.out.read_bytes(),b'keep')
        with self.assertRaises(ValueError):tool.replace(self.src,self.img,self.src,material_index=0)

    def test_invalid_ranges_indices_and_unsupported(self):
        original=copy.deepcopy(self.doc)
        for change in [lambda d:d['bufferViews'][0].update(byteLength=999999),
                       lambda d:d['accessors'][0].update(count=99),
                       lambda d:d['textures'][0].update(source=999),
                       lambda d:d['textures'][0].update(sampler=True),
                       lambda d:d['images'][0].update(uri='https://invalid.example/image'),
                       lambda d:d['buffers'][0].update(uri='external.bin'),
                       lambda d:d.update(extensionsUsed=['UNKNOWN']),
                       lambda d:d['materials'][0].update(extensions={'UNKNOWN':{}}),
                       lambda d:d['materials'][0].update(normalTexture='invalid actual texture info'),
                       lambda d:d['materials'][0]['pbrMetallicRoughness']['baseColorTexture'].update(index=999),
                       lambda d:d['accessors'][0].update(sparse={}),
                       lambda d:d['nodes'][0].update(mesh=-1)]:
            self.doc=copy.deepcopy(original);change(self.doc);self.write();self.rejected()

    def test_bad_binary_and_image(self):
        good=self.src.read_bytes()
        for raw in [b'bad',good[:-1],good+struct.pack('<II',0,0x12345678),good[:12]+struct.pack('<II',3,0x4e4f534a)+b'{} ']:
            self.src.write_bytes(raw);self.rejected()
        self.src.write_bytes(good);self.img.write_bytes(b'not image');self.rejected()


if __name__=='__main__':unittest.main()

import * as THREE from 'three';
import { chairParts, cameraPose, patternBytes, rasterSize } from './model.js';

export function createLegacyRenderer(canvas, materials) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#e7ecf2');
  const camera = new THREE.PerspectiveCamera(42, 1, 0.05, 30);
  const group = new THREE.Group(); scene.add(group);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b6c70, 1.8));
  const light = new THREE.DirectionalLight(0xffffff, 2.3); light.position.set(3, 4, 5); scene.add(light);
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const pixels = new Uint8Array(materials.woodPattern.flatMap(value => [value,value,value,255]));
  const wood = new THREE.DataTexture(pixels, 2, 2); wood.needsUpdate = true;
  const frameMaterial = new THREE.MeshStandardMaterial({ map: wood, roughness: materials.roughness.frame });
  const upholsteryMaterial = new THREE.MeshStandardMaterial({ roughness: materials.roughness.upholstery });
  let fabric = null, disposed = false;
  function draw(design, preference = 'auto') {
    if (disposed) throw new Error('Renderer disposed');
    const size = rasterSize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1, preference, window.innerWidth);
    renderer.setPixelRatio(1); renderer.setSize(size.width, size.height, false);
    camera.aspect = canvas.clientWidth / canvas.clientHeight; camera.updateProjectionMatrix();
    camera.position.fromArray(cameraPose(design)); camera.lookAt(0, 0.55, 0);
    group.clear();
    frameMaterial.color.set(materials.frame[design.finish.frame].color);
    upholsteryMaterial.color.set(materials.upholstery[design.finish.upholstery].color);
    if (fabric) fabric.dispose();
    fabric = new THREE.DataTexture(patternBytes(design.capture.seed, materials.fabricVariation), 4, 4);
    fabric.needsUpdate = true; upholsteryMaterial.map = fabric; upholsteryMaterial.needsUpdate = true;
    for (const part of chairParts(design)) {
      const mesh = new THREE.Mesh(geometry, part.material === 'frame' ? frameMaterial : upholsteryMaterial);
      mesh.scale.fromArray(part.size); mesh.position.fromArray(part.position); group.add(mesh);
    }
    const started = performance.now(); renderer.render(scene, camera);
    return { revision: THREE.REVISION, renderer: 'WebGLRenderer', backend: 'legacy raster', quality: size,
      drawingBuffer: { width: canvas.width, height: canvas.height }, objects: group.children.length,
      memoryObjects: { ...renderer.info.memory }, programs: renderer.info.programs.length,
      outputColorSpace: renderer.outputColorSpace, toneMapping: 'none', camera: camera.position.toArray(),
      cpuRenderSubmissionMs: performance.now() - started, gpuTimeMs: null, gpuBytes: null };
  }
  function dispose() {
    if (disposed) return; disposed = true;
    fabric?.dispose(); wood.dispose(); geometry.dispose(); frameMaterial.dispose(); upholsteryMaterial.dispose(); renderer.dispose();
  }
  return { draw, dispose };
}

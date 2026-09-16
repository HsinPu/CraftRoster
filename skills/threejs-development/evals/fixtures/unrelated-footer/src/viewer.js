import { BoxGeometry, Color, Mesh, MeshNormalMaterial, PerspectiveCamera, REVISION, Scene, WebGLRenderer } from 'three';

const stage = document.querySelector('#viewer-stage');
const canvas = document.querySelector('#viewer-canvas');
const status = document.querySelector('#viewer-status');
const rotate = document.querySelector('#rotate-viewer');
let cleanup = () => {};

try {
  const renderer = new WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new Scene();
  scene.background = new Color('#e7edf8');
  const camera = new PerspectiveCamera(45, 1, 0.1, 10);
  camera.position.set(0, 0, 4);
  const geometry = new BoxGeometry(1.2, 1.2, 1.2);
  const material = new MeshNormalMaterial();
  const cube = new Mesh(geometry, material);
  cube.rotation.set(0.3, 0.55, 0);
  scene.add(cube);
  const render = () => {
    renderer.render(scene, camera);
    status.dataset.revision = REVISION;
    status.dataset.drawCalls = String(renderer.info.render.calls);
    status.dataset.geometries = String(renderer.info.memory.geometries);
    status.dataset.state = 'ready';
    status.textContent = '3D 預覽已就緒';
  };
  const resize = () => {
    const width = Math.max(1, stage.clientWidth), height = Math.max(1, stage.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    render();
  };
  const rotateCube = () => { cube.rotation.y += Math.PI / 4; render(); };
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  rotate.addEventListener('click', rotateCube);
  resize();
  cleanup = () => {
    observer.disconnect();
    rotate.removeEventListener('click', rotateCube);
    geometry.dispose();
    material.dispose();
    renderer.dispose();
  };
} catch {
  status.dataset.state = 'unavailable';
  status.textContent = '此環境無法顯示 3D 預覽；頁面與頁尾仍可使用。';
  rotate.disabled = true;
}
window.addEventListener('pagehide', () => cleanup(), { once: true });

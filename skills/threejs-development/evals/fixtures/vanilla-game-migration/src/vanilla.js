import * as THREE from 'three';
import { createGame, move, tick, reset, snapshot } from './game.cjs';
import { loadLevel } from './level.cjs';
import { metrics, trackRenderer, trackGeometry, trackMaterial, bindKeys } from './diagnostics.js';

export function mountGame(stage, onState, failAsset = false) {
  let disposed = false, cleanupScene = () => {}, game = null, schedule = () => {};
  let movementStartedAt = null, firstMovementFrame = false;
  const abort = new AbortController(); metrics.activeSessions += 1; metrics.activeAssetLoads += 1;
  metrics.status = 'loading'; metrics.error = null; onState({ status: 'loading', score: 0, moving: false });
  const unbind = bindKeys((dx, dz) => api.move(dx, dz));
  const api = {
    move(dx, dz) {
      if (game && !disposed) {
        const wasMoving = game.moving; move(game, dx, dz);
        if (!wasMoving && game.moving) {
          movementStartedAt = performance.now(); firstMovementFrame = true;
          metrics.lastMovementFirstDeltaSeconds = null; metrics.lastMovementFirstPosition = null;
          metrics.lastMovementElapsedSeconds = 0; metrics.lastMovementFrameCount = 0;
        }
        schedule();
      }
    },
    reset() { if (game && !disposed) { reset(game); movementStartedAt = null; firstMovementFrame = false; schedule(); } },
    dispose() {
      if (disposed) return; disposed = true; abort.abort(); unbind(); cleanupScene();
      metrics.activeSessions -= 1; metrics.status = 'outside'; metrics.game = null;
    }
  };
  loadLevel(failAsset ? './assets/missing-level.json' : './assets/level.json', { signal: abort.signal }).then(level => {
    if (disposed) return;
    game = createGame(level);
    const renderer = trackRenderer(new THREE.WebGLRenderer({ antialias: true }));
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); stage.appendChild(renderer.domElement);
    const scene = new THREE.Scene(); scene.background = new THREE.Color(level.colors.background);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100); camera.position.set(4, 5, 6); camera.lookAt(0, 0, 0);
    const mesh = (size, color) => new THREE.Mesh(trackGeometry(new THREE.BoxGeometry(...size)), trackMaterial(new THREE.MeshBasicMaterial({ color })));
    const board = mesh([5, 0.08, 5], level.colors.board), player = mesh([0.5, 0.5, 0.5], level.colors.player), target = mesh([0.55, 0.06, 0.55], level.colors.target);
    board.position.y = -0.08; player.position.y = 0.25; target.position.y = 0.03; scene.add(board, player, target);
    let pending = 0, previous = performance.now();
    const frame = time => {
      pending = 0; if (disposed) return; metrics.frameCallbacks += 1;
      const wasMoving = game.moving, delta = Math.max(0, (time - previous) / 1000);
      tick(game, delta); previous = time;
      if (wasMoving) {
        metrics.lastMovementFrameCount += 1;
        metrics.lastMovementElapsedSeconds = Math.max(0, (time - movementStartedAt) / 1000);
        if (firstMovementFrame) {
          metrics.lastMovementFirstDeltaSeconds = delta; metrics.lastMovementFirstPosition = { x: game.x, z: game.z };
          firstMovementFrame = false;
        }
      }
      const state = snapshot(game); player.position.set(game.x, 0.25, game.z); target.position.set(...[state.target[0], 0.03, state.target[1]]);
      renderer.render(scene, camera); metrics.game = state; metrics.status = game.moving ? 'moving' : 'idle';
      onState({ status: metrics.status, score: game.score, moving: game.moving });
      if (game.moving) schedule();
    };
    schedule = () => { if (!pending && !disposed) { previous = performance.now(); pending = requestAnimationFrame(frame); } };
    const resize = () => {
      const width = Math.max(1, stage.clientWidth), height = Math.max(1, stage.clientHeight);
      camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); schedule();
    };
    const observer = new ResizeObserver(resize); observer.observe(stage); resize();
    cleanupScene = () => {
      if (pending) cancelAnimationFrame(pending); observer.disconnect();
      for (const object of [board, player, target]) { object.geometry.dispose(); object.material.dispose(); }
      renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }).catch(error => {
    if (disposed || error.name === 'AbortError') return;
    metrics.status = 'error'; metrics.error = error.message; onState({ status: 'error', score: 0, moving: false, error: error.message });
  }).finally(() => { metrics.activeAssetLoads -= 1; });
  return api;
}

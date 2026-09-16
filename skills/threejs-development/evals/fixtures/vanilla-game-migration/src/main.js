import { mountGame } from './vanilla.js';
import { attachDiagnostics } from './diagnostics.js';
import './styles.css';

document.querySelector('#app').innerHTML = `<main><h1>Grid target game — vanilla</h1><p>Move with arrow keys or direction buttons. Reach the orange target to score.</p><nav><button id="enter">Enter game</button><button id="leave">Leave game</button><label><input id="fail" type="checkbox">Fail next level load</label></nav><p id="state" role="status">Outside game</p><div id="stage" class="stage"></div><div class="controls"><button id="left">Left</button><button id="right">Right</button><button id="up">Up</button><button id="down">Down</button><button id="reset">Reset</button><button id="retry">Retry level</button></div><p id="score">Score: 0</p><h2>Observed counters</h2><p>Counts, not GPU bytes. Wait for startup to settle before measuring idle.</p><pre id="diagnostics"></pre></main>`;
const stage = document.querySelector('#stage'); let game;
const stopDiagnostics = attachDiagnostics(document.querySelector('#diagnostics'));
function leave() { game?.dispose(); game = null; document.querySelector('#state').textContent = 'Outside game'; document.querySelector('#score').textContent = 'Score: 0'; }
function enter(fail = false) {
  leave();
  game = mountGame(stage, state => {
    document.querySelector('#state').textContent = state.error ? `Level error: ${state.error}` : state.status;
    document.querySelector('#score').textContent = `Score: ${state.score}`;
  }, fail);
}
document.querySelector('#enter').onclick = () => { const control = document.querySelector('#fail'); enter(control.checked); control.checked = false; };
document.querySelector('#leave').onclick = leave;
document.querySelector('#retry').onclick = () => enter(false);
for (const [id, dx, dz] of [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]]) document.querySelector('#' + id).onclick = () => game?.move(dx, dz);
document.querySelector('#reset').onclick = () => game?.reset();
window.addEventListener('pagehide', () => { leave(); stopDiagnostics(); }, { once: true });

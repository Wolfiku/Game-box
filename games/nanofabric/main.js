/* NanoFactory — main.js */

function init() {
  loadGame();
  initCanvas();
  buildBuildPanel();
  buildResearchPanel();
  updateNavHint();

  // Bottom nav / build hint bar
  const wrap = document.getElementById('grid-wrap').parentNode;
  const nav  = document.createElement('div');
  nav.id = 'build-hint';
  wrap.appendChild(nav);
  updateNavHint();

  // Toolbar buttons
  document.getElementById('btn-open-panel').onclick = () => togglePanel('build-panel');
  document.getElementById('btn-open-research').onclick = () => { buildResearchPanel(); togglePanel('research-panel'); };
  document.getElementById('btn-open-stats').onclick = () => { buildStatsPanel(); togglePanel('stats-panel'); };
  document.getElementById('btn-save').onclick = saveGame;

  // Close buttons
  document.querySelectorAll('.close-btn[data-close]').forEach(btn => {
    btn.onclick = () => closePanel(btn.dataset.close);
  });

  // Close popup on backdrop
  document.addEventListener('pointerdown', e => {
    const popup = document.getElementById('tile-popup');
    if (!popup.classList.contains('hidden') && !popup.contains(e.target) && e.target !== canvas) {
      hideTilePopup();
    }
  });

  // Auto-save every 60s
  setInterval(saveGame, 60000);

  // Game loop
  setInterval(() => {
    tick();
    updateHUD();
  }, TICK_MS);

  // Render loop
  function loop() {
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  toast('Welcome to NanoFactory! Tap an ore patch to place a Miner.');
}

function togglePanel(id) {
  const panels = ['build-panel', 'research-panel', 'stats-panel'];
  panels.forEach(p => {
    if (p === id) {
      document.getElementById(p).classList.toggle('hidden');
    } else {
      document.getElementById(p).classList.add('hidden');
    }
  });
  // backdrop
  let bd = document.getElementById('panel-backdrop');
  const anyOpen = panels.some(p => !document.getElementById(p).classList.contains('hidden'));
  if (anyOpen) {
    if (!bd) {
      bd = document.createElement('div');
      bd.id = 'panel-backdrop';
      bd.className = 'overlay-backdrop';
      bd.onclick = () => panels.forEach(p => document.getElementById(p).classList.add('hidden')) || bd.remove();
      document.body.appendChild(bd);
    }
  } else {
    if (bd) bd.remove();
  }
}
function closePanel(id) {
  document.getElementById(id).classList.add('hidden');
  const bd = document.getElementById('panel-backdrop');
  if (bd) bd.remove();
}

window.addEventListener('load', init);

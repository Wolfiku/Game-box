/* NanoFactory — main.js */

function init() {
  loadGame();
  initCanvas();

  // Toolbar: inject save icon
  const saveBtn = document.getElementById('btn-save');
  if (saveBtn) {
    saveBtn.innerHTML = svgIcon('save', 20);
    saveBtn.title = 'Save';
    saveBtn.onclick = () => { saveGame(); toast('Saved'); };
  }

  // Bottom nav: build it
  buildNavBar();

  // Close buttons on panels
  document.querySelectorAll('.close-btn[data-close]').forEach(btn => {
    btn.innerHTML = svgIcon('close', 16);
    btn.onclick = () => closePanel(btn.dataset.close);
  });

  // Build panel: populate once
  buildBuildPanel();

  // Tap outside popup closes it
  document.addEventListener('pointerdown', e => {
    const popup = document.getElementById('tile-popup');
    if (!popup.classList.contains('hidden') && !popup.contains(e.target)) {
      hideTilePopup();
    }
  }, { capture: true });

  // Auto-save every 60 s
  setInterval(saveGame, 60000);

  // Game loop
  setInterval(() => {
    tick();
    updateHUD();
    if (!document.getElementById('build-panel').classList.contains('hidden'))    buildBuildPanel();
    if (!document.getElementById('research-panel').classList.contains('hidden')) buildResearchPanel();
  }, TICK_MS);

  // Render loop (60 fps)
  (function loop() { render(); requestAnimationFrame(loop); })();

  setMode('scroll');
  toast('SCROLL to pan  |  BUILD to place  |  Tap tile to inspect');
}

function togglePanel(id) {
  const panels = ['build-panel', 'research-panel', 'stats-panel'];
  const el = document.getElementById(id);
  const isOpen = !el.classList.contains('hidden');

  panels.forEach(p => document.getElementById(p).classList.add('hidden'));
  let bd = document.getElementById('panel-backdrop');
  if (bd) bd.remove();

  if (!isOpen) {
    el.classList.remove('hidden');
    bd = document.createElement('div');
    bd.id = 'panel-backdrop';
    bd.className = 'overlay-backdrop';
    bd.onclick = () => {
      panels.forEach(p => document.getElementById(p).classList.add('hidden'));
      bd.remove();
    };
    document.body.appendChild(bd);
  }
}

function closePanel(id) {
  document.getElementById(id).classList.add('hidden');
  const bd = document.getElementById('panel-backdrop');
  if (bd) bd.remove();
}

window.addEventListener('load', init);

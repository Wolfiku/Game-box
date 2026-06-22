/* NanoFactory — main.js */
window.addEventListener('load', () => {
  loadGame();
  initCanvas();

  // Save button
  const sb=document.getElementById('btn-save');
  if(sb){ sb.innerHTML=svgIcon('save',20); sb.onclick=()=>{saveGame();toast('Saved');}; }

  // Close buttons
  document.querySelectorAll('.cbtn[data-close]').forEach(btn=>{
    btn.innerHTML=svgIcon('close',16);
    btn.onclick=()=>closePanel(btn.dataset.close);
  });

  buildBuildPanel();
  buildNav();
  updateHUD();

  // Close popup on outside tap
  document.addEventListener('pointerdown', e=>{
    const pop=document.getElementById('tile-popup');
    if(!pop.classList.contains('hidden')&&!pop.contains(e.target)) hidePop();
  }, true);

  // Game loop: tick + HUD refresh
  setInterval(()=>{
    tick(); updateHUD();
    if(!document.getElementById('build-panel').classList.contains('hidden')) buildBuildPanel();
    if(!document.getElementById('research-panel').classList.contains('hidden')) buildResPanel();
  }, TICK_MS);

  // Render loop
  (function loop(){ render(); requestAnimationFrame(loop); })();

  // Auto-save
  setInterval(()=>saveGame(), 60000);

  setMode('scroll');
  toast('SCROLL = pan  |  BUILD = place  |  Tap tile = info');
});

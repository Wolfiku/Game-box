/* NanoFactory — main.js
 * init(), event listeners, setInterval, screen flow
 */

let tickInterval   = null;
let uiInterval     = null;
let autoSaveTimer  = 0;
const AUTO_SAVE_S  = 30;

function init() {
  const saved = load();

  // Check for save and show continue button
  if (hasSave()) {
    document.getElementById('btn-continue').style.display = '';
  }

  // NEW GAME
  document.getElementById('btn-new-game').addEventListener('click', () => {
    if (hasSave()) {
      showModal(
        'NEW GAME',
        'Start fresh?\nCurrent save will be lost.',
        [
          { label: 'CONFIRM', cls: 'btn-danger', action: () => {
            localStorage.removeItem('nf_save');
            closeModal();
            gameState = defaultState();
            startGame(null);
          }},
          { label: 'CANCEL', cls: 'btn-secondary', action: () => closeModal() }
        ]
      );
    } else {
      gameState = defaultState();
      startGame(null);
    }
  });

  // CONTINUE
  document.getElementById('btn-continue').addEventListener('click', () => {
    if (saved) {
      gameState = saved;
      startGame(saved);
    }
  });
}

function startGame(loaded) {
  document.getElementById('screen-start').classList.remove('active');
  document.getElementById('screen-game').classList.add('active');

  // Offline catchup
  if (loaded && loaded.lastSave) {
    const elapsed = (Date.now() - loaded.lastSave) / 1000;
    if (elapsed > 5) {
      const result = offlineCatchUp(elapsed);
      renderUI();
      showOfflineModal(result);
    }
  }

  renderUI();
  startLoop();
  attachGameListeners();
}

function startLoop() {
  if (tickInterval) clearInterval(tickInterval);
  if (uiInterval)   clearInterval(uiInterval);

  tickInterval = setInterval(() => {
    tick();
    autoSaveTimer += TICK_DELTA;
    if (autoSaveTimer >= AUTO_SAVE_S) {
      save();
      autoSaveTimer = 0;
    }
  }, TICK_INTERVAL);

  uiInterval = setInterval(() => {
    renderUI();
  }, 500);
}

function attachGameListeners() {
  // Header buttons
  document.getElementById('btn-save').addEventListener('click', () => {
    save();
    showToast('SAVE', 'Saved', '');
  });
  document.getElementById('btn-export').addEventListener('click', exportSave);
  document.getElementById('btn-import').addEventListener('click', importSave);
  document.getElementById('btn-reset').addEventListener('click', reset);

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Building filter
  document.querySelectorAll('.building-filters .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.building-filters .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gameState.ui.buildingFilter = btn.dataset.filter;
      renderBuildingList();
    });
  });

  // Research filter
  document.querySelectorAll('.research-categories .filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.research-categories .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gameState.ui.researchFilter = btn.dataset.rcat;
      renderResearchTab();
    });
  });

  // Manual collect button
  document.getElementById('btn-collect').addEventListener('click', () => {
    manualCollect();
    renderResourceList();
  });

  // Prestige button
  document.getElementById('btn-prestige').addEventListener('click', showPrestigeModal);

  // Building buy (delegated)
  document.getElementById('building-list').addEventListener('click', e => {
    const btn = e.target.closest('[data-qty]');
    if (!btn) return;
    const bid = btn.dataset.bid;
    const qty = btn.dataset.qty === 'max' ? 'max' : parseInt(btn.dataset.qty);
    if (buyBuilding(bid, qty)) {
      renderBuildingList();
      renderResourceList();
      renderPower();
      renderPrestigeBar();
    }
  });

  // Modal overlay click outside
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
}

// Boot
document.addEventListener('DOMContentLoaded', init);

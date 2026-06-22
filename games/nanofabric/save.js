/* NanoFactory — save.js
 * save(), load(), exportSave(), importSave(), reset()
 */

const SAVE_KEY = 'nf_save';

function save() {
  gameState.lastSave = Date.now();
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
  } catch(e) {
    console.warn('Save failed:', e);
  }
}

function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return migrateState(parsed);
  } catch(e) {
    console.warn('Load failed:', e);
    return null;
  }
}

function hasSave() {
  return !!localStorage.getItem(SAVE_KEY);
}

function exportSave() {
  try {
    gameState.lastSave = Date.now();
    const encoded = btoa(JSON.stringify(gameState));
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(encoded).then(() => {
        showToast('EXPORT', 'Save copied to clipboard', '');
      }).catch(() => {
        promptFallback(encoded);
      });
    } else {
      promptFallback(encoded);
    }
  } catch(e) {
    console.warn('Export failed:', e);
  }
}

function promptFallback(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('EXPORT', 'Save copied', '');
}

function importSave() {
  const input = prompt('Paste save code:');
  if (!input || !input.trim()) return;
  try {
    const decoded = atob(input.trim());
    const parsed  = JSON.parse(decoded);
    if (!parsed || typeof parsed !== 'object') throw new Error('Invalid save');
    const migrated = migrateState(parsed);
    gameState = migrated;
    save();
    renderUI();
    showToast('IMPORT', 'Save loaded', '');
  } catch(e) {
    alert('Invalid save data.');
  }
}

function reset() {
  showModal(
    'RESET',
    'All progress will be lost.\nThis cannot be undone.',
    [
      { label: 'CONFIRM', cls: 'btn-danger', action: () => {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
      }},
      { label: 'CANCEL', cls: 'btn-secondary', action: () => closeModal() }
    ]
  );
}

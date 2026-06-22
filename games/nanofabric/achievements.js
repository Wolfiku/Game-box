/* NanoFactory — achievements.js
 * checkAchievements(), unlockAchievement(), showToast()
 */

function checkAchievements() {
  for (const ach of ACHIEVEMENTS) {
    if (!gameState.achievements.includes(ach.id)) {
      try {
        if (ach.condition(gameState)) {
          unlockAchievement(ach);
        }
      } catch(e) {}
    }
  }
}

function unlockAchievement(ach) {
  gameState.achievements.push(ach.id);
  showToast('ACHIEVEMENT UNLOCKED', ach.name, ach.desc);
  // Refresh stats if on stats tab
  if (gameState.ui && gameState.ui.activeTab === 'stats') {
    renderStatsTab();
  }
}

function showToast(label, name, desc) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `
    <div class="toast-label">${label}</div>
    <div class="toast-name">${name}</div>
    ${desc ? `<div class="toast-desc">${desc}</div>` : ''}
  `;
  container.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 4000);
}

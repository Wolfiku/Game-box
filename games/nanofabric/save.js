/* NanoFactory — save.js */

const SAVE_KEY = 'nanofactory_save_v4';

function saveGame() {
  try {
    gameState.lastSave = Date.now();
    const data = {
      tiles:             Array.from(gameState.tiles),
      items:             Array.from(gameState.items),
      meta:              Array.from(gameState.meta),
      inventory:         gameState.inventory,
      completedResearch: gameState.completedResearch,
      achievements:      gameState.achievements,
      unlockedLore:      gameState.unlockedLore,
      totalMined:        gameState.totalMined,
      totalBelts:        gameState.totalBelts,
      timePlayed:        gameState.timePlayed,
      lastSave:          gameState.lastSave,
      stats:             gameState.stats,
      power:             gameState.power,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    toast('Game saved ✓');
    return true;
  } catch(e) {
    toast('Save failed: ' + e.message);
    return false;
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const fresh = defaultState();
    gameState = {
      ...fresh,
      tiles:             data.tiles            || fresh.tiles,
      items:             data.items            || fresh.items,
      meta:              data.meta             || fresh.meta,
      inventory:         data.inventory        || {},
      completedResearch: data.completedResearch || [],
      achievements:      data.achievements     || [],
      unlockedLore:      data.unlockedLore     || [],
      totalMined:        data.totalMined       || {},
      totalBelts:        data.totalBelts       || 0,
      timePlayed:        data.timePlayed       || 0,
      lastSave:          data.lastSave         || Date.now(),
      stats:             data.stats            || fresh.stats,
      power:             data.power            || fresh.power,
    };
    return true;
  } catch(e) {
    console.error('Load failed:', e);
    return false;
  }
}

function resetGame() {
  localStorage.removeItem(SAVE_KEY);
  gameState = defaultState();
}

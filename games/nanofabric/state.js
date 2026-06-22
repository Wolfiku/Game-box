/* NanoFactory — state.js
 * gameState object, defaultState(), deepClone()
 */

function defaultState() {
  const resources = {};
  for (const r of RESOURCES) {
    resources[r.id] = {
      amount: 0,
      cap: r.defaultCap === Infinity ? Infinity : r.defaultCap,
      totalProduced: 0,
      perSecond: 0,
      _rateBuffer: [0, 0, 0, 0]
    };
  }

  const buildings = {};
  for (const b of BUILDINGS) {
    buildings[b.id] = 0;
  }

  return {
    version: 1,
    lastSave: Date.now(),
    timePlayed: 0,
    tickCount: 0,

    resources,
    buildings,
    completedResearch: [],
    unlockedLore: ['start'],
    achievements: [],

    power: { generated: 0, consumed: 0, ratio: 1 },

    stats: {
      manualCollects: 0,
      rpSpent: 0,
      totalBuildings: 0,
      buildingsBought: {},
    },

    prestigeCount: 0,
    legacyPoints: 0,
    lpUpgradesBought: [],
    totalEnergyCellsEver: 0,

    ui: {
      buildingFilter: 'all',
      researchFilter: 'all',
      activeTab: 'factory',
    }
  };
}

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepClone);
  const out = {};
  for (const k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k)) {
      out[k] = deepClone(obj[k]);
    }
  }
  return out;
}

function migrateState(loaded) {
  // Fill missing resources/buildings from defaults
  const def = defaultState();
  if (!loaded.resources) loaded.resources = def.resources;
  for (const r of RESOURCES) {
    if (!loaded.resources[r.id]) {
      loaded.resources[r.id] = def.resources[r.id];
    } else {
      if (loaded.resources[r.id]._rateBuffer === undefined) {
        loaded.resources[r.id]._rateBuffer = [0,0,0,0];
      }
    }
  }
  if (!loaded.buildings) loaded.buildings = def.buildings;
  for (const b of BUILDINGS) {
    if (loaded.buildings[b.id] === undefined) loaded.buildings[b.id] = 0;
  }
  if (!loaded.completedResearch) loaded.completedResearch = [];
  if (!loaded.unlockedLore) loaded.unlockedLore = ['start'];
  if (!loaded.achievements) loaded.achievements = [];
  if (!loaded.power) loaded.power = { generated: 0, consumed: 0, ratio: 1 };
  if (!loaded.stats) loaded.stats = def.stats;
  if (loaded.stats.manualCollects === undefined) loaded.stats.manualCollects = 0;
  if (loaded.stats.rpSpent === undefined) loaded.stats.rpSpent = 0;
  if (!loaded.stats.buildingsBought) loaded.stats.buildingsBought = {};
  if (loaded.prestigeCount === undefined) loaded.prestigeCount = 0;
  if (loaded.legacyPoints === undefined) loaded.legacyPoints = 0;
  if (!loaded.lpUpgradesBought) loaded.lpUpgradesBought = [];
  if (loaded.totalEnergyCellsEver === undefined) loaded.totalEnergyCellsEver = 0;
  if (!loaded.ui) loaded.ui = def.ui;
  return loaded;
}

// Singleton
let gameState = defaultState();

/* NanoFactory — engine.js
 * tick(), powerCalc(), productionCalc(), offline catch-up
 */

const TICK_INTERVAL = 250;   // ms
const TICK_DELTA   = 0.25;   // seconds per tick
const MAX_OFFLINE  = 28800;  // 8 hours in seconds

function getResearchMultiplier(researchId) {
  return gameState.completedResearch.includes(researchId) ? 2.0 : 1.0;
}

function getMineMultiplier() {
  let mult = 1.0;
  if (gameState.completedResearch.includes('efficient_mining_1')) mult += 0.25;
  if (gameState.completedResearch.includes('efficient_mining_2')) mult += 0.50;
  if (gameState.completedResearch.includes('efficient_mining_3')) mult += 1.00;
  // LP boost
  if (gameState.lpUpgradesBought.includes('prod_boost')) mult += 0.1;
  return mult;
}

function getGeneratorMultiplier() {
  let mult = 1.0;
  if (gameState.completedResearch.includes('grid_optimization')) mult += 0.2;
  return mult;
}

function getProcessingMultiplier(buildingId) {
  let mult = 1.0;
  if (buildingId === 'smelter' && gameState.completedResearch.includes('advanced_smelting')) mult *= 2.0;
  if (buildingId === 'forge' && gameState.completedResearch.includes('alloy_mastery')) mult *= 2.0;
  if (gameState.completedResearch.includes('bulk_production')) mult += (1 / 4); // +1/tick = +0.25/s per building effectively
  if (gameState.lpUpgradesBought.includes('prod_boost')) mult += 0.1;
  return mult;
}

function getResourceCap(resourceId) {
  const res = RESOURCES.find(r => r.id === resourceId);
  if (!res || res.defaultCap === Infinity) return Infinity;

  let cap = res.defaultCap;
  // Storage depots
  cap += (gameState.buildings.storage_depot || 0) * 500;
  // Research
  if (gameState.completedResearch.includes('extended_storage_1')) cap += 1000;
  if (gameState.completedResearch.includes('extended_storage_2')) cap += 5000;
  return cap;
}

function syncCaps() {
  for (const r of RESOURCES) {
    if (r.defaultCap !== Infinity) {
      gameState.resources[r.id].cap = getResourceCap(r.id);
    }
  }
}

function powerCalc() {
  let generated = 0;
  let consumed  = 0;

  const genMult = getGeneratorMultiplier();

  for (const b of BUILDINGS) {
    const owned = gameState.buildings[b.id] || 0;
    if (owned === 0) continue;

    if (b.category === 'power' && b.output && b.output.mw) {
      let gen = b.output.mw * owned * genMult;

      // Fuel check for coal generators
      if (b.id === 'coal_generator') {
        const coalNeeded = b.input.coal * owned * TICK_DELTA;
        const coalAvail  = gameState.resources.coal.amount;
        const ratio = coalNeeded > 0 ? Math.min(1, coalAvail / coalNeeded) : 1;
        gen *= ratio;
      }
      // Nuclear fuel check
      if (b.id === 'nuclear_reactor') {
        const fuelNeeded = b.input.energy_cell * owned * TICK_DELTA;
        const fuelAvail  = gameState.resources.energy_cell.amount;
        const ratio = fuelNeeded > 0 ? Math.min(1, fuelAvail / fuelNeeded) : 1;
        gen *= ratio;
      }

      generated += gen;
    }

    if (b.energyCost > 0) {
      consumed += b.energyCost * owned;
    }
  }

  const ratio = consumed === 0 ? 1.0 : (generated >= consumed ? 1.0 : generated / consumed);
  gameState.power = { generated, consumed, ratio };
}

function productionCalc(delta) {
  syncCaps();
  powerCalc();

  const ratio = gameState.power.ratio;

  // Track per-second rates
  const produced = {};
  const consumed = {};
  for (const r of RESOURCES) {
    produced[r.id] = 0;
    consumed[r.id] = 0;
  }

  for (const b of BUILDINGS) {
    const owned = gameState.buildings[b.id] || 0;
    if (owned === 0) continue;

    // MINES
    if (b.category === 'mining' && b.output) {
      const mult = getMineMultiplier();
      for (const [rid, rps] of Object.entries(b.output)) {
        if (rid === 'mw') continue;
        const gain = rps * owned * mult * delta;
        const res  = gameState.resources[rid];
        if (!res) continue;
        const actual = Math.min(gain, res.cap - res.amount);
        if (actual > 0) {
          res.amount += actual;
          res.totalProduced += actual;
          produced[rid] += actual / delta;
        }
      }
    }

    // PROCESSING (including lab)
    if ((b.category === 'processing') && b.output) {
      const mult = getProcessingMultiplier(b.id);
      const effectiveRatio = b.energyCost > 0 ? ratio : 1.0;

      // Check inputs available
      let inputRatio = 1.0;
      if (b.input) {
        for (const [rid, rps] of Object.entries(b.input)) {
          if (rid === 'mw') continue;
          const needed = rps * owned * delta;
          const avail  = gameState.resources[rid] ? gameState.resources[rid].amount : 0;
          if (needed > 0) {
            inputRatio = Math.min(inputRatio, avail / needed);
          }
        }
      }
      inputRatio = Math.max(0, inputRatio);
      const finalRatio = effectiveRatio * inputRatio;

      // Consume inputs
      if (b.input && finalRatio > 0) {
        for (const [rid, rps] of Object.entries(b.input)) {
          if (rid === 'mw') continue;
          const consume = rps * owned * delta * finalRatio;
          if (gameState.resources[rid]) {
            gameState.resources[rid].amount = Math.max(0, gameState.resources[rid].amount - consume);
            consumed[rid] += consume / delta;
          }
        }
      }

      // Produce outputs
      if (finalRatio > 0) {
        for (const [rid, rps] of Object.entries(b.output)) {
          if (rid === 'mw') continue;
          const gain = rps * owned * mult * finalRatio * delta;
          const res  = gameState.resources[rid];
          if (!res) continue;
          const cap = rid === 'research_points' ? Infinity : res.cap;
          const actual = Math.min(gain, cap - res.amount);
          if (actual > 0) {
            res.amount  += actual;
            if (rid !== 'research_points') res.totalProduced += actual;
            produced[rid] += actual / delta;
          }
        }
      }
    }

    // POWER buildings — consume fuel
    if (b.category === 'power' && b.input) {
      if (b.id === 'coal_generator') {
        const coalNeeded = b.input.coal * owned * delta;
        const coalAvail  = gameState.resources.coal.amount;
        const actual = Math.min(coalNeeded, coalAvail);
        gameState.resources.coal.amount = Math.max(0, gameState.resources.coal.amount - actual);
        consumed['coal'] += actual / delta;
      }
      if (b.id === 'nuclear_reactor') {
        const fuelNeeded = b.input.energy_cell * owned * delta;
        const fuelAvail  = gameState.resources.energy_cell.amount;
        const actual = Math.min(fuelNeeded, fuelAvail);
        gameState.resources.energy_cell.amount = Math.max(0, gameState.resources.energy_cell.amount - actual);
        consumed['energy_cell'] += actual / delta;
      }
    }
  }

  // Update rolling rate buffers
  const tick = gameState.tickCount % 4;
  for (const r of RESOURCES) {
    const res = gameState.resources[r.id];
    const net = (produced[r.id] || 0) - (consumed[r.id] || 0);
    res._rateBuffer[tick] = net;
    res.perSecond = res._rateBuffer.reduce((a,b)=>a+b,0) / 4;
  }
}

function tick() {
  gameState.tickCount++;
  productionCalc(TICK_DELTA);
  checkAchievements();
  checkLore();
  gameState.timePlayed += TICK_DELTA;

  // Sync totalEnergyCellsEver
  gameState.totalEnergyCellsEver = Math.max(
    gameState.totalEnergyCellsEver,
    gameState.resources.energy_cell.totalProduced
  );
}

function offlineCatchUp(elapsed) {
  elapsed = Math.min(elapsed, MAX_OFFLINE);
  if (elapsed < 1) return { skipped: true };

  // Snapshot resources before catchup
  const before = {};
  for (const r of RESOURCES) {
    before[r.id] = gameState.resources[r.id].amount;
  }

  // Run in batches for performance
  const maxIter = 1000;
  const totalTicks = elapsed / TICK_DELTA;
  const batchSize  = Math.ceil(totalTicks / maxIter);
  const batchDelta = batchSize * TICK_DELTA;
  const iters      = Math.ceil(totalTicks / batchSize);

  for (let i = 0; i < iters; i++) {
    productionCalc(batchDelta);
    gameState.timePlayed += batchDelta;
    gameState.tickCount++;
  }

  const after = {};
  for (const r of RESOURCES) {
    after[r.id] = gameState.resources[r.id].amount;
  }

  return { elapsed, before, after };
}

function manualCollect() {
  const gains = {};
  // Give 5s worth of mine production
  for (const b of BUILDINGS) {
    if (b.category !== 'mining' || !b.output) continue;
    const owned = gameState.buildings[b.id] || 0;
    if (owned === 0) continue;
    const mult = getMineMultiplier();
    for (const [rid, rps] of Object.entries(b.output)) {
      if (rid === 'mw') continue;
      const gain = rps * owned * mult * 5;
      const res  = gameState.resources[rid];
      if (!res) continue;
      const actual = Math.min(gain, res.cap - res.amount);
      if (actual > 0) {
        res.amount += actual;
        res.totalProduced += actual;
        gains[rid] = (gains[rid] || 0) + actual;
      }
    }
  }
  // If no mines, give flat iron/copper/coal
  if (Object.keys(gains).length === 0) {
    const flat = { iron_ore: 10, copper_ore: 10, coal: 5 };
    for (const [rid, amt] of Object.entries(flat)) {
      const res = gameState.resources[rid];
      const actual = Math.min(amt, res.cap - res.amount);
      if (actual > 0) {
        res.amount += actual;
        res.totalProduced += actual;
        gains[rid] = actual;
      }
    }
  }
  gameState.stats.manualCollects++;
  return gains;
}

function checkLore() {
  for (const entry of LORE) {
    if (!gameState.unlockedLore.includes(entry.id)) {
      try {
        if (entry.unlockCondition(gameState)) {
          gameState.unlockedLore.push(entry.id);
        }
      } catch(e) {}
    }
  }
}

function canAffordBuilding(buildingId, qty) {
  const b = BUILDINGS.find(x => x.id === buildingId);
  if (!b) return false;
  const owned = gameState.buildings[buildingId] || 0;
  let totalCost = {};
  for (let i = 0; i < qty; i++) {
    const mult = Math.pow(b.costMultiplier, owned + i);
    for (const [rid, base] of Object.entries(b.baseCost)) {
      totalCost[rid] = (totalCost[rid] || 0) + Math.ceil(base * mult);
    }
  }
  for (const [rid, needed] of Object.entries(totalCost)) {
    if (!gameState.resources[rid] || gameState.resources[rid].amount < needed) return false;
  }
  return totalCost;
}

function buyBuilding(buildingId, qty) {
  if (qty === 'max') {
    let n = 0;
    while (canAffordBuilding(buildingId, n + 1)) n++;
    if (n === 0) return false;
    qty = n;
  }
  const cost = canAffordBuilding(buildingId, qty);
  if (!cost) return false;
  for (const [rid, needed] of Object.entries(cost)) {
    gameState.resources[rid].amount -= needed;
  }
  gameState.buildings[buildingId] = (gameState.buildings[buildingId] || 0) + qty;
  gameState.stats.buildingsBought[buildingId] = (gameState.stats.buildingsBought[buildingId] || 0) + qty;
  syncCaps();
  return true;
}

function getBuildingCostDisplay(buildingId, qty) {
  const b = BUILDINGS.find(x => x.id === buildingId);
  if (!b) return {};
  const owned = gameState.buildings[buildingId] || 0;
  let totalCost = {};
  for (let i = 0; i < qty; i++) {
    const mult = Math.pow(b.costMultiplier, owned + i);
    for (const [rid, base] of Object.entries(b.baseCost)) {
      totalCost[rid] = (totalCost[rid] || 0) + Math.ceil(base * mult);
    }
  }
  return totalCost;
}

function canAffordResearch(researchId) {
  const r = RESEARCH.find(x => x.id === researchId);
  if (!r) return false;
  if (gameState.completedResearch.includes(researchId)) return false;
  if (r.requires && !gameState.completedResearch.includes(r.requires)) return false;
  return gameState.resources.research_points.amount >= r.cost_rp;
}

function buyResearch(researchId) {
  if (!canAffordResearch(researchId)) return false;
  const r = RESEARCH.find(x => x.id === researchId);
  gameState.resources.research_points.amount -= r.cost_rp;
  gameState.stats.rpSpent += r.cost_rp;
  gameState.completedResearch.push(researchId);
  return true;
}

function getPrestigeLPGain() {
  const total = gameState.totalEnergyCellsEver;
  return Math.floor(Math.log10(total + 1));
}

function canPrestige() {
  return gameState.resources.energy_cell.totalProduced >= 1;
}

function doPrestige() {
  const lpGain = getPrestigeLPGain();
  const newPrestige = gameState.prestigeCount + 1;
  const newLP = gameState.legacyPoints + lpGain;
  const lpBought = [...gameState.lpUpgradesBought];
  const achievements = [...gameState.achievements];
  const loreUnlocked = [...gameState.unlockedLore];
  const totalCells = gameState.totalEnergyCellsEver + gameState.resources.energy_cell.totalProduced;

  const fresh = defaultState();
  fresh.prestigeCount = newPrestige;
  fresh.legacyPoints  = newLP;
  fresh.lpUpgradesBought = lpBought;
  fresh.achievements  = achievements;
  fresh.unlockedLore  = loreUnlocked;
  fresh.totalEnergyCellsEver = totalCells;

  // Starting resource boost from LP upgrade
  if (lpBought.includes('start_res')) {
    for (const r of RESOURCES) {
      if (r.category === 'raw') {
        fresh.resources[r.id].amount = 20;
      }
    }
  }

  gameState = fresh;
  return lpGain;
}

function buyLPUpgrade(upgradeId) {
  const upg = LP_UPGRADES.find(u => u.id === upgradeId);
  if (!upg) return false;
  if (gameState.lpUpgradesBought.includes(upgradeId)) return false;
  if (gameState.legacyPoints < upg.cost) return false;
  gameState.legacyPoints -= upg.cost;
  gameState.lpUpgradesBought.push(upgradeId);
  return true;
}

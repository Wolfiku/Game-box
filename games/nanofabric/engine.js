/* NanoFactory — engine.js (grid edition) */

function getMineMultiplier() {
  let m = 1.0;
  if (gameState.completedResearch.includes('efficient_mining_1')) m += 0.5;
  if (gameState.completedResearch.includes('efficient_mining_2')) m += 1.0;
  return m;
}
function getGenMultiplier() {
  return gameState.completedResearch.includes('grid_optimization') ? 1.2 : 1.0;
}
function getCraftMultiplier(tileType) {
  let m = 1.0;
  if (tileType === T.SMELTER && gameState.completedResearch.includes('advanced_smelting')) m *= 2;
  if (tileType === T.FORGE   && gameState.completedResearch.includes('alloy_mastery'))     m *= 2;
  if (gameState.completedResearch.includes('stack_inserter')) m *= 2;
  return m;
}
function getBeltSpeed() {
  if (gameState.completedResearch.includes('belt_speed_2')) return 4;
  if (gameState.completedResearch.includes('belt_speed_1')) return 2;
  return 1;
}

// ── Power Calculation ────────────────────────────────────────────────────────
function powerCalc() {
  let gen = 0, con = 0;
  const gm = getGenMultiplier();
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const t = getTile(x, y);
      const b = BUILDING_BY_TYPE[t];
      if (!b) continue;
      if (b.powerOut) gen += b.powerOut * gm;
      if (b.energyCost) con += b.energyCost;
    }
  }
  const ratio = con === 0 ? 1 : Math.min(1, gen / con);
  gameState.power = { generated: gen, consumed: con, ratio };
}

// ── Belt tick: move items one step forward ───────────────────────────────────
function beltTick() {
  const speed = getBeltSpeed();
  // We need to process in order of direction to avoid double-moving
  // Simple approach: collect all (pos, item) to move, then apply
  const moves = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const t = getTile(x, y);
      if (!BELT_SET.has(t)) continue;
      const item = getItem(x, y);
      if (!item) continue;
      const [dx, dy] = DIR_OFFSET[t];
      const nx = x + dx, ny = y + dy;
      moves.push({ x, y, nx, ny, item });
    }
  }
  // process each move
  for (let s = 0; s < speed; s++) {
    for (const m of moves) {
      const { x, y, nx, ny, item } = m;
      if (getItem(x, y) !== item) continue; // already moved
      const nt = getTile(nx, ny);
      if (nt === -1) {
        // off-grid: drop item into inventory
        addInv(item, 1);
        setItem(x, y, null);
        continue;
      }
      if (BELT_SET.has(nt)) {
        // move to next belt only if empty
        if (getItem(nx, ny) === null) {
          setItem(nx, ny, item);
          setItem(x, y, null);
          m.x = nx; m.y = ny; // update for next speed iteration
        }
      } else if (BUILDING_BY_TYPE[nt]) {
        // feed into machine input buffer
        const meta = getMeta(nx, ny);
        if (meta) {
          const b = BUILDING_BY_TYPE[nt];
          if (b.input && b.input[item] !== undefined) {
            const bufAmt = meta.inputBuffer[item] || 0;
            if (bufAmt < 10) {
              meta.inputBuffer[item] = bufAmt + 1;
              setItem(x, y, null);
            }
          } else if (nt === T.CHEST) {
            const bufAmt = meta.inputBuffer[item] || 0;
            if (bufAmt < (BUILDING_BY_TYPE[T.CHEST].capacity || 200)) {
              meta.inputBuffer[item] = bufAmt + 1;
              setItem(x, y, null);
            }
          }
        }
      }
    }
  }
}

// ── Machine tick: advance crafting progress ──────────────────────────────────
function machineTick(delta) {
  const powerRatio = gameState.power.ratio;
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const t = getTile(x, y);
      const b = BUILDING_BY_TYPE[t];
      if (!b || b.category === 'belt') continue;
      const meta = getMeta(x, y);
      if (!meta) continue;

      // MINER
      if (t === T.MINER) {
        // Find patch below miner
        const patch = getTile(x, y); // miner is ON the patch after placement
        const patchBelow = meta.patch;
        if (!patchBelow) continue;
        const resId = PATCH_RES[patchBelow];
        if (!resId) continue;
        meta.progress += getMineMultiplier() * delta / 1.0; // 1 item/s base
        if (meta.progress >= 1) {
          meta.progress -= 1;
          gameState.totalMined[resId] = (gameState.totalMined[resId] || 0) + 1;
          // Try to push output to adjacent belt
          if (!pushOutput(x, y, resId)) {
            // drop to inventory if no belt
            addInv(resId, 1);
          }
        }
        continue;
      }

      // POWER buildings (coal gen, nuclear)
      if (b.category === 'power') {
        if (b.input) {
          // Consume fuel from inputBuffer or inventory each tick
          for (const [rid, rps] of Object.entries(b.input)) {
            if (rid === 'mw') continue;
            const needed = rps * delta;
            const fromBuf = Math.min(meta.inputBuffer[rid] || 0, needed);
            meta.inputBuffer[rid] = (meta.inputBuffer[rid] || 0) - fromBuf;
            const remain = needed - fromBuf;
            if (remain > 0) takeInv(rid, remain);
          }
        }
        continue;
      }

      // CHEST
      if (t === T.CHEST) continue;

      // PROCESSING machines
      if (!b.input || !b.output) continue;
      if (b.energyCost > 0 && powerRatio < 0.1) continue;

      const cm = getCraftMultiplier(t);
      const speed = (1.0 / b.craftTime) * cm * (b.energyCost > 0 ? powerRatio : 1);

      // Check if we have enough input in buffer
      let canCraft = true;
      if (meta.outputBuffer) {
        canCraft = false; // wait until output is pushed
      } else {
        for (const [rid, amt] of Object.entries(b.input)) {
          const have = meta.inputBuffer[rid] || 0;
          if (have < amt) { canCraft = false; break; }
        }
      }

      if (canCraft) {
        meta.progress += speed * delta;
        if (meta.progress >= 1) {
          meta.progress -= 1;
          // Consume inputs
          for (const [rid, amt] of Object.entries(b.input)) {
            meta.inputBuffer[rid] = (meta.inputBuffer[rid] || 0) - amt;
          }
          // Queue output
          for (const [rid, amt] of Object.entries(b.output)) {
            if (rid === 'mw') continue;
            if (rid === 'research_points') {
              addInv(rid, amt);
            } else {
              meta.outputBuffer = { id: rid, amt };
            }
          }
        }
      }

      // Try to push output buffer onto adjacent belt
      if (meta.outputBuffer) {
        const { id: rid, amt } = meta.outputBuffer;
        for (let i = 0; i < amt; i++) {
          if (pushOutput(x, y, rid)) {
            meta.outputBuffer = null;
          } else {
            break;
          }
        }
      }
    }
  }
}

// Push one item of 'resId' from tile (x,y) to any adjacent belt
function pushOutput(x, y, resId) {
  const neighbors = [[1,0],[-1,0],[0,1],[0,-1]];
  for (const [dx, dy] of neighbors) {
    const nx = x+dx, ny = y+dy;
    const nt = getTile(nx, ny);
    if (!BELT_SET.has(nt)) continue;
    if (getItem(nx, ny) !== null) continue;
    setItem(nx, ny, resId);
    return true;
  }
  return false;
}

// ── Master tick ──────────────────────────────────────────────────────────────
function tick() {
  powerCalc();
  beltTick();
  machineTick(TICK_DELTA);
  checkAchievements();
  checkLore();
  gameState.timePlayed += TICK_DELTA;
}

// ── Place tile ───────────────────────────────────────────────────────────────
function placeTile(x, y, tileType) {
  const existing = getTile(x, y);
  const b = BUILDING_BY_TYPE[tileType];

  // Can't place on ore patches (except miners)
  const isPatch = existing === T.PATCH_IRON || existing === T.PATCH_COPPER || existing === T.PATCH_COAL;
  if (isPatch && tileType !== T.MINER) return false;
  if (!isPatch && existing !== T.EMPTY) return false;

  // Check placement cost
  if (b && b.placeCost) {
    for (const [rid, amt] of Object.entries(b.placeCost)) {
      if (getInv(rid) < amt) return false;
    }
    for (const [rid, amt] of Object.entries(b.placeCost)) {
      takeInv(rid, amt);
    }
  }

  // Check research lock
  if (b && b.unlockedByResearch && !gameState.completedResearch.includes(b.unlockedByResearch)) {
    return false;
  }

  if (isPatch && tileType === T.MINER) {
    // Store patch type in meta
    setTile(x, y, T.MINER);
    setMeta(x, y, { progress: 0, inputBuffer: {}, outputBuffer: null, patch: existing });
  } else {
    setTile(x, y, tileType);
    if (BELT_SET.has(tileType)) {
      gameState.totalBelts++;
    } else {
      initMeta(x, y, tileType);
    }
  }

  // Stats
  if (b) {
    if (tileType === T.MINER) gameState.stats.minersPlaced++;
    if (b.category === 'power') gameState.stats.generatorsBuilt++;
    gameState.stats.buildingsPlaced++;
  }
  return true;
}

function removeTile(x, y) {
  const t = getTile(x, y);
  if (t === T.EMPTY || t === T.PATCH_IRON || t === T.PATCH_COPPER || t === T.PATCH_COAL) return false;

  // Refund item on belt
  const item = getItem(x, y);
  if (item) { addInv(item, 1); setItem(x, y, null); }

  // Refund buffers
  const meta = getMeta(x, y);
  if (meta && meta.inputBuffer) {
    for (const [rid, amt] of Object.entries(meta.inputBuffer)) {
      if (amt > 0) addInv(rid, Math.floor(amt));
    }
  }
  if (meta && meta.outputBuffer) {
    addInv(meta.outputBuffer.id, meta.outputBuffer.amt);
  }

  if (BELT_SET.has(t)) gameState.totalBelts = Math.max(0, gameState.totalBelts - 1);

  // Restore patch if miner
  if (t === T.MINER && meta && meta.patch) {
    setTile(x, y, meta.patch);
  } else {
    setTile(x, y, T.EMPTY);
  }
  setMeta(x, y, null);
  setItem(x, y, null);
  return true;
}

// ── Research ─────────────────────────────────────────────────────────────────
function canAffordResearch(id) {
  const r = RESEARCH.find(x => x.id === id);
  if (!r || gameState.completedResearch.includes(id)) return false;
  if (r.requires && !gameState.completedResearch.includes(r.requires)) return false;
  return getInv('research_points') >= r.cost_rp;
}
function buyResearch(id) {
  if (!canAffordResearch(id)) return false;
  const r = RESEARCH.find(x => x.id === id);
  takeInv('research_points', r.cost_rp);
  gameState.completedResearch.push(id);
  return true;
}

function checkLore() {
  for (const e of LORE) {
    if (!gameState.unlockedLore.includes(e.id)) {
      try { if (e.unlockCondition(gameState)) gameState.unlockedLore.push(e.id); } catch(e){}
    }
  }
}

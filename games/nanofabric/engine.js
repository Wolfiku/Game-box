/* NanoFactory — engine.js */

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
  if (tileType === T.SMELTER   && gameState.completedResearch.includes('advanced_smelting')) m *= 2;
  if (tileType === T.FORGE     && gameState.completedResearch.includes('alloy_mastery'))     m *= 2;
  if (gameState.completedResearch.includes('stack_inserter')) m *= 2;
  return m;
}
function getBeltSpeed() {
  if (gameState.completedResearch.includes('belt_speed_2')) return 4;
  if (gameState.completedResearch.includes('belt_speed_1')) return 2;
  return 1;
}

// Power
function powerCalc() {
  let gen = 0, con = 0;
  const gm = getGenMultiplier();
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const b = BUILDING_BY_TYPE[getTile(x,y)];
      if (!b) continue;
      if (b.powerOut) gen += b.powerOut * gm;
      if (b.energyCost) con += b.energyCost;
    }
  }
  const ratio = con === 0 ? 1 : Math.min(1, gen / con);
  gameState.power = {generated:gen, consumed:con, ratio};
}

// Belt tick — straight + splitter + merger
function beltTick() {
  const speed = getBeltSpeed();
  for (let s = 0; s < speed; s++) {
    // Collect moves
    const toMove = [];
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const t = getTile(x,y);
        if (!BELT_SET.has(t)) continue;
        const item = getItem(x,y);
        if (!item) continue;
        toMove.push({x,y,t,item});
      }
    }
    // Process in reverse to avoid double-move
    for (let i = toMove.length-1; i >= 0; i--) {
      const {x,y,t,item} = toMove[i];
      if (getItem(x,y) !== item) continue; // already moved

      if (BELT_STRAIGHT.has(t)) {
        const [dx,dy] = DIR_OFFSET[t];
        tryMoveBelt(x,y,item,x+dx,y+dy);
      } else if (BELT_SPLIT.has(t)) {
        // Try straight output first, then alternate to sides
        const [dx,dy] = DIR_OFFSET[t];
        const sides = SPLIT_SIDES[t] || [];
        const meta = getMeta(x,y) || {};
        const lastSide = meta.lastSide || 0;
        const order = [[dx,dy], sides[lastSide%sides.length], sides[(lastSide+1)%sides.length]].filter(Boolean);
        let moved = false;
        for (const [ox,oy] of order) {
          if (tryMoveBelt(x,y,item,x+ox,y+oy)) { moved=true; break; }
        }
        if (moved) setMeta(x,y, {...meta, lastSide:(lastSide+1)%Math.max(1,sides.length)});
      } else if (BELT_MERGE.has(t)) {
        // Merger: take from perpendicular inputs if empty, output forward
        const [dx,dy] = DIR_OFFSET[t];
        tryMoveBelt(x,y,item,x+dx,y+dy);
      }
    }
    // Merger: pull from input sides if empty
    for (let y = 0; y < GRID_ROWS; y++) {
      for (let x = 0; x < GRID_COLS; x++) {
        const t = getTile(x,y);
        if (!BELT_MERGE.has(t)) continue;
        if (getItem(x,y)) continue;
        const inputs = MERGE_INPUTS[t] || [];
        for (const [ox,oy] of inputs) {
          const sx=x+ox, sy=y+oy;
          if (getTile(sx,sy) !== -1 && getItem(sx,sy)) {
            setItem(x,y,getItem(sx,sy));
            setItem(sx,sy,null);
            break;
          }
        }
      }
    }
  }
}

function tryMoveBelt(x,y,item,nx,ny) {
  if (nx<0||nx>=GRID_COLS||ny<0||ny>=GRID_ROWS) return false;
  const nt = getTile(nx,ny);
  // Can move onto: belt (if empty), processing machine (feeds input buffer), collector edge
  if (BELT_SET.has(nt)) {
    if (getItem(nx,ny)) return false;
    setItem(nx,ny,item); setItem(x,y,null); return true;
  }
  if (nt !== T.EMPTY && BUILDING_BY_TYPE[nt]) {
    const m = getMeta(nx,ny);
    if (m && feedMachine(nx,ny,nt,item)) { setItem(x,y,null); return true; }
  }
  // Collector edge — collect into inventory
  if (COLL_TYPES.has(nt) || COLL_BODY.has(nt)) {
    addInv(item,1);
    gameState.totalMined[item] = (gameState.totalMined[item]||0)+1;
    setItem(x,y,null); return true;
  }
  return false;
}

function feedMachine(x,y,tileType,item) {
  const b = BUILDING_BY_TYPE[tileType];
  if (!b || !b.input) return false;
  const m = getMeta(x,y);
  if (!m) return false;
  if (!(item in b.input)) return false;
  const cap = 4;
  if ((m.inputBuffer[item]||0) >= cap) return false;
  m.inputBuffer[item] = (m.inputBuffer[item]||0)+1;
  return true;
}

// Miner tick
function minerTick(dt) {
  const mult = getMineMultiplier();
  const craftTime = 3.0; // base: slow (3 seconds per item)
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (getTile(x,y) !== T.MINER) continue;
      let m = getMeta(x,y);
      if (!m) { setMeta(x,y,{progress:0,patch:null}); m=getMeta(x,y); }
      // Find adjacent patch
      if (!m.patch) {
        for (const [ox,oy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
          const pt = getTile(x+ox,y+oy);
          if (PATCH_SET.has(pt)) { m.patch=pt; break; }
        }
      }
      if (!m.patch) continue;
      m.progress += (dt * mult) / craftTime;
      if (m.progress >= 1) {
        m.progress = 0;
        const rid = PATCH_RES[m.patch];
        // Output to adjacent belt
        let placed = false;
        for (const [ox,oy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
          const nx=x+ox,ny=y+oy;
          const nt=getTile(nx,ny);
          if (BELT_SET.has(nt) && !getItem(nx,ny)) {
            setItem(nx,ny,rid); placed=true;
            gameState.totalMined[rid]=(gameState.totalMined[rid]||0)+1;
            break;
          }
        }
        // If no belt, drop into any adjacent collector
        if (!placed) {
          for (const [ox,oy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
            const nt=getTile(x+ox,y+oy);
            if (COLL_TYPES.has(nt)||COLL_BODY.has(nt)) {
              addInv(rid,1);
              gameState.totalMined[rid]=(gameState.totalMined[rid]||0)+1;
              break;
            }
          }
        }
      }
    }
  }
}

// Processing machine tick
function processTick(dt) {
  const ratio = gameState.power.ratio;
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const t = getTile(x,y);
      const b = BUILDING_BY_TYPE[t];
      if (!b || b.category === 'mining' || b.category === 'power' || b.category === 'storage' || b.category === 'belt') continue;
      let m = getMeta(x,y);
      if (!m) { initMeta(x,y,t); m=getMeta(x,y); }
      if (!b.input || !b.output) continue;

      const cm = getCraftMultiplier(t);
      const craftTime = b.craftTime / cm;

      // If output buffer full, try to eject onto adjacent belt
      if (m.outputBuffer) {
        let ejected = false;
        for (const [ox,oy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
          const nx=x+ox,ny=y+oy;
          const nt=getTile(nx,ny);
          if (BELT_SET.has(nt) && !getItem(nx,ny)) {
            setItem(nx,ny,m.outputBuffer.id);
            m.outputBuffer=null; ejected=true; break;
          }
          // Eject directly to collector
          if (COLL_TYPES.has(nt)||COLL_BODY.has(nt)) {
            addInv(m.outputBuffer.id,1);
            gameState.totalMined[m.outputBuffer.id]=(gameState.totalMined[m.outputBuffer.id]||0)+1;
            m.outputBuffer=null; ejected=true; break;
          }
        }
        if (!ejected) continue; // blocked, stall
      }

      // Check input buffer has enough
      let canCraft = true;
      for (const [rid,amt] of Object.entries(b.input)) {
        if ((m.inputBuffer[rid]||0) < amt) { canCraft=false; break; }
      }
      if (!canCraft) { m.progress=0; continue; }

      // Craft
      m.progress += (dt * ratio) / craftTime;
      if (m.progress >= 1) {
        m.progress = 0;
        for (const [rid,amt] of Object.entries(b.input)) m.inputBuffer[rid]-=amt;
        // Output
        for (const [rid,amt] of Object.entries(b.output)) {
          if (rid === 'mw') continue;
          if (rid === 'research_points') { addInv('research_points',amt); continue; }
          m.outputBuffer = {id:rid, amt};
        }
      }
    }
  }
}

// Power generator tick
function genTick(dt) {
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const t = getTile(x,y);
      const b = BUILDING_BY_TYPE[t];
      if (!b || b.category !== 'power') continue;
      if (!b.input) continue; // Solar: free
      let m = getMeta(x,y);
      if (!m) { initMeta(x,y,t); m=getMeta(x,y); }
      // Consume fuel from input buffer
      for (const [rid,amt] of Object.entries(b.input)) {
        if ((m.inputBuffer[rid]||0) < amt) {
          // Try global inventory fallback for coal gen
          const inv = getInv(rid);
          if (inv >= amt) { takeInv(rid,amt); m.inputBuffer[rid]=(m.inputBuffer[rid]||0)+amt; }
        }
      }
    }
  }
}

// Collector display — show animated indicator on anchor tile
function collectorTick() {
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const t = getTile(x,y);
      if (!COLL_TYPES.has(t)) continue;
      let m = getMeta(x,y);
      if (!m) { setMeta(x,y,{progress:0,collected:0}); m=getMeta(x,y); }
      // Pulse animation
      m.progress = (m.progress + 0.05) % 1;
    }
  }
}

// Chest tick: suck from adjacent belt
function chestTick() {
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (getTile(x,y) !== T.CHEST) continue;
      const m = getMeta(x,y) || {stored:{}};
      let total = Object.values(m.stored||{}).reduce((a,b)=>a+b,0);
      const b = BUILDING_BY_TYPE[T.CHEST];
      if (total >= (b.capacity||200)) continue;
      for (const [ox,oy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
        const nx=x+ox,ny=y+oy;
        const item=getItem(nx,ny);
        if (!item) continue;
        if (BELT_SET.has(getTile(nx,ny))) {
          m.stored[item]=(m.stored[item]||0)+1;
          setItem(nx,ny,null);
          addInv(item,1);
          setMeta(x,y,m);
          break;
        }
      }
    }
  }
}

// Main tick
function tick() {
  const dt = TICK_DELTA;
  gameState.timePlayed += dt;
  powerCalc();
  genTick(dt);
  beltTick();
  minerTick(dt);
  processTick(dt);
  collectorTick();
  chestTick();
  checkAchievements();
  checkLore();
}

// Placement helpers
function placeTile(x, y, tileType) {
  if (x<0||x>=GRID_COLS||y<0||y>=GRID_ROWS) return false;
  const existing = getTile(x,y);
  if (PATCH_SET.has(existing)) {
    // Only miner can go on patch
    if (tileType !== T.MINER) return false;
  } else if (existing !== T.EMPTY) {
    return false;
  }
  const b = BUILDING_BY_TYPE[tileType];

  // Collector: place 3x3
  if (COLL_TYPES.has(tileType)) {
    if (!canPlace3x3(x,y)) return false;
    if (b.placeCost && !payCost(b.placeCost)) return false;
    place3x3(x,y,tileType);
    return true;
  }

  if (b && b.placeCost && !payCost(b.placeCost)) return false;
  setTile(x,y,tileType);
  if (BELT_SET.has(tileType)) gameState.totalBelts++;
  if (tileType === T.MINER) {
    gameState.stats.minersPlaced++;
    setMeta(x,y,{progress:0,patch:null});
  } else {
    initMeta(x,y,tileType);
  }
  if (b && b.category==='power') gameState.stats.generatorsBuilt++;
  gameState.stats.buildingsPlaced++;
  return true;
}

function canPlace3x3(ax,ay) {
  for (let dy=0;dy<3;dy++) for (let dx=0;dx<3;dx++) {
    const t=getTile(ax+dx,ay+dy);
    if (t===undefined||t===-1) return false;
    if (t!==T.EMPTY) return false;
  }
  return true;
}
function place3x3(ax,ay,anchorType) {
  const bodyType = anchorType===T.COLLECTOR ? T.COLL_BODY : T.COLL2_BODY;
  for (let dy=0;dy<3;dy++) for (let dx=0;dx<3;dx++) {
    const t = (dx===0&&dy===0) ? anchorType : bodyType;
    setTile(ax+dx,ay+dy,t);
  }
  setMeta(ax,ay,{progress:0,collected:0});
}

function remove3x3(ax,ay) {
  for (let dy=0;dy<3;dy++) for (let dx=0;dx<3;dx++) {
    setTile(ax+dx,ay+dy,T.EMPTY);
    setMeta(ax+dx,ay+dy,null);
    setItem(ax+dx,ay+dy,null);
  }
}

function payCost(cost) {
  // check first
  for (const [id,amt] of Object.entries(cost)) {
    if (getInv(id)<amt) return false;
  }
  for (const [id,amt] of Object.entries(cost)) takeInv(id,amt);
  return true;
}

function removeTile(x,y) {
  const t = getTile(x,y);
  if (t===T.EMPTY||PATCH_SET.has(t)) return;

  // Collector anchor or body
  if (COLL_TYPES.has(t)) { remove3x3(x,y); return; }
  if (COLL_BODY.has(t)) {
    // Find anchor
    for (let dy=-2;dy<=0;dy++) for (let dx=-2;dx<=0;dx++) {
      const at=getTile(x+dx,y+dy);
      if (COLL_TYPES.has(at)) { remove3x3(x+dx,y+dy); return; }
    }
    return;
  }

  setTile(x,y,T.EMPTY);
  setMeta(x,y,null);
  setItem(x,y,null);
}

function buyResearch(id) {
  const r = RESEARCH.find(r=>r.id===id);
  if (!r) return false;
  if (gameState.completedResearch.includes(id)) return false;
  if (r.requires && !gameState.completedResearch.includes(r.requires)) return false;
  if (getInv('research_points') < r.cost_rp) return false;
  takeInv('research_points', r.cost_rp);
  gameState.completedResearch.push(id);
  return true;
}

function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!gameState.achievements.includes(a.id) && a.condition(gameState)) {
      gameState.achievements.push(a.id);
      if (typeof toast === 'function') toast('Achievement: '+a.name);
    }
  }
}
function checkLore() {
  for (const l of LORE) {
    if (!gameState.unlockedLore.includes(l.id) && l.unlockCondition(gameState)) {
      gameState.unlockedLore.push(l.id);
      if (typeof toast === 'function') toast(l.title+': '+l.text);
    }
  }
}

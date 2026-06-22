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

// ── Power ──────────────────────────────────────────────────────────────
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

// ── Belt tick ──────────────────────────────────────────────────────────────
function beltTick() {
  const speed = getBeltSpeed();
  // Collect all belt moves first
  const moves = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const t = getTile(x,y);
      if (!BELT_SET.has(t)) continue;
      const item = getItem(x,y);
      if (!item) continue;
      const [dx,dy] = DIR_OFFSET[t] || [0,0];
      moves.push({x,y,nx:x+dx,ny:y+dy,item,t});
    }
  }

  for (let s = 0; s < speed; s++) {
    for (const m of moves) {
      const {x,y,item,t} = m;
      if (getItem(x,y) !== item) continue;
      const [dx,dy] = DIR_OFFSET[t] || [0,0];
      const nx = x+dx, ny = y+dy;

      // Splitter: try straight first, then sides alternating
      if (BELT_SPLIT.has(t)) {
        const sides = SPLIT_SIDES[t] || [];
        const candidates = [[dx,dy], ...sides];
        const meta = ge
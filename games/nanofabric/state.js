/* NanoFactory — state.js */

function defaultState() {
  const tiles = new Array(GRID_COLS * GRID_ROWS).fill(T.EMPTY);
  const items = new Array(GRID_COLS * GRID_ROWS).fill(null);
  const meta  = new Array(GRID_COLS * GRID_ROWS).fill(null);

  const patches = [
    {x:4,  y:4,  type:T.PATCH_IRON},   {x:5,  y:4,  type:T.PATCH_IRON},
    {x:4,  y:5,  type:T.PATCH_IRON},   {x:6,  y:3,  type:T.PATCH_IRON},
    {x:12, y:8,  type:T.PATCH_IRON},   {x:13, y:8,  type:T.PATCH_IRON},
    {x:12, y:9,  type:T.PATCH_IRON},   {x:20, y:15, type:T.PATCH_IRON},
    {x:21, y:15, type:T.PATCH_IRON},   {x:20, y:16, type:T.PATCH_IRON},
    {x:8,  y:2,  type:T.PATCH_COPPER}, {x:9,  y:2,  type:T.PATCH_COPPER},
    {x:8,  y:3,  type:T.PATCH_COPPER}, {x:16, y:6,  type:T.PATCH_COPPER},
    {x:17, y:6,  type:T.PATCH_COPPER}, {x:25, y:10, type:T.PATCH_COPPER},
    {x:26, y:10, type:T.PATCH_COPPER},
    {x:2,  y:10, type:T.PATCH_COAL},   {x:3,  y:10, type:T.PATCH_COAL},
    {x:2,  y:11, type:T.PATCH_COAL},   {x:10, y:14, type:T.PATCH_COAL},
    {x:11, y:14, type:T.PATCH_COAL},   {x:30, y:20, type:T.PATCH_COAL},
    {x:31, y:20, type:T.PATCH_COAL},
  ];
  for (const p of patches) {
    if (p.x>=0&&p.x<GRID_COLS&&p.y>=0&&p.y<GRID_ROWS)
      tiles[p.y*GRID_COLS+p.x]=p.type;
  }

  return {
    tiles, items, meta,
    inventory: {},
    power: {generated:0, consumed:0, ratio:1},
    completedResearch: [],
    achievements: [],
    unlockedLore: [],
    totalMined: {},
    totalBelts: 0,
    timePlayed: 0,
    lastSave: Date.now(),
    stats: {minersPlaced:0, generatorsBuilt:0, buildingsPlaced:0},
  };
}

let gameState = defaultState();

function getInv(id)      { return gameState.inventory[id] || 0; }
function addInv(id, amt) { gameState.inventory[id] = (gameState.inventory[id]||0) + amt; }
function takeInv(id, amt) {
  const have = getInv(id);
  const take = Math.min(have, amt);
  gameState.inventory[id] = have - take;
  return take;
}
function getTile(x,y) {
  if (x<0||x>=GRID_COLS||y<0||y>=GRID_ROWS) return -1;
  return gameState.tiles[y*GRID_COLS+x];
}
function setTile(x,y,type) {
  if (x<0||x>=GRID_COLS||y<0||y>=GRID_ROWS) return;
  gameState.tiles[y*GRID_COLS+x]=type;
}
function getItem(x,y) {
  if (x<0||x>=GRID_COLS||y<0||y>=GRID_ROWS) return null;
  return gameState.items[y*GRID_COLS+x];
}
function setItem(x,y,item) {
  if (x<0||x>=GRID_COLS||y<0||y>=GRID_ROWS) return;
  gameState.items[y*GRID_COLS+x]=item;
}
function getMeta(x,y) {
  if (x<0||x>=GRID_COLS||y<0||y>=GRID_ROWS) return null;
  return gameState.meta[y*GRID_COLS+x];
}
function setMeta(x,y,val) {
  if (x<0||x>=GRID_COLS||y<0||y>=GRID_ROWS) return;
  gameState.meta[y*GRID_COLS+x]=val;
}
function initMeta(x,y,tileType) {
  if (!BUILDING_BY_TYPE[tileType]) return;
  setMeta(x,y,{progress:0, inputBuffer:{}, outputBuffer:null, fuelBuffer:0});
}

/* NanoFactory — ui.js (grid renderer + interaction) */

// ── Canvas setup ─────────────────────────────────────────────────────────────
let canvas, ctx;
let camX = 0, camY = 0;  // camera offset in pixels
let isDragging = false, dragStartX = 0, dragStartY = 0, camStartX = 0, camStartY = 0;
let isPainting = false, paintStartX = 0, paintStartY = 0;  // for drag-to-place belts
let touchStartDist = 0;  // for pinch zoom

let selectedTool = null;   // { tileType } or 'remove'
let selectedBuildingId = null;

const TILE_COLORS = {
  [T.EMPTY]:        '#0d0d14',
  [T.PATCH_IRON]:   '#2a2d3a',
  [T.PATCH_COPPER]: '#2e2018',
  [T.PATCH_COAL]:   '#1a1a1a',
  [T.BELT_R]:       '#1e2235',
  [T.BELT_L]:       '#1e2235',
  [T.BELT_U]:       '#1e2235',
  [T.BELT_D]:       '#1e2235',
  [T.MINER]:        '#2a3a2a',
  [T.SMELTER]:      '#3a2a1a',
  [T.WIRE_MILL]:    '#1a2a3a',
  [T.FORGE]:        '#3a1a1a',
  [T.ASSEMBLY]:     '#1a3a1a',
  [T.BATTERY_PLANT]:'#2a1a3a',
  [T.CELL_FACTORY]: '#3a1a2a',
  [T.LAB]:          '#1a3a3a',
  [T.COAL_GEN]:     '#2a2a1a',
  [T.SOLAR]:        '#1a2a1a',
  [T.NUCLEAR]:      '#1a3a1a',
  [T.CHEST]:        '#2a2420',
};

const TILE_ICONS = {
  [T.PATCH_IRON]:   '🪨',
  [T.PATCH_COPPER]: '🟤',
  [T.PATCH_COAL]:   '⬛',
  [T.BELT_R]:       '→',
  [T.BELT_L]:       '←',
  [T.BELT_U]:       '↑',
  [T.BELT_D]:       '↓',
  [T.MINER]:        '⛏',
  [T.SMELTER]:      '🔥',
  [T.WIRE_MILL]:    '🌀',
  [T.FORGE]:        '🏭',
  [T.ASSEMBLY]:     '⚙',
  [T.BATTERY_PLANT]:'🔋',
  [T.CELL_FACTORY]: '⚡',
  [T.LAB]:          '🔬',
  [T.COAL_GEN]:     '🏗',
  [T.SOLAR]:        '☀',
  [T.NUCLEAR]:      '☢',
  [T.CHEST]:        '📦',
};

function initCanvas() {
  canvas = document.getElementById('grid-canvas');
  ctx    = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Touch events
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
  canvas.addEventListener('touchend',   onTouchEnd,   { passive: false });

  // Mouse events
  canvas.addEventListener('mousedown',  onMouseDown);
  canvas.addEventListener('mousemove',  onMouseMove);
  canvas.addEventListener('mouseup',    onMouseUp);
  canvas.addEventListener('contextmenu', onContextMenu);
}

function resizeCanvas() {
  const wrap = document.getElementById('grid-wrap');
  canvas.width  = wrap.clientWidth;
  canvas.height = wrap.clientHeight;
}

// ── Coordinate helpers ───────────────────────────────────────────────────────
function screenToTile(sx, sy) {
  return {
    x: Math.floor((sx + camX) / TILE_SIZE),
    y: Math.floor((sy + camY) / TILE_SIZE),
  };
}
function tileToScreen(tx, ty) {
  return {
    sx: tx * TILE_SIZE - camX,
    sy: ty * TILE_SIZE - camY,
  };
}
function clampCamera() {
  const maxX = GRID_COLS * TILE_SIZE - canvas.width;
  const maxY = GRID_ROWS * TILE_SIZE - canvas.height;
  camX = Math.max(0, Math.min(camX, maxX));
  camY = Math.max(0, Math.min(camY, maxY));
}

// ── Render ───────────────────────────────────────────────────────────────────
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const startX = Math.floor(camX / TILE_SIZE);
  const startY = Math.floor(camY / TILE_SIZE);
  const endX   = Math.min(GRID_COLS, startX + Math.ceil(canvas.width  / TILE_SIZE) + 1);
  const endY   = Math.min(GRID_ROWS, startY + Math.ceil(canvas.height / TILE_SIZE) + 1);

  ctx.font = Math.floor(TILE_SIZE * 0.45) + 'px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const sx = x * TILE_SIZE - camX;
      const sy = y * TILE_SIZE - camY;
      const t  = getTile(x, y);

      // Background
      ctx.fillStyle = TILE_COLORS[t] || '#0d0d14';
      ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

      // Grid line
      ctx.strokeStyle = '#1a1a2a';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx + 0.5, sy + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

      // Icon
      const icon = TILE_ICONS[t];
      if (icon) {
        ctx.fillStyle = '#fff';
        ctx.fillText(icon, sx + TILE_SIZE/2, sy + TILE_SIZE/2);
      }

      // Belt direction stripe
      if (BELT_SET.has(t)) {
        drawBeltArrow(ctx, sx, sy, t);
      }

      // Item on belt
      const item = getItem(x, y);
      if (item) {
        ctx.fillStyle = ITEM_COLOR[item] || '#fff';
        ctx.beginPath();
        ctx.arc(sx + TILE_SIZE/2, sy + TILE_SIZE/2, TILE_SIZE * 0.14, 0, Math.PI*2);
        ctx.fill();
      }

      // Machine progress bar
      const meta = getMeta(x, y);
      if (meta && meta.progress > 0) {
        ctx.fillStyle = 'rgba(79,142,247,0.25)';
        ctx.fillRect(sx, sy + TILE_SIZE - 4, TILE_SIZE * meta.progress, 4);
        ctx.fillStyle = '#4f8ef7';
        ctx.fillRect(sx, sy + TILE_SIZE - 4, TILE_SIZE * meta.progress - 1, 3);
      }
    }
  }

  // Hover highlight
  if (hoverTile) {
    const { sx, sy } = tileToScreen(hoverTile.x, hoverTile.y);
    ctx.strokeStyle = selectedTool === 'remove' ? '#e94560' : '#4f8ef7';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, TILE_SIZE - 2, TILE_SIZE - 2);
  }
}

function drawBeltArrow(ctx, sx, sy, t) {
  ctx.fillStyle = 'rgba(100,120,200,0.35)';
  const cx = sx + TILE_SIZE/2, cy = sy + TILE_SIZE/2;
  const s  = TILE_SIZE * 0.18;
  ctx.save();
  ctx.translate(cx, cy);
  const rot = { [T.BELT_R]: 0, [T.BELT_D]: Math.PI/2, [T.BELT_L]: Math.PI, [T.BELT_U]: -Math.PI/2 };
  ctx.rotate(rot[t] || 0);
  ctx.beginPath();
  ctx.moveTo(s, 0);
  ctx.lineTo(-s, -s*0.7);
  ctx.lineTo(-s,  s*0.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── Input ────────────────────────────────────────────────────────────────────
let hoverTile = null;
let dragMoved = false;
const DRAG_THRESHOLD = 8;

function onMouseDown(e) {
  if (e.button === 1) return;
  dragStartX = e.clientX; dragStartY = e.clientY;
  camStartX  = camX;      camStartY  = camY;
  dragMoved  = false;
  if (e.button === 2) { isPainting = true; return; }
  isDragging = true;
}
function onMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  hoverTile = screenToTile(e.clientX - rect.left, e.clientY - rect.top);

  if (isDragging) {
    const dx = e.clientX - dragStartX, dy = e.clientY - dragStartY;
    if (!dragMoved && Math.hypot(dx, dy) > DRAG_THRESHOLD) dragMoved = true;
    camX = camStartX - dx;
    camY = camStartY - dy;
    clampCamera();
  }
  if (isPainting && selectedTool && BELT_SET.has(selectedTool.tileType)) {
    placeTile(hoverTile.x, hoverTile.y, selectedTool.tileType);
  }
}
function onMouseUp(e) {
  if (e.button === 2) { isPainting = false; return; }
  if (!dragMoved) {
    const rect = canvas.getBoundingClientRect();
    handleTap(e.clientX - rect.left, e.clientY - rect.top);
  }
  isDragging = false;
  dragMoved  = false;
}
function onContextMenu(e) { e.preventDefault(); }

// Touch
let touchId = null, touch2Id = null;
let lastTouchX = 0, lastTouchY = 0;
let pinchStartDist = 0;

function getTouchById(touches, id) {
  for (const t of touches) if (t.identifier === id) return t;
  return null;
}
function onTouchStart(e) {
  e.preventDefault();
  if (e.touches.length === 1) {
    const t = e.touches[0];
    touchId    = t.identifier;
    dragStartX = t.clientX; dragStartY = t.clientY;
    camStartX  = camX;      camStartY  = camY;
    lastTouchX = t.clientX; lastTouchY = t.clientY;
    dragMoved  = false;
    isPainting = selectedTool && (BELT_SET.has(selectedTool.tileType) || selectedTool === 'remove');
  } else if (e.touches.length === 2) {
    isPainting = false;
    pinchStartDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
  }
}
function onTouchMove(e) {
  e.preventDefault();
  if (e.touches.length === 1) {
    const t = getTouchById(e.touches, touchId);
    if (!t) return;
    const dx = t.clientX - dragStartX, dy = t.clientY - dragStartY;
    if (!dragMoved && Math.hypot(dx, dy) > DRAG_THRESHOLD) dragMoved = true;
    if (!isPainting) {
      camX = camStartX - dx;
      camY = camStartY - dy;
      clampCamera();
    } else {
      const rect = canvas.getBoundingClientRect();
      const tile = screenToTile(t.clientX - rect.left, t.clientY - rect.top);
      if (selectedTool === 'remove') {
        removeTile(tile.x, tile.y);
      } else if (selectedTool) {
        placeTile(tile.x, tile.y, selectedTool.tileType);
      }
    }
    lastTouchX = t.clientX; lastTouchY = t.clientY;
  }
}
function onTouchEnd(e) {
  e.preventDefault();
  if (!dragMoved) {
    const t = e.changedTouches[0];
    const rect = canvas.getBoundingClientRect();
    handleTap(t.clientX - rect.left, t.clientY - rect.top);
  }
  isPainting = false;
  touchId    = null;
  dragMoved  = false;
}

// ── Tap action ───────────────────────────────────────────────────────────────
function handleTap(sx, sy) {
  const tile = screenToTile(sx, sy);
  if (tile.x < 0 || tile.x >= GRID_COLS || tile.y < 0 || tile.y >= GRID_ROWS) return;

  if (selectedTool === 'remove') {
    removeTile(tile.x, tile.y);
    return;
  }
  if (selectedTool) {
    const placed = placeTile(tile.x, tile.y, selectedTool.tileType);
    if (!placed) toast('Cannot place here');
    return;
  }
  // No tool: show tile info
  showTilePopup(tile.x, tile.y, sx, sy);
}

// ── Tile popup ───────────────────────────────────────────────────────────────
function showTilePopup(tx, ty, sx, sy) {
  const t    = getTile(tx, ty);
  const b    = BUILDING_BY_TYPE[t];
  const meta = getMeta(tx, ty);
  const popup = document.getElementById('tile-popup');
  const title  = document.getElementById('tile-popup-title');
  const body   = document.getElementById('tile-popup-body');
  const acts   = document.getElementById('tile-popup-actions');

  if (t === T.EMPTY) { hideTilePopup(); return; }

  title.textContent = b ? b.name : (TILE_ICONS[t] || '?') + ' Tile';
  let info = '';
  if (t === T.PATCH_IRON)   info = 'Iron Ore deposit';
  if (t === T.PATCH_COPPER) info = 'Copper Ore deposit';
  if (t === T.PATCH_COAL)   info = 'Coal deposit';
  if (BELT_SET.has(t)) {
    const item = getItem(tx, ty);
    info = 'Belt ' + (BELT_LABELS[t] || '') + (item ? '<br>Carrying: <b>' + (RES_BY_ID[item]?.name || item) + '</b>' : '<br>Empty');
  }
  if (b && b.category === 'processing') {
    info = b.description + '<br>';
    if (meta) {
      info += 'Progress: ' + Math.floor(meta.progress * 100) + '%<br>';
      const inBuf = Object.entries(meta.inputBuffer || {}).filter(([,v])=>v>0).map(([k,v])=>(RES_BY_ID[k]?.name||k)+': '+Math.floor(v)).join(', ');
      if (inBuf) info += 'In buffer: ' + inBuf + '<br>';
      if (meta.outputBuffer) info += 'Output ready: ' + (RES_BY_ID[meta.outputBuffer.id]?.name || meta.outputBuffer.id);
    }
  }
  if (t === T.MINER && meta) {
    const resId = PATCH_RES[meta.patch];
    info = 'Mining: <b>' + (RES_BY_ID[resId]?.name || resId || '?') + '</b><br>Progress: ' + Math.floor(meta.progress * 100) + '%';
  }
  if (t === T.CHEST && meta) {
    const contents = Object.entries(meta.inputBuffer || {}).filter(([,v])=>v>0).map(([k,v])=>(RES_BY_ID[k]?.name||k)+': '+Math.floor(v)).join('<br>');
    info = 'Chest contents:<br>' + (contents || 'Empty');
  }
  if (b && b.category === 'power') {
    info = b.description + '<br>Generating: ' + (b.powerOut || 0) + ' MW';
  }

  body.innerHTML = info || b?.description || '';

  acts.innerHTML = '';
  if (t !== T.PATCH_IRON && t !== T.PATCH_COPPER && t !== T.PATCH_COAL) {
    const btn = document.createElement('button');
    btn.textContent = '🗑 Remove';
    btn.className = 'btn-danger';
    btn.onclick = () => { removeTile(tx, ty); hideTilePopup(); };
    acts.appendChild(btn);
  }
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.onclick = hideTilePopup;
  acts.appendChild(closeBtn);

  // Position popup near tap but keep on screen
  popup.classList.remove('hidden');
  const pw = 200, ph = 160;
  let px = sx + 10, py = sy + 10;
  if (px + pw > canvas.width)  px = sx - pw - 10;
  if (py + ph > canvas.height) py = sy - ph - 10;
  const wrap = document.getElementById('grid-wrap');
  const wRect = wrap.getBoundingClientRect();
  popup.style.left = (wRect.left + Math.max(0, px)) + 'px';
  popup.style.top  = (wRect.top  + Math.max(0, py)) + 'px';
}
function hideTilePopup() {
  document.getElementById('tile-popup').classList.add('hidden');
}

// ── HUD / UI updates ─────────────────────────────────────────────────────────
function buildResBar() {
  const bar = document.getElementById('res-bar');
  bar.innerHTML = '';
  for (const r of RESOURCES) {
    const amt = getInv(r.id);
    if (amt === 0 && r.id !== 'iron_ore' && r.id !== 'copper_ore' && r.id !== 'coal') continue;
    const chip = document.createElement('div');
    chip.className = 'res-chip';
    chip.innerHTML = `<span class="res-chip-dot" style="background:${r.color}"></span>
      <span class="res-chip-val">${fmtNum(amt)}</span>
      <span class="res-chip-rate muted">${r.name.substring(0,6)}</span>`;
    bar.appendChild(chip);
  }
}

function updateHUD() {
  const p = gameState.power;
  document.getElementById('hud-power').textContent =
    '⚡ ' + fmtNum(p.generated) + '/' + fmtNum(p.consumed) + ' MW';
  buildResBar();
}

function buildBuildPanel() {
  const toolBtns = document.getElementById('tool-buttons');
  const bldBtns  = document.getElementById('building-buttons');
  toolBtns.innerHTML = bldBtns.innerHTML = '';

  // Remove tool
  const rem = document.createElement('button');
  rem.className = 'build-btn' + (selectedTool === 'remove' ? ' active' : '');
  rem.innerHTML = '<span class="build-btn-icon">🗑</span><span>Remove</span>';
  rem.onclick = () => { selectedTool = selectedTool === 'remove' ? null : 'remove'; buildBuildPanel(); updateNavHint(); };
  toolBtns.appendChild(rem);

  for (const b of BUILDINGS) {
    const isLocked = b.unlockedByResearch && !gameState.completedResearch.includes(b.unlockedByResearch);
    const isActive = selectedTool && selectedTool.tileType === b.tileType;

    let costHtml = '';
    if (b.placeCost) {
      const parts = Object.entries(b.placeCost).map(([rid, amt]) => {
        const have = getInv(rid);
        const cls  = have >= amt ? 'build-btn-canafford' : 'build-btn-cantafford';
        return `<span class="${cls}">${fmtNum(amt)} ${RES_BY_ID[rid]?.name || rid}</span>`;
      });
      costHtml = '<div class="build-btn-cost">' + parts.join(' ') + '</div>';
    }

    const btn = document.createElement('button');
    btn.className = 'build-btn' + (isActive ? ' active' : '') + (isLocked ? ' locked' : '');
    btn.innerHTML = `<span class="build-btn-icon">${b.icon}</span><span>${b.name}</span>${costHtml}`;
    btn.onclick = () => {
      if (isLocked) { toast('Locked — needs research'); return; }
      selectedTool = isActive ? null : { tileType: b.tileType };
      buildBuildPanel();
      updateNavHint();
    };

    const container = b.category === 'belt' ? toolBtns : bldBtns;
    container.appendChild(btn);
  }
}

function buildResearchPanel() {
  const list = document.getElementById('research-list');
  list.innerHTML = '';
  document.getElementById('rp-bar').textContent = '🔬 Research Points: ' + fmtNum(getInv('research_points'));

  for (const r of RESEARCH) {
    const done  = gameState.completedResearch.includes(r.id);
    const locked = r.requires && !gameState.completedResearch.includes(r.requires);
    const afford = getInv('research_points') >= r.cost_rp;

    const card = document.createElement('div');
    card.className = 'res-card' + (done ? ' done' : locked ? ' locked' : afford ? ' affordable' : '');
    card.innerHTML = `<div class="res-card-name">${done ? '✓ ' : ''}${r.name}</div>
      <div class="res-card-desc">${r.description}</div>
      <div class="res-card-cost">${done ? 'Completed' : r.cost_rp + ' RP'}</div>`;
    if (!done && !locked) {
      card.onclick = () => {
        if (buyResearch(r.id)) { toast('Researched: ' + r.name); buildResearchPanel(); }
        else toast('Not enough RP');
      };
    }
    list.appendChild(card);
  }
}

function buildStatsPanel() {
  const el = document.getElementById('stats-content');
  const p  = gameState.power;
  const mined = Object.entries(gameState.totalMined).map(([k,v])=>`${RES_BY_ID[k]?.name||k}: ${fmtNum(v)}`).join('<br>') || '—';
  const inv   = Object.entries(gameState.inventory).filter(([,v])=>v>0).map(([k,v])=>`${RES_BY_ID[k]?.name||k}: ${fmtNum(v)}`).join('<br>') || '—';
  el.innerHTML = `
    <b>Power</b><br>Generated: ${fmtNum(p.generated)} MW<br>Consumed: ${fmtNum(p.consumed)} MW<br><br>
    <b>Total Mined</b><br>${mined}<br><br>
    <b>Inventory</b><br>${inv}<br><br>
    <b>Time Played</b><br>${fmtTime(gameState.timePlayed)}<br><br>
    <b>Achievements</b><br>${gameState.achievements.length} / ${ACHIEVEMENTS.length}<br><br>
    <b>Research</b><br>${gameState.completedResearch.length} / ${RESEARCH.length} done<br><br>
    <button onclick="if(confirm('Reset everything?')) { resetGame(); location.reload(); }" style="color:var(--accent);border-color:var(--accent);padding:6px 12px;margin-top:8px">Reset Game</button>
  `;
}

function updateNavHint() {
  const hint = document.getElementById('build-hint');
  if (!hint) return;
  const tools = [
    { icon: selectedTool === 'remove' ? '🗑' : (selectedTool ? BUILDINGS.find(b=>b.tileType===selectedTool.tileType)?.icon || '?' : '👆'), label: selectedTool === 'remove' ? 'REMOVE' : (selectedTool ? BUILDINGS.find(b=>b.tileType===selectedTool.tileType)?.name || '?' : 'SELECT'), active: !!selectedTool },
    { icon: '↔', label: 'SCROLL', active: !selectedTool },
  ];
  hint.innerHTML = tools.map(t=>
    `<div class="hint-tool ${t.active?'active':''}">
       <span class="hint-tool-icon">${t.icon}</span>
       <span>${t.label}</span>
     </div>`
  ).join('');
}

// ── Utility ──────────────────────────────────────────────────────────────────
function fmtNum(n) {
  n = Math.floor(n);
  if (n >= 1e6) return (n/1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n/1e3).toFixed(1) + 'K';
  return n.toString();
}
function fmtTime(s) {
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60);
  return h + 'h ' + m + 'm';
}
function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 2100);
}

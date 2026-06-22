/* NanoFactory — ui.js (grid renderer + mobile-first interaction) */

// ── Canvas ────────────────────────────────────────────────────────────
let canvas, ctx;
let camX = 0, camY = 0;

// Interaction state
let mode = 'scroll';  // 'scroll' | 'build' | 'remove'
let selectedTool = null;  // { tileType, id } or null

// Drag / pan
let pointerDown = false;
let dragStartX = 0, dragStartY = 0;
let camStartX  = 0, camStartY  = 0;
let hasMoved   = false;
const DRAG_THRESHOLD = 6;

// Belt paint (drag-to-place)
let isPainting = false;
let lastPaintTile = null;

// Multi-touch pinch
let pinchActive = false;
let pinchIds    = [];
let pinchStartDist = 0;

// Tile colours
const TILE_BG = {
  [T.EMPTY]:         '#0d0d14',
  [T.PATCH_IRON]:    '#181e28',
  [T.PATCH_COPPER]:  '#201610',
  [T.PATCH_COAL]:    '#141414',
  [T.BELT_R]:        '#161828',
  [T.BELT_L]:        '#161828',
  [T.BELT_U]:        '#161828',
  [T.BELT_D]:        '#161828',
  [T.MINER]:         '#0d1c0d',
  [T.SMELTER]:       '#1e1008',
  [T.WIRE_MILL]:     '#101828',
  [T.FORGE]:         '#1c0e0e',
  [T.ASSEMBLY]:      '#0e1c0e',
  [T.BATTERY_PLANT]: '#1a1a08',
  [T.CELL_FACTORY]:  '#1c0e12',
  [T.LAB]:           '#0e1c1c',
  [T.COAL_GEN]:      '#141418',
  [T.SOLAR]:         '#101c10',
  [T.NUCLEAR]:       '#0e1c0e',
  [T.CHEST]:         '#181410',
};

// Icon id per tile type
const TILE_ICON = {
  [T.PATCH_IRON]:    'patch_iron',
  [T.PATCH_COPPER]:  'patch_copper',
  [T.PATCH_COAL]:    'patch_coal',
  [T.BELT_R]:        'belt_r',
  [T.BELT_L]:        'belt_l',
  [T.BELT_U]:        'belt_u',
  [T.BELT_D]:        'belt_d',
  [T.MINER]:         'miner',
  [T.SMELTER]:       'smelter',
  [T.WIRE_MILL]:     'wire_mill',
  [T.FORGE]:         'forge',
  [T.ASSEMBLY]:      'assembly',
  [T.BATTERY_PLANT]: 'battery_plant',
  [T.CELL_FACTORY]:  'cell_factory',
  [T.LAB]:           'lab',
  [T.COAL_GEN]:      'coal_gen',
  [T.SOLAR]:         'solar',
  [T.NUCLEAR]:       'nuclear',
  [T.CHEST]:         'chest',
};

// Offscreen image cache for SVG icons
const iconCache = {};
function getIconImage(iconId, size) {
  const key = iconId + '_' + size;
  if (iconCache[key]) return iconCache[key];
  const svg  = ICONS[iconId];
  if (!svg) return null;
  const sized = svg.replace('<svg ', `<svg width="${size}" height="${size}" `);
  const blob  = new Blob([sized], { type: 'image/svg+xml' });
  const url   = URL.createObjectURL(blob);
  const img   = new Image();
  img.src = url;
  iconCache[key] = img;
  return img;
}

function initCanvas() {
  canvas = document.getElementById('grid-canvas');
  ctx    = canvas.getContext('2d');
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Pointer events — unified for mouse + touch
  canvas.addEventListener('pointerdown',  onPointerDown,  { passive: false });
  canvas.addEventListener('pointermove',  onPointerMove,  { passive: false });
  canvas.addEventListener('pointerup',    onPointerUp,    { passive: false });
  canvas.addEventListener('pointercancel',onPointerUp,    { passive: false });
  canvas.addEventListener('contextmenu',  e => e.preventDefault());

  // Secondary pointer for pinch detection
  canvas.addEventListener('touchstart',  onTouchStart, { passive: false });
  canvas.addEventListener('touchmove',   onTouchMove,  { passive: false });
  canvas.addEventListener('touchend',    onTouchEnd,   { passive: false });
  canvas.style.touchAction = 'none';
}

function resizeCanvas() {
  const wrap  = document.getElementById('grid-wrap');
  const r     = wrap.getBoundingClientRect();
  canvas.width  = r.width;
  canvas.height = r.height;
}

// ── Helpers ───────────────────────────────────────────────────────────
function screenToTile(sx, sy) {
  return {
    x: Math.floor((sx + camX) / TILE_SIZE),
    y: Math.floor((sy + camY) / TILE_SIZE),
  };
}
function tileToScreen(tx, ty) {
  return { sx: tx * TILE_SIZE - camX, sy: ty * TILE_SIZE - camY };
}
function clampCamera() {
  const wrap = document.getElementById('grid-wrap');
  const maxX = Math.max(0, GRID_COLS * TILE_SIZE - wrap.clientWidth);
  const maxY = Math.max(0, GRID_ROWS * TILE_SIZE - wrap.clientHeight);
  camX = Math.max(0, Math.min(camX, maxX));
  camY = Math.max(0, Math.min(camY, maxY));
}

// ── Render ────────────────────────────────────────────────────────────
let hoverTile = null;

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const startX = Math.floor(camX / TILE_SIZE);
  const startY = Math.floor(camY / TILE_SIZE);
  const endX   = Math.min(GRID_COLS, startX + Math.ceil(canvas.width  / TILE_SIZE) + 2);
  const endY   = Math.min(GRID_ROWS, startY + Math.ceil(canvas.height / TILE_SIZE) + 2);
  const iconSz = Math.floor(TILE_SIZE * 0.6);
  const iconOff = Math.floor((TILE_SIZE - iconSz) / 2);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const sx = x * TILE_SIZE - camX;
      const sy = y * TILE_SIZE - camY;
      const t  = getTile(x, y);

      // Tile BG
      ctx.fillStyle = TILE_BG[t] || '#0d0d14';
      ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);

      // Grid line
      ctx.strokeStyle = '#18182a';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx + 0.5, sy + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);

      // Icon
      const iconId = TILE_ICON[t];
      if (iconId) {
        const img = getIconImage(iconId, iconSz);
        if (img && img.complete) {
          ctx.drawImage(img, sx + iconOff, sy + iconOff, iconSz, iconSz);
        }
      }

      // Belt motion stripe
      if (BELT_SET.has(t)) drawBeltStripe(sx, sy, t);

      // Item dot on belt
      const item = getItem(x, y);
      if (item) {
        ctx.fillStyle = ITEM_COLOR[item] || '#fff';
        ctx.beginPath();
        ctx.arc(sx + TILE_SIZE/2, sy + TILE_SIZE/2, TILE_SIZE * 0.13, 0, Math.PI*2);
        ctx.fill();
      }

      // Progress bar
      const meta = getMeta(x, y);
      if (meta && meta.progress > 0) {
        ctx.fillStyle = 'rgba(79,142,247,0.18)';
        ctx.fillRect(sx, sy + TILE_SIZE - 5, TILE_SIZE, 5);
        ctx.fillStyle = '#4f8ef7';
        ctx.fillRect(sx, sy + TILE_SIZE - 5, TILE_SIZE * meta.progress, 4);
      }
    }
  }

  // Hover highlight
  if (hoverTile) {
    const { sx, sy } = tileToScreen(hoverTile.x, hoverTile.y);
    ctx.strokeStyle = mode === 'remove' ? '#e94560' : (mode === 'build' ? '#4f8ef7' : '#ffffff22');
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, TILE_SIZE - 2, TILE_SIZE - 2);
  }
}

function drawBeltStripe(sx, sy, t) {
  const cx = sx + TILE_SIZE/2, cy = sy + TILE_SIZE/2;
  const s  = TILE_SIZE * 0.2;
  ctx.save();
  ctx.translate(cx, cy);
  const angles = { [T.BELT_R]:0, [T.BELT_D]:Math.PI/2, [T.BELT_L]:Math.PI, [T.BELT_U]:-Math.PI/2 };
  ctx.rotate(angles[t] || 0);
  ctx.fillStyle = 'rgba(79,142,247,0.28)';
  ctx.beginPath();
  ctx.moveTo(s, 0); ctx.lineTo(-s*0.7, -s*0.65); ctx.lineTo(-s*0.7, s*0.65);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// ── Pointer input ─────────────────────────────────────────────────────
let activePointerId = null;

function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function onPointerDown(e) {
  if (pinchActive) return;
  if (activePointerId !== null) return;
  activePointerId = e.pointerId;
  canvas.setPointerCapture(e.pointerId);

  const { x, y } = canvasPos(e);
  dragStartX = x; dragStartY = y;
  camStartX  = camX; camStartY = camY;
  hasMoved   = false;
  pointerDown = true;

  // In build/remove mode, start painting immediately on belts
  if (mode === 'build' && selectedTool && BELT_SET.has(selectedTool.tileType)) {
    isPainting = true;
    const tile = screenToTile(x, y);
    lastPaintTile = null;
    doPaint(tile);
  } else if (mode === 'remove') {
    isPainting = true;
    const tile = screenToTile(x, y);
    doRemove(tile);
  }
}

function onPointerMove(e) {
  if (!pointerDown || pinchActive) return;
  if (e.pointerId !== activePointerId) return;
  e.preventDefault();

  const { x, y } = canvasPos(e);
  const dx = x - dragStartX, dy = y - dragStartY;
  if (!hasMoved && Math.hypot(dx, dy) > DRAG_THRESHOLD) hasMoved = true;

  const tile = screenToTile(x, y);
  hoverTile = tile;

  if (isPainting) {
    if (mode === 'build' && selectedTool) {
      doPaint(tile);
    } else if (mode === 'remove') {
      doRemove(tile);
    }
  } else if (mode === 'scroll') {
    camX = camStartX - dx;
    camY = camStartY - dy;
    clampCamera();
  } else if (hasMoved && mode === 'build' && !BELT_SET.has(selectedTool?.tileType)) {
    // Non-belt build mode: panning still works
    camX = camStartX - dx;
    camY = camStartY - dy;
    clampCamera();
  }
}

function onPointerUp(e) {
  if (e.pointerId !== activePointerId) return;
  activePointerId = null;
  pointerDown = false;
  isPainting  = false;
  lastPaintTile = null;

  if (!hasMoved) {
    const { x, y } = canvasPos(e);
    handleTap(x, y);
  }
  hasMoved = false;
}

// Pinch: use raw touch events (pointerdown doesn't reliably give us two pointers on mobile)
let pinchTouch1 = null, pinchTouch2 = null;
function onTouchStart(e) {
  if (e.touches.length === 2) {
    pinchActive = true;
    isPainting  = false;
    pointerDown = false;
    pinchTouch1 = e.touches[0];
    pinchTouch2 = e.touches[1];
    pinchStartDist = Math.hypot(
      pinchTouch1.clientX - pinchTouch2.clientX,
      pinchTouch1.clientY - pinchTouch2.clientY,
    );
  }
}
function onTouchMove(e) {
  if (!pinchActive || e.touches.length < 2) return;
  e.preventDefault();
  // Two-finger pan
  const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
  const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
  const prevMidX = (pinchTouch1.clientX + pinchTouch2.clientX) / 2;
  const prevMidY = (pinchTouch1.clientY + pinchTouch2.clientY) / 2;
  camX -= midX - prevMidX;
  camY -= midY - prevMidY;
  clampCamera();
  pinchTouch1 = e.touches[0];
  pinchTouch2 = e.touches[1];
}
function onTouchEnd(e) {
  if (e.touches.length < 2) pinchActive = false;
}

function doPaint(tile) {
  if (!tile || (lastPaintTile && lastPaintTile.x === tile.x && lastPaintTile.y === tile.y)) return;
  lastPaintTile = tile;
  if (mode === 'build' && selectedTool) placeTile(tile.x, tile.y, selectedTool.tileType);
}
function doRemove(tile) {
  if (tile) removeTile(tile.x, tile.y);
}

// ── Tap ────────────────────────────────────────────────────────────────
function handleTap(sx, sy) {
  const tile = screenToTile(sx, sy);
  if (tile.x < 0 || tile.x >= GRID_COLS || tile.y < 0 || tile.y >= GRID_ROWS) return;

  hideTilePopup();

  if (mode === 'remove') {
    removeTile(tile.x, tile.y);
    return;
  }
  if (mode === 'build' && selectedTool) {
    const ok = placeTile(tile.x, tile.y, selectedTool.tileType);
    if (!ok) toast('Cannot place here');
    return;
  }
  // Scroll mode: show info
  showTilePopup(tile.x, tile.y, sx, sy);
}

// ── Tile popup ─────────────────────────────────────────────────────────
function showTilePopup(tx, ty, sx, sy) {
  const t    = getTile(tx, ty);
  if (t === T.EMPTY) return;

  const b    = BUILDING_BY_TYPE[t];
  const meta = getMeta(tx, ty);
  const popup = document.getElementById('tile-popup');
  const title  = document.getElementById('tile-popup-title');
  const body   = document.getElementById('tile-popup-body');
  const acts   = document.getElementById('tile-popup-actions');

  // Title
  title.innerHTML = b ? (svgIcon(b.icon, 14) + ' ' + b.name) : '';

  let html = '';

  // Ore patches
  if (PATCH_SET.has(t)) {
    const rid = PATCH_RES[t];
    html += `<div>${svgIcon(rid, 12)} ${RES_BY_ID[rid]?.name} deposit</div>`;
    html += `<div style="color:var(--muted);font-size:10px;margin-top:4px">Place a Miner on this patch to extract ore.</div>`;
  }

  // Belts
  if (BELT_SET.has(t)) {
    const item = getItem(tx, ty);
    html += `<div>Direction: ${['','Right','Left','Up','Down'][t-T.BELT_R+1] || ''}</div>`;
    html += item
      ? `<div>Carrying: ${svgIcon(item, 12)} <b>${RES_BY_ID[item]?.name || item}</b></div>`
      : `<div style="color:var(--muted)">Empty</div>`;
  }

  // Miner
  if (t === T.MINER && meta) {
    const resId = PATCH_RES[meta.patch];
    html += `<div>Mining: ${svgIcon(resId, 12)} <b>${RES_BY_ID[resId]?.name || '?'}</b></div>`;
    html += `<div>Progress: <b>${Math.floor(meta.progress * 100)}%</b></div>`;
  }

  // Processing machines
  if (b && b.category === 'processing' && b.input) {
    html += buildRecipeHtml(b, meta);
  }

  // Power
  if (b && b.category === 'power') {
    html += `<div style="margin-top:4px">Generates: ${svgIcon('power', 12)} <b>${b.powerOut} MW</b></div>`;
    if (b.input) {
      html += `<div>Fuel: `;
      html += Object.entries(b.input).map(([rid])=> svgIcon(rid,12) + ' ' + (RES_BY_ID[rid]?.name||rid)).join(', ');
      html += `</div>`;
    }
    if (meta) {
      const fuelRid = b.input ? Object.keys(b.input)[0] : null;
      if (fuelRid) html += `<div>Fuel buffer: <b>${Math.floor(meta.inputBuffer[fuelRid]||0)}</b></div>`;
    }
  }

  // Chest
  if (t === T.CHEST && meta) {
    const contents = Object.entries(meta.inputBuffer||{}).filter(([,v])=>v>0);
    if (contents.length) {
      html += `<div style="margin-top:4px">Contents:</div>`;
      contents.forEach(([k,v]) => {
        html += `<div>${svgIcon(k,12)} ${RES_BY_ID[k]?.name||k}: <b>${Math.floor(v)}</b></div>`;
      });
    } else {
      html += `<div style="color:var(--muted)">Empty</div>`;
    }
  }

  body.innerHTML = html;

  // Actions
  acts.innerHTML = '';
  if (!PATCH_SET.has(t)) {
    const del = document.createElement('button');
    del.className = 'btn-danger';
    del.innerHTML = svgIcon('remove', 12) + ' Remove';
    del.onclick = () => { removeTile(tx, ty); hideTilePopup(); };
    acts.appendChild(del);
  }
  const cl = document.createElement('button');
  cl.textContent = 'Close';
  cl.onclick = hideTilePopup;
  acts.appendChild(cl);

  popup.classList.remove('hidden');

  // Position
  const wrap = document.getElementById('grid-wrap');
  const wr   = wrap.getBoundingClientRect();
  const pw = 220, ph = 200;
  let px = sx + 12, py = sy + 12;
  if (px + pw > wrap.clientWidth)  px = Math.max(4, sx - pw - 4);
  if (py + ph > wrap.clientHeight) py = Math.max(4, sy - ph - 4);
  popup.style.left = (wr.left + px) + 'px';
  popup.style.top  = (wr.top  + py) + 'px';
}

function buildRecipeHtml(b, meta) {
  let html = '<div class="popup-recipe">';
  html += '<span class="popup-recipe-label">IN</span> ';
  html += Object.entries(b.input).map(([rid, amt]) =>
    `<span class="popup-recipe-item">${svgIcon(rid,14)}<span>${amt} ${RES_BY_ID[rid]?.name||rid}</span></span>`
  ).join('<span class="recipe-arrow"> + </span>');
  html += ' <span class="recipe-arrow"> → </span> ';
  html += Object.entries(b.output).filter(([k])=>k!=='mw').map(([rid, amt]) =>
    `<span class="popup-recipe-item">${svgIcon(rid,14)}<span>${amt} ${RES_BY_ID[rid]?.name||rid}</span></span>`
  ).join(' ');
  html += '</div>';
  if (meta) {
    html += `<div>Progress: <b>${Math.floor(meta.progress*100)}%</b></div>`;
    const inBuf = Object.entries(meta.inputBuffer||{}).filter(([,v])=>v>0);
    if (inBuf.length) html += '<div>Buffer: ' + inBuf.map(([k,v])=>`${svgIcon(k,12)} ${Math.floor(v)}`).join(' ') + '</div>';
    if (meta.outputBuffer) html += `<div>Output ready: ${svgIcon(meta.outputBuffer.id,12)} ${RES_BY_ID[meta.outputBuffer.id]?.name}</div>`;
  }
  return html;
}

function hideTilePopup() {
  document.getElementById('tile-popup').classList.add('hidden');
}

// ── Mode switching ─────────────────────────────────────────────────────
function setMode(m, tool) {
  mode = m;
  selectedTool = tool || null;
  buildNavBar();
  if (m !== 'scroll') {
    showModeBadge(m === 'remove' ? 'REMOVE MODE' : 'BUILD: ' + (tool?.name || ''));
  } else {
    showModeBadge('SCROLL MODE');
  }
  buildBuildPanel();
}

let badgeTimer = null;
function showModeBadge(text) {
  const el = document.getElementById('mode-badge');
  el.textContent = text;
  el.classList.add('visible');
  clearTimeout(badgeTimer);
  badgeTimer = setTimeout(() => el.classList.remove('visible'), 1800);
}

// ── HUD ────────────────────────────────────────────────────────────────
function updateHUD() {
  const p = gameState.power;
  const pwEl = document.getElementById('hud-power');
  pwEl.innerHTML = svgIcon('power', 12) + ' ' + fmtNum(p.generated) + '/' + fmtNum(p.consumed) + ' MW';
  buildResBar();
}

function buildResBar() {
  const bar = document.getElementById('res-bar');
  bar.innerHTML = '';
  for (const r of RESOURCES) {
    const amt = getInv(r.id);
    if (amt === 0 && r.id !== 'iron_ore' && r.id !== 'copper_ore' && r.id !== 'coal') continue;
    const chip = document.createElement('div');
    chip.className = 'res-chip';
    chip.innerHTML = svgIcon(r.id, 14) +
      `<span class="res-chip-val">${fmtNum(amt)}</span>`;
    bar.appendChild(chip);
  }
}

// ── Build Panel ────────────────────────────────────────────────────────
function buildBuildPanel() {
  const toolBtns = document.getElementById('tool-buttons');
  const bldBtns  = document.getElementById('building-buttons');
  toolBtns.innerHTML = bldBtns.innerHTML = '';

  // Remove tool
  const rem = document.createElement('button');
  rem.className = 'build-btn' + (mode === 'remove' ? ' active' : '');
  rem.innerHTML = `${svgIcon('remove',22)}<span class="build-btn-name">Remove</span>`;
  rem.onclick = () => setMode(mode === 'remove' ? 'build' : 'remove');
  toolBtns.appendChild(rem);

  for (const b of BUILDINGS) {
    const isLocked  = b.unlockedByResearch && !gameState.completedResearch.includes(b.unlockedByResearch);
    const isActive  = mode === 'build' && selectedTool?.tileType === b.tileType;

    const btn = document.createElement('button');
    btn.className = 'build-btn' + (isActive ? ' active' : '') + (isLocked ? ' locked' : '');

    let inner = `${svgIcon(b.icon, 22)}<span class="build-btn-name">${b.name}</span>`;

    // Recipe preview
    if (b.input || b.output) {
      inner += '<div class="recipe-row">';
      if (b.input) {
        inner += Object.keys(b.input).map(rid => svgIcon(rid, 12)).join('');
        inner += '<span class="recipe-arrow">→</span>';
      }
      if (b.output) {
        inner += Object.keys(b.output).filter(k=>k!=='mw').map(rid => svgIcon(rid, 12)).join('');
        if (b.output.mw) inner += svgIcon('power', 12);
      }
      inner += '</div>';
    }

    // Placement cost
    if (b.placeCost) {
      const parts = Object.entries(b.placeCost).map(([rid, amt]) => {
        const have = getInv(rid);
        const cls  = have >= amt ? 'cost-ok' : 'cost-bad';
        return `<span class="${cls}">${svgIcon(rid,10)}${fmtNum(amt)}</span>`;
      });
      inner += `<div class="cost-tag" style="display:flex;gap:3px;align-items:center">${parts.join(' ')}</div>`;
    }

    if (isLocked) inner += `<span class="badge-locked">${svgIcon('lock', 10)}</span>`;

    btn.innerHTML = inner;
    btn.onclick = () => {
      if (isLocked) { toast('Needs research first'); return; }
      if (isActive) { setMode('scroll'); } else { setMode('build', b); }
    };

    const container = (b.category === 'belt') ? toolBtns : bldBtns;
    container.appendChild(btn);
  }
}

// ── Research Panel ─────────────────────────────────────────────────────
function buildResearchPanel() {
  const list = document.getElementById('research-list');
  list.innerHTML = '';
  const rpEl = document.getElementById('rp-bar');
  rpEl.innerHTML = svgIcon('research_points', 14) + ' ' + fmtNum(getInv('research_points')) + ' RP available';

  for (const r of RESEARCH) {
    const done   = gameState.completedResearch.includes(r.id);
    const locked = r.requires && !gameState.completedResearch.includes(r.requires);
    const afford = getInv('research_points') >= r.cost_rp;

    const card = document.createElement('div');
    card.className = 'res-card' + (done ? ' done' : locked ? ' locked' : afford ? ' affordable' : '');
    card.innerHTML = `
      <div class="res-card-name">${done ? svgIcon('check',12) + ' ' : ''}${r.name}</div>
      <div class="res-card-desc">${r.description}</div>
      <div class="res-card-cost">${done ? 'Completed' : svgIcon('research_points',11) + ' ' + r.cost_rp + ' RP'}</div>
      ${locked ? '<div style="font-size:9px;color:var(--muted);margin-top:3px">' + svgIcon('lock',10) + ' Requires: ' + r.requires + '</div>' : ''}
    `;
    if (!done && !locked) {
      card.onclick = () => {
        if (buyResearch(r.id)) { toast('Researched: ' + r.name); buildResearchPanel(); buildBuildPanel(); }
        else toast('Not enough RP');
      };
    }
    list.appendChild(card);
  }
}

// ── Stats Panel ────────────────────────────────────────────────────────
function buildStatsPanel() {
  const el = document.getElementById('stats-content');
  const p  = gameState.power;
  const mined = Object.entries(gameState.totalMined)
    .filter(([,v])=>v>0)
    .map(([k,v])=>`${svgIcon(k,12)} ${RES_BY_ID[k]?.name||k}: <b>${fmtNum(v)}</b>`)
    .join('<br>') || '—';
  const inv = Object.entries(gameState.inventory)
    .filter(([,v])=>v>0)
    .map(([k,v])=>`${svgIcon(k,12)} ${RES_BY_ID[k]?.name||k}: <b>${fmtNum(v)}</b>`)
    .join('<br>') || '—';
  const ach = ACHIEVEMENTS.map(a =>
    `${gameState.achievements.includes(a.id) ? svgIcon('check',12) : svgIcon('lock',12)} ${a.name}: <span style="color:var(--muted)">${a.desc}</span>`
  ).join('<br>');

  el.innerHTML = `
    <b>Power</b><br>
    ${svgIcon('power',12)} Generated: <b>${fmtNum(p.generated)} MW</b><br>
    Consumed: <b>${fmtNum(p.consumed)} MW</b><br><br>
    <b>Total Mined</b><br>${mined}<br><br>
    <b>Inventory</b><br>${inv}<br><br>
    <b>Time Played</b><br>${fmtTime(gameState.timePlayed)}<br><br>
    <b>Achievements</b><br>${ach}<br><br>
    <b>Research</b><br>${gameState.completedResearch.length} / ${RESEARCH.length} completed<br><br>
    <button onclick="if(confirm('Reset all progress?')){resetGame();location.reload()}" style="color:var(--accent);border:1px solid var(--accent);padding:8px 16px;border-radius:6px;margin-top:6px;font-size:11px">Reset Game</button>
  `;
}

// ── Nav Bar ────────────────────────────────────────────────────────────
function buildNavBar() {
  const nav = document.getElementById('bottom-nav');
  if (!nav) return;
  const scrollActive = mode === 'scroll';
  const buildActive  = mode === 'build' || mode === 'remove';

  nav.innerHTML = '';

  const btns = [
    { id:'nav-scroll', icon:'scroll', label:'SCROLL', action: () => setMode('scroll'), active: scrollActive, cls:'mode-scroll' },
    { id:'nav-build',  icon:'build',  label:'BUILD',  action: () => togglePanel('build-panel'), active: buildActive, cls:'' },
    { id:'nav-res',    icon:'research',label:'RESEARCH',action: () => { buildResearchPanel(); togglePanel('research-panel'); }, active: false, cls:'' },
    { id:'nav-stats',  icon:'stats',  label:'STATS',  action: () => { buildStatsPanel(); togglePanel('stats-panel'); }, active: false, cls:'' },
    { id:'nav-save',   icon:'save',   label:'SAVE',   action: saveGame, active: false, cls:'' },
  ];

  for (const b of btns) {
    const btn = document.createElement('button');
    btn.id = b.id;
    btn.className = 'nav-btn ' + b.cls + (b.active ? ' active' : '');
    btn.innerHTML = svgIcon(b.icon, 22) + '<span>' + b.label + '</span>';
    btn.onclick = b.action;
    nav.appendChild(btn);
  }
}

// ── Utility ────────────────────────────────────────────────────────────
function fmtNum(n) {
  n = Math.floor(n || 0);
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
  el.className = 'toast'; el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 2100);
}

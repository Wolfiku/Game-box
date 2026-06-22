/* NanoFactory — ui.js */

// ── Canvas & camera ──────────────────────────────────────────────────────────
let canvas, ctx;
let camX = 0, camY = 0;

// Interaction
let iMode = 'scroll'; // 'scroll' | 'build' | 'remove'
let selTool = null;

// Drag state
let pDown = false, pId = null;
let dsx = 0, dsy = 0, csx = 0, csy = 0;
let moved = false;
const DRAG_TH = 6;

// Painting (belt drag)
let painting = false, lastPT = null;

// Pinch
let pinching = false, pt1 = null, pt2 = null;

// Icon image cache
const icCache = {};
function icImg(id, sz) {
  const k = id + sz;
  if (icCache[k]) return icCache[k];
  const svg = ICONS[id]; if (!svg) return null;
  const s = svg.replace('<svg ', `<svg width="${sz}" height="${sz}" `);
  const img = new Image();
  img.src = 'data:image/svg+xml;base64,' + btoa(s);
  return (icCache[k] = img);
}

// Tile background colours
const TBGC = {
  [T.EMPTY]:'#0d0d14',[T.PATCH_IRON]:'#181e28',[T.PATCH_COPPER]:'#1e1208',[T.PATCH_COAL]:'#131313',
  [T.BELT_R]:'#14162a',[T.BELT_L]:'#14162a',[T.BELT_U]:'#14162a',[T.BELT_D]:'#14162a',
  [T.MINER]:'#0d1c0d',[T.SMELTER]:'#1e1008',[T.WIRE_MILL]:'#0e1828',
  [T.FORGE]:'#1c0e0e',[T.ASSEMBLY]:'#0e1c0e',[T.BATTERY_PLANT]:'#1a1a08',
  [T.CELL_FACTORY]:'#1c0e12',[T.LAB]:'#0e1c1c',[T.COAL_GEN]:'#141418',
  [T.SOLAR]:'#101c10',[T.NUCLEAR]:'#0e1c0e',[T.CHEST]:'#181410',
};
const TICN = {
  [T.PATCH_IRON]:'patch_iron',[T.PATCH_COPPER]:'patch_copper',[T.PATCH_COAL]:'patch_coal',
  [T.BELT_R]:'belt_r',[T.BELT_L]:'belt_l',[T.BELT_U]:'belt_u',[T.BELT_D]:'belt_d',
  [T.MINER]:'miner',[T.SMELTER]:'smelter',[T.WIRE_MILL]:'wire_mill',
  [T.FORGE]:'forge',[T.ASSEMBLY]:'assembly',[T.BATTERY_PLANT]:'battery_plant',
  [T.CELL_FACTORY]:'cell_factory',[T.LAB]:'lab',[T.COAL_GEN]:'coal_gen',
  [T.SOLAR]:'solar',[T.NUCLEAR]:'nuclear',[T.CHEST]:'chest',
};

function initCanvas() {
  canvas = document.getElementById('grid-canvas');
  ctx = canvas.getContext('2d');
  resizeCv();
  window.addEventListener('resize', resizeCv);
  canvas.addEventListener('pointerdown', onPD, {passive:false});
  canvas.addEventListener('pointermove', onPM, {passive:false});
  canvas.addEventListener('pointerup',   onPU, {passive:false});
  canvas.addEventListener('pointercancel', onPU, {passive:false});
  canvas.addEventListener('touchstart', onTS, {passive:false});
  canvas.addEventListener('touchmove',  onTM, {passive:false});
  canvas.addEventListener('touchend',   onTE, {passive:false});
  canvas.addEventListener('contextmenu', e => e.preventDefault());
}
function resizeCv() {
  const r = document.getElementById('grid-wrap').getBoundingClientRect();
  canvas.width = r.width; canvas.height = r.height;
}

// ── Camera helpers ───────────────────────────────────────────────────────────
function clampCam() {
  const w = canvas.width, h = canvas.height;
  camX = Math.max(0, Math.min(camX, Math.max(0, GRID_COLS*TILE_SIZE - w)));
  camY = Math.max(0, Math.min(camY, Math.max(0, GRID_ROWS*TILE_SIZE - h)));
}
function cpos(e) {
  const r = canvas.getBoundingClientRect();
  return {x: e.clientX - r.left, y: e.clientY - r.top};
}
function s2t(sx, sy) {
  return {x: Math.floor((sx+camX)/TILE_SIZE), y: Math.floor((sy+camY)/TILE_SIZE)};
}

// ── Render ───────────────────────────────────────────────────────────────────
let hoverTile = null;
function render() {
  if (!ctx) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  const isz = Math.floor(TILE_SIZE * 0.58);
  const ioff = Math.floor((TILE_SIZE - isz)/2);
  const x0 = Math.floor(camX/TILE_SIZE), y0 = Math.floor(camY/TILE_SIZE);
  const x1 = Math.min(GRID_COLS, x0 + Math.ceil(canvas.width/TILE_SIZE) + 2);
  const y1 = Math.min(GRID_ROWS, y0 + Math.ceil(canvas.height/TILE_SIZE) + 2);

  for (let y=y0; y<y1; y++) {
    for (let x=x0; x<x1; x++) {
      const sx = x*TILE_SIZE - camX, sy = y*TILE_SIZE - camY;
      const t = getTile(x,y);
      ctx.fillStyle = TBGC[t] || '#0d0d14';
      ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#18182a'; ctx.lineWidth = 0.5;
      ctx.strokeRect(sx+.5, sy+.5, TILE_SIZE-1, TILE_SIZE-1);

      const iid = TICN[t];
      if (iid) {
        const img = icImg(iid, isz);
        if (img && img.complete) ctx.drawImage(img, sx+ioff, sy+ioff, isz, isz);
      }

      if (BELT_SET.has(t)) drawArrow(sx, sy, t);

      const item = getItem(x,y);
      if (item) {
        ctx.fillStyle = ITEM_COLOR[item] || '#fff';
        ctx.beginPath();
        ctx.arc(sx+TILE_SIZE/2, sy+TILE_SIZE/2, TILE_SIZE*.13, 0, Math.PI*2);
        ctx.fill();
      }

      const m = getMeta(x,y);
      if (m && m.progress > 0) {
        ctx.fillStyle = 'rgba(79,142,247,.15)';
        ctx.fillRect(sx, sy+TILE_SIZE-5, TILE_SIZE, 5);
        ctx.fillStyle = '#4f8ef7';
        ctx.fillRect(sx, sy+TILE_SIZE-5, TILE_SIZE*m.progress, 4);
      }
    }
  }

  if (hoverTile) {
    const sx = hoverTile.x*TILE_SIZE - camX, sy = hoverTile.y*TILE_SIZE - camY;
    ctx.strokeStyle = iMode==='remove' ? '#e94560' : '#4f8ef7';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx+1, sy+1, TILE_SIZE-2, TILE_SIZE-2);
  }
}

function drawArrow(sx,sy,t) {
  const cx=sx+TILE_SIZE/2, cy=sy+TILE_SIZE/2, s=TILE_SIZE*.18;
  ctx.save(); ctx.translate(cx,cy);
  const a={[T.BELT_R]:0,[T.BELT_D]:Math.PI/2,[T.BELT_L]:Math.PI,[T.BELT_U]:-Math.PI/2};
  ctx.rotate(a[t]||0);
  ctx.fillStyle='rgba(79,142,247,.3)';
  ctx.beginPath(); ctx.moveTo(s,0); ctx.lineTo(-s*.7,-s*.65); ctx.lineTo(-s*.7,s*.65);
  ctx.closePath(); ctx.fill(); ctx.restore();
}

// ── Pointer events ───────────────────────────────────────────────────────────
function onPD(e) {
  if (pinching || pId!==null) return;
  pId=e.pointerId; canvas.setPointerCapture(e.pointerId);
  const p=cpos(e);
  dsx=p.x; dsy=p.y; csx=camX; csy=camY; moved=false; pDown=true;
  if (iMode==='build' && selTool && BELT_SET.has(selTool.tileType)) {
    painting=true; lastPT=null; doPaint(s2t(p.x,p.y));
  } else if (iMode==='remove') {
    painting=true; doRemove(s2t(p.x,p.y));
  }
}
function onPM(e) {
  if (!pDown||pinching||e.pointerId!==pId) return;
  e.preventDefault();
  const p=cpos(e);
  const dx=p.x-dsx, dy=p.y-dsy;
  if (!moved && Math.hypot(dx,dy)>DRAG_TH) moved=true;
  hoverTile=s2t(p.x,p.y);
  if (painting) {
    if (iMode==='build'&&selTool) doPaint(s2t(p.x,p.y));
    else if (iMode==='remove') doRemove(s2t(p.x,p.y));
  } else if (iMode==='scroll'||(!BELT_SET.has(selTool?.tileType)&&moved)) {
    camX=csx-dx; camY=csy-dy; clampCam();
  }
}
function onPU(e) {
  if (e.pointerId!==pId) return;
  pId=null; pDown=false; painting=false; lastPT=null;
  if (!moved) { const p=cpos(e); handleTap(p.x,p.y); }
  moved=false;
}
function onTS(e) {
  if (e.touches.length===2) {
    pinching=true; pDown=false; painting=false;
    pt1=e.touches[0]; pt2=e.touches[1];
  }
}
function onTM(e) {
  if (!pinching||e.touches.length<2) return;
  e.preventDefault();
  const mx=(e.touches[0].clientX+e.touches[1].clientX)/2;
  const my=(e.touches[0].clientY+e.touches[1].clientY)/2;
  const ox=(pt1.clientX+pt2.clientX)/2, oy=(pt1.clientY+pt2.clientY)/2;
  camX-=mx-ox; camY-=my-oy; clampCam();
  pt1=e.touches[0]; pt2=e.touches[1];
}
function onTE(e) { if (e.touches.length<2) pinching=false; }

function doPaint(tile) {
  if (!tile||lastPT&&lastPT.x===tile.x&&lastPT.y===tile.y) return;
  lastPT=tile;
  if (iMode==='build'&&selTool) placeTile(tile.x,tile.y,selTool.tileType);
}
function doRemove(tile) { if (tile) removeTile(tile.x,tile.y); }

// ── Tap ──────────────────────────────────────────────────────────────────────
function handleTap(sx,sy) {
  const t=s2t(sx,sy);
  if (t.x<0||t.x>=GRID_COLS||t.y<0||t.y>=GRID_ROWS) return;
  hidePop();
  if (iMode==='remove') { removeTile(t.x,t.y); return; }
  if (iMode==='build'&&selTool) {
    if (!placeTile(t.x,t.y,selTool.tileType)) toast('Cannot place here');
    return;
  }
  showPop(t.x,t.y,sx,sy);
}

// ── Tile popup ───────────────────────────────────────────────────────────────
function showPop(tx,ty,sx,sy) {
  const t=getTile(tx,ty); if (t===T.EMPTY) return;
  const b=BUILDING_BY_TYPE[t];
  const m=getMeta(tx,ty);
  document.getElementById('tpt').innerHTML = b ? (svgIcon(b.icon,14)+' '+b.name) : 'Tile';
  let h='';
  if (PATCH_SET.has(t)) {
    const rid=PATCH_RES[t];
    h+=`${svgIcon(rid,12)} ${RES_BY_ID[rid]?.name} deposit<br><span style="color:var(--mut);font-size:10px">Place a Miner here to extract ore.</span>`;
  }
  if (BELT_SET.has(t)) {
    const item=getItem(tx,ty);
    h+=item?`Carrying: ${svgIcon(item,12)} <b>${RES_BY_ID[item]?.name||item}</b>`:`<span style="color:var(--mut)">Empty belt</span>`;
  }
  if (t===T.MINER&&m) {
    const rid=PATCH_RES[m.patch];
    h+=`Mining: ${svgIcon(rid,12)} <b>${RES_BY_ID[rid]?.name||'?'}</b><br>Progress: <b>${Math.floor(m.progress*100)}%</b>`;
  }
  if (b&&b.category==='processing'&&b.input) {
    h+='<div class="prec">';
    h+=Object.entries(b.input).map(([r,a])=>`${svgIcon(r,14)} ${a} ${RES_BY_ID[r]?.name||r}`).join(' + ');
    h+=' <span style="color:var(--mut)">&#8594;</span> ';
    h+=Object.entries(b.output).filter(([k])=>k!=='mw').map(([r,a])=>`${svgIcon(r,14)} ${a} ${RES_BY_ID[r]?.name||r}`).join(' ');
    h+='</div>';
    if (m) h+=`Progress: <b>${Math.floor(m.progress*100)}%</b>`;
  }
  if (b&&b.category==='power') {
    h+=`Output: ${svgIcon('power',12)} <b>${b.powerOut} MW</b>`;
    if (b.input) h+='<br>Fuel: '+Object.keys(b.input).map(r=>svgIcon(r,12)+' '+(RES_BY_ID[r]?.name||r)).join(', ');
  }
  document.getElementById('tpb').innerHTML=h;
  const ac=document.getElementById('tpa'); ac.innerHTML='';
  if (!PATCH_SET.has(t)) {
    const d=document.createElement('button');
    d.className='bdng'; d.innerHTML=svgIcon('remove',12)+' Remove';
    d.onclick=()=>{removeTile(tx,ty);hidePop();}; ac.appendChild(d);
  }
  const cl=document.createElement('button');
  cl.textContent='Close'; cl.onclick=hidePop; ac.appendChild(cl);
  const pop=document.getElementById('tile-popup');
  pop.classList.remove('hidden');
  const pw=230,ph=180;
  let px=sx+12,py=sy+12;
  const wr=document.getElementById('grid-wrap').getBoundingClientRect();
  if (px+pw>wr.right)  px=Math.max(wr.left+4, sx-pw-4);
  if (py+ph>wr.bottom) py=Math.max(wr.top+4,  sy-ph-4);
  pop.style.left=px+'px'; pop.style.top=py+'px';
}
function hidePop() { document.getElementById('tile-popup').classList.add('hidden'); }

// ── Mode ─────────────────────────────────────────────────────────────────────
let badgeT=null;
function setMode(m, tool) {
  iMode=m; selTool=tool||null;
  buildNav();
  const label=m==='remove'?'REMOVE MODE':m==='build'?'BUILD: '+(tool?.name||''):'SCROLL MODE';
  const el=document.getElementById('mode-badge');
  el.textContent=label; el.classList.add('show');
  clearTimeout(badgeT); badgeT=setTimeout(()=>el.classList.remove('show'),1600);
  buildBuildPanel();
}

// ── HUD ──────────────────────────────────────────────────────────────────────
function fmt(n) {
  n=Math.floor(n||0);
  if (n>=1e6) return (n/1e6).toFixed(1)+'M';
  if (n>=1e3) return (n/1e3).toFixed(1)+'K';
  return ''+n;
}
function fmtT(s) { return Math.floor(s/3600)+'h '+Math.floor((s%3600)/60)+'m'; }
function toast(msg) {
  const el=document.createElement('div');
  el.className='toast'; el.textContent=msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(()=>el.remove(),2100);
}
function updateHUD() {
  const p=gameState.power;
  document.getElementById('hud-power').innerHTML=svgIcon('power',12)+' '+fmt(p.generated)+'/'+fmt(p.consumed)+' MW';
  const bar=document.getElementById('res-bar'); bar.innerHTML='';
  for (const r of RESOURCES) {
    const a=getInv(r.id);
    if (!a&&r.id!=='iron_ore'&&r.id!=='copper_ore'&&r.id!=='coal') continue;
    const c=document.createElement('div'); c.className='rc';
    c.innerHTML=svgIcon(r.id,14)+'<b>'+fmt(a)+'</b>';
    bar.appendChild(c);
  }
}

// ── Build Panel ──────────────────────────────────────────────────────────────
function buildBuildPanel() {
  const tb=document.getElementById('tool-buttons');
  const bb=document.getElementById('building-buttons');
  if (!tb||!bb) return;
  tb.innerHTML=bb.innerHTML='';

  // Remove button
  const rb=document.createElement('button'); rb.className='bb'+(iMode==='remove'?' act':'');
  rb.innerHTML=svgIcon('remove',22)+'<span class="bb-name">Remove</span>';
  rb.onclick=()=>setMode(iMode==='remove'?'scroll':'remove');
  tb.appendChild(rb);

  for (const b of BUILDINGS) {
    const locked=b.unlockedByResearch&&!gameState.completedResearch.includes(b.unlockedByResearch);
    const active=iMode==='build'&&selTool?.tileType===b.tileType;
    const btn=document.createElement('button');
    btn.className='bb'+(active?' act':'')+(locked?' lck':'');
    let inner=`${svgIcon(b.icon,22)}<span class="bb-name">${b.name}</span>`;
    // Recipe row
    if (b.input||b.output) {
      inner+='<div class="rrow">';
      if (b.input) inner+=Object.keys(b.input).map(r=>svgIcon(r,11)).join('')+'<span class="rarr">&#8594;</span>';
      if (b.output) {
        inner+=Object.keys(b.output).filter(k=>k!=='mw').map(r=>svgIcon(r,11)).join('');
        if (b.output.mw) inner+=svgIcon('power',11);
      }
      inner+='</div>';
    }
    // Cost
    if (b.placeCost) {
      const parts=Object.entries(b.placeCost).map(([r,a])=>{
        const cls=getInv(r)>=a?'cok':'cbad';
        return `<span class="${cls}">${svgIcon(r,10)}${fmt(a)}</span>`;
      });
      inner+=`<div class="ctag">${parts.join('')}</div>`;
    }
    btn.innerHTML=inner;
    btn.onclick=()=>{
      if (locked){toast('Needs research');return;}
      setMode(active?'scroll':'build', b);
    };
    (b.category==='belt'?tb:bb).appendChild(btn);
  }
}

// ── Research Panel ───────────────────────────────────────────────────────────
function buildResPanel() {
  const list=document.getElementById('research-list'); if (!list) return;
  list.innerHTML='';
  document.getElementById('rp-bar').innerHTML=svgIcon('research_points',14)+' '+fmt(getInv('research_points'))+' RP';
  for (const r of RESEARCH) {
    const done=gameState.completedResearch.includes(r.id);
    const lck=r.requires&&!gameState.completedResearch.includes(r.requires);
    const aff=getInv('research_points')>=r.cost_rp;
    const c=document.createElement('div');
    c.className='rcard'+(done?' done':lck?' lck':aff?' aff':'');
    c.innerHTML=`<div class="rcard-n">${done?svgIcon('check',11)+' ':''}${r.name}</div>
      <div class="rcard-d">${r.description}</div>
      <div class="rcard-c">${done?'Done':svgIcon('research_points',10)+' '+r.cost_rp+' RP'}</div>
      ${lck?`<div style="font-size:9px;color:var(--mut);margin-top:2px">${svgIcon('lock',10)} Requires: ${r.requires}</div>`:''}`;
    if (!done&&!lck) c.onclick=()=>{
      if (buyResearch(r.id)){toast('Researched: '+r.name);buildResPanel();buildBuildPanel();}
      else toast('Not enough RP');
    };
    list.appendChild(c);
  }
}

// ── Stats Panel ──────────────────────────────────────────────────────────────
function buildStatsPanel() {
  const el=document.getElementById('stats-content'); if (!el) return;
  const p=gameState.power;
  const mined=Object.entries(gameState.totalMined).filter(([,v])=>v>0)
    .map(([k,v])=>`${svgIcon(k,12)} ${RES_BY_ID[k]?.name||k}: <b>${fmt(v)}</b>`).join('<br>')||'—';
  const inv=Object.entries(gameState.inventory).filter(([,v])=>v>0)
    .map(([k,v])=>`${svgIcon(k,12)} ${RES_BY_ID[k]?.name||k}: <b>${fmt(v)}</b>`).join('<br>')||'—';
  const ach=ACHIEVEMENTS.map(a=>`${gameState.achievements.includes(a.id)?svgIcon('check',11):svgIcon('lock',11)} ${a.name}: <span style="color:var(--mut)">${a.desc}</span>`).join('<br>');
  el.innerHTML=`
    <b>Power</b><br>${svgIcon('power',12)} ${fmt(p.generated)} MW / ${fmt(p.consumed)} MW consumed<br><br>
    <b>Mined</b><br>${mined}<br><br>
    <b>Inventory</b><br>${inv}<br><br>
    <b>Time</b><br>${fmtT(gameState.timePlayed)}<br><br>
    <b>Achievements</b><br>${ach}<br><br>
    <b>Research</b><br>${gameState.completedResearch.length}/${RESEARCH.length}<br><br>
    <button onclick="if(confirm('Reset?')){resetGame&&resetGame();location.reload()}" style="color:var(--acc);border:1px solid var(--acc);padding:8px 16px;border-radius:6px;font-size:11px">Reset Game</button>`;
}

// ── Nav Bar ──────────────────────────────────────────────────────────────────
function buildNav() {
  const nav=document.getElementById('bottom-nav'); if (!nav) return;
  nav.innerHTML='';
  const scrollAct=iMode==='scroll';
  const buildAct=iMode==='build'||iMode==='remove';
  [
    {icon:'scroll', label:'SCROLL', cls:scrollAct?'act-blu':'', fn:()=>setMode('scroll')},
    {icon:'build',  label:'BUILD',  cls:buildAct?'act':'',      fn:()=>togglePanel('build-panel')},
    {icon:'research',label:'LAB',   cls:'',                      fn:()=>{buildResPanel();togglePanel('research-panel');}},
    {icon:'stats',  label:'STATS',  cls:'',                      fn:()=>{buildStatsPanel();togglePanel('stats-panel');}},
    {icon:'save',   label:'SAVE',   cls:'',                      fn:()=>{saveGame();toast('Saved');}},
  ].forEach(b=>{
    const btn=document.createElement('button');
    btn.className='nb '+b.cls;
    btn.innerHTML=svgIcon(b.icon,22)+'<span>'+b.label+'</span>';
    btn.onclick=b.fn; nav.appendChild(btn);
  });
}

function togglePanel(id) {
  const ids=['build-panel','research-panel','stats-panel'];
  const el=document.getElementById(id);
  const open=!el.classList.contains('hidden');
  ids.forEach(p=>document.getElementById(p).classList.add('hidden'));
  document.getElementById('bd-backdrop')?.remove();
  if (open) return;
  el.classList.remove('hidden');
  const bd=document.createElement('div'); bd.id='bd-backdrop'; bd.className='backdrop';
  bd.onclick=()=>{ ids.forEach(p=>document.getElementById(p).classList.add('hidden')); bd.remove(); };
  document.body.appendChild(bd);
}
function closePanel(id) {
  document.getElementById(id)?.classList.add('hidden');
  document.getElementById('bd-backdrop')?.remove();
}

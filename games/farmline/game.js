
const canvas=document.getElementById('game');const ctx=canvas.getContext('2d');
const statsEl=document.getElementById('stats');const actionsEl=document.getElementById('actions');
const panelEl=document.getElementById('panel');const logEl=document.getElementById('log');

const SAVE_KEY='farm_auto_save_v1';const TILE=28;const W=100,H=100;const TICK_RATE=20;const DT=1000/TICK_RATE;const VIEW_MARGIN=2;
const SEEDS=['wheat','corn','carrot'];
const cropDefs={wheat:{name:'Wheat',grow:18,seedCost:2,yield:5,color:'#d4c36a'},corn:{name:'Corn',grow:32,seedCost:6,yield:14,color:'#d8d06a'},carrot:{name:'Carrot',grow:48,seedCost:12,yield:28,color:'#d98a3a'}};
const techDefs=[{id:'robotSpeed',name:'Robot Speed',base:50,mult:1.75,desc:'+10% robot speed per level'},{id:'yieldBoost',name:'Yield Boost',base:80,mult:1.9,desc:'+1 crop yield per level'},{id:'harvestRadius',name:'Harvester Radius',base:120,mult:2,desc:'AI can harvest in 2-tile radius'},{id:'routeSlots',name:'Route Slots',base:150,mult:2.2,desc:'+1 waypoint slot per level'},{id:'automation',name:'Automation',base:220,mult:2.4,desc:'Unlocks more robot logic'}];
const buildingDefs={storage:{name:'Storage',cost:{wood:30,stone:10},icon:'warehouse'},farm:{name:'Farm Plot',cost:{wood:8},icon:'sprout'},dock:{name:'Dock',cost:{wood:20,stone:5},icon:'anchor'},conveyor:{name:'Conveyor',cost:{wood:2,stone:1},icon:'move-horizontal'}};


const TILE_IDX = {
  groundDirt: 0, groundTilled: 1, fence: 12,
  grassA: 94, grassB: 105,
  cropStage1: 106, cropStage2: 107, cropStage3: 119,
  roofA: 90, roofB: 102,
  stoneA: 84, stoneB: 110,
  woodWall: 60, shadow: 130
};
const SHEET_COLS = 12;
const SHEET_TILE = 16;
const SHEET_GAP = 1;
let tilesheetImg = null;
function loadTilesheet(){
  return new Promise(res=>{
    const img = new Image();
    img.onload = () => { tilesheetImg = img; res(true); };
    img.onerror = () => { tilesheetImg = null; res(false); };
    img.src = 'assetes/tiles/Tilemap/tilemap.png';
  });
}
function drawTile(ctx, idx, dx, dy, size){
  if(!tilesheetImg) return false;
  const col = idx % SHEET_COLS;
  const row = Math.floor(idx / SHEET_COLS);
  const sx = col * (SHEET_TILE + SHEET_GAP);
  const sy = row * (SHEET_TILE + SHEET_GAP);
  ctx.drawImage(tilesheetImg, sx, sy, SHEET_TILE, SHEET_TILE, dx, dy, size, size);
  return true;
}


class Inventory{constructor(data){this.items=data||{gold:50,wood:20,stone:10,seeds:20};}get(k){return this.items[k]||0}add(k,n){this.items[k]=(this.items[k]||0)+n}has(cost){for(const k in cost)if(this.get(k)<cost[k])return false;return true}spend(cost){if(!this.has(cost))return false;for(const k in cost)this.items[k]-=cost[k];return true}}
class Grid{constructor(){this.tiles=new Uint8Array(W*H);this.crop=new Array(W*H).fill(null);this.building=new Array(W*H).fill(null);}idx(x,y){return y*W+x}in(x,y){return x>=0&&y>=0&&x<W&&y<H}get(x,y){return this.tiles[this.idx(x,y)]}set(x,y,v){this.tiles[this.idx(x,y)]=v}}
class Robot{constructor(x,y){this.x=x;this.y=y;this.path=[];this.goal=null;this.mode='idle';this.speed=1;this.carry=0;this.carryType=null;this.route=[];this.routeIndex=0;this.wait=0;this.home={x,y};}serialize(){return {x:this.x,y:this.y,path:this.path,goal:this.goal,mode:this.mode,speed:this.speed,carry:this.carry,carryType:this.carryType,route:this.route,routeIndex:this.routeIndex,wait:this.wait,home:this.home}}}

const state={grid:new Grid(),inv:new Inventory(),robots:[],camera:{x:0,y:0,zoom:1},selected:'plant-wheat',selectedTile:null,tick:0,acc:0,last:performance.now(),paused:true,tech:{robotSpeed:0,yieldBoost:0,harvestRadius:0,routeSlots:0,automation:0},moneyPerSec:0,autoPlant:true,logs:[]};

function log(msg){state.logs.unshift(msg);state.logs=state.logs.slice(0,8);if(logEl)logEl.innerHTML=state.logs.map(s=>`<div>${s}</div>`).join('')}
function costForTech(id,lvl){const d=techDefs.find(t=>t.id===id);return Math.floor(d.base*Math.pow(d.mult,lvl))}
function placeInitial(){for(let x=20;x<30;x++)for(let y=20;y<30;y++)state.grid.set(x,y,1);state.grid.building[state.grid.idx(25,25)]={type:'storage'};state.grid.building[state.grid.idx(26,25)]={type:'dock'};for(let i=0;i<4;i++)state.robots.push(new Robot(25+i,27));}

function save(){localStorage.setItem(SAVE_KEY,JSON.stringify({grid:[...state.grid.tiles],crop:state.grid.crop,building:state.grid.building,inv:state.inv.items,robots:state.robots.map(r=>r.serialize()),tech:state.tech,camera:state.camera,tick:state.tick,autoPlant:state.autoPlant}))}
function load(){const s=localStorage.getItem(SAVE_KEY);if(!s){placeInitial();return}try{const d=JSON.parse(s);state.grid.tiles=Uint8Array.from(d.grid);state.grid.crop=d.crop;state.grid.building=d.building;state.inv=new Inventory(d.inv);state.robots=d.robots.map(r=>Object.assign(new Robot(r.x,r.y),r));state.tech=d.tech||state.tech;state.camera=d.camera||state.camera;state.tick=d.tick||0;state.autoPlant=d.autoPlant??true}catch(e){placeInitial()}}

function canPlace(x,y){return state.grid.in(x,y)&&!state.grid.building[state.grid.idx(x,y)]}
function neighbors(x,y){return [[x+1,y],[x-1,y],[x,y+1],[x,y-1]].filter(([a,b])=>state.grid.in(a,b))}
function findPath(sx,sy,tx,ty){const q=[[sx,sy]];const prev=new Int32Array(W*H).fill(-1);const seen=new Uint8Array(W*H);seen[state.grid.idx(sx,sy)]=1;let qi=0;while(qi<q.length){const [x,y]=q[qi++];if(x===tx&&y===ty)break;for(const [nx,ny] of neighbors(x,y)){const id=state.grid.idx(nx,ny);if(seen[id])continue;if(state.grid.get(nx,ny)===2)continue;seen[id]=1;prev[id]=state.grid.idx(x,y);q.push([nx,ny])}}const end=state.grid.idx(tx,ty);if(prev[end]===-1&&!(sx===tx&&sy===ty))return [];const path=[];let cur=end;while(cur!==state.grid.idx(sx,sy)){path.push([cur%W,Math.floor(cur/W)]);cur=prev[cur];if(cur<0)break}return path.reverse()}

function tickRobot(r){
  r.speed=1+state.tech.robotSpeed*0.1;
  if(r.wait>0){r.wait--;return}
  if(r.route.length){
    const [tx,ty]=r.route[r.routeIndex];
    if(r.x===tx&&r.y===ty){r.routeIndex++;if(r.routeIndex>=r.route.length){r.route=[];r.routeIndex=0;r.mode='idle'}return}
    const dx=Math.sign(tx-r.x),dy=Math.sign(ty-r.y);
    if(Math.random()<0.5?r.x!==tx:r.y!==ty){if(r.x!==tx)r.x+=dx;else r.y+=dy}else{if(r.y!==ty)r.y+=dy;else r.x+=dx}
    return;
  }
  let best=null;
  for(let y=Math.max(0,r.y-state.tech.harvestRadius-1);y<Math.min(H,r.y+state.tech.harvestRadius+2);y++){
    for(let x=Math.max(0,r.x-state.tech.harvestRadius-1);x<Math.min(W,r.x+state.tech.harvestRadius+2);x++){
      const c=state.grid.crop[state.grid.idx(x,y)];
      if(c&&c.ready){best={x,y,c};break}
    }
    if(best)break;
  }
  if(best){
    const p=findPath(r.x,r.y,best.x,best.y);
    if(p.length){r.path=p;r.goal=best}
  }
  if(r.path.length){
    const [nx,ny]=r.path[0];
    if(r.x===nx&&r.y===ny)r.path.shift();
    else if(r.x<nx)r.x++;else if(r.x>nx)r.x--;else if(r.y<ny)r.y++;else if(r.y>ny)r.y--;
    return;
  }
  if(r.goal&&r.x===r.goal.x&&r.y===r.goal.y){
    const id=state.grid.idx(r.x,r.y);const c=state.grid.crop[id];
    if(c&&c.ready){const gain=c.yield+state.tech.yieldBoost;state.inv.add('gold',gain);state.grid.crop[id]=null;state.moneyPerSec+=gain*0.05;log(`Harvested ${c.type} +${gain}g`);r.wait=2;r.goal=null;return}
  }
  if(state.autoPlant){
    for(let i=0;i<3;i++){
      const x=(Math.random()*W)|0,y=(Math.random()*H)|0,id=state.grid.idx(x,y);
      if(state.grid.get(x,y)===1&&!state.grid.crop[id]){
        const type=SEEDS[(Math.random()*SEEDS.length)|0];const def=cropDefs[type];
        if(state.inv.get('seeds')>=def.seedCost){state.inv.add('seeds',-def.seedCost);state.grid.crop[id]={type,grow:0,ready:false};break}
      }
    }
  }
}

function updateCrops(){for(let i=0;i<state.grid.crop.length;i++){const c=state.grid.crop[i];if(!c)continue;c.grow++;if(c.grow>=cropDefs[c.type].grow)c.ready=true}}
function updateTechIncome(){state.inv.add('gold',Math.floor(state.moneyPerSec/20));state.moneyPerSec*=0.985}
function buyTech(id){const lvl=state.tech[id]||0;const cost=costForTech(id,lvl);if(state.inv.get('gold')<cost)return;state.inv.add('gold',-cost);state.tech[id]=lvl+1;log(`${id} -> lvl ${lvl+1}`)}
function placeBuilding(type,x,y){const d=buildingDefs[type];if(!d||!canPlace(x,y))return;if(!state.inv.spend(d.cost))return;state.grid.building[state.grid.idx(x,y)]={type};}

function draw(){
  const dpr=devicePixelRatio||1;
  canvas.width=innerWidth*dpr;canvas.height=innerHeight*dpr;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,innerWidth,innerHeight);
  const cam=state.camera;
  const startX=Math.max(0,((cam.x-VIEW_MARGIN)/TILE)|0);
  const startY=Math.max(0,((cam.y-VIEW_MARGIN)/TILE)|0);
  const endX=Math.min(W,(((cam.x+innerWidth/cam.zoom)/TILE)+VIEW_MARGIN)|0);
  const endY=Math.min(H,(((cam.y+innerHeight/cam.zoom)/TILE)+VIEW_MARGIN)|0);
  ctx.save();ctx.scale(cam.zoom,cam.zoom);ctx.translate(-cam.x,-cam.y);
  for(let y=startY;y<endY;y++){
    for(let x=startX;x<endX;x++){
      const id=state.grid.idx(x,y);const t=state.grid.get(x,y);
      const gTile=t===1?TILE_IDX.groundTilled:(t===2?TILE_IDX.stoneA:TILE_IDX.grassA);
      if(!drawTile(ctx,gTile,x*TILE,y*TILE,TILE)){
        ctx.fillStyle=t===1?'#355d2a':t===2?'#4b4b4b':'#244';
        ctx.fillRect(x*TILE,y*TILE,TILE-1,TILE-1);
      }
      const c=state.grid.crop[id];
      if(c){
        const stageIdx=c.ready?TILE_IDX.cropStage3:(c.grow>cropDefs[c.type].grow*0.5?TILE_IDX.cropStage2:TILE_IDX.cropStage1);
        if(!drawTile(ctx,stageIdx,x*TILE+3,y*TILE+3,TILE-6)){
          ctx.fillStyle=cropDefs[c.type].color;
          ctx.fillRect(x*TILE+4,y*TILE+4,TILE-8,TILE-8);
        }
        if(c.ready){ctx.fillStyle='#ffd';ctx.fillRect(x*TILE+TILE-8,y*TILE+3,4,4)}
      }
      const b=state.grid.building[id];
      if(b){
        const bIdx=b.type==='storage'?TILE_IDX.woodWall:(b.type==='dock'?TILE_IDX.roofB:TILE_IDX.roofA);
        if(!drawTile(ctx,bIdx,x*TILE+1,y*TILE+1,TILE-2)){
          ctx.fillStyle=b.type==='storage'?'#7b448a':'#666';
          ctx.fillRect(x*TILE+3,y*TILE+3,TILE-6,TILE-6);
        }
      }
    }
  }
  for(const r of state.robots){
    if(!drawTile(ctx,TILE_IDX.stoneB,r.x*TILE+5,r.y*TILE+5,TILE-10)){
      ctx.fillStyle='#ff6';ctx.fillRect(r.x*TILE+6,r.y*TILE+6,TILE-12,TILE-12);
    }
  }
  ctx.restore();
  const inv=state.inv.items;
  if(statsEl)statsEl.innerHTML=`<i data-lucide="coins" style="width:14px;vertical-align:-2px"></i> ${Math.floor(inv.gold)}<br><i data-lucide="sprout" style="width:14px;vertical-align:-2px"></i> ${inv.seeds}<br><i data-lucide="trees" style="width:14px;vertical-align:-2px"></i> ${inv.wood}<br><i data-lucide="mountain" style="width:14px;vertical-align:-2px"></i> ${inv.stone}<br><i data-lucide="bot" style="width:14px;vertical-align:-2px"></i> ${state.robots.length}`;
  if(panelEl)panelEl.innerHTML=`Tool: ${state.selected}<br>${Object.entries(state.tech).map(([k,v])=>`${k}:${v}`).join(' ')}<br>Auto: ${state.autoPlant?'an':'aus'}`;
  refreshIcons();
}

function loop(t){
  if(!state.last)state.last=t;
  state.acc+=t-state.last;state.last=t;
  while(state.acc>=DT){
    if(!state.paused){state.tick++;updateCrops();updateTechIncome();for(const r of state.robots)tickRobot(r);if(state.tick%40===0)save();}
    state.acc-=DT;
  }
  draw();
  requestAnimationFrame(loop);
}

/* ============ UI LAYER ============ */
const uiEls={
  startMenu:document.getElementById('startMenu'),settingsMenu:document.getElementById('settingsMenu'),
  topbar:document.getElementById('topbar'),actions:document.getElementById('actions'),
  shop:document.getElementById('shop'),shopContent:document.getElementById('shopContent'),
  panel:document.getElementById('panel'),log:document.getElementById('log'),
  btnNewGame:document.getElementById('btnNewGame'),btnContinue:document.getElementById('btnContinue'),
  btnSettings:document.getElementById('btnSettings'),btnCloseSettings:document.getElementById('btnCloseSettings'),
  btnWipe:document.getElementById('btnWipe'),btnOpenShop:document.getElementById('btnOpenShop'),
  btnOpenMenu:document.getElementById('btnOpenMenu'),closeShop:document.getElementById('closeShop'),
};

const ICONS={wheat:'wheat',corn:'wheat',carrot:'carrot',storage:'warehouse',farm:'sprout',dock:'anchor',conveyor:'move-horizontal',robot:'bot',robotSpeed:'gauge',yieldBoost:'trending-up',harvestRadius:'crosshair',routeSlots:'route',automation:'cpu'};

function refreshIcons(){ if(window.lucide) lucide.createIcons(); }
function showGameUI(show){[uiEls.topbar,uiEls.actions,uiEls.panel,uiEls.log].forEach(el=>{if(el)el.classList.toggle('hidden',!show)})}
function openStart(show){uiEls.startMenu.classList.toggle('show',!!show);state.paused=!!show;if(uiEls.btnContinue)uiEls.btnContinue.disabled=!localStorage.getItem(SAVE_KEY);}
function openSettings(show){uiEls.settingsMenu.classList.toggle('show',!!show)}
function toggleShop(force){const willShow=force!==undefined?force:uiEls.shop.classList.contains('hidden');uiEls.shop.classList.toggle('hidden',!willShow);if(willShow)renderShopTab(currentShopTab)}
let currentShopTab='seeds';
function shopIconWrap(name){return `<div class="shop-item-icon"><i data-lucide="${name}"></i></div>`}
function renderShopTab(tab){
  currentShopTab=tab;
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  let html='';
  if(tab==='seeds'){
    for(const [id,def] of Object.entries(cropDefs)){
      const can=state.inv.get('gold')>=def.seedCost;
      html+=`<div class="shop-item"><div class="shop-item-info">${shopIconWrap(ICONS[id]||'sprout')}<div class="shop-item-text"><b>${def.name}</b><span class="cost">${def.seedCost} gold &rarr; +1 Saat</span></div></div><button class="shop-buy" data-buyseed="${id}" ${can?'':'disabled'}>Kaufen</button></div>`;
    }
  }else if(tab==='buildings'){
    for(const [id,def] of Object.entries(buildingDefs)){
      const costStr=Object.entries(def.cost).map(([k,v])=>`${v} ${k}`).join(', ');
      html+=`<div class="shop-item"><div class="shop-item-info">${shopIconWrap(ICONS[id]||'box')}<div class="shop-item-text"><b>${def.name}</b><span class="cost">${costStr}</span></div></div><button class="shop-buy" data-select="${id}">Wählen</button></div>`;
    }
    html+=`<div class="shop-item"><div class="shop-item-info">${shopIconWrap('bot')}<div class="shop-item-text"><b>Roboter</b><span class="cost">Platzieren per Klick</span></div></div><button class="shop-buy" data-select="robot">Wählen</button></div>`;
  }else if(tab==='tech'){
    for(const td of techDefs){
      const lvl=state.tech[td.id]||0;const cost=costForTech(td.id,lvl);const can=state.inv.get('gold')>=cost;
      html+=`<div class="shop-item"><div class="shop-item-info">${shopIconWrap(ICONS[td.id]||'cpu')}<div class="shop-item-text"><b>${td.name} · Lv.${lvl}</b><span class="cost">${td.desc} — ${cost} gold</span></div></div><button class="shop-buy" data-buytech="${td.id}" ${can?'':'disabled'}>Kaufen</button></div>`;
    }
  }
  uiEls.shopContent.innerHTML=html;
  refreshIcons();
  uiEls.shopContent.querySelectorAll('[data-buytech]').forEach(b=>{b.onclick=()=>{buyTech(b.dataset.buytech);renderShopTab(currentShopTab);buildButtons();}});
  uiEls.shopContent.querySelectorAll('[data-buyseed]').forEach(b=>{b.onclick=()=>{const id=b.dataset.buyseed;const def=cropDefs[id];if(state.inv.get('gold')>=def.seedCost){state.inv.add('gold',-def.seedCost);state.inv.add('seeds',1);log(`+1 ${def.name} Saat`)}renderShopTab(currentShopTab);}});
  uiEls.shopContent.querySelectorAll('[data-select]').forEach(b=>{b.onclick=()=>{state.selected=b.dataset.select;buildButtons();toggleShop(false);}});
}
document.querySelectorAll('.tab-btn').forEach(b=>{b.onclick=()=>renderShopTab(b.dataset.tab)});

function buildButtons(){
  actionsEl.innerHTML='';
  const tools=[['plant-wheat','Weizen','wheat'],['plant-corn','Mais','wheat'],['plant-carrot','Karotte','carrot'],['robot','Roboter','bot'],['storage','Lager','warehouse'],['farm','Feld','sprout'],['dock','Dock','anchor'],['conveyor','Band','move-horizontal']];
  for(const [id,label,icon] of tools){
    const b=document.createElement('button');
    b.innerHTML=`<i data-lucide="${icon}" style="width:14px;height:14px;vertical-align:-2px;margin-right:5px"></i>${label}`;
    b.className=id===state.selected?'sel':'';
    b.onclick=()=>{state.selected=id;buildButtons();};
    actionsEl.appendChild(b);
  }
  const auto=document.createElement('button');
  auto.innerHTML=`<i data-lucide="${state.autoPlant?'zap':'zap-off'}" style="width:14px;height:14px;vertical-align:-2px;margin-right:5px"></i>Auto ${state.autoPlant?'an':'aus'}`;
  auto.onclick=()=>{state.autoPlant=!state.autoPlant;buildButtons()};
  actionsEl.appendChild(auto);
  refreshIcons();
}

/* ---- Canvas input: mouse + touch ---- */
function placeAt(gx,gy){
  if(!state.grid.in(gx,gy))return;
  const id=state.grid.idx(gx,gy);
  if(state.selected==='robot'){state.robots.push(new Robot(gx,gy));return}
  if(state.selected.startsWith('plant-')){
    const type=state.selected.split('-')[1];const def=cropDefs[type];
    if(state.inv.get('seeds')>=0&&state.grid.get(gx,gy)===1&&!state.grid.crop[id]){
      if(state.inv.get('seeds')>0){state.inv.add('seeds',-1);state.grid.crop[id]={type,grow:0,ready:false}}
    }
  }else if(buildingDefs[state.selected]){placeBuilding(state.selected,gx,gy)}
  else if(state.selected==='conveyor'){state.grid.set(gx,gy,2)}
}

let drag=false,moved=false,sx=0,sy=0,cx=0,cy=0;
let pinchDist=null;

function screenToGrid(clientX,clientY){
  const rect=canvas.getBoundingClientRect();
  const x=(clientX-rect.left)/state.camera.zoom+state.camera.x;
  const y=(clientY-rect.top)/state.camera.zoom+state.camera.y;
  return [Math.floor(x/TILE),Math.floor(y/TILE)];
}

canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('wheel',e=>{const z=state.camera.zoom;state.camera.zoom=Math.max(.5,Math.min(2.5,z*(e.deltaY>0?.9:1.1)))},{passive:true});

canvas.addEventListener('pointerdown',e=>{
  drag=true;moved=false;sx=e.clientX;sy=e.clientY;cx=state.camera.x;cy=state.camera.y;
});
window.addEventListener('pointerup',e=>{
  if(drag&&!moved){const [gx,gy]=screenToGrid(e.clientX,e.clientY);placeAt(gx,gy)}
  drag=false;
});
window.addEventListener('pointermove',e=>{
  if(!drag)return;
  const dx=e.clientX-sx,dy=e.clientY-sy;
  if(Math.abs(dx)>4||Math.abs(dy)>4)moved=true;
  state.camera.x=Math.max(0,Math.min(W*TILE-innerWidth/state.camera.zoom,cx-dx/state.camera.zoom));
  state.camera.y=Math.max(0,Math.min(H*TILE-innerHeight/state.camera.zoom,cy-dy/state.camera.zoom));
});

canvas.addEventListener('touchstart',e=>{
  if(e.touches.length===2){
    const [t1,t2]=e.touches;
    pinchDist=Math.hypot(t1.clientX-t2.clientX,t1.clientY-t2.clientY);
  }
},{passive:true});
canvas.addEventListener('touchmove',e=>{
  if(e.touches.length===2&&pinchDist){
    const [t1,t2]=e.touches;
    const d=Math.hypot(t1.clientX-t2.clientX,t1.clientY-t2.clientY);
    const z=state.camera.zoom*(d/pinchDist);
    state.camera.zoom=Math.max(.5,Math.min(2.5,z));
    pinchDist=d;
  }
},{passive:true});
canvas.addEventListener('touchend',e=>{ if(e.touches.length<2)pinchDist=null; },{passive:true});

window.addEventListener('keydown',e=>{
  if(e.key==='s'&&(e.ctrlKey||e.metaKey)){e.preventDefault();save()}
  if(e.key==='p')state.paused=!state.paused;
});

/* ---- Start menu wiring ---- */
if(uiEls.btnNewGame) uiEls.btnNewGame.addEventListener('click',()=>{
  localStorage.removeItem(SAVE_KEY);
  state.inv=new Inventory();
  state.robots=[];
  state.tech={robotSpeed:0,yieldBoost:0,harvestRadius:0,routeSlots:0,automation:0};
  state.selected='plant-wheat';
  state.camera={x:0,y:0,zoom:1};
  state.tick=0;
  state.autoPlant=true;
  state.grid=new Grid();
  placeInitial();
  showGameUI(true);
  openStart(false);
  buildButtons();
  save();
});

if(uiEls.btnContinue) uiEls.btnContinue.addEventListener('click',()=>{
  if(!localStorage.getItem(SAVE_KEY))return;
  load();
  showGameUI(true);
  openStart(false);
  buildButtons();
});

if(uiEls.btnSettings) uiEls.btnSettings.addEventListener('click',()=>openSettings(true));
if(uiEls.btnCloseSettings) uiEls.btnCloseSettings.addEventListener('click',()=>openSettings(false));
if(uiEls.btnWipe) uiEls.btnWipe.addEventListener('click',()=>{localStorage.removeItem(SAVE_KEY);if(uiEls.btnContinue)uiEls.btnContinue.disabled=true;log('Spielstand gelöscht')});
if(uiEls.btnOpenShop) uiEls.btnOpenShop.addEventListener('click',()=>toggleShop(true));
if(uiEls.closeShop) uiEls.closeShop.addEventListener('click',()=>toggleShop(false));
if(uiEls.btnOpenMenu) uiEls.btnOpenMenu.addEventListener('click',()=>{showGameUI(false);openStart(true)});

/* ---- boot ---- */
showGameUI(false);
openStart(true);
buildButtons();
refreshIcons();
loadTilesheet();
setInterval(()=>{if(!state.paused)save()},5000);
requestAnimationFrame(loop);

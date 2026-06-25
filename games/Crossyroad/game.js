// ── DOM ────────────────────────────────────────────────────────────
const counterDOM       = document.getElementById('counter');
const screenMenu       = document.getElementById('screen-menu');
const screenSettings   = document.getElementById('screen-settings');
const screenEnd        = document.getElementById('screen-end');
const menuHsVal        = document.getElementById('menu-hs-val');
const menuCoinsVal     = document.getElementById('menu-coins-val');
const endScoreVal      = document.getElementById('end-score-val');
const endHsVal         = document.getElementById('end-hs-val');
const endCoinsVal      = document.getElementById('end-coins-val');
const endCoinsTotal    = document.getElementById('end-coins-total');
const hudEl            = document.getElementById('hud');
const controlsEl       = document.getElementById('controls');
const highscoreDisplay = document.getElementById('highscore-display');
const hudCoinsVal      = document.getElementById('hud-coins-val');
const coinPopup        = document.getElementById('coin-popup');

// ── Config ────────────────────────────────────────────────────────
const CONFIG = {
  distance: 500, chickenSize: 15, positionWidth: 42,
  columns: 17, stepTime: 200, zoom: 2, boardWidth: 42 * 17
};

// ── Themes ────────────────────────────────────────────────────────
const THEMES = {
  white: { sky:0x87CEEB, road:0x454A59, roadSide:0x393D49, grass:0xbaf455, grassSide:0x99C846, vehicleColors:[0xa52523,0xbdb638,0x78b14b] },
  dark:  { sky:0x1a1a1a, road:0x1c1c1c, roadSide:0x151515, grass:0x1e4620, grassSide:0x143016, vehicleColors:[0x8b0000,0x856d00,0x2d5a1e] }
};
let savedTheme   = localStorage.getItem('cr_theme') || 'white';
let currentTheme = getTheme(savedTheme);

function getTheme(name) {
  if (name === 'time') { const h = new Date().getHours(); return (h >= 7 && h < 20) ? THEMES.white : THEMES.dark; }
  return THEMES[name] || THEMES.white;
}
function applyTheme(name) {
  savedTheme = name; localStorage.setItem('cr_theme', name); currentTheme = getTheme(name);
  document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
  const map = { white:'theme-white', dark:'theme-dark', time:'theme-time' };
  document.getElementById(map[name]).classList.add('active');
  if (scene) { scene.background = new THREE.Color(currentTheme.sky); applyThemeToLanes(); }
  document.body.style.background = (currentTheme === THEMES.dark) ? '#1a1a1a' : '#87CEEB';
}
function applyThemeToLanes() {
  if (!lanes) return;
  lanes.forEach(lane => {
    const g = lane.type === 'field' || lane.type === 'forest';
    if (lane.type === 'water') return;
    lane.mesh.children.forEach((sec, i) => {
      if (sec.material) sec.material.color.setHex(i===0?(g?currentTheme.grass:currentTheme.road):(g?currentTheme.grassSide:currentTheme.roadSide));
    });
  });
}

// ── Persistent data ───────────────────────────────────────────────
let highscore   = parseInt(localStorage.getItem('cr_highscore') || '0', 10);
let totalCoins  = parseInt(localStorage.getItem('cr_coins') || '0', 10);
let sessionCoins = 0;

function saveHighscore(s) { if (s > highscore) { highscore = s; localStorage.setItem('cr_highscore', s); } }
function saveCoins(n)     { totalCoins += n; localStorage.setItem('cr_coins', totalCoins); }

function updateMenuUI() {
  menuHsVal.textContent    = highscore;
  menuCoinsVal.textContent = totalCoins;
}
updateMenuUI();

// ── Three.js scene ────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(currentTheme.sky);
const camera = new THREE.OrthographicCamera(window.innerWidth/-2, window.innerWidth/2, window.innerHeight/2, window.innerHeight/-2, 0.1, 10000);
camera.rotation.x = 50*Math.PI/180;
camera.rotation.y = 20*Math.PI/180;
camera.rotation.z = 10*Math.PI/180;
const initialCameraPositionY = -Math.tan(camera.rotation.x)*CONFIG.distance;
const initialCameraPositionX =  Math.tan(camera.rotation.y)*Math.sqrt(CONFIG.distance**2+initialCameraPositionY**2);
camera.position.set(initialCameraPositionX, initialCameraPositionY, CONFIG.distance);

const hemiLight = new THREE.HemisphereLight(0xffffff,0xffffff,0.6); scene.add(hemiLight);
const initialDirLightPositionX=-100, initialDirLightPositionY=-100;
const dirLight = new THREE.DirectionalLight(0xffffff,0.6);
dirLight.position.set(initialDirLightPositionX, initialDirLightPositionY, 200);
dirLight.castShadow=true; dirLight.shadow.mapSize.width=2048; dirLight.shadow.mapSize.height=2048;
var d=500; dirLight.shadow.camera.left=-d; dirLight.shadow.camera.right=d; dirLight.shadow.camera.top=d; dirLight.shadow.camera.bottom=-d;
scene.add(dirLight);
const backLight=new THREE.DirectionalLight(0x000000,.4); backLight.position.set(200,200,50); backLight.castShadow=true; scene.add(backLight);

const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth,window.innerHeight);
document.getElementById('game-container').appendChild(renderer.domElement);
window.addEventListener('resize',()=>{
  camera.left=window.innerWidth/-2; camera.right=window.innerWidth/2;
  camera.top=window.innerHeight/2; camera.bottom=window.innerHeight/-2;
  camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth,window.innerHeight);
});

// ── Game state ───────────────────────────────────────────────────
const laneTypes=['car','truck','forest','water'];
const laneSpeeds=[2,2.5,3];
const threeHeights=[20,45,60];
let lanes, currentLane, currentColumn, previousTimestamp;
let startMoving, moves, stepStartTimestamp;
let isDead=false, gameRunning=false, score=0;

// ── Textures ─────────────────────────────────────────────────────
function Texture(w,h,rects){
  const c=document.createElement('canvas'); c.width=w; c.height=h;
  const ctx=c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);
  ctx.fillStyle='rgba(0,0,0,0.6)'; rects.forEach(r=>ctx.fillRect(r.x,r.y,r.w,r.h));
  return new THREE.CanvasTexture(c);
}
const carFrontTexture       = new Texture(40,80,[{x:0,y:10,w:30,h:60}]);
const carBackTexture        = new Texture(40,80,[{x:10,y:10,w:30,h:60}]);
const carRightSideTexture   = new Texture(110,40,[{x:10,y:0,w:50,h:30},{x:70,y:0,w:30,h:30}]);
const carLeftSideTexture    = new Texture(110,40,[{x:10,y:10,w:50,h:30},{x:70,y:10,w:30,h:30}]);
const truckFrontTexture     = new Texture(30,30,[{x:15,y:0,w:10,h:30}]);
const truckRightSideTexture = new Texture(25,30,[{x:0,y:15,w:10,h:10}]);
const truckLeftSideTexture  = new Texture(25,30,[{x:0,y:5,w:10,h:10}]);

// ── 3D objects ───────────────────────────────────────────────────
function Wheel(){
  const w=new THREE.Mesh(new THREE.BoxGeometry(12*CONFIG.zoom,33*CONFIG.zoom,12*CONFIG.zoom),new THREE.MeshLambertMaterial({color:0x333333,flatShading:true}));
  w.position.z=6*CONFIG.zoom; return w;
}
function Car(){
  const car=new THREE.Group();
  const color=currentTheme.vehicleColors[Math.floor(Math.random()*currentTheme.vehicleColors.length)];
  const main=new THREE.Mesh(new THREE.BoxGeometry(60*CONFIG.zoom,30*CONFIG.zoom,15*CONFIG.zoom),new THREE.MeshPhongMaterial({color,flatShading:true}));
  main.position.z=12*CONFIG.zoom; main.castShadow=true; main.receiveShadow=true; car.add(main);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(33*CONFIG.zoom,24*CONFIG.zoom,12*CONFIG.zoom),[
    new THREE.MeshPhongMaterial({color:0xcccccc,flatShading:true,map:carBackTexture}),
    new THREE.MeshPhongMaterial({color:0xcccccc,flatShading:true,map:carFrontTexture}),
    new THREE.MeshPhongMaterial({color:0xcccccc,flatShading:true,map:carRightSideTexture}),
    new THREE.MeshPhongMaterial({color:0xcccccc,flatShading:true,map:carLeftSideTexture}),
    new THREE.MeshPhongMaterial({color:0xcccccc,flatShading:true}),
    new THREE.MeshPhongMaterial({color:0xcccccc,flatShading:true})
  ]);
  cabin.position.set(6*CONFIG.zoom,0,25.5*CONFIG.zoom); cabin.castShadow=true; cabin.receiveShadow=true; car.add(cabin);
  const fw=new Wheel(); fw.position.x=-18*CONFIG.zoom; car.add(fw);
  const bw=new Wheel(); bw.position.x=18*CONFIG.zoom;  car.add(bw);
  car.castShadow=true; return car;
}
function Truck(){
  const truck=new THREE.Group();
  const color=currentTheme.vehicleColors[Math.floor(Math.random()*currentTheme.vehicleColors.length)];
  const base=new THREE.Mesh(new THREE.BoxGeometry(100*CONFIG.zoom,25*CONFIG.zoom,5*CONFIG.zoom),new THREE.MeshLambertMaterial({color:0xb4c6fc,flatShading:true}));
  base.position.z=10*CONFIG.zoom; truck.add(base);
  const cargo=new THREE.Mesh(new THREE.BoxGeometry(75*CONFIG.zoom,35*CONFIG.zoom,40*CONFIG.zoom),new THREE.MeshPhongMaterial({color:0xb4c6fc,flatShading:true}));
  cargo.position.set(15*CONFIG.zoom,0,30*CONFIG.zoom); cargo.castShadow=true; cargo.receiveShadow=true; truck.add(cargo);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(25*CONFIG.zoom,30*CONFIG.zoom,30*CONFIG.zoom),[
    new THREE.MeshPhongMaterial({color,flatShading:true}),
    new THREE.MeshPhongMaterial({color,flatShading:true,map:truckFrontTexture}),
    new THREE.MeshPhongMaterial({color,flatShading:true,map:truckRightSideTexture}),
    new THREE.MeshPhongMaterial({color,flatShading:true,map:truckLeftSideTexture}),
    new THREE.MeshPhongMaterial({color,flatShading:true}),
    new THREE.MeshPhongMaterial({color,flatShading:true})
  ]);
  cabin.position.set(-40*CONFIG.zoom,0,20*CONFIG.zoom); cabin.castShadow=true; cabin.receiveShadow=true; truck.add(cabin);
  const fw=new Wheel(); fw.position.x=-38*CONFIG.zoom; truck.add(fw);
  const mw=new Wheel(); mw.position.x=-10*CONFIG.zoom; truck.add(mw);
  const bw=new Wheel(); bw.position.x=30*CONFIG.zoom;  truck.add(bw);
  return truck;
}
function TreeObj(){
  const t=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.BoxGeometry(15*CONFIG.zoom,15*CONFIG.zoom,20*CONFIG.zoom),new THREE.MeshPhongMaterial({color:0x4d2926,flatShading:true}));
  trunk.position.z=10*CONFIG.zoom; trunk.castShadow=true; t.add(trunk);
  const h=threeHeights[Math.floor(Math.random()*threeHeights.length)];
  const crown=new THREE.Mesh(new THREE.BoxGeometry(30*CONFIG.zoom,30*CONFIG.zoom,h*CONFIG.zoom),new THREE.MeshLambertMaterial({color:0x7aa21d,flatShading:true}));
  crown.position.z=(h/2+20)*CONFIG.zoom; crown.castShadow=true; t.add(crown);
  return t;
}
function Chicken(){
  const c=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(CONFIG.chickenSize*CONFIG.zoom,CONFIG.chickenSize*CONFIG.zoom,20*CONFIG.zoom),new THREE.MeshPhongMaterial({color:0xffffff,flatShading:true}));
  body.position.z=10*CONFIG.zoom; body.castShadow=true; body.receiveShadow=true; c.add(body);
  const rowel=new THREE.Mesh(new THREE.BoxGeometry(2*CONFIG.zoom,4*CONFIG.zoom,2*CONFIG.zoom),new THREE.MeshLambertMaterial({color:0xF0619A,flatShading:true}));
  rowel.position.z=21*CONFIG.zoom; c.add(rowel);
  return c;
}
function Road(){
  const road=new THREE.Group();
  const sec=color=>new THREE.Mesh(new THREE.PlaneGeometry(CONFIG.boardWidth*CONFIG.zoom,CONFIG.positionWidth*CONFIG.zoom),new THREE.MeshPhongMaterial({color}));
  const mid=sec(currentTheme.road); mid.receiveShadow=true; road.add(mid);
  const l=sec(currentTheme.roadSide); l.position.x=-CONFIG.boardWidth*CONFIG.zoom; road.add(l);
  const r=sec(currentTheme.roadSide); r.position.x=CONFIG.boardWidth*CONFIG.zoom;  road.add(r);
  return road;
}
function Grass(){
  const grass=new THREE.Group();
  const sec=color=>new THREE.Mesh(new THREE.BoxGeometry(CONFIG.boardWidth*CONFIG.zoom,CONFIG.positionWidth*CONFIG.zoom,3*CONFIG.zoom),new THREE.MeshPhongMaterial({color}));
  const mid=sec(currentTheme.grass); mid.receiveShadow=true; grass.add(mid);
  const l=sec(currentTheme.grassSide); l.position.x=-CONFIG.boardWidth*CONFIG.zoom; grass.add(l);
  const r=sec(currentTheme.grassSide); r.position.x=CONFIG.boardWidth*CONFIG.zoom;  grass.add(r);
  grass.position.z=1.5*CONFIG.zoom; return grass;
}

// ── Water + Lily Pad ──────────────────────────────────────────────
function WaterPlane(){
  const w=new THREE.Group();
  // Wide water surface
  const surf=new THREE.Mesh(
    new THREE.BoxGeometry(CONFIG.boardWidth*3*CONFIG.zoom, CONFIG.positionWidth*CONFIG.zoom, 2*CONFIG.zoom),
    new THREE.MeshPhongMaterial({color:0x1a7abf, transparent:true, opacity:0.85, shininess:120})
  );
  surf.receiveShadow=true;
  w.add(surf);
  w.position.z=1*CONFIG.zoom;
  return w;
}

function LilyPad(){
  const group=new THREE.Group();
  // Pad (flat green cylinder)
  const pad=new THREE.Mesh(
    new THREE.CylinderGeometry(16*CONFIG.zoom, 16*CONFIG.zoom, 3*CONFIG.zoom, 18),
    new THREE.MeshPhongMaterial({color:0x3aad3a, flatShading:false, shininess:40})
  );
  pad.rotation.x=Math.PI/2;
  pad.castShadow=true; pad.receiveShadow=true;
  group.add(pad);
  // Small notch (darker sector) to look like a real lily pad
  const notch=new THREE.Mesh(
    new THREE.BoxGeometry(6*CONFIG.zoom, 3*CONFIG.zoom, 4*CONFIG.zoom),
    new THREE.MeshPhongMaterial({color:0x2a8a2a})
  );
  notch.position.set(14*CONFIG.zoom, 0, 0);
  group.add(notch);
  // White flower on top
  const flower=new THREE.Mesh(
    new THREE.SphereGeometry(5*CONFIG.zoom, 8, 6),
    new THREE.MeshPhongMaterial({color:0xfffde0, emissive:0xffee88, shininess:80})
  );
  flower.position.set(0, 0, 5*CONFIG.zoom);
  flower.scale.z=0.5;
  group.add(flower);
  // Petals (4 flat boxes around flower)
  const petalColors=[0xffb3c6,0xffd6e0,0xffb3c6,0xffd6e0];
  for(let i=0;i<4;i++){
    const petal=new THREE.Mesh(
      new THREE.BoxGeometry(7*CONFIG.zoom, 3*CONFIG.zoom, 2*CONFIG.zoom),
      new THREE.MeshPhongMaterial({color:petalColors[i],flatShading:true})
    );
    petal.position.set(
      Math.cos(i*Math.PI/2)*9*CONFIG.zoom,
      Math.sin(i*Math.PI/2)*9*CONFIG.zoom,
      4*CONFIG.zoom
    );
    group.add(petal);
  }
  group.position.z=3*CONFIG.zoom; // float above water
  return group;
}

// ── Coin 3D object ────────────────────────────────────────────────
function CoinMesh(){
  const coin=new THREE.Mesh(
    new THREE.CylinderGeometry(6*CONFIG.zoom, 6*CONFIG.zoom, 3*CONFIG.zoom, 16),
    new THREE.MeshPhongMaterial({color:0xFFD700, emissive:0xAA8800, flatShading:false, shininess:90})
  );
  coin.rotation.x = Math.PI/2;
  coin.position.z = 10*CONFIG.zoom;
  coin.castShadow = true;
  return coin;
}

// ── Lane ─────────────────────────────────────────────────────────
function Lane(index){
  this.index=index;
  this.type=index<=0?'field':laneTypes[Math.floor(Math.random()*laneTypes.length)];
  this.coins=[];
  this.pads=[];  // lily pads for water lane: {mesh, x}

  switch(this.type){
    case 'field': this.mesh=new Grass(); break;
    case 'forest':{
      this.mesh=new Grass();
      this.occupiedPositions=new Set();
      this.threes=[1,2,3,4].map(()=>{
        const tree=new TreeObj(); let pos;
        do{pos=Math.floor(Math.random()*CONFIG.columns);}while(this.occupiedPositions.has(pos));
        this.occupiedPositions.add(pos);
        tree.position.x=(pos*CONFIG.positionWidth+CONFIG.positionWidth/2)*CONFIG.zoom-CONFIG.boardWidth*CONFIG.zoom/2;
        this.mesh.add(tree); return tree;
      });
      this._addCoins();
      break;
    }
    case 'car':{
      this.mesh=new Road(); this.direction=Math.random()>=0.5;
      const occ=new Set();
      this.vechicles=[1,2,3].map(()=>{
        const v=new Car(); let pos;
        do{pos=Math.floor(Math.random()*CONFIG.columns/2);}while(occ.has(pos));
        occ.add(pos);
        v.position.x=(pos*CONFIG.positionWidth*2+CONFIG.positionWidth/2)*CONFIG.zoom-CONFIG.boardWidth*CONFIG.zoom/2;
        if(!this.direction)v.rotation.z=Math.PI;
        this.mesh.add(v); return v;
      });
      this.speed=laneSpeeds[Math.floor(Math.random()*laneSpeeds.length)]; break;
    }
    case 'truck':{
      this.mesh=new Road(); this.direction=Math.random()>=0.5;
      const occ=new Set();
      this.vechicles=[1,2].map(()=>{
        const v=new Truck(); let pos;
        do{pos=Math.floor(Math.random()*CONFIG.columns/3);}while(occ.has(pos));
        occ.add(pos);
        v.position.x=(pos*CONFIG.positionWidth*3+CONFIG.positionWidth/2)*CONFIG.zoom-CONFIG.boardWidth*CONFIG.zoom/2;
        if(!this.direction)v.rotation.z=Math.PI;
        this.mesh.add(v); return v;
      });
      this.speed=laneSpeeds[Math.floor(Math.random()*laneSpeeds.length)]; break;
    }
    case 'water':{
      this.mesh=new WaterPlane();
      this.direction=Math.random()>=0.5; // drift direction
      this.speed=laneSpeeds[Math.floor(Math.random()*laneSpeeds.length)]*0.6;
      const padCount=2+Math.floor(Math.random()*2); // 2-3 pads
      const boardHalf=CONFIG.boardWidth*CONFIG.zoom/2;
      for(let i=0;i<padCount;i++){
        const pad=new LilyPad();
        // Space pads evenly with some randomness
        const segment=CONFIG.boardWidth*CONFIG.zoom/padCount;
        pad.position.x=-boardHalf+segment*i+segment*0.3+Math.random()*segment*0.4;
        this.mesh.add(pad);
        this.pads.push({mesh:pad, baseX:pad.position.x});
      }
      break;
    }
  }
}
Lane.prototype._addCoins=function(){
  if(this.index<=0) return;
  const count=Math.random()<0.4?Math.floor(Math.random()*2)+1:0;
  const used=new Set(this.occupiedPositions||new Set());
  for(let i=0;i<count;i++){
    let pos; let tries=0;
    do{pos=Math.floor(Math.random()*CONFIG.columns);tries++;}while(used.has(pos)&&tries<20);
    if(tries>=20) break;
    used.add(pos);
    const mesh=new CoinMesh();
    mesh.position.x=(pos*CONFIG.positionWidth+CONFIG.positionWidth/2)*CONFIG.zoom-CONFIG.boardWidth*CONFIG.zoom/2;
    this.mesh.add(mesh);
    this.coins.push({mesh, column:pos, collected:false});
  }
};

// ── Chicken instance ──────────────────────────────────────────────
const chicken=new Chicken();
scene.add(chicken);
dirLight.target=chicken;

const generateLanes=()=>
  [-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9]
    .map(index=>{ const lane=new Lane(index); lane.mesh.position.y=index*CONFIG.positionWidth*CONFIG.zoom; scene.add(lane.mesh); return lane; })
    .filter(l=>l.index>=0);

const addLane=()=>{
  const index=lanes.length;
  const lane=new Lane(index);
  lane.mesh.position.y=index*CONFIG.positionWidth*CONFIG.zoom;
  scene.add(lane.mesh); lanes.push(lane);
};

const initValues=()=>{
  lanes=generateLanes();
  currentLane=0; currentColumn=Math.floor(CONFIG.columns/2);
  previousTimestamp=null; startMoving=false; moves=[]; stepStartTimestamp=null;
  isDead=false; score=0; sessionCoins=0;
  chicken.position.set(0,0,0);
  camera.position.y=initialCameraPositionY; camera.position.x=initialCameraPositionX;
  dirLight.position.x=initialDirLightPositionX; dirLight.position.y=initialDirLightPositionY;
  counterDOM.innerHTML='0';
  hudCoinsVal.textContent='0';
  applyThemeToLanes();
  scene.background=new THREE.Color(currentTheme.sky);
};

// ── Movement ──────────────────────────────────────────────────────
function move(direction){
  if(isDead||!gameRunning)return;
  const fp=moves.reduce((p,m)=>{
    if(m==='forward') return{lane:p.lane+1,column:p.column};
    if(m==='backward')return{lane:p.lane-1,column:p.column};
    if(m==='left')    return{lane:p.lane,column:p.column-1};
    if(m==='right')   return{lane:p.lane,column:p.column+1};
    return p;
  },{lane:currentLane,column:currentColumn});

  if(direction==='forward'){
    if(lanes[fp.lane+1]&&lanes[fp.lane+1].type==='forest'&&lanes[fp.lane+1].occupiedPositions.has(fp.column))return;
    if(!stepStartTimestamp)startMoving=true;
    addLane();
  }else if(direction==='backward'){
    if(fp.lane===0)return;
    if(lanes[fp.lane-1]&&lanes[fp.lane-1].type==='forest'&&lanes[fp.lane-1].occupiedPositions.has(fp.column))return;
    if(!stepStartTimestamp)startMoving=true;
  }else if(direction==='left'){
    if(fp.column===0)return;
    if(lanes[fp.lane]&&lanes[fp.lane].type==='forest'&&lanes[fp.lane].occupiedPositions.has(fp.column-1))return;
    if(!stepStartTimestamp)startMoving=true;
  }else if(direction==='right'){
    if(fp.column===CONFIG.columns-1)return;
    if(lanes[fp.lane]&&lanes[fp.lane].type==='forest'&&lanes[fp.lane].occupiedPositions.has(fp.column+1))return;
    if(!stepStartTimestamp)startMoving=true;
  }
  moves.push(direction);
}

// ── Water: get pad under chicken ──────────────────────────────────
// Returns the pad mesh if the chicken is standing on one, else null
function getPadUnderChicken(){
  const cx=chicken.position.x;
  const cy=chicken.position.y;
  const padRadius=16*CONFIG.zoom;
  const halfY=CONFIG.positionWidth*CONFIG.zoom/2;
  for(const lane of lanes){
    if(lane.type!=='water') continue;
    const laneY=lane.mesh.position.y;
    if(cy<laneY-halfY||cy>laneY+halfY) continue;
    for(const p of lane.pads){
      // pad world X = lane.mesh.position.x (0) + pad local x
      const padWorldX=p.mesh.position.x;
      if(Math.abs(cx-padWorldX)<padRadius) return p;
    }
  }
  return null;
}

// Is the chicken currently on a water lane?
function onWaterLane(){
  const cy=chicken.position.y;
  const halfY=CONFIG.positionWidth*CONFIG.zoom/2;
  for(const lane of lanes){
    if(lane.type!=='water') continue;
    const laneY=lane.mesh.position.y;
    if(cy>=laneY-halfY&&cy<=laneY+halfY) return lane;
  }
  return null;
}

// ── Coin collection ───────────────────────────────────────────────
function showCoinPopup(){
  coinPopup.classList.remove('pop');
  void coinPopup.offsetWidth;
  coinPopup.classList.add('pop');
}
function checkCoins(){
  const cx=chicken.position.x;
  const cy=chicken.position.y;
  const halfX=(CONFIG.chickenSize*CONFIG.zoom)/2+4;
  const halfY=(CONFIG.positionWidth*CONFIG.zoom)/2;
  for(const lane of lanes){
    if(!lane.coins||lane.coins.length===0)continue;
    const laneWorldY=lane.mesh.position.y;
    if(cy<laneWorldY-halfY||cy>laneWorldY+halfY)continue;
    for(const coin of lane.coins){
      if(coin.collected)continue;
      const coinWorldX=coin.mesh.position.x;
      if(Math.abs(cx-coinWorldX)<halfX){
        coin.collected=true;
        lane.mesh.remove(coin.mesh);
        sessionCoins++;
        hudCoinsVal.textContent=sessionCoins;
        showCoinPopup();
      }
    }
  }
}

// ── Collision ─────────────────────────────────────────────────────
function checkCollision(){
  const cx=chicken.position.x, cy=chicken.position.y;
  const hx=(CONFIG.chickenSize*CONFIG.zoom)/2;
  for(let i=0;i<lanes.length;i++){
    const lane=lanes[i];
    if(lane.type!=='car'&&lane.type!=='truck')continue;
    const laneY=lane.mesh.position.y;
    const laneHY=(CONFIG.positionWidth*CONFIG.zoom)/2;
    if(cy<laneY-laneHY||cy>laneY+laneHY)continue;
    const vhx=(lane.type==='car'?60:105)*CONFIG.zoom/2;
    for(const v of lane.vechicles){
      if(cx+hx>v.position.x-vhx&&cx-hx<v.position.x+vhx)return true;
    }
  }
  return false;
}

// ── Drowning check ────────────────────────────────────────────────
// Called once per frame only when movement has stopped and we're on water
let waterCheckDelay=0;
function checkDrowning(){
  const waterLane=onWaterLane();
  if(!waterLane) return;
  // Only check when not mid-jump
  if(stepStartTimestamp!==null) return;
  const pad=getPadUnderChicken();
  if(!pad) triggerDeath();
}

// ── Game Over ─────────────────────────────────────────────────────
function triggerDeath(){
  if(isDead) return;
  isDead=true;
  score=currentLane;
  saveHighscore(score);
  saveCoins(sessionCoins);
  endScoreVal.textContent=score;
  endHsVal.textContent=highscore;
  endCoinsVal.textContent=sessionCoins;
  endCoinsTotal.textContent='(gesamt: '+totalCoins+')';
  screenEnd.classList.add('visible');
}

// ── UI Navigation ──────────────────────────────────────────────────
function showMenu(){
  gameRunning=false;
  screenMenu.classList.remove('hidden');
  screenEnd.classList.remove('visible');
  screenSettings.classList.add('hidden');
  hudEl.style.display='none';
  controlsEl.style.display='none';
  updateMenuUI();
  currentTheme=getTheme(savedTheme);
  document.body.style.background=(currentTheme===THEMES.dark)?'#1a1a1a':'#87CEEB';
}
function startGame(){
  screenMenu.classList.add('hidden');
  screenEnd.classList.remove('visible');
  hudEl.style.display='flex';
  controlsEl.style.display='grid';
  highscoreDisplay.textContent=highscore;
  currentTheme=getTheme(savedTheme);
  lanes.forEach(l=>scene.remove(l.mesh));
  initValues();
  gameRunning=true;
}

// ── Theme init ────────────────────────────────────────────────────
(function initThemeButtons(){
  document.querySelectorAll('.theme-btn').forEach(b=>b.classList.remove('active'));
  const map={white:'theme-white',dark:'theme-dark',time:'theme-time'};
  const el=document.getElementById(map[savedTheme]); if(el)el.classList.add('active');
})();

// ── Button events ──────────────────────────────────────────────────
document.getElementById('btn-play').addEventListener('click',startGame);
document.getElementById('btn-settings-open').addEventListener('click',()=>{ screenMenu.classList.add('hidden'); screenSettings.classList.remove('hidden'); });
document.getElementById('btn-settings-close').addEventListener('click',()=>{ screenSettings.classList.add('hidden'); screenMenu.classList.remove('hidden'); });
document.getElementById('theme-white').addEventListener('click',()=>applyTheme('white'));
document.getElementById('theme-dark').addEventListener('click',()=>applyTheme('dark'));
document.getElementById('theme-time').addEventListener('click',()=>applyTheme('time'));
document.getElementById('btn-retry').addEventListener('click',()=>{
  screenEnd.classList.remove('visible');
  lanes.forEach(l=>scene.remove(l.mesh));
  initValues(); gameRunning=true;
});
document.getElementById('btn-menu').addEventListener('click',showMenu);
document.getElementById('forward').addEventListener('click',()=>move('forward'));
document.getElementById('backward').addEventListener('click',()=>move('backward'));
document.getElementById('left').addEventListener('click',()=>move('left'));
document.getElementById('right').addEventListener('click',()=>move('right'));
window.addEventListener('keydown',e=>{
  if(!gameRunning)return;
  if(e.keyCode===38||e.key==='w')move('forward');
  else if(e.keyCode===40||e.key==='s')move('backward');
  else if(e.keyCode===37||e.key==='a')move('left');
  else if(e.keyCode===39||e.key==='d')move('right');
});

// ── Touch controls ────────────────────────────────────────────────
(function initTouchControls(){
  const canvas=renderer.domElement;
  let sx=0,sy=0,st=0;
  const SWIPE=30, TAP_D=12, TAP_T=200;
  canvas.addEventListener('touchstart',e=>{
    e.preventDefault(); sx=e.changedTouches[0].clientX; sy=e.changedTouches[0].clientY; st=Date.now();
  },{passive:false});
  canvas.addEventListener('touchend',e=>{
    e.preventDefault();
    const dx=e.changedTouches[0].clientX-sx, dy=e.changedTouches[0].clientY-sy;
    const dist=Math.sqrt(dx*dx+dy*dy), elapsed=Date.now()-st;
    if(dist<TAP_D&&elapsed<TAP_T){ move('forward'); }
    else if(dist>=SWIPE){ Math.abs(dx)>Math.abs(dy)?move(dx>0?'right':'left'):move(dy<0?'forward':'backward'); }
  },{passive:false});
  canvas.addEventListener('touchmove',e=>e.preventDefault(),{passive:false});
})();

// ── Animation ─────────────────────────────────────────────────────
let coinAngle=0;

function animate(timestamp){
  requestAnimationFrame(animate);
  if(!previousTimestamp)previousTimestamp=timestamp;
  const delta=timestamp-previousTimestamp;
  previousTimestamp=timestamp;

  // Spin coins
  coinAngle+=delta*0.003;
  if(lanes)lanes.forEach(lane=>{
    if(lane.coins)lane.coins.forEach(coin=>{
      if(!coin.collected)coin.mesh.rotation.y=coinAngle;
    });
  });

  if(!gameRunning){renderer.render(scene,camera);return;}

  const boardHalf=CONFIG.boardWidth*CONFIG.zoom/2;
  const edgeOff=CONFIG.positionWidth*2*CONFIG.zoom;

  // Move vehicles + lily pads
  lanes.forEach(lane=>{
    if(lane.type==='car'||lane.type==='truck'){
      const eL=-boardHalf-edgeOff, eR=boardHalf+edgeOff;
      lane.vechicles.forEach(v=>{
        if(lane.direction)v.position.x=v.position.x<eL?eR:v.position.x-lane.speed/16*delta;
        else               v.position.x=v.position.x>eR?eL:v.position.x+lane.speed/16*delta;
      });
    }
    if(lane.type==='water'){
      // Pads drift; wrap around edges
      const eL=-boardHalf-edgeOff, eR=boardHalf+edgeOff;
      lane.pads.forEach(p=>{
        if(lane.direction){
          p.mesh.position.x-=lane.speed/16*delta;
          if(p.mesh.position.x<eL) p.mesh.position.x=eR;
        }else{
          p.mesh.position.x+=lane.speed/16*delta;
          if(p.mesh.position.x>eR) p.mesh.position.x=eL;
        }
      });
    }
  });

  if(startMoving){stepStartTimestamp=timestamp;startMoving=false;}

  if(stepStartTimestamp){
    const dt=timestamp-stepStartTimestamp;
    const moveDist=Math.min(dt/CONFIG.stepTime,1)*CONFIG.positionWidth*CONFIG.zoom;
    const jumpDist=Math.sin(Math.min(dt/CONFIG.stepTime,1)*Math.PI)*8*CONFIG.zoom;
    switch(moves[0]){
      case 'forward':{
        const posY=currentLane*CONFIG.positionWidth*CONFIG.zoom+moveDist;
        camera.position.y=initialCameraPositionY+posY; dirLight.position.y=initialDirLightPositionY+posY;
        chicken.position.y=posY; chicken.position.z=jumpDist; break;
      }
      case 'backward':{
        const posY=currentLane*CONFIG.positionWidth*CONFIG.zoom-moveDist;
        camera.position.y=initialCameraPositionY+posY; dirLight.position.y=initialDirLightPositionY+posY;
        chicken.position.y=posY; chicken.position.z=jumpDist; break;
      }
      case 'left':{
        const posX=(currentColumn*CONFIG.positionWidth+CONFIG.positionWidth/2)*CONFIG.zoom-boardHalf-moveDist;
        camera.position.x=initialCameraPositionX+posX; dirLight.position.x=initialDirLightPositionX+posX;
        chicken.position.x=posX; chicken.position.z=jumpDist; break;
      }
      case 'right':{
        const posX=(currentColumn*CONFIG.positionWidth+CONFIG.positionWidth/2)*CONFIG.zoom-boardHalf+moveDist;
        camera.position.x=initialCameraPositionX+posX; dirLight.position.x=initialDirLightPositionX+posX;
        chicken.position.x=posX; chicken.position.z=jumpDist; break;
      }
    }
    if(dt>CONFIG.stepTime){
      switch(moves[0]){
        case 'forward':  currentLane++;  score=currentLane; counterDOM.innerHTML=score; break;
        case 'backward': currentLane--;  score=currentLane; counterDOM.innerHTML=score; break;
        case 'left':     currentColumn--; break;
        case 'right':    currentColumn++; break;
      }
      moves.shift();
      stepStartTimestamp=moves.length===0?null:timestamp;
    }
  }

  // If standing still on water → ride the pad or drown
  if(!isDead && stepStartTimestamp===null && moves.length===0){
    const waterLane=onWaterLane();
    if(waterLane){
      const pad=getPadUnderChicken();
      if(pad){
        // Ride the pad: push chicken X with pad
        const speed=waterLane.speed/16*delta;
        if(waterLane.direction){
          chicken.position.x-=speed;
          camera.position.x-=speed;
          dirLight.position.x-=speed;
        }else{
          chicken.position.x+=speed;
          camera.position.x+=speed;
          dirLight.position.x+=speed;
        }
        // Drown if carried off edge
        if(Math.abs(chicken.position.x)>boardHalf+edgeOff) triggerDeath();
      }else{
        // No pad under chicken → drown
        triggerDeath();
      }
    }
  }

  checkCoins();
  if(!isDead&&checkCollision())triggerDeath();
  renderer.render(scene,camera);
}

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded',()=>{
  initValues();
  showMenu();
  requestAnimationFrame(animate);
});

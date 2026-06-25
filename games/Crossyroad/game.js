// DOM Elements
const counterDOM = document.getElementById('counter');
const endDOM = document.getElementById('end');

// Game Configuration
const CONFIG = {
  distance: 500,
  chickenSize: 15,
  positionWidth: 42,
  columns: 17,
  stepTime: 200,
  zoom: 2,
  darkMode: false,
  boardWidth: 42 * 17
};

const COLORS = {
  light: {
    sky: 0x87CEEB, road: 0x454A59, roadSide: 0x393D49,
    grass: 0xbaf455, grassSide: 0x99C846,
    vechicleColors: [0xa52523, 0xbdb638, 0x78b14b]
  },
  dark: {
    sky: 0x1a1a1a, road: 0x1c1c1c, roadSide: 0x151515,
    grass: 0x1e4620, grassSide: 0x143016,
    vechicleColors: [0x8b0000, 0x856d00, 0x2d5a1e]
  }
};

let currentColorScheme = COLORS.light;

const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.light.sky);

const camera = new THREE.OrthographicCamera(
  window.innerWidth / -2, window.innerWidth / 2,
  window.innerHeight / 2, window.innerHeight / -2,
  0.1, 10000
);
camera.rotation.x = 50 * Math.PI / 180;
camera.rotation.y = 20 * Math.PI / 180;
camera.rotation.z = 10 * Math.PI / 180;

const initialCameraPositionY = -Math.tan(camera.rotation.x) * CONFIG.distance;
const initialCameraPositionX = Math.tan(camera.rotation.y) * Math.sqrt(CONFIG.distance ** 2 + initialCameraPositionY ** 2);
camera.position.set(initialCameraPositionX, initialCameraPositionY, CONFIG.distance);

const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
scene.add(hemiLight);

const initialDirLightPositionX = -100;
const initialDirLightPositionY = -100;
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(initialDirLightPositionX, initialDirLightPositionY, 200);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
var d = 500;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
scene.add(dirLight);

const backLight = new THREE.DirectionalLight(0x000000, 0.4);
backLight.position.set(200, 200, 50);
backLight.castShadow = true;
scene.add(backLight);

const laneTypes = ['car', 'truck', 'forest'];
const laneSpeeds = [2, 2.5, 3];
const threeHeights = [20, 45, 60];
let lanes, currentLane, currentColumn, previousTimestamp;
let startMoving, moves, stepStartTimestamp;
let isDead = false;

function Texture(width, height, rects) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  rects.forEach(r => ctx.fillRect(r.x, r.y, r.w, r.h));
  return new THREE.CanvasTexture(canvas);
}

const carFrontTexture = new Texture(40, 80, [{ x: 0, y: 10, w: 30, h: 60 }]);
const carBackTexture = new Texture(40, 80, [{ x: 10, y: 10, w: 30, h: 60 }]);
const carRightSideTexture = new Texture(110, 40, [{ x: 10, y: 0, w: 50, h: 30 }, { x: 70, y: 0, w: 30, h: 30 }]);
const carLeftSideTexture = new Texture(110, 40, [{ x: 10, y: 10, w: 50, h: 30 }, { x: 70, y: 10, w: 30, h: 30 }]);
const truckFrontTexture = new Texture(30, 30, [{ x: 15, y: 0, w: 10, h: 30 }]);
const truckRightSideTexture = new Texture(25, 30, [{ x: 0, y: 15, w: 10, h: 10 }]);
const truckLeftSideTexture = new Texture(25, 30, [{ x: 0, y: 5, w: 10, h: 10 }]);

function Wheel() {
  const w = new THREE.Mesh(
    new THREE.BoxGeometry(12 * CONFIG.zoom, 33 * CONFIG.zoom, 12 * CONFIG.zoom),
    new THREE.MeshLambertMaterial({ color: 0x333333, flatShading: true })
  );
  w.position.z = 6 * CONFIG.zoom;
  return w;
}

function Car() {
  const car = new THREE.Group();
  const color = currentColorScheme.vechicleColors[Math.floor(Math.random() * currentColorScheme.vechicleColors.length)];
  const main = new THREE.Mesh(
    new THREE.BoxGeometry(60 * CONFIG.zoom, 30 * CONFIG.zoom, 15 * CONFIG.zoom),
    new THREE.MeshPhongMaterial({ color, flatShading: true })
  );
  main.position.z = 12 * CONFIG.zoom; main.castShadow = true; main.receiveShadow = true;
  car.add(main);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(33 * CONFIG.zoom, 24 * CONFIG.zoom, 12 * CONFIG.zoom),
    [
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carBackTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carFrontTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carRightSideTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true, map: carLeftSideTexture }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true }),
      new THREE.MeshPhongMaterial({ color: 0xcccccc, flatShading: true })
    ]
  );
  cabin.position.set(6 * CONFIG.zoom, 0, 25.5 * CONFIG.zoom);
  cabin.castShadow = true; cabin.receiveShadow = true;
  car.add(cabin);
  const fw = new Wheel(); fw.position.x = -18 * CONFIG.zoom; car.add(fw);
  const bw = new Wheel(); bw.position.x = 18 * CONFIG.zoom; car.add(bw);
  car.castShadow = true;
  return car;
}

function Truck() {
  const truck = new THREE.Group();
  const color = currentColorScheme.vechicleColors[Math.floor(Math.random() * currentColorScheme.vechicleColors.length)];
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(100 * CONFIG.zoom, 25 * CONFIG.zoom, 5 * CONFIG.zoom),
    new THREE.MeshLambertMaterial({ color: 0xb4c6fc, flatShading: true })
  );
  base.position.z = 10 * CONFIG.zoom; truck.add(base);
  const cargo = new THREE.Mesh(
    new THREE.BoxGeometry(75 * CONFIG.zoom, 35 * CONFIG.zoom, 40 * CONFIG.zoom),
    new THREE.MeshPhongMaterial({ color: 0xb4c6fc, flatShading: true })
  );
  cargo.position.set(15 * CONFIG.zoom, 0, 30 * CONFIG.zoom);
  cargo.castShadow = true; cargo.receiveShadow = true; truck.add(cargo);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(25 * CONFIG.zoom, 30 * CONFIG.zoom, 30 * CONFIG.zoom),
    [
      new THREE.MeshPhongMaterial({ color, flatShading: true }),
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckFrontTexture }),
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckRightSideTexture }),
      new THREE.MeshPhongMaterial({ color, flatShading: true, map: truckLeftSideTexture }),
      new THREE.MeshPhongMaterial({ color, flatShading: true }),
      new THREE.MeshPhongMaterial({ color, flatShading: true })
    ]
  );
  cabin.position.set(-40 * CONFIG.zoom, 0, 20 * CONFIG.zoom);
  cabin.castShadow = true; cabin.receiveShadow = true; truck.add(cabin);
  const fw = new Wheel(); fw.position.x = -38 * CONFIG.zoom; truck.add(fw);
  const mw = new Wheel(); mw.position.x = -10 * CONFIG.zoom; truck.add(mw);
  const bw = new Wheel(); bw.position.x = 30 * CONFIG.zoom; truck.add(bw);
  return truck;
}

function Three() {
  const three = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(15 * CONFIG.zoom, 15 * CONFIG.zoom, 20 * CONFIG.zoom),
    new THREE.MeshPhongMaterial({ color: 0x4d2926, flatShading: true })
  );
  trunk.position.z = 10 * CONFIG.zoom; trunk.castShadow = true; trunk.receiveShadow = true;
  three.add(trunk);
  const height = threeHeights[Math.floor(Math.random() * threeHeights.length)];
  const crown = new THREE.Mesh(
    new THREE.BoxGeometry(30 * CONFIG.zoom, 30 * CONFIG.zoom, height * CONFIG.zoom),
    new THREE.MeshLambertMaterial({ color: CONFIG.darkMode ? 0x2d5a1e : 0x7aa21d, flatShading: true })
  );
  crown.position.z = (height / 2 + 20) * CONFIG.zoom;
  crown.castShadow = true; three.add(crown);
  return three;
}

function Chicken() {
  const chicken = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(CONFIG.chickenSize * CONFIG.zoom, CONFIG.chickenSize * CONFIG.zoom, 20 * CONFIG.zoom),
    new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true })
  );
  body.position.z = 10 * CONFIG.zoom; body.castShadow = true; body.receiveShadow = true;
  chicken.add(body);
  const rowel = new THREE.Mesh(
    new THREE.BoxGeometry(2 * CONFIG.zoom, 4 * CONFIG.zoom, 2 * CONFIG.zoom),
    new THREE.MeshLambertMaterial({ color: 0xF0619A, flatShading: true })
  );
  rowel.position.z = 21 * CONFIG.zoom; chicken.add(rowel);
  return chicken;
}

function Road() {
  const road = new THREE.Group();
  const sec = color => new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.boardWidth * CONFIG.zoom, CONFIG.positionWidth * CONFIG.zoom),
    new THREE.MeshPhongMaterial({ color })
  );
  const mid = sec(currentColorScheme.road); mid.receiveShadow = true; road.add(mid);
  const l = sec(currentColorScheme.roadSide); l.position.x = -CONFIG.boardWidth * CONFIG.zoom; road.add(l);
  const r = sec(currentColorScheme.roadSide); r.position.x = CONFIG.boardWidth * CONFIG.zoom; road.add(r);
  return road;
}

function Grass() {
  const grass = new THREE.Group();
  const sec = color => new THREE.Mesh(
    new THREE.BoxGeometry(CONFIG.boardWidth * CONFIG.zoom, CONFIG.positionWidth * CONFIG.zoom, 3 * CONFIG.zoom),
    new THREE.MeshPhongMaterial({ color })
  );
  const mid = sec(currentColorScheme.grass); mid.receiveShadow = true; grass.add(mid);
  const l = sec(currentColorScheme.grassSide); l.position.x = -CONFIG.boardWidth * CONFIG.zoom; grass.add(l);
  const r = sec(currentColorScheme.grassSide); r.position.x = CONFIG.boardWidth * CONFIG.zoom; grass.add(r);
  grass.position.z = 1.5 * CONFIG.zoom;
  return grass;
}

function Lane(index) {
  this.index = index;
  this.type = index <= 0 ? 'field' : laneTypes[Math.floor(Math.random() * laneTypes.length)];
  // laneWorldY: the world-space Y center of this lane
  this.laneWorldY = index * CONFIG.positionWidth * CONFIG.zoom;

  switch (this.type) {
    case 'field': this.mesh = new Grass(); break;
    case 'forest': {
      this.mesh = new Grass();
      this.occupiedPositions = new Set();
      this.threes = [1, 2, 3, 4].map(() => {
        const three = new Three();
        let position;
        do { position = Math.floor(Math.random() * CONFIG.columns); }
        while (this.occupiedPositions.has(position));
        this.occupiedPositions.add(position);
        three.position.x = (position * CONFIG.positionWidth + CONFIG.positionWidth / 2) * CONFIG.zoom - CONFIG.boardWidth * CONFIG.zoom / 2;
        this.mesh.add(three);
        return three;
      });
      break;
    }
    case 'car': {
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;
      const occ = new Set();
      this.vechicles = [1, 2, 3].map(() => {
        const v = new Car();
        let pos;
        do { pos = Math.floor(Math.random() * CONFIG.columns / 2); } while (occ.has(pos));
        occ.add(pos);
        // local X within the lane mesh
        v.position.x = (pos * CONFIG.positionWidth * 2 + CONFIG.positionWidth / 2) * CONFIG.zoom - CONFIG.boardWidth * CONFIG.zoom / 2;
        if (!this.direction) v.rotation.z = Math.PI;
        this.mesh.add(v);
        return v;
      });
      this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
      break;
    }
    case 'truck': {
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;
      const occ = new Set();
      this.vechicles = [1, 2].map(() => {
        const v = new Truck();
        let pos;
        do { pos = Math.floor(Math.random() * CONFIG.columns / 3); } while (occ.has(pos));
        occ.add(pos);
        v.position.x = (pos * CONFIG.positionWidth * 3 + CONFIG.positionWidth / 2) * CONFIG.zoom - CONFIG.boardWidth * CONFIG.zoom / 2;
        if (!this.direction) v.rotation.z = Math.PI;
        this.mesh.add(v);
        return v;
      });
      this.speed = laneSpeeds[Math.floor(Math.random() * laneSpeeds.length)];
      break;
    }
  }
}

const chicken = new Chicken();
scene.add(chicken);
dirLight.target = chicken;

const generateLanes = () =>
  [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map(index => {
      const lane = new Lane(index);
      lane.mesh.position.y = index * CONFIG.positionWidth * CONFIG.zoom;
      scene.add(lane.mesh);
      return lane;
    })
    .filter(lane => lane.index >= 0);

const addLane = () => {
  const index = lanes.length;
  const lane = new Lane(index);
  lane.mesh.position.y = index * CONFIG.positionWidth * CONFIG.zoom;
  scene.add(lane.mesh);
  lanes.push(lane);
};

const initaliseValues = () => {
  lanes = generateLanes();
  currentLane = 0;
  currentColumn = Math.floor(CONFIG.columns / 2);
  previousTimestamp = null;
  startMoving = false;
  moves = [];
  stepStartTimestamp = null;
  isDead = false;
  chicken.position.set(0, 0, 0);
  camera.position.y = initialCameraPositionY;
  camera.position.x = initialCameraPositionX;
  dirLight.position.x = initialDirLightPositionX;
  dirLight.position.y = initialDirLightPositionY;
};

function move(direction) {
  if (isDead) return;
  const finalPositions = moves.reduce((pos, m) => {
    if (m === 'forward') return { lane: pos.lane + 1, column: pos.column };
    if (m === 'backward') return { lane: pos.lane - 1, column: pos.column };
    if (m === 'left') return { lane: pos.lane, column: pos.column - 1 };
    if (m === 'right') return { lane: pos.lane, column: pos.column + 1 };
    return pos;
  }, { lane: currentLane, column: currentColumn });

  if (direction === 'forward') {
    if (lanes[finalPositions.lane + 1].type === 'forest' && lanes[finalPositions.lane + 1].occupiedPositions.has(finalPositions.column)) return;
    if (!stepStartTimestamp) startMoving = true;
    addLane();
  } else if (direction === 'backward') {
    if (finalPositions.lane === 0) return;
    if (lanes[finalPositions.lane - 1].type === 'forest' && lanes[finalPositions.lane - 1].occupiedPositions.has(finalPositions.column)) return;
    if (!stepStartTimestamp) startMoving = true;
  } else if (direction === 'left') {
    if (finalPositions.column === 0) return;
    if (lanes[finalPositions.lane].type === 'forest' && lanes[finalPositions.lane].occupiedPositions.has(finalPositions.column - 1)) return;
    if (!stepStartTimestamp) startMoving = true;
  } else if (direction === 'right') {
    if (finalPositions.column === CONFIG.columns - 1) return;
    if (lanes[finalPositions.lane].type === 'forest' && lanes[finalPositions.lane].occupiedPositions.has(finalPositions.column + 1)) return;
    if (!stepStartTimestamp) startMoving = true;
  }
  moves.push(direction);
}

function toggleDarkMode() {
  CONFIG.darkMode = !CONFIG.darkMode;
  currentColorScheme = CONFIG.darkMode ? COLORS.dark : COLORS.light;
  scene.background = new THREE.Color(currentColorScheme.sky);
  lanes.forEach(lane => {
    const isGrass = lane.type === 'field' || lane.type === 'forest';
    lane.mesh.children.forEach((section, i) => {
      if (section.material) {
        section.material.color.setHex(
          i === 0
            ? (isGrass ? currentColorScheme.grass : currentColorScheme.road)
            : (isGrass ? currentColorScheme.grassSide : currentColorScheme.roadSide)
        );
      }
    });
  });
}

// COLLISION DETECTION - world space
// Vehicles are children of lane.mesh, so their world X = lane.mesh.position.x + vehicle.position.x
// lane.mesh.position.x is always 0 (only Y varies), so vehicle world X = vehicle.position.x ✓
// But we must compare chicken Y against the lane's world Y center.
function checkCollision() {
  if (isDead) return false;

  const chickenWorldX = chicken.position.x;
  const chickenWorldY = chicken.position.y;
  const chickenHalfX = (CONFIG.chickenSize * CONFIG.zoom) / 2;

  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i];
    if (lane.type !== 'car' && lane.type !== 'truck') continue;

    // World Y center of this lane
    const laneWorldY = lane.mesh.position.y; // = i * positionWidth * zoom
    const laneHalfY = (CONFIG.positionWidth * CONFIG.zoom) / 2;

    // Only check lanes where the chicken is actually present (Y overlap)
    if (chickenWorldY < laneWorldY - laneHalfY) continue;
    if (chickenWorldY > laneWorldY + laneHalfY) continue;

    const vehicleHalfX = (lane.type === 'car' ? 60 : 105) * CONFIG.zoom / 2;

    for (const v of lane.vechicles) {
      // v.position.x is LOCAL to lane.mesh, but lane.mesh.position.x = 0 always
      // so world X of vehicle = v.position.x
      const vWorldX = v.position.x;
      if (
        chickenWorldX + chickenHalfX > vWorldX - vehicleHalfX &&
        chickenWorldX - chickenHalfX < vWorldX + vehicleHalfX
      ) {
        return true;
      }
    }
  }
  return false;
}

// Event listeners
document.querySelector('#retry').addEventListener('click', () => {
  lanes.forEach(lane => scene.remove(lane.mesh));
  initaliseValues();
  endDOM.style.visibility = 'hidden';
  endDOM.classList.remove('visible');
});
document.getElementById('forward').addEventListener('click', () => move('forward'));
document.getElementById('backward').addEventListener('click', () => move('backward'));
document.getElementById('left').addEventListener('click', () => move('left'));
document.getElementById('right').addEventListener('click', () => move('right'));
document.getElementById('darkMode').addEventListener('click', toggleDarkMode);

window.addEventListener('keydown', e => {
  if (e.keyCode === 38) move('forward');
  else if (e.keyCode === 40) move('backward');
  else if (e.keyCode === 37) move('left');
  else if (e.keyCode === 39) move('right');
  else if (e.key === 'd') toggleDarkMode();
});

// Renderer
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
const gameContainer = document.getElementById('game-container');
(gameContainer || document.body).appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.left = window.innerWidth / -2;
  camera.right = window.innerWidth / 2;
  camera.top = window.innerHeight / 2;
  camera.bottom = window.innerHeight / -2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// SWIPE - attach directly to the canvas after renderer is created
// The canvas is appended to #game-container, so we must wait for it to exist
(function initSwipe() {
  const canvas = renderer.domElement;
  let touchStartX = 0, touchStartY = 0, swiped = false;
  const THRESHOLD = 30;

  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
    swiped = false;
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (swiped) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < THRESHOLD && Math.abs(dy) < THRESHOLD) return;
    swiped = true;
    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? 'right' : 'left');
    } else {
      move(dy < 0 ? 'forward' : 'backward');
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    e.preventDefault();
  }, { passive: false });
})();

// Animation loop
function animate(timestamp) {
  requestAnimationFrame(animate);

  if (!previousTimestamp) previousTimestamp = timestamp;
  const delta = timestamp - previousTimestamp;
  previousTimestamp = timestamp;

  // Move vehicles
  lanes.forEach(lane => {
    if (lane.type === 'car' || lane.type === 'truck') {
      const edgeLeft = -CONFIG.boardWidth * CONFIG.zoom / 2 - CONFIG.positionWidth * 2 * CONFIG.zoom;
      const edgeRight = CONFIG.boardWidth * CONFIG.zoom / 2 + CONFIG.positionWidth * 2 * CONFIG.zoom;
      lane.vechicles.forEach(v => {
        if (lane.direction) {
          v.position.x = v.position.x < edgeLeft ? edgeRight : v.position.x - lane.speed / 16 * delta;
        } else {
          v.position.x = v.position.x > edgeRight ? edgeLeft : v.position.x + lane.speed / 16 * delta;
        }
      });
    }
  });

  if (startMoving) { stepStartTimestamp = timestamp; startMoving = false; }

  if (stepStartTimestamp) {
    const moveDeltaTime = timestamp - stepStartTimestamp;
    const moveDeltaDistance = Math.min(moveDeltaTime / CONFIG.stepTime, 1) * CONFIG.positionWidth * CONFIG.zoom;
    const jumpDeltaDistance = Math.sin(Math.min(moveDeltaTime / CONFIG.stepTime, 1) * Math.PI) * 8 * CONFIG.zoom;

    switch (moves[0]) {
      case 'forward': {
        const posY = currentLane * CONFIG.positionWidth * CONFIG.zoom + moveDeltaDistance;
        camera.position.y = initialCameraPositionY + posY;
        dirLight.position.y = initialDirLightPositionY + posY;
        chicken.position.y = posY;
        chicken.position.z = jumpDeltaDistance;
        break;
      }
      case 'backward': {
        const posY = currentLane * CONFIG.positionWidth * CONFIG.zoom - moveDeltaDistance;
        camera.position.y = initialCameraPositionY + posY;
        dirLight.position.y = initialDirLightPositionY + posY;
        chicken.position.y = posY;
        chicken.position.z = jumpDeltaDistance;
        break;
      }
      case 'left': {
        const posX = (currentColumn * CONFIG.positionWidth + CONFIG.positionWidth / 2) * CONFIG.zoom - CONFIG.boardWidth * CONFIG.zoom / 2 - moveDeltaDistance;
        camera.position.x = initialCameraPositionX + posX;
        dirLight.position.x = initialDirLightPositionX + posX;
        chicken.position.x = posX;
        chicken.position.z = jumpDeltaDistance;
        break;
      }
      case 'right': {
        const posX = (currentColumn * CONFIG.positionWidth + CONFIG.positionWidth / 2) * CONFIG.zoom - CONFIG.boardWidth * CONFIG.zoom / 2 + moveDeltaDistance;
        camera.position.x = initialCameraPositionX + posX;
        dirLight.position.x = initialDirLightPositionX + posX;
        chicken.position.x = posX;
        chicken.position.z = jumpDeltaDistance;
        break;
      }
    }

    if (moveDeltaTime > CONFIG.stepTime) {
      switch (moves[0]) {
        case 'forward': currentLane++; counterDOM.innerHTML = currentLane; break;
        case 'backward': currentLane--; counterDOM.innerHTML = currentLane; break;
        case 'left': currentColumn--; break;
        case 'right': currentColumn++; break;
      }
      moves.shift();
      stepStartTimestamp = moves.length === 0 ? null : timestamp;
    }
  }

  // Collision check every frame using world-space positions
  if (!isDead && checkCollision()) {
    isDead = true;
    endDOM.style.visibility = 'visible';
    endDOM.classList.add('visible');
  }

  renderer.render(scene, camera);
}

document.addEventListener('DOMContentLoaded', () => {
  initaliseValues();
  requestAnimationFrame(animate);
});

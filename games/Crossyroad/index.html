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
  boardWidth: 42 * 17 // positionWidth * columns
};

// Color schemes
const COLORS = {
  light: {
    sky: 0x87CEEB,
    road: 0x454A59,
    roadSide: 0x393D49,
    grass: 0xbaf455,
    grassSide: 0x99C846,
    vechicleColors: [0xa52523, 0xbdb638, 0x78b14b]
  },
  dark: {
    sky: 0x1a1a1a,
    road: 0x1c1c1c,
    roadSide: 0x151515,
    grass: 0x1e4620,
    grassSide: 0x143016,
    vechicleColors: [0x8b0000, 0x856d00, 0x2d5a1e]
  }
};

let currentColorScheme = COLORS.light;

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(COLORS.light.sky);

const camera = new THREE.OrthographicCamera(
  window.innerWidth/-2,
  window.innerWidth/2,
  window.innerHeight/2,
  window.innerHeight/-2,
  0.1,
  10000
);

// Camera positioning
camera.rotation.x = 50*Math.PI/180;
camera.rotation.y = 20*Math.PI/180;
camera.rotation.z = 10*Math.PI/180;

const initialCameraPositionY = -Math.tan(camera.rotation.x)*CONFIG.distance;
const initialCameraPositionX = Math.tan(camera.rotation.y)*Math.sqrt(CONFIG.distance**2 + initialCameraPositionY**2);
camera.position.y = initialCameraPositionY;
camera.position.x = initialCameraPositionX;
camera.position.z = CONFIG.distance;

// Lighting
const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
scene.add(hemiLight);

const initialDirLightPositionX = -100;
const initialDirLightPositionY = -100;
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(initialDirLightPositionX, initialDirLightPositionY, 200);
dirLight.castShadow = true;
scene.add(dirLight);

dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
var d = 500;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;

const backLight = new THREE.DirectionalLight(0x000000, .4);
backLight.position.set(200, 200, 50);
backLight.castShadow = true;
scene.add(backLight);

// Game variables
const laneTypes = ['car', 'truck', 'forest'];
const laneSpeeds = [2, 2.5, 3];
const threeHeights = [20, 45, 60];
let lanes;
let currentLane;
let currentColumn;
let previousTimestamp;
let startMoving;
let moves;
let stepStartTimestamp;

// Textures
const carFrontTexture = new Texture(40,80,[{x: 0, y: 10, w: 30, h: 60}]);
const carBackTexture = new Texture(40,80,[{x: 10, y: 10, w: 30, h: 60}]);
const carRightSideTexture = new Texture(110,40,[{x: 10, y: 0, w: 50, h: 30}, {x: 70, y: 0, w: 30, h: 30}]);
const carLeftSideTexture = new Texture(110,40,[{x: 10, y: 10, w: 50, h: 30}, {x: 70, y: 10, w: 30, h: 30}]);

const truckFrontTexture = new Texture(30,30,[{x: 15, y: 0, w: 10, h: 30}]);
const truckRightSideTexture = new Texture(25,30,[{x: 0, y: 15, w: 10, h: 10}]);
const truckLeftSideTexture = new Texture(25,30,[{x: 0, y: 5, w: 10, h: 10}]);

// Texture creation function
function Texture(width, height, rects) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "rgba(0,0,0,0.6)";
  rects.forEach(rect => {
    context.fillRect(rect.x, rect.y, rect.w, rect.h);
  });
  return new THREE.CanvasTexture(canvas);
}

// Component creation functions
function Wheel() {
  const wheel = new THREE.Mesh(
    new THREE.BoxGeometry(12*CONFIG.zoom, 33*CONFIG.zoom, 12*CONFIG.zoom),
    new THREE.MeshLambertMaterial({color: 0x333333, flatShading: true})
  );
  wheel.position.z = 6*CONFIG.zoom;
  return wheel;
}

function Car() {
  const car = new THREE.Group();
  const color = currentColorScheme.vechicleColors[Math.floor(Math.random() * currentColorScheme.vechicleColors.length)];

  const main = new THREE.Mesh(
    new THREE.BoxGeometry(60*CONFIG.zoom, 30*CONFIG.zoom, 15*CONFIG.zoom),
    new THREE.MeshPhongMaterial({color, flatShading: true})
  );
  main.position.z = 12*CONFIG.zoom;
  main.castShadow = true;
  main.receiveShadow = true;
  car.add(main);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(33*CONFIG.zoom, 24*CONFIG.zoom, 12*CONFIG.zoom),
    [
      new THREE.MeshPhongMaterial({color: 0xcccccc, flatShading: true, map: carBackTexture}),
      new THREE.MeshPhongMaterial({color: 0xcccccc, flatShading: true, map: carFrontTexture}),
      new THREE.MeshPhongMaterial({color: 0xcccccc, flatShading: true, map: carRightSideTexture}),
      new THREE.MeshPhongMaterial({color: 0xcccccc, flatShading: true, map: carLeftSideTexture}),
      new THREE.MeshPhongMaterial({color: 0xcccccc, flatShading: true}),
      new THREE.MeshPhongMaterial({color: 0xcccccc, flatShading: true})
    ]
  );
  cabin.position.x = 6*CONFIG.zoom;
  cabin.position.z = 25.5*CONFIG.zoom;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  car.add(cabin);

  const frontWheel = new Wheel();
  frontWheel.position.x = -18*CONFIG.zoom;
  car.add(frontWheel);

  const backWheel = new Wheel();
  backWheel.position.x = 18*CONFIG.zoom;
  car.add(backWheel);

  car.castShadow = true;
  car.receiveShadow = false;

  return car;
}

function Truck() {
  const truck = new THREE.Group();
  const color = currentColorScheme.vechicleColors[Math.floor(Math.random() * currentColorScheme.vechicleColors.length)];

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(100*CONFIG.zoom, 25*CONFIG.zoom, 5*CONFIG.zoom),
    new THREE.MeshLambertMaterial({color: 0xb4c6fc, flatShading: true})
  );
  base.position.z = 10*CONFIG.zoom;
  truck.add(base);

  const cargo = new THREE.Mesh(
    new THREE.BoxGeometry(75*CONFIG.zoom, 35*CONFIG.zoom, 40*CONFIG.zoom),
    new THREE.MeshPhongMaterial({color: 0xb4c6fc, flatShading: true})
  );
  cargo.position.x = 15*CONFIG.zoom;
  cargo.position.z = 30*CONFIG.zoom;
  cargo.castShadow = true;
  cargo.receiveShadow = true;
  truck.add(cargo);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(25*CONFIG.zoom, 30*CONFIG.zoom, 30*CONFIG.zoom),
    [
      new THREE.MeshPhongMaterial({color, flatShading: true}),
      new THREE.MeshPhongMaterial({color, flatShading: true, map: truckFrontTexture}),
      new THREE.MeshPhongMaterial({color, flatShading: true, map: truckRightSideTexture}),
      new THREE.MeshPhongMaterial({color, flatShading: true, map: truckLeftSideTexture}),
      new THREE.MeshPhongMaterial({color, flatShading: true}),
      new THREE.MeshPhongMaterial({color, flatShading: true})
    ]
  );
  cabin.position.x = -40*CONFIG.zoom;
  cabin.position.z = 20*CONFIG.zoom;
  cabin.castShadow = true;
  cabin.receiveShadow = true;
  truck.add(cabin);

  const frontWheel = new Wheel();
  frontWheel.position.x = -38*CONFIG.zoom;
  truck.add(frontWheel);

  const middleWheel = new Wheel();
  middleWheel.position.x = -10*CONFIG.zoom;
  truck.add(middleWheel);

  const backWheel = new Wheel();
  backWheel.position.x = 30*CONFIG.zoom;
  truck.add(backWheel);

  return truck;
}

function Three() {
  const three = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(15*CONFIG.zoom, 15*CONFIG.zoom, 20*CONFIG.zoom),
    new THREE.MeshPhongMaterial({color: 0x4d2926, flatShading: true})
  );
  trunk.position.z = 10*CONFIG.zoom;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  three.add(trunk);

  const height = threeHeights[Math.floor(Math.random()*threeHeights.length)];
  const crown = new THREE.Mesh(
    new THREE.BoxGeometry(30*CONFIG.zoom, 30*CONFIG.zoom, height*CONFIG.zoom),
    new THREE.MeshLambertMaterial({color: CONFIG.darkMode ? 0x2d5a1e : 0x7aa21d, flatShading: true})
  );
  crown.position.z = (height/2+20)*CONFIG.zoom;
  crown.castShadow = true;
  crown.receiveShadow = false;
  three.add(crown);

  return three;
}

function Chicken() {
  const chicken = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(CONFIG.chickenSize*CONFIG.zoom, CONFIG.chickenSize*CONFIG.zoom, 20*CONFIG.zoom),
    new THREE.MeshPhongMaterial({color: 0xffffff, flatShading: true})
  );
  body.position.z = 10*CONFIG.zoom;
  body.castShadow = true;
  body.receiveShadow = true;
  chicken.add(body);

  const rowel = new THREE.Mesh(
    new THREE.BoxGeometry(2*CONFIG.zoom, 4*CONFIG.zoom, 2*CONFIG.zoom),
    new THREE.MeshLambertMaterial({color: 0xF0619A, flatShading: true})
  );
  rowel.position.z = 21*CONFIG.zoom;
  rowel.castShadow = true;
  rowel.receiveShadow = false;
  chicken.add(rowel);

  return chicken;
}

function Road() {
  const road = new THREE.Group();

  const createSection = color => new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.boardWidth*CONFIG.zoom, CONFIG.positionWidth*CONFIG.zoom),
    new THREE.MeshPhongMaterial({color})
  );

  const middle = createSection(currentColorScheme.road);
  middle.receiveShadow = true;
  road.add(middle);

  const left = createSection(currentColorScheme.roadSide);
  left.position.x = -CONFIG.boardWidth*CONFIG.zoom;
  road.add(left);

  const right = createSection(currentColorScheme.roadSide);
  right.position.x = CONFIG.boardWidth*CONFIG.zoom;
  road.add(right);

  return road;
}

function Grass() {
  const grass = new THREE.Group();

  const createSection = color => new THREE.Mesh(
    new THREE.BoxGeometry(CONFIG.boardWidth*CONFIG.zoom, CONFIG.positionWidth*CONFIG.zoom, 3*CONFIG.zoom),
    new THREE.MeshPhongMaterial({color})
  );

  const middle = createSection(currentColorScheme.grass);
  middle.receiveShadow = true;
  grass.add(middle);

  const left = createSection(currentColorScheme.grassSide);
  left.position.x = -CONFIG.boardWidth*CONFIG.zoom;
  grass.add(left);

  const right = createSection(currentColorScheme.grassSide);
  right.position.x = CONFIG.boardWidth*CONFIG.zoom;
  grass.add(right);

  grass.position.z = 1.5*CONFIG.zoom;
  return grass;
}

function Lane(index) {
  this.index = index;
  this.type = index <= 0 ? 'field' : laneTypes[Math.floor(Math.random()*laneTypes.length)];

  switch(this.type) {
    case 'field': {
      this.mesh = new Grass();
      break;
    }
    case 'forest': {
      this.mesh = new Grass();

      this.occupiedPositions = new Set();
      this.threes = [1,2,3,4].map(() => {
        const three = new Three();
        let position;
        do {
          position = Math.floor(Math.random()*CONFIG.columns);
        } while(this.occupiedPositions.has(position));
        this.occupiedPositions.add(position);
        three.position.x = (position*CONFIG.positionWidth+CONFIG.positionWidth/2)*CONFIG.zoom-CONFIG.boardWidth*CONFIG.zoom/2;
        this.mesh.add(three);
        return three;
      });
      break;
    }
    case 'car': {
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;

      const occupiedPositions = new Set();
      this.vechicles = [1,2,3].map(() => {
        const vechicle = new Car();
        let position;
        do {
          position = Math.floor(Math.random()*CONFIG.columns/2);
        } while(occupiedPositions.has(position));
        occupiedPositions.add(position);
        vechicle.position.x = (position*CONFIG.positionWidth*2+CONFIG.positionWidth/2)*CONFIG.zoom-CONFIG.boardWidth*CONFIG.zoom/2;
        if(!this.direction) vechicle.rotation.z = Math.PI;
        this.mesh.add(vechicle);
        return vechicle;
      });

      this.speed = laneSpeeds[Math.floor(Math.random()*laneSpeeds.length)];
      break;
    }
    case 'truck': {
      this.mesh = new Road();
      this.direction = Math.random() >= 0.5;

      const occupiedPositions = new Set();
      this.vechicles = [1,2].map(() => {
        const vechicle = new Truck();
        let position;
        do {
          position = Math.floor(Math.random()*CONFIG.columns/3);
        } while(occupiedPositions.has(position));
        occupiedPositions.add(position);
        vechicle.position.x = (position*CONFIG.positionWidth*3+CONFIG.positionWidth/2)*CONFIG.zoom-CONFIG.boardWidth*CONFIG.zoom/2;
        if(!this.direction) vechicle.rotation.z = Math.PI;
        this.mesh.add(vechicle);
        return vechicle;
      });

      this.speed = laneSpeeds[Math.floor(Math.random()*laneSpeeds.length)];
      break;
    }
  }
}

// Game setup functions
const chicken = new Chicken();
scene.add(chicken);
dirLight.target = chicken;

const generateLanes = () => [-9,-8,-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7,8,9].map((index) => {
  const lane = new Lane(index);
  lane.mesh.position.y = index*CONFIG.positionWidth*CONFIG.zoom;
  scene.add(lane.mesh);
  return lane;
}).filter((lane) => lane.index >= 0);

const addLane = () => {
  const index = lanes.length;
  const lane = new Lane(index);
  lane.mesh.position.y = index*CONFIG.positionWidth*CONFIG.zoom;
  scene.add(lane.mesh);
  lanes.push(lane);
}

const initaliseValues = () => {
  lanes = generateLanes();
  currentLane = 0;
  currentColumn = Math.floor(CONFIG.columns/2);
  previousTimestamp = null;
  startMoving = false;
  moves = [];
  stepStartTimestamp = null;

  chicken.position.x = 0;
  chicken.position.y = 0;

  camera.position.y = initialCameraPositionY;
  camera.position.x = initialCameraPositionX;

  dirLight.position.x = initialDirLightPositionX;
  dirLight.position.y = initialDirLightPositionY;
}

// Movement and game controls
function move(direction) {
  const finalPositions = moves.reduce((position, move) => {
    if(move === 'forward') return {lane: position.lane+1, column: position.column};
    if(move === 'backward') return {lane: position.lane-1, column: position.column};
    if(move === 'left') return {lane: position.lane, column: position.column-1};
    if(move === 'right') return {lane: position.lane, column: position.column+1};
    return position;  // Add default return
  }, {lane: currentLane, column: currentColumn});

  if (direction === 'forward') {
    if(lanes[finalPositions.lane+1].type === 'forest' && lanes[finalPositions.lane+1].occupiedPositions.has(finalPositions.column)) return;
    if(!stepStartTimestamp) startMoving = true;
    addLane();
  }
  else if (direction === 'backward') {
    if(finalPositions.lane === 0) return;
    if(lanes[finalPositions.lane-1].type === 'forest' && lanes[finalPositions.lane-1].occupiedPositions.has(finalPositions.column)) return;
    if(!stepStartTimestamp) startMoving = true;
  }
  else if (direction === 'left') {
    if(finalPositions.column === 0) return;
    if(lanes[finalPositions.lane].type === 'forest' && lanes[finalPositions.lane].occupiedPositions.has(finalPositions.column-1)) return;
    if(!stepStartTimestamp) startMoving = true;
  }
  else if (direction === 'right') {
    if(finalPositions.column === CONFIG.columns - 1) return;
    if(lanes[finalPositions.lane].type === 'forest' && lanes[finalPositions.lane].occupiedPositions.has(finalPositions.column+1)) return;
    if(!stepStartTimestamp) startMoving = true;
  }
  moves.push(direction);
}

function toggleDarkMode() {
  CONFIG.darkMode = !CONFIG.darkMode;
  currentColorScheme = CONFIG.darkMode ? COLORS.dark : COLORS.light;
  scene.background = new THREE.Color(currentColorScheme.sky);
  
  lanes.forEach(lane => {
    if (lane.type === 'field' || lane.type === 'forest') {
      lane.mesh.children.forEach((section, index) => {
        if (section.material) {
          section.material.color.setHex(
            index === 0 ? currentColorScheme.grass : currentColorScheme.grassSide
          );
        }
      });
    } else {
      lane.mesh.children.forEach((section, index) => {
        if (section.material) {
          section.material.color.setHex(
            index === 0 ? currentColorScheme.road : currentColorScheme.roadSide
          );
        }
      });
    }
  });
}

// Event listeners
document.querySelector("#retry").addEventListener("click", () => {
  lanes.forEach(lane => scene.remove(lane.mesh));
  initaliseValues();
  endDOM.style.visibility = 'hidden';
});

document.getElementById('forward').addEventListener("click", () => move('forward'));
document.getElementById('backward').addEventListener("click", () => move('backward'));
document.getElementById('left').addEventListener("click", () => move('left'));
document.getElementById('right').addEventListener("click", () => move('right'));
document.getElementById('darkMode').addEventListener("click", toggleDarkMode);

window.addEventListener("keydown", event => {
  if (event.keyCode == '38') {
    move('forward');
  }
  else if (event.keyCode == '40') {
    move('backward');
  }
  else if (event.keyCode == '37') {
    move('left');
  }
  else if (event.keyCode == '39') {
    move('right');
  }
  else if (event.key === 'd') {
    toggleDarkMode();
  }
});

// Renderer setup
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true
});
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
const gameContainer = document.getElementById('game-container');
if (gameContainer) {
    gameContainer.appendChild(renderer.domElement);
} else {
    document.body.appendChild(renderer.domElement);
}

// Add window resize handler
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.left = width / -2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = height / -2;
    
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// Animation loop
function animate(timestamp) {
  requestAnimationFrame(animate);

  if(!previousTimestamp) previousTimestamp = timestamp;
  const delta = timestamp - previousTimestamp;
  previousTimestamp = timestamp;

  // Animate vehicles
  lanes.forEach(lane => {
    if(lane.type === 'car' || lane.type === 'truck') {
      const aBitBeforeTheBeginingOfLane = -CONFIG.boardWidth*CONFIG.zoom/2 - CONFIG.positionWidth*2*CONFIG.zoom;
      const aBitAfterTheEndOFLane = CONFIG.boardWidth*CONFIG.zoom/2 + CONFIG.positionWidth*2*CONFIG.zoom;
      lane.vechicles.forEach(vechicle => {
        if(lane.direction) {
          vechicle.position.x = vechicle.position.x < aBitBeforeTheBeginingOfLane ? aBitAfterTheEndOFLane : vechicle.position.x -= lane.speed/16*delta;
        } else {
          vechicle.position.x = vechicle.position.x > aBitAfterTheEndOFLane ? aBitBeforeTheBeginingOfLane : vechicle.position.x += lane.speed/16*delta;
        }
      });
    }
  });

  // Handle movement animation
  if(startMoving) {
    stepStartTimestamp = timestamp;
    startMoving = false;
  }

  if(stepStartTimestamp) {
    const moveDeltaTime = timestamp - stepStartTimestamp;
    const moveDeltaDistance = Math.min(moveDeltaTime/CONFIG.stepTime,1)*CONFIG.positionWidth*CONFIG.zoom;
    const jumpDeltaDistance = Math.sin(Math.min(moveDeltaTime/CONFIG.stepTime,1)*Math.PI)*8*CONFIG.zoom;
    
    switch(moves[0]) {
      case 'forward': {
        const positionY = currentLane*CONFIG.positionWidth*CONFIG.zoom + moveDeltaDistance;
        camera.position.y = initialCameraPositionY + positionY;
        dirLight.position.y = initialDirLightPositionY + positionY;
        chicken.position.y = positionY;
        chicken.position.z = jumpDeltaDistance;
        break;
      }
      case 'backward': {
        const positionY = currentLane*CONFIG.positionWidth*CONFIG.zoom - moveDeltaDistance;
        camera.position.y = initialCameraPositionY + positionY;
        dirLight.position.y = initialDirLightPositionY + positionY;
        chicken.position.y = positionY;
        chicken.position.z = jumpDeltaDistance;
        break;
      }
      case 'left': {
        const positionX = (currentColumn*CONFIG.positionWidth+CONFIG.positionWidth/2)*CONFIG.zoom -CONFIG.boardWidth*CONFIG.zoom/2 - moveDeltaDistance;
        camera.position.x = initialCameraPositionX + positionX;
        dirLight.position.x = initialDirLightPositionX + positionX;
        chicken.position.x = positionX;
        chicken.position.z = jumpDeltaDistance;
        break;
      }
      case 'right': {
        const positionX = (currentColumn*CONFIG.positionWidth+CONFIG.positionWidth/2)*CONFIG.zoom -CONFIG.boardWidth*CONFIG.zoom/2 + moveDeltaDistance;
        camera.position.x = initialCameraPositionX + positionX;
        dirLight.position.x = initialDirLightPositionX + positionX;
        chicken.position.x = positionX;
        chicken.position.z = jumpDeltaDistance;
        break;
      }
    }

    if(moveDeltaTime > CONFIG.stepTime) {
      switch(moves[0]) {
        case 'forward': {
          currentLane++;
          counterDOM.innerHTML = currentLane;
          break;
        }
        case 'backward': {
          currentLane--;
          counterDOM.innerHTML = currentLane;
          break;
        }
        case 'left': {
          currentColumn--;
          break;
        }
        case 'right': {
          currentColumn++;
          break;
        }
      }
      moves.shift();
      stepStartTimestamp = moves.length === 0 ? null : timestamp;
    }
  }

  // Collision detection
  if(lanes[currentLane].type === 'car' || lanes[currentLane].type === 'truck') {
    const chickenMinX = chicken.position.x - CONFIG.chickenSize*CONFIG.zoom/2;
    const chickenMaxX = chicken.position.x + CONFIG.chickenSize*CONFIG.zoom/2;
    const vechicleLength = { car: 60, truck: 105}[lanes[currentLane].type];
    
    lanes[currentLane].vechicles.forEach(vechicle => {
      const carMinX = vechicle.position.x - vechicleLength*CONFIG.zoom/2;
      const carMaxX = vechicle.position.x + vechicleLength*CONFIG.zoom/2;
      if(chickenMaxX > carMinX && chickenMinX < carMaxX) {
        endDOM.style.visibility = 'visible';
      }
    });
  }
  
  renderer.render(scene, camera);
}

// Initialize and start the game
document.addEventListener('DOMContentLoaded', () => {
    initaliseValues();
    requestAnimationFrame(animate);
});

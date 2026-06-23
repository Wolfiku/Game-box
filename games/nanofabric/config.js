/* NanoFactory — config.js */

const GRID_COLS = 40;
const GRID_ROWS = 30;
const TILE_SIZE = 48;
const TICK_MS    = 500;
const TICK_DELTA = 0.5;
const MAX_OFFLINE = 28800;

const T = {
  EMPTY:   0,
  BELT_R:  1, BELT_L: 2, BELT_U: 3, BELT_D: 4,
  // Splitters / mergers (smart belts) — kept for explicit use but belts auto-split now
  SPLIT_R: 5, SPLIT_L: 6, SPLIT_U: 7, SPLIT_D: 8,
  MERGE_R: 9,
  MINER:        10,
  SMELTER:      11,
  WIRE_MILL:    12,
  FORGE:        13,
  ASSEMBLY:     14,
  BATTERY_PLANT:15,
  CELL_FACTORY: 16,
  LAB:          17,
  COAL_GEN:     18,
  SOLAR:        19,
  NUCLEAR:      20,
  CHEST:        21,
  // Collector (3x3, anchor = top-left corner)
  COLLECTOR:    22,
  COLL_BODY:    23,
  // Advanced collector (upgradeable)
  COLLECTOR2:   24,
  COLL2_BODY:   25,
  PATCH_IRON:   30,
  PATCH_COPPER: 31,
  PATCH_COAL:   32,
};

const BELT_STRAIGHT = new Set([T.BELT_R, T.BELT_L, T.BELT_U, T.BELT_D]);
const BELT_SPLIT    = new Set([T.SPLIT_R, T.SPLIT_L, T.SPLIT_U, T.SPLIT_D]);
const BELT_MERGE    = new Set([T.MERGE_R]);
const BELT_SET      = new Set([...BELT_STRAIGHT, ...BELT_SPLIT, ...BELT_MERGE]);
const PATCH_SET     = new Set([T.PATCH_IRON, T.PATCH_COPPER, T.PATCH_COAL]);
const COLL_TYPES    = new Set([T.COLLECTOR, T.COLLECTOR2]);
const COLL_BODY     = new Set([T.COLL_BODY, T.COLL2_BODY]);

// Straight belt direction
const DIR_OFFSET = {
  [T.BELT_R]:[ 1, 0], [T.BELT_L]:[-1, 0], [T.BELT_U]:[ 0,-1], [T.BELT_D]:[ 0, 1],
  [T.SPLIT_R]:[ 1, 0],[T.SPLIT_L]:[-1, 0],[T.SPLIT_U]:[ 0,-1],[T.SPLIT_D]:[ 0, 1],
  [T.MERGE_R]:[ 1, 0],
};
// Splitter side outputs (perpendicular to dir)
const SPLIT_SIDES = {
  [T.SPLIT_R]:[[0,-1],[0,1]], [T.SPLIT_L]:[[0,1],[0,-1]],
  [T.SPLIT_U]:[[-1,0],[1,0]], [T.SPLIT_D]:[[1,0],[-1,0]],
};
// Merger input sides (perpendicular)
const MERGE_INPUTS = {
  [T.MERGE_R]:[[0,-1],[0,1]],
};

// Auto-split perpendicular offsets for straight belts (relative to direction)
// For a belt going in direction d, AUTO_SPLIT_PERP gives the two side offsets
const AUTO_SPLIT_PERP = {
  [T.BELT_R]:[[0,-1],[0,1]],
  [T.BELT_L]:[[0,-1],[0,1]],
  [T.BELT_U]:[[-1,0],[1,0]],
  [T.BELT_D]:[[-1,0],[1,0]],
};

const PATCH_RES = {
  [T.PATCH_IRON]:  'iron_ore',
  [T.PATCH_COPPER]:'copper_ore',
  [T.PATCH_COAL]:  'coal',
};

const ITEM_COLOR = {
  iron_ore:'#a0a8b8', copper_ore:'#c87941', coal:'#666',
  iron_plate:'#ccd',  copper_plate:'#c87941',
  copper_wire:'#e09050', steel:'#8899aa',
  circuit_board:'#4f8ef7', battery:'#f5a623', energy_cell:'#e94560',
  research_points:'#4caf7d',
};

const BUILDINGS = [
  // Belts
  {id:'belt_r', tileType:T.BELT_R, icon:'belt_r', name:'Belt R', category:'belt', placeCost:null},
  {id:'belt_d', tileType:T.BELT_D, icon:'belt_d', name:'Belt D', category:'belt', placeCost:null},
  {id:'belt_l', tileType:T.BELT_L, icon:'belt_l', name:'Belt L', category:'belt', placeCost:null},
  {id:'belt_u', tileType:T.BELT_U, icon:'belt_u', name:'Belt U', category:'belt', placeCost:null},
  // Smart belts (explicit)
  {id:'split_r', tileType:T.SPLIT_R, icon:'split_r', name:'Split R', category:'belt', placeCost:null, description:'Splits belt output to left+right'},
  {id:'split_d', tileType:T.SPLIT_D, icon:'split_d', name:'Split D', category:'belt', placeCost:null},
  {id:'split_l', tileType:T.SPLIT_L, icon:'split_l', name:'Split L', category:'belt', placeCost:null},
  {id:'split_u', tileType:T.SPLIT_U, icon:'split_u', name:'Split U', category:'belt', placeCost:null},
  {id:'merge_r', tileType:T.MERGE_R, icon:'merge_r', name:'Merge R', category:'belt', placeCost:null, description:'Merges two belts into one (outputs right)'},
  // Miner
  {id:'miner', tileType:T.MINER, icon:'miner', name:'Miner', category:'mining',
   placeCost:null, craftTime:3.0},
  // Collector (3x3) — free at game start, cost for manual placement later
  {id:'collector', tileType:T.COLLECTOR, icon:'chest', name:'Collector', category:'storage',
   placeCost:{iron_plate:20},
   description:'3x3 hub. Bring belts to any edge tile to collect items into global inventory.',
   size:3,
  },
  // Advanced Collector (3x3, unlockable)
  {id:'collector2', tileType:T.COLLECTOR2, icon:'chest', name:'Adv. Collector', category:'storage',
   placeCost:{steel:50, circuit_board:10},
   description:'3x3 advanced hub. Filters and collects items. Unlocked by research.',
   size:3, unlockedByResearch:'stack_inserter',
  },
  // Processing
  // FIX #4: Smelter now requires coal + iron_ore → iron_plate
  // FIX #5: Wire Mill now requires copper_plate (smelted copper) instead of copper_ore
  {id:'smelter',       tileType:T.SMELTER,       icon:'smelter',       name:'Smelter',       category:'processing', placeCost:{iron_ore:50},   input:{iron_ore:1, coal:1},          output:{iron_plate:1},   craftTime:2, energyCost:2},
  {id:'copper_smelter',tileType:T.COPPER_SMELTER,icon:'smelter',       name:'Copper Smelter',category:'processing', placeCost:{iron_ore:30},   input:{copper_ore:1, coal:1},        output:{copper_plate:1}, craftTime:2, energyCost:2},
  {id:'wire_mill',     tileType:T.WIRE_MILL,     icon:'wire_mill',     name:'Wire Mill',     category:'processing', placeCost:{copper_ore:50}, input:{copper_plate:1},              output:{copper_wire:2},  craftTime:2, energyCost:1},
  {id:'forge',         tileType:T.FORGE,         icon:'forge',         name:'Forge',         category:'processing', placeCost:{iron_plate:100},input:{iron_plate:1,coal:1},         output:{steel:1},        craftTime:4, energyCost:4},
  {id:'assembly',      tileType:T.ASSEMBLY,      icon:'assembly',      name:'Assembly',      category:'processing', placeCost:{iron_plate:200},input:{copper_wire:1,iron_plate:1},  output:{circuit_board:1},craftTime:3, energyCost:3},
  {id:'battery_plant', tileType:T.BATTERY_PLANT, icon:'battery_plant', name:'Battery Plant', category:'processing', placeCost:{steel:200},     input:{copper_wire:2,steel:1},       output:{battery:1},      craftTime:3, energyCost:2},
  {id:'cell_factory',  tileType:T.CELL_FACTORY,  icon:'cell_factory',  name:'Cell Factory',  category:'processing', placeCost:{circuit_board:50},input:{battery:1,circuit_board:1},output:{energy_cell:1},  craftTime:5, energyCost:5},
  {id:'lab',           tileType:T.LAB,           icon:'lab',           name:'Lab',           category:'processing', placeCost:{circuit_board:30},input:{circuit_board:1},           output:{research_points:1},craftTime:4,energyCost:3},
  // Power
  {id:'coal_gen', tileType:T.COAL_GEN, icon:'coal_gen', name:'Coal Gen', category:'power', placeCost:{iron_plate:80},  input:{coal:2}, output:{mw:10}, energyCost:0, powerOut:10},
  {id:'solar',    tileType:T.SOLAR,    icon:'solar',    name:'Solar',    category:'power', placeCost:{circuit_board:20},input:null,     output:{mw:5},  energyCost:0, powerOut:5,  unlockedByResearch:'solar_technology'},
  {id:'nuclear',  tileType:T.NUCLEAR,  icon:'nuclear',  name:'Nuclear',  category:'power', placeCost:{energy_cell:200},input:{energy_cell:0.2},output:{mw:200},energyCost:0,powerOut:200,unlockedByResearch:'nuclear_research'},
  // Legacy chest
  {id:'chest', tileType:T.CHEST, icon:'chest', name:'Chest', category:'storage', placeCost:{iron_plate:30}, capacity:200},
];

// Add COPPER_SMELTER tile type
T.COPPER_SMELTER = 26;

const BUILDING_BY_TYPE = {};
for (const b of BUILDINGS) BUILDING_BY_TYPE[b.tileType] = b;
BUILDING_BY_TYPE[T.COLL_BODY]  = BUILDING_BY_TYPE[T.COLLECTOR];
BUILDING_BY_TYPE[T.COLL2_BODY] = BUILDING_BY_TYPE[T.COLLECTOR2];

const RESOURCES = [
  {id:'iron_ore',      name:'Iron Ore',      color:'#a0a8b8'},
  {id:'copper_ore',    name:'Copper Ore',    color:'#c87941'},
  {id:'coal',          name:'Coal',          color:'#666'},
  {id:'iron_plate',    name:'Iron Plate',    color:'#ccd'},
  {id:'copper_plate',  name:'Copper Plate',  color:'#c87941'},
  {id:'copper_wire',   name:'Copper Wire',   color:'#e09050'},
  {id:'steel',         name:'Steel',         color:'#8899aa'},
  {id:'circuit_board', name:'Circuit Board', color:'#4f8ef7'},
  {id:'battery',       name:'Battery',       color:'#f5a623'},
  {id:'energy_cell',   name:'Energy Cell',   color:'#e94560'},
  {id:'research_points',name:'RP',           color:'#4caf7d'},
];
const RES_BY_ID = {};
for (const r of RESOURCES) RES_BY_ID[r.id] = r;

// FIX #6: Research unlock costs now require real materials
const RESEARCH = [
  {id:'efficient_mining_1',name:'Efficient Mining I',  category:'production',cost_rp:100, mat_cost:{iron_plate:50},  description:'Miners +50% speed',       requires:null,                 effect:{mineMultiplier:0.5}},
  {id:'efficient_mining_2',name:'Efficient Mining II', category:'production',cost_rp:500, mat_cost:{iron_plate:200, coal:100}, description:'Miners +100% speed',      requires:'efficient_mining_1', effect:{mineMultiplier:1.0}},
  {id:'advanced_smelting', name:'Advanced Smelting',   category:'production',cost_rp:300, mat_cost:{iron_plate:100, coal:50},  description:'Smelter 2x speed',        requires:null,                 effect:{smelterMult:1.0}},
  {id:'alloy_mastery',     name:'Alloy Mastery',       category:'production',cost_rp:800, mat_cost:{steel:100},     description:'Forge 2x speed',          requires:null,                 effect:{forgeMult:1.0}},
  {id:'solar_technology',  name:'Solar Technology',    category:'energy',    cost_rp:600, mat_cost:{circuit_board:30, iron_plate:100}, description:'Unlocks Solar Panels', requires:null,                 effect:{unlock:'solar'}},
  {id:'grid_optimization', name:'Grid Optimization',   category:'energy',    cost_rp:1500,mat_cost:{circuit_board:80, steel:50},  description:'Generators +20% output', requires:null,                 effect:{genMult:0.2}},
  {id:'nuclear_research',  name:'Nuclear Research',    category:'energy',    cost_rp:5000,mat_cost:{energy_cell:20, circuit_board:200}, description:'Unlocks Nuclear Reactor',requires:null,                 effect:{unlock:'nuclear'}},
  {id:'belt_speed_1',      name:'Fast Belts I',        category:'automation',cost_rp:400, mat_cost:{iron_plate:150},description:'Belts 2x faster',         requires:null,                 effect:{beltSpeed:2}},
  {id:'belt_speed_2',      name:'Fast Belts II',       category:'automation',cost_rp:2000,mat_cost:{steel:80, circuit_board:20}, description:'Belts 4x faster',         requires:'belt_speed_1',       effect:{beltSpeed:4}},
  {id:'stack_inserter',    name:'Stack Inserter',      category:'automation',cost_rp:3000,mat_cost:{circuit_board:100, steel:150}, description:'Unlocks Adv. Collector',  requires:null,                 effect:{batchMult:2}},
];

const LORE = [
  {id:'start',      title:'Day 0',      text:'Bunker lights flicker. A broken pickaxe.',         unlockCondition:()=>true},
  {id:'first_iron', title:'First Ore',  text:'Ore found. The earth remembers.',                  unlockCondition:(s)=>(s.totalMined['iron_ore']||0)>=10},
  {id:'first_belt', title:'The Grid',   text:'Items flow. The factory breathes.',                unlockCondition:(s)=>s.totalBelts>=5},
  {id:'first_power',title:'Power Up',   text:'Machines exhale for the first time.',              unlockCondition:(s)=>s.power.generated>=10},
  {id:'100mw',      title:'100 MW',     text:'Something stirs in the dark outside.',             unlockCondition:(s)=>s.power.generated>=100},
  {id:'first_cell', title:'Energy Cell',text:'It hums. The mission is almost complete.',         unlockCondition:(s)=>(s.inventory['energy_cell']||0)>=1},
];

const ACHIEVEMENTS = [
  {id:'first_mine', name:'First Strike',  desc:'Place first Miner',       condition:(s)=>s.stats.minersPlaced>=1},
  {id:'belt5',      name:'On the Line',   desc:'Place 5 belts',           condition:(s)=>s.totalBelts>=5},
  {id:'belt50',     name:'Conveyor King', desc:'Place 50 belts',          condition:(s)=>s.totalBelts>=50},
  {id:'iron100',    name:'Iron Will',     desc:'Mine 100 Iron Ore',       condition:(s)=>(s.totalMined['iron_ore']||0)>=100},
  {id:'powered',    name:'Power On',      desc:'Build a generator',       condition:(s)=>s.stats.generatorsBuilt>=1},
  {id:'researcher', name:'Researcher',    desc:'First research done',     condition:(s)=>s.completedResearch.length>=1},
  {id:'circuitry',  name:'Circuitry',     desc:'Produce a Circuit Board', condition:(s)=>(s.inventory['circuit_board']||0)>=1},
];

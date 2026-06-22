/* NanoFactory — config.js  (grid edition)
 * Static game data: tiles, buildings, research, lore, achievements
 */

// Grid
const GRID_COLS = 40;
const GRID_ROWS = 30;
const TILE_SIZE = 48;   // px

// Tick rate
const TICK_MS    = 500;   // ms per tick
const TICK_DELTA = 0.5;   // seconds per tick
const MAX_OFFLINE = 28800; // 8 hours

// Tile types
const T = {
  EMPTY:   0,
  BELT_R:  1,   // → right
  BELT_L:  2,   // ← left
  BELT_U:  3,   // ↑ up
  BELT_D:  4,   // ↓ down
  MINER:   10,
  SMELTER: 11,
  WIRE_MILL:    12,
  FORGE:        13,
  ASSEMBLY:     14,
  BATTERY_PLANT:15,
  CELL_FACTORY: 16,
  LAB:          17,
  COAL_GEN:     18,
  SOLAR:        19,
  NUCLEAR:      20,
  CHEST:        21,  // storage
  PATCH_IRON:   30,  // resource patch
  PATCH_COPPER: 31,
  PATCH_COAL:   32,
};

// Belt rotation cycle
const BELT_CYCLE = [T.BELT_R, T.BELT_D, T.BELT_L, T.BELT_U];
const BELT_SET   = new Set(BELT_CYCLE);

// Direction offsets [dx, dy]
const DIR_OFFSET = {
  [T.BELT_R]: [ 1, 0],
  [T.BELT_L]: [-1, 0],
  [T.BELT_U]: [ 0,-1],
  [T.BELT_D]: [ 0, 1],
};

const BELT_LABELS = {
  [T.BELT_R]: '→',
  [T.BELT_L]: '←',
  [T.BELT_U]: '↑',
  [T.BELT_D]: '↓',
};

// Building definitions
const BUILDINGS = [
  {
    id: 'belt_r',     tileType: T.BELT_R,   name: 'Belt →',       icon: '→',
    category: 'belt', placeCost: null, description: 'Moves items right'
  },
  {
    id: 'belt_d',     tileType: T.BELT_D,   name: 'Belt ↓',       icon: '↓',
    category: 'belt', placeCost: null, description: 'Moves items down'
  },
  {
    id: 'belt_l',     tileType: T.BELT_L,   name: 'Belt ←',       icon: '←',
    category: 'belt', placeCost: null, description: 'Moves items left'
  },
  {
    id: 'belt_u',     tileType: T.BELT_U,   name: 'Belt ↑',       icon: '↑',
    category: 'belt', placeCost: null, description: 'Moves items up'
  },
  {
    id: 'miner',      tileType: T.MINER,    name: 'Miner',        icon: '⛏',
    category: 'mining',
    placeCost: null,
    description: 'Place on ore patch to mine. Outputs onto adjacent belt.',
    outputRate: 1.0,   // items/s
    output: null,      // determined by patch below
  },
  {
    id: 'smelter',    tileType: T.SMELTER,  name: 'Smelter',      icon: '🔥',
    category: 'processing',
    placeCost: { iron_ore: 50 },
    description: 'Iron Ore → Iron Plate. Needs belt input/output.',
    input: { iron_ore: 1 }, output: { iron_plate: 1 },
    craftTime: 2,   // seconds per item
    energyCost: 2,
  },
  {
    id: 'wire_mill',  tileType: T.WIRE_MILL, name: 'Wire Mill',   icon: '🌀',
    category: 'processing',
    placeCost: { copper_ore: 50 },
    description: 'Copper Ore → Copper Wire (x2).',
    input: { copper_ore: 1 }, output: { copper_wire: 2 },
    craftTime: 2, energyCost: 1,
  },
  {
    id: 'forge',      tileType: T.FORGE,    name: 'Forge',        icon: '🏭',
    category: 'processing',
    placeCost: { iron_plate: 100 },
    description: 'Iron Plate + Coal → Steel.',
    input: { iron_plate: 1, coal: 1 }, output: { steel: 1 },
    craftTime: 4, energyCost: 4,
  },
  {
    id: 'assembly',   tileType: T.ASSEMBLY, name: 'Assembly',     icon: '⚙️',
    category: 'processing',
    placeCost: { iron_plate: 200 },
    description: 'Copper Wire + Iron Plate → Circuit Board.',
    input: { copper_wire: 1, iron_plate: 1 }, output: { circuit_board: 1 },
    craftTime: 3, energyCost: 3,
  },
  {
    id: 'battery_plant', tileType: T.BATTERY_PLANT, name: 'Battery Plant', icon: '🔋',
    category: 'processing',
    placeCost: { steel: 200 },
    description: 'Copper Wire + Steel → Battery.',
    input: { copper_wire: 2, steel: 1 }, output: { battery: 1 },
    craftTime: 3, energyCost: 2,
  },
  {
    id: 'cell_factory', tileType: T.CELL_FACTORY, name: 'Cell Factory', icon: '⚡',
    category: 'processing',
    placeCost: { circuit_board: 50 },
    description: 'Battery + Circuit Board → Energy Cell.',
    input: { battery: 1, circuit_board: 1 }, output: { energy_cell: 1 },
    craftTime: 5, energyCost: 5,
  },
  {
    id: 'lab',        tileType: T.LAB,      name: 'Lab',          icon: '🔬',
    category: 'processing',
    placeCost: { circuit_board: 30 },
    description: 'Circuit Board → Research Points.',
    input: { circuit_board: 1 }, output: { research_points: 1 },
    craftTime: 4, energyCost: 3,
  },
  {
    id: 'coal_gen',   tileType: T.COAL_GEN, name: 'Coal Gen',     icon: '🏗',
    category: 'power',
    placeCost: { iron_plate: 80 },
    description: 'Burns Coal from belt input. Generates 10 MW.',
    input: { coal: 2 }, output: { mw: 10 },
    craftTime: null, energyCost: 0, powerOut: 10,
  },
  {
    id: 'solar',      tileType: T.SOLAR,    name: 'Solar Panel',  icon: '☀️',
    category: 'power',
    placeCost: { circuit_board: 20 },
    description: 'Free 5 MW. No input needed.',
    input: null, output: { mw: 5 },
    craftTime: null, energyCost: 0, powerOut: 5,
    unlockedByResearch: 'solar_technology',
  },
  {
    id: 'nuclear',    tileType: T.NUCLEAR,  name: 'Nuclear',      icon: '☢️',
    category: 'power',
    placeCost: { energy_cell: 200 },
    description: 'Consumes Energy Cells. Generates 200 MW.',
    input: { energy_cell: 0.2 }, output: { mw: 200 },
    craftTime: null, energyCost: 0, powerOut: 200,
    unlockedByResearch: 'nuclear_research',
  },
  {
    id: 'chest',      tileType: T.CHEST,    name: 'Chest',        icon: '📦',
    category: 'storage',
    placeCost: { iron_plate: 30 },
    description: 'Stores up to 200 of any one item from belt.',
    capacity: 200,
  },
];

const BUILDING_BY_TYPE = {};
for (const b of BUILDINGS) BUILDING_BY_TYPE[b.tileType] = b;

const RESOURCES = [
  { id: 'iron_ore',      name: 'Iron Ore',      color: '#a0a8b8', patch: T.PATCH_IRON   },
  { id: 'copper_ore',    name: 'Copper Ore',    color: '#c87941', patch: T.PATCH_COPPER },
  { id: 'coal',          name: 'Coal',          color: '#555568', patch: T.PATCH_COAL   },
  { id: 'iron_plate',    name: 'Iron Plate',    color: '#a0a8b8' },
  { id: 'copper_wire',   name: 'Copper Wire',   color: '#c87941' },
  { id: 'steel',         name: 'Steel',         color: '#8899aa' },
  { id: 'circuit_board', name: 'Circuit Board', color: '#4f8ef7' },
  { id: 'battery',       name: 'Battery',       color: '#f5a623' },
  { id: 'energy_cell',   name: 'Energy Cell',   color: '#e94560' },
  { id: 'research_points', name: 'RP',          color: '#4caf7d' },
];

// Resource lookup
const RES_BY_ID = {};
for (const r of RESOURCES) RES_BY_ID[r.id] = r;

// Patch → resource
const PATCH_RES = {
  [T.PATCH_IRON]:   'iron_ore',
  [T.PATCH_COPPER]: 'copper_ore',
  [T.PATCH_COAL]:   'coal',
};

// Item colours for belt rendering
const ITEM_COLOR = {
  iron_ore:      '#a0a8b8',
  copper_ore:    '#c87941',
  coal:          '#555',
  iron_plate:    '#ccd',
  copper_wire:   '#e09050',
  steel:         '#8899aa',
  circuit_board: '#4f8ef7',
  battery:       '#f5a623',
  energy_cell:   '#e94560',
  research_points: '#4caf7d',
};

const RESEARCH = [
  { id: 'efficient_mining_1', name: 'Efficient Mining I',   category: 'production', cost_rp:  100, description: 'All miners +50%',       requires: null, effect: { mineMultiplier: 0.5  } },
  { id: 'efficient_mining_2', name: 'Efficient Mining II',  category: 'production', cost_rp:  500, description: 'All miners +100%',      requires: 'efficient_mining_1', effect: { mineMultiplier: 1.0 } },
  { id: 'advanced_smelting',  name: 'Advanced Smelting',    category: 'production', cost_rp:  300, description: 'Smelter 2× speed',      requires: null, effect: { smelterMult: 1.0    } },
  { id: 'alloy_mastery',      name: 'Alloy Mastery',        category: 'production', cost_rp:  800, description: 'Forge 2× speed',        requires: null, effect: { forgeMult: 1.0      } },
  { id: 'solar_technology',   name: 'Solar Technology',     category: 'energy',     cost_rp:  600, description: 'Unlocks Solar Panels',  requires: null, effect: { unlock: 'solar'     } },
  { id: 'grid_optimization',  name: 'Grid Optimization',   category: 'energy',     cost_rp: 1500, description: 'Generators +20% output',requires: null, effect: { genMult: 0.2       } },
  { id: 'nuclear_research',   name: 'Nuclear Research',     category: 'energy',     cost_rp: 5000, description: 'Unlocks Nuclear Reactor',requires: null, effect: { unlock: 'nuclear'  } },
  { id: 'belt_speed_1',       name: 'Fast Belts I',         category: 'automation', cost_rp:  400, description: 'Belt items move 2×',    requires: null, effect: { beltSpeed: 2        } },
  { id: 'belt_speed_2',       name: 'Fast Belts II',        category: 'automation', cost_rp: 2000, description: 'Belt items move 4×',    requires: 'belt_speed_1', effect: { beltSpeed: 4 } },
  { id: 'stack_inserter',     name: 'Stack Inserter',       category: 'automation', cost_rp: 3000, description: 'Machines process 2× batch', requires: null, effect: { batchMult: 2 } },
];

const LORE = [
  { id: 'start',       title: 'Day 0',        text: 'The bunker lights flicker. You find a broken pickaxe.',   unlockCondition: () => true },
  { id: 'first_iron',  title: 'First Ore',    text: 'The ore is here. The earth remembers its purpose.',        unlockCondition: (s) => (s.totalMined['iron_ore'] || 0) >= 10 },
  { id: 'first_belt',  title: 'The Grid',     text: 'Items flow along the belts. The factory breathes.',        unlockCondition: (s) => s.totalBelts >= 5 },
  { id: 'first_power', title: 'Power Up',     text: 'Power flows through the conduits. The machines exhale.',   unlockCondition: (s) => s.power.generated >= 10 },
  { id: '100mw',       title: '100 MW',       text: 'The grid is alive. Something stirs in the dark outside.',  unlockCondition: (s) => s.power.generated >= 100 },
  { id: 'first_cell',  title: 'Energy Cell',  text: 'You hold the first energy cell. It hums with potential.',  unlockCondition: (s) => (s.inventory['energy_cell'] || 0) >= 1 },
];

const ACHIEVEMENTS = [
  { id: 'first_mine',   name: 'First Strike',     desc: 'Place your first miner',            condition: (s) => s.stats.minersPlaced >= 1 },
  { id: 'belt5',        name: 'On the Line',       desc: 'Place 5 belts',                      condition: (s) => s.totalBelts >= 5 },
  { id: 'belt50',       name: 'Conveyor King',     desc: 'Place 50 belts',                     condition: (s) => s.totalBelts >= 50 },
  { id: 'iron100',      name: 'Iron Will',         desc: 'Mine 100 Iron Ore',                  condition: (s) => (s.totalMined['iron_ore'] || 0) >= 100 },
  { id: 'powered',      name: 'Power On',          desc: 'Build a generator',                  condition: (s) => s.stats.generatorsBuilt >= 1 },
  { id: 'researcher',   name: 'Researcher',        desc: 'Complete first research',            condition: (s) => s.completedResearch.length >= 1 },
  { id: 'circuitry',    name: 'Circuitry',         desc: 'Produce a Circuit Board',            condition: (s) => (s.inventory['circuit_board'] || 0) >= 1 },
  { id: 'nuclear_opt',  name: 'Nuclear Option',    desc: 'Build a Nuclear Reactor',            condition: (s) => s.stats.generatorsBuilt >= 1 && s.power.generated >= 200 },
];

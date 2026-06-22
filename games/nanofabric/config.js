/* NanoFactory — config.js
 * All static game data: buildings, research, recipes, lore
 */

const RESOURCES = [
  // RAW
  { id: 'iron_ore',      name: 'Iron Ore',      category: 'raw',       defaultCap: 500,  color: 'var(--iron-color)'    },
  { id: 'copper_ore',    name: 'Copper Ore',    category: 'raw',       defaultCap: 500,  color: 'var(--copper-color)'  },
  { id: 'coal',          name: 'Coal',          category: 'raw',       defaultCap: 500,  color: 'var(--coal-color)'    },
  // PROCESSED
  { id: 'iron_plate',    name: 'Iron Plate',    category: 'processed', defaultCap: 300,  color: 'var(--iron-color)'    },
  { id: 'copper_wire',   name: 'Copper Wire',   category: 'processed', defaultCap: 300,  color: 'var(--copper-color)'  },
  { id: 'steel',         name: 'Steel',         category: 'processed', defaultCap: 200,  color: 'var(--muted)'         },
  { id: 'circuit_board', name: 'Circuit Board', category: 'processed', defaultCap: 200,  color: 'var(--generic-color)' },
  { id: 'battery',       name: 'Battery',       category: 'processed', defaultCap: 150,  color: 'var(--accent-blue)'   },
  { id: 'energy_cell',   name: 'Energy Cell',   category: 'processed', defaultCap: 100,  color: 'var(--accent)'        },
  // SPECIAL
  { id: 'research_points', name: 'RP',          category: 'special',   defaultCap: Infinity, color: 'var(--success)'  },
];

const BUILDINGS = [
  // MINING
  {
    id: 'iron_mine', name: 'Iron Mine', category: 'mining',
    baseCost: { iron_ore: 50 }, costMultiplier: 1.15,
    output: { iron_ore: 2 }, input: null, energyCost: 0,
    unlockedByResearch: null
  },
  {
    id: 'copper_mine', name: 'Copper Mine', category: 'mining',
    baseCost: { copper_ore: 50 }, costMultiplier: 1.15,
    output: { copper_ore: 2 }, input: null, energyCost: 0,
    unlockedByResearch: null
  },
  {
    id: 'coal_mine', name: 'Coal Mine', category: 'mining',
    baseCost: { coal: 40 }, costMultiplier: 1.15,
    output: { coal: 3 }, input: null, energyCost: 0,
    unlockedByResearch: null
  },
  // PROCESSING
  {
    id: 'smelter', name: 'Smelter', category: 'processing',
    baseCost: { iron_ore: 150 }, costMultiplier: 1.15,
    output: { iron_plate: 1 }, input: { iron_ore: 1 }, energyCost: 2,
    unlockedByResearch: null
  },
  {
    id: 'wire_mill', name: 'Wire Mill', category: 'processing',
    baseCost: { copper_ore: 150 }, costMultiplier: 1.15,
    output: { copper_wire: 2 }, input: { copper_ore: 1 }, energyCost: 1,
    unlockedByResearch: null
  },
  {
    id: 'forge', name: 'Forge', category: 'processing',
    baseCost: { iron_plate: 300 }, costMultiplier: 1.15,
    output: { steel: 1 }, input: { iron_plate: 1, coal: 0.5 }, energyCost: 4,
    unlockedByResearch: null
  },
  {
    id: 'assembly_line', name: 'Assembly Line', category: 'processing',
    baseCost: { iron_plate: 500 }, costMultiplier: 1.15,
    output: { circuit_board: 1 }, input: { copper_wire: 1, iron_plate: 1 }, energyCost: 3,
    unlockedByResearch: null
  },
  {
    id: 'battery_plant', name: 'Battery Plant', category: 'processing',
    baseCost: { steel: 800 }, costMultiplier: 1.15,
    output: { battery: 1 }, input: { copper_wire: 2, steel: 1 }, energyCost: 2,
    unlockedByResearch: null
  },
  {
    id: 'cell_factory', name: 'Cell Factory', category: 'processing',
    baseCost: { circuit_board: 2000 }, costMultiplier: 1.15,
    output: { energy_cell: 1 }, input: { battery: 1, circuit_board: 1 }, energyCost: 5,
    unlockedByResearch: null
  },
  {
    id: 'lab', name: 'Lab', category: 'processing',
    baseCost: { circuit_board: 1000 }, costMultiplier: 1.15,
    output: { research_points: 1 }, input: null, energyCost: 3,
    unlockedByResearch: null
  },
  // POWER
  {
    id: 'coal_generator', name: 'Coal Generator', category: 'power',
    baseCost: { iron_plate: 200 }, costMultiplier: 1.15,
    output: { mw: 10 }, input: { coal: 2 }, energyCost: 0,
    unlockedByResearch: null
  },
  {
    id: 'solar_panel', name: 'Solar Panel', category: 'power',
    baseCost: { circuit_board: 500 }, costMultiplier: 1.15,
    output: { mw: 5 }, input: null, energyCost: 0,
    unlockedByResearch: 'solar_technology'
  },
  {
    id: 'nuclear_reactor', name: 'Nuclear Reactor', category: 'power',
    baseCost: { energy_cell: 5000 }, costMultiplier: 1.15,
    output: { mw: 200 }, input: { energy_cell: 0.1 }, energyCost: 0,
    unlockedByResearch: 'nuclear_research'
  },
  // STORAGE
  {
    id: 'storage_depot', name: 'Storage Depot', category: 'storage',
    baseCost: { iron_plate: 300 }, costMultiplier: 1.15,
    output: null, input: null, energyCost: 0,
    unlockedByResearch: null,
    storageBonus: 500
  },
];

const RESEARCH = [
  // PRODUCTION
  {
    id: 'efficient_mining_1', name: 'Efficient Mining I', category: 'production',
    cost_rp: 100, description: 'All mines +25%',
    requires: null,
    effect: { mineMultiplier: 0.25 }
  },
  {
    id: 'efficient_mining_2', name: 'Efficient Mining II', category: 'production',
    cost_rp: 500, description: 'All mines +50%',
    requires: 'efficient_mining_1',
    effect: { mineMultiplier: 0.50 }
  },
  {
    id: 'efficient_mining_3', name: 'Efficient Mining III', category: 'production',
    cost_rp: 2000, description: 'All mines +100%',
    requires: 'efficient_mining_2',
    effect: { mineMultiplier: 1.0 }
  },
  {
    id: 'advanced_smelting', name: 'Advanced Smelting', category: 'production',
    cost_rp: 300, description: 'Smelter 2x speed',
    requires: null,
    effect: { smelterMultiplier: 1.0 }
  },
  {
    id: 'alloy_mastery', name: 'Alloy Mastery', category: 'production',
    cost_rp: 800, description: 'Forge 2x speed',
    requires: null,
    effect: { forgeMultiplier: 1.0 }
  },
  // AUTOMATION
  {
    id: 'auto_collector', name: 'Auto Collector', category: 'automation',
    cost_rp: 200, description: 'Automate manual collect',
    requires: null,
    effect: { autoCollect: true }
  },
  {
    id: 'chain_processing', name: 'Chain Processing', category: 'automation',
    cost_rp: 1000, description: 'Auto-balance inputs',
    requires: null,
    effect: { chainProcessing: true }
  },
  {
    id: 'bulk_production', name: 'Bulk Production', category: 'automation',
    cost_rp: 2500, description: 'All machines +1/tick',
    requires: null,
    effect: { bulkBonus: 1 }
  },
  // ENERGY
  {
    id: 'solar_technology', name: 'Solar Technology', category: 'energy',
    cost_rp: 600, description: 'Unlocks solar panels',
    requires: null,
    effect: { unlock: 'solar_panel' }
  },
  {
    id: 'grid_optimization', name: 'Grid Optimization', category: 'energy',
    cost_rp: 1500, description: 'Generators +20% output',
    requires: null,
    effect: { generatorMultiplier: 0.2 }
  },
  {
    id: 'nuclear_research', name: 'Nuclear Research', category: 'energy',
    cost_rp: 5000, description: 'Unlocks nuclear reactor',
    requires: null,
    effect: { unlock: 'nuclear_reactor' }
  },
  // EXPANSION
  {
    id: 'extended_storage_1', name: 'Extended Storage I', category: 'expansion',
    cost_rp: 400, description: 'All caps +1,000',
    requires: null,
    effect: { storageCap: 1000 }
  },
  {
    id: 'extended_storage_2', name: 'Extended Storage II', category: 'expansion',
    cost_rp: 2000, description: 'All caps +5,000',
    requires: 'extended_storage_1',
    effect: { storageCap: 5000 }
  },
  {
    id: 'titanium_mining', name: 'Titanium Mining', category: 'expansion',
    cost_rp: 8000, description: 'New resource: Titanium',
    requires: null,
    effect: { unlockTitanium: true }
  },
];

const LORE = [
  {
    id: 'start',
    title: 'Day 0',
    text: 'The bunker lights flicker. You find a broken pickaxe in the corner.',
    unlockCondition: () => true
  },
  {
    id: 'first_iron',
    title: 'First Ore',
    text: 'The ore is still here. The earth remembers its purpose.',
    unlockCondition: (state) => state.resources.iron_ore.totalProduced >= 1
  },
  {
    id: 'first_circuit',
    title: 'Circuit',
    text: 'A working circuit board. The first manufactured object in years.',
    unlockCondition: (state) => state.resources.circuit_board.totalProduced >= 1
  },
  {
    id: 'first_power',
    title: 'Power Up',
    text: 'Power flows through the conduits. The machines exhale for the first time.',
    unlockCondition: (state) => state.power.generated >= 1
  },
  {
    id: '100mw',
    title: '100 MW',
    text: 'The grid is alive. Something stirs in the dark outside.',
    unlockCondition: (state) => state.power.generated >= 100
  },
  {
    id: 'first_reactor',
    title: 'Reactor Online',
    text: 'Light floods the valley. Someone out there is watching the glow.',
    unlockCondition: (state) => (state.buildings.nuclear_reactor || 0) >= 1
  },
  {
    id: 'first_prestige',
    title: 'New Era',
    text: 'You have rebuilt once before. This time, you know how far it goes.',
    unlockCondition: (state) => state.prestigeCount >= 1
  },
];

const ACHIEVEMENTS = [
  { id: 'first_strike',    name: 'First Strike',     desc: 'First manual collect',    condition: (s) => s.stats.manualCollects >= 1 },
  { id: 'iron_will',       name: 'Iron Will',         desc: '100 Iron Ore total',      condition: (s) => s.resources.iron_ore.totalProduced >= 100 },
  { id: 'copper_age',      name: 'Copper Age',        desc: '100 Copper Ore total',    condition: (s) => s.resources.copper_ore.totalProduced >= 100 },
  { id: 'power_on',        name: 'Power On',          desc: 'First generator built',   condition: (s) => (s.buildings.coal_generator || 0) >= 1 },
  { id: 'connected',       name: 'Connected',         desc: '50 MW reached',           condition: (s) => s.power.generated >= 50 },
  { id: 'powerhouse',      name: 'Powerhouse',        desc: '200 MW reached',          condition: (s) => s.power.generated >= 200 },
  { id: 'assembly_req',    name: 'Assembly Required', desc: 'First assembly line',     condition: (s) => (s.buildings.assembly_line || 0) >= 1 },
  { id: 'circuitry',       name: 'Circuitry',         desc: 'First circuit board',     condition: (s) => s.resources.circuit_board.totalProduced >= 1 },
  { id: 'energized',       name: 'Energized',         desc: 'First energy cell',       condition: (s) => s.resources.energy_cell.totalProduced >= 1 },
  { id: 'industrialist',   name: 'Industrialist',     desc: '10 buildings owned',      condition: (s) => Object.values(s.buildings).reduce((a,b)=>a+b,0) >= 10 },
  { id: 'magnate',         name: 'Magnate',           desc: '50 buildings owned',      condition: (s) => Object.values(s.buildings).reduce((a,b)=>a+b,0) >= 50 },
  { id: 'researcher',      name: 'Researcher',        desc: 'First RP spent',          condition: (s) => s.stats.rpSpent >= 1 },
  { id: 'scholar',         name: 'Scholar',           desc: '10 research done',        condition: (s) => s.completedResearch.length >= 10 },
  { id: 'sun_chaser',      name: 'Sun Chaser',        desc: 'First solar panel',       condition: (s) => (s.buildings.solar_panel || 0) >= 1 },
  { id: 'nuclear_option',  name: 'Nuclear Option',    desc: 'First reactor built',     condition: (s) => (s.buildings.nuclear_reactor || 0) >= 1 },
  { id: 'hoarder',         name: 'Hoarder',           desc: 'Any resource at cap',     condition: (s) => {
    for (const id in s.resources) {
      const r = s.resources[id];
      if (r.cap < Infinity && r.amount >= r.cap) return true;
    }
    return false;
  }},
  { id: 'chain_reaction',  name: 'Chain Reaction',    desc: 'All processors active',  condition: (s) => {
    const processors = ['smelter','wire_mill','forge','assembly_line','battery_plant','cell_factory'];
    return processors.every(id => (s.buildings[id] || 0) >= 1);
  }},
  { id: 'efficient',       name: 'Efficient',         desc: 'Full power, 10 machines', condition: (s) => s.power.ratio >= 1 && Object.values(s.buildings).reduce((a,b)=>a+b,0) >= 10 },
  { id: 'new_era',         name: 'New Era',           desc: 'First prestige done',     condition: (s) => s.prestigeCount >= 1 },
  { id: 'legend',          name: 'Legend',            desc: 'Three prestiges done',    condition: (s) => s.prestigeCount >= 3 },
];

const LP_UPGRADES = [
  { id: 'prod_boost',  desc: '+10% production',  cost: 1, effect: { productionBoost: 0.1  } },
  { id: 'start_res',   desc: 'Starting res x2',  cost: 2, effect: { startingResBoost: true } },
  { id: 'offline_ext', desc: 'Offline +2 hours',  cost: 3, effect: { offlineHours: 2       } },
];

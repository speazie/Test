// js/data.js — Pie Clicker static data. No imports/exports; attaches to window.
// game.js reads window.PIE_BUILDINGS / window.PIE_UPGRADES / window.PIE_ACHIEVEMENTS.

window.PIE_BUILDINGS = [
  { id: 'rolling-pin', name: 'Rolling Pin', baseCost: 15, baseCps: 0.1, desc: 'A trusty rolling pin, ready to flatten dough into destiny.' },
  { id: 'grandma', name: 'Grandma', baseCost: 120, baseCps: 1, desc: "Grandma's secret recipe. She won't share it, but she bakes like the wind." },
  { id: 'oven', name: 'Oven', baseCost: 1200, baseCps: 8, desc: 'A proper wood-fired oven, for proper crusts.' },
  { id: 'bakery', name: 'Bakery', baseCost: 13000, baseCps: 65, desc: 'A whole storefront staffed by eager apprentice bakers.' },
  { id: 'pie-farm', name: 'Pie Farm', baseCost: 140000, baseCps: 500, desc: 'Rolling fields of pie trees, heavy with ripe, bubbling fruit.' },
  { id: 'pie-factory', name: 'Pie Factory', baseCost: 1600000, baseCps: 4000, desc: 'Conveyor belts of crimped crusts and molten filling, 24/7.' },
  { id: 'bakery-guild', name: 'Bakery Guild', baseCost: 18000000, baseCps: 30000, desc: 'A secretive order sworn entirely to the pursuit of pie perfection.' },
  { id: 'pie-portal', name: 'Pie Portal', baseCost: 200000000, baseCps: 250000, desc: 'A shimmering rift to a dimension made of nothing but pie.' },
  { id: 'pie-alchemist', name: 'Pie Alchemist', baseCost: 2200000000, baseCps: 2000000, desc: 'Transmutes base lead into golden lattice crusts via forbidden pastry science.' },
  { id: 'pie-singularity', name: 'Pie Singularity', baseCost: 26000000000, baseCps: 17000000, desc: 'All matter in the observable universe collapses into a single, infinite pie.' }
];

window.PIE_UPGRADES = [
  // --- click multipliers ---
  {
    id: 'stronger-wrists',
    name: 'Stronger Wrists',
    cost: 50,
    desc: 'Years of dough-kneading finally pay off. Double the pies per click.',
    requires: null,
    effect: { type: 'clickMultiplier', target: null, multiplier: 2 }
  },
  {
    id: 'buttered-fingers',
    name: 'Buttered Fingers',
    cost: 5000,
    desc: 'Slippery, sure, but surprisingly effective at pressing out pies.',
    requires: { buildingId: 'grandma', count: 5 },
    effect: { type: 'clickMultiplier', target: null, multiplier: 2 }
  },
  {
    id: 'crimping-mastery',
    name: 'Crimping Mastery',
    cost: 250000,
    desc: 'A perfect crimp every time. Triples your clicking power.',
    requires: { buildingId: 'oven', count: 10 },
    effect: { type: 'clickMultiplier', target: null, multiplier: 3 }
  },
  {
    id: 'quantum-rolling-pin',
    name: 'Quantum Rolling Pin',
    cost: 25000000,
    desc: 'Rolls the dough in every possible universe simultaneously.',
    requires: { buildingId: 'pie-factory', count: 5 },
    effect: { type: 'clickMultiplier', target: null, multiplier: 5 }
  },

  // --- building multipliers ---
  {
    id: 'nonstick-coating',
    name: 'Nonstick Coating',
    cost: 100,
    desc: 'Dough slides right off. Rolling pins work twice as fast.',
    requires: { buildingId: 'rolling-pin', count: 1 },
    effect: { type: 'buildingMultiplier', target: 'rolling-pin', multiplier: 2 }
  },
  {
    id: 'grandmas-secret-recipe',
    name: "Grandma's Secret Recipe",
    cost: 1200,
    desc: 'She finally wrote it down. Every grandma bakes twice as fast.',
    requires: { buildingId: 'grandma', count: 1 },
    effect: { type: 'buildingMultiplier', target: 'grandma', multiplier: 2 }
  },
  {
    id: 'convection-ovens',
    name: 'Convection Ovens',
    cost: 12000,
    desc: 'Hot air circulates evenly, doubling every oven’s output.',
    requires: { buildingId: 'oven', count: 1 },
    effect: { type: 'buildingMultiplier', target: 'oven', multiplier: 2 }
  },
  {
    id: 'artisan-bakers-union',
    name: "Artisan Bakers' Union",
    cost: 130000,
    desc: 'Better wages, better morale, better pies. Bakeries double their output.',
    requires: { buildingId: 'bakery', count: 1 },
    effect: { type: 'buildingMultiplier', target: 'bakery', multiplier: 2 }
  },
  {
    id: 'heirloom-seeds',
    name: 'Heirloom Seeds',
    cost: 1400000,
    desc: 'A rare strain of pie tree, bred for maximum filling yield.',
    requires: { buildingId: 'pie-farm', count: 1 },
    effect: { type: 'buildingMultiplier', target: 'pie-farm', multiplier: 2 }
  },
  {
    id: 'robotic-crust-crimpers',
    name: 'Robotic Crust Crimpers',
    cost: 16000000,
    desc: 'Tireless steel fingers double the pace of every factory.',
    requires: { buildingId: 'pie-factory', count: 1 },
    effect: { type: 'buildingMultiplier', target: 'pie-factory', multiplier: 2 }
  },

  // --- global cps multipliers (expensive, late-game) ---
  {
    id: 'ancient-pie-almanac',
    name: 'Ancient Pie Almanac',
    cost: 10000000,
    desc: 'Forbidden baking wisdom, boosting all production by a quarter.',
    requires: { buildingId: 'bakery-guild', count: 1 },
    effect: { type: 'globalCpsMultiplier', target: null, multiplier: 1.25 }
  },
  {
    id: 'flour-of-the-gods',
    name: 'Flour of the Gods',
    cost: 150000000,
    desc: 'Milled on Mount Olympus. Every pie in existence bakes 50% faster.',
    requires: { buildingId: 'pie-portal', count: 1 },
    effect: { type: 'globalCpsMultiplier', target: null, multiplier: 1.5 }
  },
  {
    id: 'the-final-crust',
    name: 'The Final Crust',
    cost: 3000000000,
    desc: 'The last crust anyone will ever need. Doubles all pie production.',
    requires: { buildingId: 'pie-alchemist', count: 1 },
    effect: { type: 'globalCpsMultiplier', target: null, multiplier: 2 }
  }
];

window.PIE_ACHIEVEMENTS = [
  {
    id: 'first-pie',
    name: 'First Pie!',
    desc: 'Bake your very first pie.',
    condition: (state) => state.totalPiesBaked >= 1
  },
  {
    id: 'century-pies',
    name: 'Century of Pies',
    desc: 'Bake 100 pies in total.',
    condition: (state) => state.totalPiesBaked >= 100
  },
  {
    id: 'thousand-pies',
    name: 'Pie Enthusiast',
    desc: 'Bake 1,000 pies in total.',
    condition: (state) => state.totalPiesBaked >= 1000
  },
  {
    id: 'ten-thousand-pies',
    name: 'Pie Professional',
    desc: 'Bake 10,000 pies in total.',
    condition: (state) => state.totalPiesBaked >= 10000
  },
  {
    id: 'hundred-thousand-pies',
    name: 'Pie Tycoon',
    desc: 'Bake 100,000 pies in total.',
    condition: (state) => state.totalPiesBaked >= 100000
  },
  {
    id: 'million-pies',
    name: 'Pie Mogul',
    desc: 'Bake 1,000,000 pies in total.',
    condition: (state) => state.totalPiesBaked >= 1000000
  },
  {
    id: 'billion-pies',
    name: 'Pie Deity',
    desc: 'Bake 1,000,000,000 pies in total.',
    condition: (state) => state.totalPiesBaked >= 1000000000
  },
  {
    id: 'first-building',
    name: 'Getting Some Help',
    desc: 'Own your first production building.',
    condition: (state) => Object.values(state.buildings || {}).reduce((a, b) => a + b, 0) >= 1
  },
  {
    id: 'rolling-pin-collector',
    name: 'Rolling Pin Collector',
    desc: 'Own 25 Rolling Pins.',
    condition: (state) => (state.buildings && state.buildings['rolling-pin'] || 0) >= 25
  },
  {
    id: 'grandma-army',
    name: 'Grandma Army',
    desc: 'Own 50 Grandmas.',
    condition: (state) => (state.buildings && state.buildings['grandma'] || 0) >= 50
  },
  {
    id: 'oven-overload',
    name: 'Oven Overload',
    desc: 'Own 25 Ovens.',
    condition: (state) => (state.buildings && state.buildings['oven'] || 0) >= 25
  },
  {
    id: 'building-tycoon',
    name: 'Building Tycoon',
    desc: 'Own 100 buildings combined, across all types.',
    condition: (state) => Object.values(state.buildings || {}).reduce((a, b) => a + b, 0) >= 100
  },
  {
    id: 'mighty-click',
    name: 'Mighty Click',
    desc: 'Reach a click power of 10 pies per click.',
    condition: (state) => state.clickPower >= 10
  },
  {
    id: 'godly-click',
    name: 'Godly Click',
    desc: 'Reach a click power of 100 pies per click.',
    condition: (state) => state.clickPower >= 100
  },
  {
    id: 'secret-recipe-unlocked',
    name: "Nan's Secret is Out",
    desc: "Purchase Grandma's Secret Recipe upgrade.",
    condition: (state) => Array.isArray(state.upgradesBought) && state.upgradesBought.includes('grandmas-secret-recipe')
  }
];

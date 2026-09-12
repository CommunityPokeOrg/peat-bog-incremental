export interface ResourceCost {
  broth?: number;
  compute?: number;
}

export interface BuildingDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  baseCost: ResourceCost;
  brothPerSecond?: number;
  computePerSecond?: number;
  cooling?: number;
  heat?: number;
}

export const COST_SCALE = 1.15;

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'harvester',
    name: 'Peat Harvester',
    emoji: '🪵',
    description: 'A hardy cutter dragging rich peat from the bog.',
    baseCost: { broth: 15 },
    brothPerSecond: 0.5,
  },
  {
    id: 'vat',
    name: 'Fermentation Vat',
    emoji: '🧪',
    description: 'Slow-brews peat into nutrient-dense compute broth.',
    baseCost: { broth: 100 },
    brothPerSecond: 4,
  },
  {
    id: 'pump',
    name: 'Bog Pump',
    emoji: '⛽',
    description: 'Industrial pump slurping broth straight from the water table.',
    baseCost: { broth: 1100 },
    brothPerSecond: 25,
  },
  {
    id: 'chiller',
    name: 'Chiller',
    emoji: '❄️',
    description: 'Keeps a rack-sized pocket of the bog frosty. +10 cooling.',
    baseCost: { broth: 600 },
    cooling: 10,
  },
  {
    id: 'tower',
    name: 'Cooling Tower',
    emoji: '🏭',
    description: 'Evaporative tower venting steam over the moss. +120 cooling.',
    baseCost: { broth: 12000 },
    cooling: 120,
  },
  {
    id: 'rack',
    name: 'Server Rack',
    emoji: '🖥️',
    description: 'A humming rack steeped in the bog. +2 compute/s, 8 heat.',
    baseCost: { broth: 2500 },
    computePerSecond: 2,
    heat: 8,
  },
  {
    id: 'pod',
    name: 'Compute Pod',
    emoji: '📦',
    description: 'A sealed pod of racks half-sunk in the mire. +20 compute/s, 60 heat.',
    baseCost: { broth: 50000 },
    computePerSecond: 20,
    heat: 60,
  },
  {
    id: 'hall',
    name: 'Data Hall',
    emoji: '🏢',
    description: 'A whole hall of servers drinking the bog dry. +250 compute/s, 500 heat.',
    baseCost: { broth: 1_000_000 },
    computePerSecond: 250,
    heat: 500,
  },
  {
    id: 'hyperscaler',
    name: 'Bog Hyperscaler',
    emoji: '🌐',
    description: 'A continent-scale facility anointed in broth. +4000 compute/s, 5000 heat.',
    baseCost: { broth: 25_000_000, compute: 100_000 },
    computePerSecond: 4000,
    heat: 5000,
  },
];

export const BUILDING_BY_ID: Record<string, BuildingDef> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b]),
);

export type UpgradeKind = 'click' | 'building';

export interface UpgradeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cost: ResourceCost;
  kind: UpgradeKind;
  /** For kind 'building': which building it doubles. */
  buildingId?: string;
  /** Click multiplier applied when purchased. */
  clickMultiplier?: number;
  /** Fraction of broth/s added to each click. */
  clickBrothFraction?: number;
  /** Minimum owned buildings required to reveal. */
  requiresOwned?: number;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'spade',
    name: 'Sharper Spade',
    emoji: '🥄',
    description: 'Click power ×2.',
    cost: { broth: 50 },
    kind: 'click',
    clickMultiplier: 2,
  },
  {
    id: 'gloves',
    name: 'Insulated Gloves',
    emoji: '🧤',
    description: 'Click power ×2.',
    cost: { broth: 500 },
    kind: 'click',
    clickMultiplier: 2,
  },
  {
    id: 'buckets',
    name: 'Twin Buckets',
    emoji: '🪣',
    description: 'Click power ×2.',
    cost: { broth: 5000 },
    kind: 'click',
    clickMultiplier: 2,
  },
  {
    id: 'dredge',
    name: 'Mechanised Dredge',
    emoji: '⚙️',
    description: 'Each click also gains +1% of your broth/s.',
    cost: { broth: 50_000 },
    kind: 'click',
    clickBrothFraction: 0.01,
  },
  {
    id: 'ladle',
    name: 'Neural Ladle',
    emoji: '🧠',
    description: 'Click power ×5.',
    cost: { broth: 1_000_000, compute: 5000 },
    kind: 'click',
    clickMultiplier: 5,
  },
  ...BUILDINGS.map(
    (b): UpgradeDef => ({
      id: `boost-${b.id}`,
      name: `${b.name} Overclock`,
      emoji: b.emoji,
      description: `${b.name} output ×2. Requires 10 owned.`,
      cost: scaleCost(b.baseCost, 10),
      kind: 'building',
      buildingId: b.id,
      requiresOwned: 10,
    }),
  ),
];

function scaleCost(cost: ResourceCost, factor: number): ResourceCost {
  const out: ResourceCost = {};
  if (cost.broth !== undefined) out.broth = cost.broth * factor;
  if (cost.compute !== undefined) out.compute = cost.compute * factor;
  return out;
}

export const UPGRADE_BY_ID: Record<string, UpgradeDef> = Object.fromEntries(
  UPGRADES.map((u) => [u.id, u]),
);

export interface ResearchDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cost: ResourceCost;
}

export const RESEARCH: ResearchDef[] = [
  {
    id: 'thermal-modelling',
    name: 'Thermal Modelling',
    emoji: '📈',
    description: 'Cooling effectiveness +25%.',
    cost: { compute: 500 },
  },
  {
    id: 'liquid-immersion',
    name: 'Liquid Immersion',
    emoji: '🛢️',
    description: 'All heat output −20%.',
    cost: { compute: 5000 },
  },
  {
    id: 'broth-distillation',
    name: 'Broth Distillation',
    emoji: '⚗️',
    description: 'Broth production ×1.5.',
    cost: { compute: 20_000 },
  },
  {
    id: 'edge-caching',
    name: 'Edge Caching',
    emoji: '🗄️',
    description: 'Compute production ×1.5.',
    cost: { compute: 100_000 },
  },
  {
    id: 'quantum-peat',
    name: 'Quantum Peat',
    emoji: '♾️',
    description: 'All production ×2.',
    cost: { compute: 1_000_000 },
  },
];

export const RESEARCH_BY_ID: Record<string, ResearchDef> = Object.fromEntries(
  RESEARCH.map((r) => [r.id, r]),
);

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'click-1', name: 'First Scoop', emoji: '🫧', description: 'Harvest broth for the first time.' },
  { id: 'click-100', name: 'Calloused Hands', emoji: '✋', description: 'Harvest 100 times.' },
  { id: 'click-1000', name: 'Bog Drudge', emoji: '🏋️', description: 'Harvest 1,000 times.' },
  { id: 'broth-1k', name: 'Simmering Pot', emoji: '🍲', description: 'Earn 1,000 total broth.' },
  { id: 'broth-1m', name: 'Broth Barron', emoji: '🍯', description: 'Earn 1,000,000 total broth.' },
  { id: 'broth-1b', name: 'Broth Ocean', emoji: '🌊', description: 'Earn 1,000,000,000 total broth.' },
  { id: 'first-rack', name: 'Boot Sequence', emoji: '🖥️', description: 'Buy your first Server Rack.' },
  { id: 'chiller-10', name: 'Cold Snap', emoji: '❄️', description: 'Own 10 Chillers.' },
  { id: 'chiller-50', name: 'Permafrost', emoji: '🧊', description: 'Own 50 Chillers.' },
  { id: 'first-compute', name: 'First FLOP', emoji: '💡', description: 'Generate your first compute.' },
  { id: 'compute-1m', name: 'Exascale Bog', emoji: '🚀', description: 'Earn 1,000,000 total compute.' },
  { id: 'full-cool', name: 'Ice Cold', emoji: '🥶', description: 'Run 100% cooled with 100+ heat.' },
  { id: 'prestige-1', name: 'Bog Reborn', emoji: '♻️', description: 'Drain the bog for the first time.' },
  { id: 'cores-10', name: 'Core Sample', emoji: '💎', description: 'Hold 10 Bog Cores.' },
  { id: 'harvester-100', name: 'Peat Empire', emoji: '🪵', description: 'Own 100 Peat Harvesters.' },
  { id: 'hyperscaler', name: 'Hyperscaled', emoji: '🌐', description: 'Own a Bog Hyperscaler.' },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

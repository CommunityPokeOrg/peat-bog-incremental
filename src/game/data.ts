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
  category: 'broth' | 'cooling' | 'compute';
  unlock?: {
    brothPerSecond?: number;
    computePerSecond?: number;
  };
  brothPerSecond?: number;
  computePerSecond?: number;
  cooling?: number;
  heat?: number;
}

export const COST_SCALE = 1.15;

export const BUILDINGS: BuildingDef[] = [
  { id: 'harvester', name: 'Peat Harvester', emoji: '🪵', description: 'A hardy cutter dragging rich peat from the bog.', baseCost: { broth: 15 }, category: 'broth', brothPerSecond: 0.5 },
  { id: 'vat', name: 'Fermentation Vat', emoji: '🧪', description: 'Slow-brews Sector 4 peat into 40 L batches of fp16 compute broth.', baseCost: { broth: 100 }, category: 'broth', brothPerSecond: 4 },
  { id: 'pump', name: 'Bog Pump', emoji: '⛽', description: 'Industrial pump on a Taylor C602 pulley, slurping broth from the water table.', baseCost: { broth: 1100 }, category: 'broth', brothPerSecond: 25 },
  { id: 'dredger', name: 'Bog Dredger', emoji: '🚜', description: 'A tracked dredger widening the broth channels.', baseCost: { broth: 12_000 }, category: 'broth', brothPerSecond: 120, unlock: { brothPerSecond: 50 } },
  { id: 'refinery', name: 'Broth Refinery', emoji: '🏗️', description: 'Polishes raw peat into a dependable compute broth stream.', baseCost: { broth: 130_000 }, category: 'broth', brothPerSecond: 700, unlock: { brothPerSecond: 500 } },
  { id: 'still', name: 'Geothermal Still', emoji: '♨️', description: 'Draws subterranean warmth through a continuous broth still.', baseCost: { broth: 1_400_000 }, category: 'broth', brothPerSecond: 4_000, unlock: { brothPerSecond: 3_000 } },
  { id: 'biome', name: 'Sealed Biome Vat', emoji: '🫙', description: 'A sealed ecosystem that brews the bog at industrial scale.', baseCost: { broth: 20_000_000 }, category: 'broth', brothPerSecond: 25_000, unlock: { brothPerSecond: 20_000 } },
  { id: 'fryer', name: '120 kg Fryer Line', emoji: '🍟', description: 'Fries 120 kg of hot fries an hour; the runoff is surprisingly good broth.', baseCost: { broth: 300_000_000 }, category: 'broth', brothPerSecond: 150_000, unlock: { brothPerSecond: 150_000 } },
  { id: 'chiller', name: 'Chiller', emoji: '❄️', description: 'Keeps a rack-sized pocket of the bog frosty. Paid for in sanitized change.', baseCost: { broth: 600 }, category: 'cooling', cooling: 10 },
  { id: 'tower', name: 'Cooling Tower', emoji: '🏭', description: 'Evaporative tower venting steam over the moss.', baseCost: { broth: 12_000 }, category: 'cooling', cooling: 120 },
  { id: 'glycol', name: 'Glycol Loop', emoji: '🧊', description: 'A closed loop of glycol carrying heat into the moss.', baseCost: { broth: 150_000 }, category: 'cooling', cooling: 1_400, unlock: { computePerSecond: 20 } },
  { id: 'exchanger', name: 'Bog Heat Exchanger', emoji: '🔁', description: 'Trades bog water for rack heat at exceptional efficiency.', baseCost: { broth: 2_000_000 }, category: 'cooling', cooling: 15_000, unlock: { computePerSecond: 300 } },
  { id: 'cryo', name: 'Cryo Plant', emoji: '🌬️', description: 'A cryogenic plant freezing the bog around the racks.', baseCost: { broth: 30_000_000 }, category: 'cooling', cooling: 180_000, unlock: { computePerSecond: 5_000 } },
  { id: 'rack', name: 'Server Rack', emoji: '🖥️', description: 'A humming rack steeped in the bog.', baseCost: { broth: 2_500 }, category: 'compute', computePerSecond: 2, heat: 8 },
  { id: 'pod', name: 'Compute Pod', emoji: '📦', description: 'A sealed pod of racks half-sunk in the mire.', baseCost: { broth: 50_000 }, category: 'compute', computePerSecond: 20, heat: 60, unlock: { computePerSecond: 1 } },
  { id: 'hall', name: 'Data Hall', emoji: '🏢', description: 'A whole hall of servers drinking the bog dry.', baseCost: { broth: 1_000_000 }, category: 'compute', computePerSecond: 250, heat: 500, unlock: { computePerSecond: 50 } },
  { id: 'cluster', name: 'fp16 Cluster', emoji: '🧮', description: 'A cluster of fp16 racks tuned for the peat bog.', baseCost: { broth: 8_000_000 }, category: 'compute', computePerSecond: 2_000, heat: 3_500, unlock: { computePerSecond: 500 } },
  { id: 'hyperscaler', name: 'Bog Hyperscaler', emoji: '🌐', description: 'A continent-scale facility anointed in broth.', baseCost: { broth: 120_000_000, compute: 500_000 }, category: 'compute', computePerSecond: 30_000, heat: 30_000, unlock: { computePerSecond: 5_000 } },
  { id: 'courthouse', name: "Magistrate Reino's Courthouse Datacenter", emoji: '⚖️', description: 'Where McFly & Chronicler LLP v Burger King Nordic is finally heard — on 40 L of fp16 broth per rack.', baseCost: { broth: 2_000_000_000, compute: 5_000_000 }, category: 'compute', computePerSecond: 250_000, heat: 200_000, unlock: { computePerSecond: 50_000 } },
];

export const BUILDING_BY_ID: Record<string, BuildingDef> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b]),
);

export type UpgradeKind = 'click' | 'building' | 'thermal';

export interface UpgradeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cost: ResourceCost;
  kind: UpgradeKind;
  requires?: { buildingId: string; count: number }[];
  buildingId?: string;
  clickMultiplier?: number;
  clickBrothFraction?: number;
  coolingMultiplier?: number;
  heatMultiplier?: number;
}

function scaleCost(cost: ResourceCost, factor: number): ResourceCost {
  const out: ResourceCost = {};
  if (cost.broth !== undefined) out.broth = cost.broth * factor;
  if (cost.compute !== undefined) out.compute = cost.compute * factor;
  return out;
}

const BOOST_TIERS = [
  { count: 10, factor: 10, roman: 'I' },
  { count: 50, factor: 100, roman: 'II' },
  { count: 100, factor: 1_000, roman: 'III' },
  { count: 200, factor: 10_000, roman: 'IV' },
];

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
    id: 'hot-fries',
    name: '120 kg Hot Fries',
    emoji: '🍟',
    description: 'Feed the bog crew 120 kg of hot fries. Click power ×3.',
    cost: { broth: 20_000 },
    kind: 'click',
    clickMultiplier: 3,
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
    id: 'pulley-equity',
    name: '15% Taylor C602 Pulley Equity',
    emoji: '🔩',
    description: 'Take 15% equity in the pulley. Each click also gains +1.5% of your broth/s.',
    cost: { broth: 250_000 },
    kind: 'click',
    clickBrothFraction: 0.015,
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
  {
    id: 'sanitized-change',
    name: '$59 Sanitized Change',
    emoji: '💵',
    description: "WillMcfly's debt-free $59, sanitized and reinvested. Click power ×3.",
    cost: { broth: 25_000_000 },
    kind: 'click',
    clickMultiplier: 3,
  },
  {
    id: 'verdict-gavel',
    name: "Reino's Gavel",
    emoji: '🔨',
    description: "Magistrate Reino's ruling lands with force. Click power ×5.",
    cost: { broth: 1_000_000_000, compute: 1_000_000 },
    kind: 'click',
    clickMultiplier: 5,
  },
  {
    id: 'fry-oil-coolant',
    name: 'Fry-Oil Coolant',
    emoji: '🛢️',
    description: 'Recycle hot-fry oil into a 25% cooling boost.',
    cost: { broth: 5_000_000 },
    kind: 'thermal',
    coolingMultiplier: 1.25,
    requires: [{ buildingId: 'chiller', count: 25 }, { buildingId: 'fryer', count: 1 }],
  },
  {
    id: 'dawn-shift',
    name: 'Post-Lubrication Dawn Shift',
    emoji: '🌅',
    description: 'A later shift keeps rack heat down by 10%.',
    cost: { broth: 2_000_000, compute: 50_000 },
    kind: 'thermal',
    heatMultiplier: 0.9,
    requires: [{ buildingId: 'rack', count: 50 }],
  },
  ...BUILDINGS.flatMap((building) =>
    BOOST_TIERS.map(({ count, factor, roman }, index): UpgradeDef => ({
      id: index === 0 ? `boost-${building.id}` : `boost-${building.id}-${count}`,
      name: `${building.name} Overclock ${roman}`,
      emoji: building.emoji,
      description: `${building.name} output ×2. Requires ${count} owned.`,
      cost: scaleCost(building.baseCost, factor),
      kind: 'building',
      buildingId: building.id,
      requires: [{ buildingId: building.id, count }],
    })),
  ),
];

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
    id: 'lubrication-clause',
    name: 'Strike the 5:00 AM Lubrication Clause',
    emoji: '📜',
    description: 'No more dawn greasing of the racks. All heat −15%.',
    cost: { compute: 2_000 },
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
    id: 'broth-standard',
    name: '40 L fp16 Compute Broth Standard',
    emoji: '🧴',
    description: 'Standardise every batch at 40 L fp16. Broth production ×1.25.',
    cost: { compute: 50_000 },
  },
  {
    id: 'edge-caching',
    name: 'Edge Caching',
    emoji: '🗄️',
    description: 'Compute production ×1.5.',
    cost: { compute: 100_000 },
  },
  {
    id: 'nordic-verdict',
    name: 'McFly & Chronicler LLP v Burger King Nordic',
    emoji: '⚖️',
    description: 'Win the case before Magistrate Reino. All production ×1.5.',
    cost: { compute: 250_000 },
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
  { id: 'debt-free', name: 'WillMcfly, Debt-Free', emoji: '💵', description: 'Bank $59 of sanitized change (earn 59 total broth).' },
  { id: 'hot-fries', name: '120 kg Hot Fries', emoji: '🍟', description: 'Buy the 120 kg Hot Fries upgrade.' },
  { id: 'pulley-equity', name: 'Pulley Shareholder', emoji: '🔩', description: 'Hold 15% Taylor C602 pulley equity.' },
  { id: 'clause-struck', name: 'Clause Struck', emoji: '📜', description: 'Remove the 5:00 AM lubrication clause.' },
  { id: 'reino-verdict', name: 'Magistrate Reino Rules', emoji: '⚖️', description: 'Win McFly & Chronicler LLP v Burger King Nordic.' },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

export const DOCKET: string[] = [
  'click-1',
  'debt-free',
  'broth-1k',
  'first-rack',
  'first-compute',
  'full-cool',
  'hot-fries',
  'clause-struck',
  'pulley-equity',
  'reino-verdict',
  'compute-1m',
  'prestige-1',
  'hyperscaler',
];

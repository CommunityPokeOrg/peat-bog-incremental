import type { Decimal } from './decimal';

/** Resource identifiers used by wallets, rates, and costs. */
export type ResourceId = 'broth' | 'peat' | 'sphagnum' | 'methane' | 'compute' | 'evidence' | 'bogCores';
/** Resources that can be spent; Bog Cores are prestige currency. */
export type SpendableResource = Exclude<ResourceId, 'bogCores'>;

export interface ResourceDef {
  id: ResourceId;
  name: string;
  emoji: string;
}

/** Resource metadata shown by resource counters and controls. */
export const RESOURCES: ResourceDef[] = [
  { id: 'broth', name: 'fp16 compute broth', emoji: '🫧' },
  { id: 'peat', name: 'raw peat', emoji: '🟫' },
  { id: 'sphagnum', name: 'sphagnum moss', emoji: '🌱' },
  { id: 'methane', name: 'bog methane', emoji: '💨' },
  { id: 'compute', name: 'compute', emoji: '⚡' },
  { id: 'evidence', name: 'case evidence', emoji: '📁' },
  { id: 'bogCores', name: 'bog cores', emoji: '💠' },
];

export type ResourceCostSpec = Partial<Record<SpendableResource, number>>;
export type ResourceCost = Partial<Record<SpendableResource, Decimal>>;

export interface BuildingDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  baseCost: ResourceCostSpec;
  generates: 'broth' | 'peat' | 'sphagnum' | 'methane' | 'cooling' | 'compute' | 'evidence';
  unlock?: {
    brothPerSecond?: number;
    computePerSecond?: number;
    peatPerSecond?: number;
    sphagnumPerSecond?: number;
    methanePerSecond?: number;
  };
  brothPerSecond?: number;
  computePerSecond?: number;
  peatPerSecond?: number;
  sphagnumPerSecond?: number;
  methanePerSecond?: number;
  evidencePerSecond?: number;
  cooling?: number;
  heat?: number;
}

export const COST_SCALE = 1.15;

export const BUILDINGS: BuildingDef[] = [
  { id: 'harvester', name: 'Peat Harvester', emoji: '🪵', description: 'A hardy cutter dragging rich peat from the bog.', baseCost: { broth: 15 }, generates: 'broth', brothPerSecond: 0.5 },
  { id: 'vat', name: 'Fermentation Vat', emoji: '🧪', description: 'Slow-brews Sector 4 peat into 40 L batches of fp16 compute broth.', baseCost: { broth: 100 }, generates: 'broth', brothPerSecond: 4 },
  { id: 'pump', name: 'Bog Pump', emoji: '⛽', description: 'Industrial pump on a Taylor C602 pulley, slurping broth from the water table.', baseCost: { broth: 1100 }, generates: 'broth', brothPerSecond: 25 },
  { id: 'dredger', name: 'Bog Dredger', emoji: '🚜', description: 'A tracked dredger widening the broth channels.', baseCost: { broth: 12_000 }, generates: 'broth', brothPerSecond: 120, unlock: { brothPerSecond: 50 } },
  { id: 'refinery', name: 'Broth Refinery', emoji: '🏗️', description: 'Polishes raw peat into a dependable compute broth stream.', baseCost: { broth: 130_000 }, generates: 'broth', brothPerSecond: 700, unlock: { brothPerSecond: 500 } },
  { id: 'still', name: 'Geothermal Still', emoji: '♨️', description: 'Draws subterranean warmth through a continuous broth still.', baseCost: { broth: 1_400_000 }, generates: 'broth', brothPerSecond: 4_000, unlock: { brothPerSecond: 3_000 } },
  { id: 'biome', name: 'Sealed Biome Vat', emoji: '🫙', description: 'A sealed ecosystem that brews the bog at industrial scale.', baseCost: { broth: 20_000_000 }, generates: 'broth', brothPerSecond: 25_000, unlock: { brothPerSecond: 20_000 } },
  { id: 'fryer', name: '120 kg Fryer Line', emoji: '🍟', description: 'Fries 120 kg of hot fries an hour; the runoff is surprisingly good broth.', baseCost: { broth: 300_000_000 }, generates: 'broth', brothPerSecond: 150_000, unlock: { brothPerSecond: 150_000 } },
  { id: 'kettle', name: 'Methane-Fired Kettle', emoji: '🫕', description: 'Boils broth on bog gas. Filed under "renewable" by the Chronicler.', baseCost: { broth: 4_000_000_000, methane: 2_000_000 }, generates: 'broth', brothPerSecond: 1_200_000, unlock: { brothPerSecond: 1_000_000 } },
  { id: 'cutter', name: 'Peat Cutter', emoji: '🔪', description: 'Cuts raw peat from the upper bog.', baseCost: { broth: 40 }, generates: 'peat', peatPerSecond: 0.3 },
  { id: 'excavator', name: 'Trench Excavator', emoji: '⛏️', description: 'Digs deep channels through the peat.', baseCost: { broth: 2_500, peat: 150 }, generates: 'peat', peatPerSecond: 6, unlock: { peatPerSecond: 2 } },
  { id: 'bogwalker', name: 'Bog Walker Rig', emoji: '🦿', description: 'Strides across the bog on industrial legs.', baseCost: { broth: 400_000, peat: 20_000 }, generates: 'peat', peatPerSecond: 150, unlock: { peatPerSecond: 40 } },
  { id: 'barge', name: 'Peat Barge', emoji: '🛶', description: 'A flat barge hauling cut peat down the flooded channels.', baseCost: { broth: 30_000_000, methane: 20_000 }, generates: 'peat', peatPerSecond: 3_000, unlock: { peatPerSecond: 800 } },
  { id: 'nursery', name: 'Sphagnum Nursery', emoji: '🌱', description: 'Trays of living moss raised on warm broth runoff.', baseCost: { broth: 800, peat: 60 }, generates: 'sphagnum', sphagnumPerSecond: 0.4 },
  { id: 'terrace', name: 'Moss Terrace', emoji: '🪴', description: 'Stepped terraces where the moss grows thick enough to walk on. Almost.', baseCost: { broth: 60_000, peat: 4_000 }, generates: 'sphagnum', sphagnumPerSecond: 8, unlock: { sphagnumPerSecond: 3 } },
  { id: 'loom', name: 'Bog Moss Loom', emoji: '🧵', description: 'Weaves sphagnum into insulating mats the racks are wrapped in.', baseCost: { broth: 5_000_000, sphagnum: 50_000 }, generates: 'sphagnum', sphagnumPerSecond: 200, unlock: { sphagnumPerSecond: 60 } },
  { id: 'digester', name: 'Anaerobic Digester', emoji: '🧫', description: 'Sealed peat rots in the dark and burps usable gas.', baseCost: { broth: 15_000, peat: 800 }, generates: 'methane', methanePerSecond: 0.5 },
  { id: 'gasdome', name: 'Methane Capture Dome', emoji: '⛺', description: 'A tarp dome over the wettest acre, catching what the bog exhales.', baseCost: { broth: 800_000, sphagnum: 5_000 }, generates: 'methane', methanePerSecond: 12, unlock: { methanePerSecond: 3 } },
  { id: 'flare', name: 'Flare Stack Turbine', emoji: '🔥', description: 'Burns off the surplus and spins a turbine while it does.', baseCost: { broth: 40_000_000, methane: 200_000 }, generates: 'methane', methanePerSecond: 300, unlock: { methanePerSecond: 100 } },
  { id: 'chiller', name: 'Chiller', emoji: '❄️', description: 'Keeps a rack-sized pocket of the bog frosty. Paid for in sanitized change.', baseCost: { broth: 600 }, generates: 'cooling', cooling: 10 },
  { id: 'mossbed', name: 'Moss Cooling Bed', emoji: '🌿', description: 'A bed of living moss that draws heat from the racks.', baseCost: { broth: 3_000, peat: 200 }, generates: 'cooling', cooling: 40 },
  { id: 'tower', name: 'Cooling Tower', emoji: '🏭', description: 'Evaporative tower venting steam over the moss.', baseCost: { broth: 12_000 }, generates: 'cooling', cooling: 120 },
  { id: 'glycol', name: 'Glycol Loop', emoji: '🧊', description: 'A closed loop of glycol carrying heat into the moss.', baseCost: { broth: 150_000 }, generates: 'cooling', cooling: 1_400, unlock: { computePerSecond: 20 } },
  { id: 'jacket', name: 'Sphagnum Jacket', emoji: '🧣', description: 'Wet moss wrapped around every rack. Cheap, damp, effective.', baseCost: { broth: 500_000, sphagnum: 3_000 }, generates: 'cooling', cooling: 5_000, unlock: { computePerSecond: 100 } },
  { id: 'exchanger', name: 'Bog Heat Exchanger', emoji: '🔁', description: 'Trades bog water for rack heat at exceptional efficiency.', baseCost: { broth: 2_000_000 }, generates: 'cooling', cooling: 15_000, unlock: { computePerSecond: 300 } },
  { id: 'cryo', name: 'Cryo Plant', emoji: '🌬️', description: 'A cryogenic plant freezing the bog around the racks.', baseCost: { broth: 30_000_000, peat: 500_000 }, generates: 'cooling', cooling: 180_000, unlock: { computePerSecond: 5_000 } },
  { id: 'rack', name: 'Server Rack', emoji: '🖥️', description: 'A humming rack steeped in the bog.', baseCost: { broth: 2_500 }, generates: 'compute', computePerSecond: 2, heat: 8 },
  { id: 'pod', name: 'Compute Pod', emoji: '📦', description: 'A sealed pod of racks half-sunk in the mire.', baseCost: { broth: 50_000 }, generates: 'compute', computePerSecond: 20, heat: 60, unlock: { computePerSecond: 1 } },
  { id: 'hall', name: 'Data Hall', emoji: '🏢', description: 'A whole hall of servers drinking the bog dry.', baseCost: { broth: 1_000_000 }, generates: 'compute', computePerSecond: 250, heat: 500, unlock: { computePerSecond: 50 } },
  { id: 'cluster', name: 'fp16 Cluster', emoji: '🧮', description: 'A cluster of fp16 racks tuned for the peat bog.', baseCost: { broth: 8_000_000 }, generates: 'compute', computePerSecond: 2_000, heat: 3_500, unlock: { computePerSecond: 500 } },
  { id: 'hyperscaler', name: 'Bog Hyperscaler', emoji: '🌐', description: 'A continent-scale facility anointed in broth.', baseCost: { broth: 120_000_000, compute: 500_000 }, generates: 'compute', computePerSecond: 30_000, heat: 30_000, unlock: { computePerSecond: 5_000 } },
  { id: 'turbinehall', name: 'Gas Turbine Hall', emoji: '🏭', description: 'Racks powered by bog methane; the exhaust warms the courthouse.', baseCost: { broth: 1_500_000_000, methane: 300_000 }, generates: 'compute', computePerSecond: 300_000, heat: 250_000, unlock: { computePerSecond: 100_000 } },
  { id: 'clerk', name: "Chronicler's Clerk Desk", emoji: '🖋️', description: 'A clerk desk that turns events into evidence.', baseCost: { broth: 20_000, compute: 200 }, generates: 'evidence', evidencePerSecond: 0.2, unlock: { computePerSecond: 5 } },
  { id: 'archive', name: 'Evidence Archive', emoji: '🗄️', description: 'Archives every filing from the peat bog trial.', baseCost: { broth: 2_000_000, compute: 50_000 }, generates: 'evidence', evidencePerSecond: 4, unlock: { computePerSecond: 500 } },
  { id: 'deposition', name: 'Deposition Booth', emoji: '🎙️', description: 'Witnesses depose on tape; the moss soaks up the echo.', baseCost: { broth: 200_000, compute: 5_000, sphagnum: 500 }, generates: 'evidence', evidencePerSecond: 1, unlock: { computePerSecond: 50 } },
  { id: 'courthouse', name: "Magistrate Reino's Courthouse Datacenter", emoji: '⚖️', description: 'Where McFly & Chronicler LLP v Burger King Nordic is finally heard — on 40 L of fp16 broth per rack.', baseCost: { broth: 2_000_000_000, compute: 5_000_000 }, generates: 'evidence', computePerSecond: 250_000, evidencePerSecond: 60, heat: 200_000, unlock: { computePerSecond: 50_000 } },
];

export const BUILDING_BY_ID: Record<string, BuildingDef> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b]),
);

export type UpgradeKind = 'click' | 'building' | 'thermal' | 'resource';

export interface UpgradeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cost: ResourceCostSpec;
  kind: UpgradeKind;
  requires?: { buildingId: string; count: number }[];
  buildingId?: string;
  clickMultiplier?: number;
  clickBrothFraction?: number;
  coolingMultiplier?: number;
  heatMultiplier?: number;
  resourceMultiplier?: { resource: Exclude<SpendableResource, 'bogCores'>; factor: number };
}

function scaleCost(cost: ResourceCostSpec, factor: number): ResourceCostSpec {
  const out: ResourceCostSpec = {};
  for (const [resource, amount] of Object.entries(cost) as [SpendableResource, number][]) {
    out[resource] = amount * factor;
  }
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
  { id: 'moss-mulch', name: 'Sphagnum Mulch', emoji: '🌱', description: 'Spent moss mulched back into the cuttings. Peat production ×1.5.', cost: { sphagnum: 500 }, kind: 'resource', resourceMultiplier: { resource: 'peat', factor: 1.5 }, requires: [{ buildingId: 'nursery', count: 10 }] },
  { id: 'pilot-light', name: 'Methane Pilot Light', emoji: '🕯️', description: 'Every vat gets a bog-gas flame underneath. Broth production ×1.25.', cost: { methane: 2_000 }, kind: 'resource', resourceMultiplier: { resource: 'broth', factor: 1.25 }, requires: [{ buildingId: 'digester', count: 10 }] },
  { id: 'evidence-press', name: 'Gas-Fired Evidence Press', emoji: '🗞️', description: 'Exhibits pressed flat and hot. Evidence production ×1.5.', cost: { methane: 20_000, evidence: 200 }, kind: 'resource', resourceMultiplier: { resource: 'evidence', factor: 1.5 }, requires: [{ buildingId: 'archive', count: 5 }] },
  { id: 'gas-scrubber', name: 'Bog Gas Scrubber', emoji: '🧯', description: 'Scrubbed exhaust runs colder. Cooling +20%.', cost: { methane: 50_000 }, kind: 'thermal', coolingMultiplier: 1.2, requires: [{ buildingId: 'gasdome', count: 10 }] },
  { id: 'moss-membrane', name: 'Moss Filter Membrane', emoji: '🧻', description: 'A living membrane between rack and bog. All heat −10%.', cost: { sphagnum: 20_000 }, kind: 'thermal', heatMultiplier: 0.9, requires: [{ buildingId: 'terrace', count: 10 }] },
  { id: 'wetland-charter', name: 'Wetland Charter', emoji: '📗', description: 'Magistrate Reino grants the moss protected status. Sphagnum production ×2.', cost: { evidence: 5_000, sphagnum: 100_000 }, kind: 'resource', resourceMultiplier: { resource: 'sphagnum', factor: 2 }, requires: [{ buildingId: 'loom', count: 5 }] },
  { id: 'flare-recovery', name: 'Flare Recovery Loop', emoji: '♻️', description: 'Nothing burns off unmetered. Methane production ×2.', cost: { methane: 1_000_000 }, kind: 'resource', resourceMultiplier: { resource: 'methane', factor: 2 }, requires: [{ buildingId: 'flare', count: 5 }] },
  { id: 'stenographer', name: 'Deposition Stenographer', emoji: '⌨️', description: 'Every scoop is entered into the record. Click power ×4.', cost: { evidence: 2_000 }, kind: 'click', clickMultiplier: 4, requires: [{ buildingId: 'deposition', count: 5 }] },
  { id: 'pierre-spade', name: "Pierre's Cutting Spade", emoji: '⛏️', description: 'A bog-oak spade found beside the old cutter, edge still keen. Peat production ×1.2.', cost: { peat: 20_000 }, kind: 'resource', requires: [{ buildingId: 'harvester', count: 25 }], resourceMultiplier: { resource: 'peat', factor: 1.2 } },
  { id: 'shrome-lantern', name: "Shrome's Spore Lantern", emoji: '🏮', description: 'A lantern that glows with living spores; the moss grows toward it. Sphagnum production ×1.2.', cost: { sphagnum: 5_000, broth: 500_000 }, kind: 'resource', requires: [{ buildingId: 'nursery', count: 10 }], resourceMultiplier: { resource: 'sphagnum', factor: 1.2 } },
  { id: 'samkals-ledger', name: "Samkals' Stone Ledger", emoji: '🪨', description: 'A rubbing taken from the sunken archive; the clerks copy its columns. Evidence production ×1.2.', cost: { evidence: 2_000, compute: 100_000 }, kind: 'resource', requires: [{ buildingId: 'clerk', count: 10 }], resourceMultiplier: { resource: 'evidence', factor: 1.2 } },
  { id: 'kreatix-gauge', name: "Kreatix's Pulley Gauge", emoji: '🧰', description: "The wright's own brass gauge; racks trued against it run cooler. Heat −10%.", cost: { compute: 200_000 }, kind: 'thermal', requires: [{ buildingId: 'rack', count: 25 }], heatMultiplier: 0.9 },
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
  cost: ResourceCostSpec;
  durationSec: number;
}

export const RESEARCH: ResearchDef[] = [
  {
    id: 'thermal-modelling',
    name: 'Thermal Modelling',
    emoji: '📈',
    description: 'Cooling effectiveness +25%.',
    cost: { compute: 500 },
    durationSec: 60,
  },
  {
    id: 'lubrication-clause',
    name: 'Strike the 5:00 AM Lubrication Clause',
    emoji: '📜',
    description: 'No more dawn greasing of the racks. All heat −15%.',
    cost: { compute: 2_000, evidence: 50 },
    durationSec: 180,
  },
  {
    id: 'liquid-immersion',
    name: 'Liquid Immersion',
    emoji: '🛢️',
    description: 'All heat output −20%.',
    cost: { compute: 5000 },
    durationSec: 240,
  },
  {
    id: 'broth-distillation',
    name: 'Broth Distillation',
    emoji: '⚗️',
    description: 'Broth production ×1.5.',
    cost: { compute: 20_000 },
    durationSec: 300,
  },
  {
    id: 'broth-standard',
    name: '40 L fp16 Compute Broth Standard',
    emoji: '🧴',
    description: 'Standardise every batch at 40 L fp16. Broth production ×1.25.',
    cost: { compute: 50_000 },
    durationSec: 420,
  },
  {
    id: 'edge-caching',
    name: 'Edge Caching',
    emoji: '🗄️',
    description: 'Compute production ×1.5.',
    cost: { compute: 100_000 },
    durationSec: 600,
  },
  {
    id: 'nordic-verdict',
    name: 'McFly & Chronicler LLP v Burger King Nordic',
    emoji: '⚖️',
    description: 'Win the case before Magistrate Reino. All production ×1.5.',
    cost: { compute: 250_000, evidence: 2_000 },
    durationSec: 1_200,
  },
  {
    id: 'quantum-peat',
    name: 'Quantum Peat',
    emoji: '♾️',
    description: 'All production ×2.',
    cost: { compute: 1_000_000 },
    durationSec: 1_800,
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
  { id: 'moss-1k', name: 'Soft Ground', emoji: '🌱', description: 'Earn 1,000 total sphagnum.' },
  { id: 'methane-1k', name: 'Marsh Light', emoji: '💨', description: 'Earn 1,000 total methane.' },
  { id: 'charter-1', name: 'First Term Signed', emoji: '📗', description: 'Sign a Charter term.' },
  { id: 'charter-all', name: 'Full Charter', emoji: '📜', description: 'Sign every Charter term.' },
  { id: 'keepers-all', name: 'Council of the Bog', emoji: '🕯️', description: 'Meet every Keeper of the Bog.' },
  { id: 'relics-4', name: 'Relic Cutter', emoji: '🏺', description: 'Recover all four Keeper relics.' },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

export const FIELD_NOTES: string[] = [
  'Field note 01: the bog has entered a plea of damp.',
  'Field note 02: the first cut was clean. The second was personal.',
  'Field note 03: the moss is winning. Filed without objection.',
  'Field note 04: Exhibit C is a 40 L drum, labelled fp16, warm to the touch.',
  "Field note 05: Reino's clerk asks that the racks stop humming during recess.",
  'Field note 06: the 5:00 AM lubrication clause has been struck; the racks are still greasy.',
  "Field note 07: Burger King Nordic's counsel requests the fries be entered as evidence. Denied; eaten.",
  'Field note 08: $59 in sanitized change remains in escrow, smelling of peat.',
  'Field note 09: the Taylor C602 pulley turns 15% in our favour.',
  'Field note 10: methane was found bubbling under the filing cabinet.',
  'Field note 11: sphagnum has formed a committee and requested shade.',
  'Field note 12: the courthouse datacenter accepts broth by the litre.',
  'Field note 13: the bog gas is renewable, provided nobody asks where it came from.',
  'Field note 14: all objections are logged, dried, and returned to the peat.',
  'Field note 15: the cutters leave a sod uncut on the deep bank. Pierre is under it, and he prefers the quiet.',
  "Field note 16: follow Mia's prints across the mire. Step where she did not, and the bog files a claim on your boots.",
  'Field note 17: Shrome does not speak; the moss just grows a little greener where he has been.',
  'Field note 18: Samkals was dredged, read, and put back. The ledger objected to being dry.',
  'Field note 19: the marsh light called Spaced rose over the digesters again. It was looking at the stars, not at us.',
  'Field note 20: nobody has seen vwh open the sluice. The water is simply gone by morning.',
  "Field note 21: Hermano's kettle is never empty. The far bank is a long wade, and worth it.",
  'Field note 22: Tassie passed under the racks at 3:00 AM. The thermal gauge has not stopped sulking.',
  "Field note 23: every pulley in the bog carries the wright's mark. Kreatix hung the first rack; the rest followed.",
  'Field note 24: Poke spoke in the vat again. Three bubbles, then silence. The Keepers took it as a yes.',
];

import type { Decimal } from './decimal';

/** Resource identifiers used by wallets, rates, and costs. */
export type ResourceId =
  | 'broth' | 'peat' | 'sphagnum' | 'methane' | 'compute' | 'evidence'
  | 'sludge' | 'briquettes' | 'refinedBroth' | 'sediment' | 'essence' | 'bogCores';
/** Resources that can be spent; Bog Cores are prestige currency. */
export type SpendableResource = Exclude<ResourceId, 'bogCores'>;

export interface ResourceDef {
  id: ResourceId;
  name: string;
  emoji: string;
  blurb: string;
  tier: 1 | 2 | 3;
}

/** Resource metadata shown by resource counters and controls. */
export const RESOURCES: ResourceDef[] = [
  { id: 'broth', name: 'fp16 compute broth', emoji: '🫧', blurb: 'fp16 compute broth', tier: 1 },
  { id: 'peat', name: 'raw peat', emoji: '🟫', blurb: 'raw peat', tier: 1 },
  { id: 'sphagnum', name: 'sphagnum moss', emoji: '🌱', blurb: 'sphagnum moss', tier: 1 },
  { id: 'methane', name: 'bog methane', emoji: '💨', blurb: 'bog methane', tier: 1 },
  { id: 'compute', name: 'compute', emoji: '⚡', blurb: 'compute', tier: 1 },
  { id: 'evidence', name: 'case evidence', emoji: '📁', blurb: 'case evidence', tier: 1 },
  { id: 'sludge', name: 'bog sludge', emoji: '🟤', blurb: 'the slurry the dredgers bring up', tier: 2 },
  { id: 'briquettes', name: 'dried briquettes', emoji: '🧱', blurb: 'peat pressed and kiln-dried', tier: 2 },
  { id: 'refinedBroth', name: 'refined broth', emoji: '🏺', blurb: 'broth run twice through the still', tier: 2 },
  { id: 'sediment', name: 'condensed sediment', emoji: '🪨', blurb: 'what settles when sludge is left in the dark', tier: 3 },
  { id: 'essence', name: 'bog essence', emoji: '✨', blurb: 'what the bog is, when everything else is boiled off', tier: 3 },
  { id: 'bogCores', name: 'bog cores', emoji: '💠', blurb: 'banked prestige cores', tier: 3 },
];

export type ResourceCostSpec = Partial<Record<SpendableResource, number>>;
export type ResourceCost = Partial<Record<SpendableResource, Decimal>>;
export type ProductionLine = SpendableResource | 'cooling';
export interface ResourceChainDef {
  from: SpendableResource[];
  to: SpendableResource;
  line: ProductionLine;
}

export interface BuildingDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  baseCost: ResourceCostSpec;
  line: ProductionLine;
  boostNames: [string, string, string, string];
  costScale?: number;
  unlock?: {
    rate?: Partial<Record<SpendableResource, number>>;
    lifetime?: Partial<Record<SpendableResource, number>>;
  };
  produces?: Partial<Record<SpendableResource, number>>;
  consumes?: Partial<Record<SpendableResource, number>>;
  cooling?: number;
  heat?: number;
}

export const COST_SCALE = 1.15;

const BASE_BUILDINGS: Omit<BuildingDef, 'boostNames'>[] = [
  { id: 'harvester', name: 'Peat Harvester', emoji: '🪵', description: 'A hardy cutter dragging rich peat from the bog.', baseCost: { broth: 15 }, produces: { broth: 0.5 }, line: 'broth'},
  { id: 'vat', name: 'Fermentation Vat', emoji: '🧪', description: 'Slow-brews Sector 4 peat into 40 L batches of fp16 compute broth.', baseCost: { broth: 100 }, produces: { broth: 4 }, line: 'broth'},
  { id: 'pump', name: 'Bog Pump', emoji: '⛽', description: 'Industrial pump on a Taylor C602 pulley, slurping broth from the water table.', baseCost: { broth: 1100 }, produces: { broth: 25 }, line: 'broth'},
  { id: 'dredger', name: 'Bog Dredger', emoji: '🚜', description: 'A tracked dredger widening the broth channels.', baseCost: { broth: 12_000 }, produces: { broth: 120, sludge: 2.4 }, line: 'broth', unlock: { rate: { broth: 50 } } },
  { id: 'refinery', name: 'Broth Refinery', emoji: '🏗️', description: 'Polishes raw peat into a dependable compute broth stream.', baseCost: { broth: 130_000 }, produces: { broth: 700, sludge: 14 }, line: 'broth', unlock: { rate: { broth: 500 } } },
  { id: 'still', name: 'Geothermal Still', emoji: '♨️', description: 'Draws subterranean warmth through a continuous broth still.', baseCost: { broth: 1_400_000 }, produces: { broth: 4_000, sludge: 80 }, line: 'broth', unlock: { rate: { broth: 3_000 } } },
  { id: 'biome', name: 'Sealed Biome Vat', emoji: '🫙', description: 'A sealed ecosystem that brews the bog at industrial scale.', baseCost: { broth: 20_000_000 }, produces: { broth: 25_000, sludge: 500 }, line: 'broth', unlock: { rate: { broth: 20_000 } } },
  { id: 'fryer', name: '120 kg Fryer Line', emoji: '🍟', description: 'Fries 120 kg of hot fries an hour; the runoff is surprisingly good broth.', baseCost: { broth: 300_000_000 }, produces: { broth: 150_000, sludge: 3_000 }, line: 'broth', unlock: { rate: { broth: 150_000 } } },
  { id: 'kettle', name: 'Methane-Fired Kettle', emoji: '🫕', description: 'Boils broth on bog gas. Filed under "renewable" by the Chronicler.', baseCost: { broth: 4_000_000_000, methane: 2_000_000 }, produces: { broth: 1_200_000, sludge: 24_000 }, line: 'broth', unlock: { rate: { broth: 1_000_000 } } },
  { id: 'cutter', name: 'Peat Cutter', emoji: '🔪', description: 'Cuts raw peat from the upper bog.', baseCost: { broth: 40 }, produces: { peat: 0.3 }, line: 'peat'},
  { id: 'excavator', name: 'Trench Excavator', emoji: '⛏️', description: 'Digs deep channels through the peat.', baseCost: { broth: 2_500, peat: 150 }, produces: { peat: 6 }, line: 'peat', unlock: { rate: { peat: 2 } } },
  { id: 'bogwalker', name: 'Bog Walker Rig', emoji: '🦿', description: 'Strides across the bog on industrial legs.', baseCost: { broth: 400_000, peat: 20_000 }, produces: { peat: 150 }, line: 'peat', unlock: { rate: { peat: 40 } } },
  { id: 'barge', name: 'Peat Barge', emoji: '🛶', description: 'A flat barge hauling cut peat down the flooded channels.', baseCost: { broth: 30_000_000, methane: 20_000 }, produces: { peat: 3_000 }, line: 'peat', unlock: { rate: { peat: 800 } } },
  { id: 'nursery', name: 'Sphagnum Nursery', emoji: '🌱', description: 'Trays of living moss raised on warm broth runoff.', baseCost: { broth: 800, peat: 60 }, produces: { sphagnum: 0.4 }, line: 'sphagnum'},
  { id: 'terrace', name: 'Moss Terrace', emoji: '🪴', description: 'Stepped terraces where the moss grows thick enough to walk on. Almost.', baseCost: { broth: 60_000, peat: 4_000 }, produces: { sphagnum: 8 }, line: 'sphagnum', unlock: { rate: { sphagnum: 3 } } },
  { id: 'loom', name: 'Bog Moss Loom', emoji: '🧵', description: 'Weaves sphagnum into insulating mats the racks are wrapped in.', baseCost: { broth: 5_000_000, sphagnum: 50_000 }, produces: { sphagnum: 200 }, line: 'sphagnum', unlock: { rate: { sphagnum: 60 } } },
  { id: 'digester', name: 'Anaerobic Digester', emoji: '🧫', description: 'Sealed peat rots in the dark and burps usable gas.', baseCost: { broth: 15_000, peat: 800 }, produces: { methane: 0.5 }, line: 'methane'},
  { id: 'gasdome', name: 'Methane Capture Dome', emoji: '⛺', description: 'A tarp dome over the wettest acre, catching what the bog exhales.', baseCost: { broth: 800_000, sphagnum: 5_000 }, produces: { methane: 12 }, line: 'methane', unlock: { rate: { methane: 3 } } },
  { id: 'flare', name: 'Flare Stack Turbine', emoji: '🔥', description: 'Burns off the surplus and spins a turbine while it does.', baseCost: { broth: 40_000_000, methane: 200_000 }, produces: { methane: 300 }, line: 'methane', unlock: { rate: { methane: 100 } } },
  { id: 'chiller', name: 'Chiller', emoji: '❄️', description: 'Keeps a rack-sized pocket of the bog frosty. Paid for in sanitized change.', baseCost: { broth: 600 }, line: 'cooling', cooling: 10 },
  { id: 'mossbed', name: 'Moss Cooling Bed', emoji: '🌿', description: 'A bed of living moss that draws heat from the racks.', baseCost: { broth: 3_000, peat: 200 }, line: 'cooling', cooling: 40 },
  { id: 'tower', name: 'Cooling Tower', emoji: '🏭', description: 'Evaporative tower venting steam over the moss.', baseCost: { broth: 12_000 }, line: 'cooling', cooling: 120 },
  { id: 'glycol', name: 'Glycol Loop', emoji: '🧊', description: 'A closed loop of glycol carrying heat into the moss.', baseCost: { broth: 150_000 }, line: 'cooling', cooling: 1_400, unlock: { rate: { compute: 20 } } },
  { id: 'jacket', name: 'Sphagnum Jacket', emoji: '🧣', description: 'Wet moss wrapped around every rack. Cheap, damp, effective.', baseCost: { broth: 500_000, sphagnum: 3_000 }, line: 'cooling', cooling: 5_000, unlock: { rate: { compute: 100 } } },
  { id: 'exchanger', name: 'Bog Heat Exchanger', emoji: '🔁', description: 'Trades bog water for rack heat at exceptional efficiency.', baseCost: { broth: 2_000_000 }, line: 'cooling', cooling: 15_000, unlock: { rate: { compute: 300 } } },
  { id: 'cryo', name: 'Cryo Plant', emoji: '🌬️', description: 'A cryogenic plant freezing the bog around the racks.', baseCost: { broth: 30_000_000, peat: 500_000 }, line: 'cooling', cooling: 180_000, unlock: { rate: { compute: 5_000 } } },
  { id: 'rack', name: 'Server Rack', emoji: '🖥️', description: 'A humming rack steeped in the bog.', baseCost: { broth: 2_500 }, produces: { compute: 2 }, line: 'compute', heat: 8 },
  { id: 'pod', name: 'Compute Pod', emoji: '📦', description: 'A sealed pod of racks half-sunk in the mire.', baseCost: { broth: 50_000 }, produces: { compute: 20 }, line: 'compute', heat: 60, unlock: { rate: { compute: 1 } } },
  { id: 'hall', name: 'Data Hall', emoji: '🏢', description: 'A whole hall of servers drinking the bog dry.', baseCost: { broth: 1_000_000 }, produces: { compute: 250 }, line: 'compute', heat: 500, unlock: { rate: { compute: 50 } } },
  { id: 'cluster', name: 'fp16 Cluster', emoji: '🧮', description: 'A cluster of fp16 racks tuned for the peat bog.', baseCost: { broth: 8_000_000 }, produces: { compute: 2_000 }, line: 'compute', heat: 3_500, unlock: { rate: { compute: 500 } } },
  { id: 'hyperscaler', name: 'Bog Hyperscaler', emoji: '🌐', description: 'A continent-scale facility anointed in broth.', baseCost: { broth: 120_000_000, compute: 500_000 }, produces: { compute: 30_000 }, line: 'compute', heat: 30_000, unlock: { rate: { compute: 5_000 } } },
  { id: 'turbinehall', name: 'Gas Turbine Hall', emoji: '🏭', description: 'Racks powered by bog methane; the exhaust warms the courthouse.', baseCost: { broth: 1_500_000_000, methane: 300_000 }, produces: { compute: 300_000 }, line: 'compute', heat: 250_000, unlock: { rate: { compute: 100_000 } } },
  { id: 'clerk', name: "Chronicler's Clerk Desk", emoji: '🖋️', description: 'A clerk desk that turns events into evidence.', baseCost: { broth: 20_000, compute: 200 }, produces: { evidence: 0.2 }, line: 'evidence', unlock: { rate: { compute: 5 } } },
  { id: 'archive', name: 'Evidence Archive', emoji: '🗄️', description: 'Archives every filing from the peat bog trial.', baseCost: { broth: 2_000_000, compute: 50_000 }, produces: { evidence: 4 }, line: 'evidence', unlock: { rate: { compute: 500 } } },
  { id: 'deposition', name: 'Deposition Booth', emoji: '🎙️', description: 'Witnesses depose on tape; the moss soaks up the echo.', baseCost: { broth: 200_000, compute: 5_000, sphagnum: 500 }, produces: { evidence: 1 }, line: 'evidence', unlock: { rate: { compute: 50 } } },
  { id: 'courthouse', name: "Magistrate Reino's Courthouse Datacenter", emoji: '⚖️', description: 'Where McFly & Chronicler LLP v Burger King Nordic is finally heard — on 40 L of fp16 broth per rack.', baseCost: { broth: 2_000_000_000, compute: 5_000_000 }, produces: { compute: 250_000, evidence: 60 }, line: 'evidence', heat: 200_000, unlock: { rate: { compute: 50_000 } } },
  { id: 'peat-press', name: 'Peat Press', emoji: '🧱', description: 'Pressed peat leaves the bog in a shape the clerk can stack.', baseCost: { broth: 180_000, peat: 25_000 }, line: 'briquettes', costScale: 1.17, consumes: { peat: 6 }, produces: { briquettes: 0.8 }, unlock: { rate: { briquettes: 0.48 }, lifetime: { peat: 25_000 } } },
  { id: 'drying-kiln', name: 'Drying Kiln', emoji: '🔥', description: 'The second kiln runs hotter and accepts no objections from the moss.', baseCost: { broth: 2_500_000, peat: 400_000 }, line: 'briquettes', costScale: 1.17, consumes: { peat: 18 }, produces: { briquettes: 3 }, unlock: { rate: { briquettes: 1.8 }, lifetime: { peat: 400_000 } } },
  { id: 'briquette-works', name: 'Briquette Works', emoji: '🏭', description: 'A whole works presses the bog into neat fuel bricks.', baseCost: { broth: 36_000_000, peat: 7_000_000 }, line: 'briquettes', costScale: 1.2, consumes: { peat: 60 }, produces: { briquettes: 12 }, unlock: { rate: { briquettes: 7.2 }, lifetime: { peat: 7_000_000 } } },
  { id: 'arcane-extractor', name: 'Arcane Peat Extractor', emoji: '⚗️', description: 'An extractor so advanced the paperwork calls it arcane and moves on.', baseCost: { broth: 48_000_000_000 }, line: 'broth', costScale: 1.2, produces: { broth: 8_000_000, sludge: 160_000 }, unlock: { rate: { broth: 4_800_000 } } },
  { id: 'cosmic-condenser', name: 'Cosmic Bog Condenser', emoji: '🌌', description: 'The bog is condensed until the courthouse lights notice.', baseCost: { broth: 650_000_000_000 }, line: 'broth', costScale: 1.2, produces: { broth: 60_000_000, sludge: 1_200_000 }, unlock: { rate: { broth: 36_000_000 } } },
  { id: 'peat-monument', name: 'Peat Monument', emoji: '🗿', description: 'A cut so large Magistrate Reino requests a surveyor.', baseCost: { broth: 9_000_000_000 }, line: 'peat', costScale: 1.2, produces: { peat: 25_000 }, unlock: { rate: { peat: 15_000 } } },
  { id: 'peat-rail', name: 'Peat Rail', emoji: '🚂', description: 'A narrow rail carries sod past every filing cabinet in Sector 4.', baseCost: { broth: 140_000_000_000, methane: 2_000_000 }, line: 'peat', costScale: 1.2, produces: { peat: 200_000 }, unlock: { rate: { peat: 120_000 } } },
  { id: 'peat-estate', name: 'Peat Estate', emoji: '🏞️', description: 'The bog acquires acreage and declines to discuss the valuation.', baseCost: { broth: 2_000_000_000_000, methane: 40_000_000 }, line: 'peat', costScale: 1.2, produces: { peat: 1_600_000 }, unlock: { rate: { peat: 960_000 } } },
  { id: 'moss-cathedral', name: 'Moss Cathedral', emoji: '⛪', description: 'The moss grows under a vaulted roof and files its own hymns.', baseCost: { broth: 50_000_000, peat: 5_000_000 }, line: 'sphagnum', costScale: 1.2, produces: { sphagnum: 1_000 }, unlock: { rate: { sphagnum: 600 } } },
  { id: 'moss-reserve', name: 'Sphagnum Reserve', emoji: '🌿', description: 'A protected reserve where every tuft has standing in court.', baseCost: { broth: 800_000_000, peat: 100_000_000 }, line: 'sphagnum', costScale: 1.2, produces: { sphagnum: 8_000 }, unlock: { rate: { sphagnum: 4_800 } } },
  { id: 'gas-orchard', name: 'Methane Orchard', emoji: '🍐', description: 'Gas pockets are cultivated in rows, though nothing is served at lunch.', baseCost: { broth: 250_000_000, peat: 10_000_000 }, line: 'methane', costScale: 1.2, produces: { methane: 2_000 }, unlock: { rate: { methane: 1_200 } } },
  { id: 'gas-reservoir', name: 'Methane Reservoir', emoji: '🛢️', description: 'The bog stores enough gas to make the insurance clerk leave.', baseCost: { broth: 4_000_000_000, peat: 250_000_000 }, line: 'methane', costScale: 1.2, produces: { methane: 16_000 }, unlock: { rate: { methane: 9_600 } } },
  { id: 'deep-freeze', name: 'Deep Freeze', emoji: '🧊', description: 'A cold plant drops the rack temperature below the filing threshold.', baseCost: { broth: 400_000_000, peat: 20_000_000 }, line: 'cooling', costScale: 1.2, cooling: 700_000, unlock: { rate: { compute: 200_000 } } },
  { id: 'ice-gallery', name: 'Ice Gallery', emoji: '🏛️', description: 'Cooling galleries run beneath the bog like very expensive roots.', baseCost: { broth: 6_000_000_000, peat: 300_000_000 }, line: 'cooling', costScale: 1.2, cooling: 5_000_000, unlock: { rate: { compute: 1_500_000 } } },
  { id: 'polar-mire', name: 'Polar Mire Plant', emoji: '🌨️', description: 'The bog becomes a climate and the racks stop complaining.', baseCost: { broth: 90_000_000_000, peat: 5_000_000_000 }, line: 'cooling', costScale: 1.2, cooling: 40_000_000, unlock: { rate: { compute: 12_000_000 } } },
  { id: 'quantum-hall', name: 'Quantum Rack Hall', emoji: '🌀', description: 'The racks run in several legal jurisdictions at once.', baseCost: { broth: 350_000_000, compute: 20_000_000 }, line: 'compute', costScale: 1.2, heat: 1_500_000, consumes: { briquettes: 20 }, produces: { compute: 1_000_000 }, unlock: { rate: { compute: 600_000 }, lifetime: { briquettes: 100_000 } } },
  { id: 'mire-cluster', name: 'Mire Cluster', emoji: '🧮', description: 'A cluster tuned to the peat and the most stubborn objections.', baseCost: { broth: 5_000_000_000, compute: 300_000_000 }, line: 'compute', costScale: 1.2, heat: 8_000_000, consumes: { briquettes: 120 }, produces: { compute: 7_000_000 }, unlock: { rate: { compute: 4_200_000 }, lifetime: { briquettes: 1_000_000 } } },
  { id: 'bog-supercomputer', name: 'Bog Supercomputer', emoji: '💻', description: 'A supercomputer powered by dried peat and procedural patience.', baseCost: { broth: 70_000_000_000, compute: 5_000_000_000 }, line: 'compute', costScale: 1.2, heat: 40_000_000, consumes: { briquettes: 600, refinedBroth: 20 }, produces: { compute: 50_000_000 }, unlock: { rate: { compute: 30_000_000 }, lifetime: { briquettes: 8_000_000 } } },
  { id: 'court-oracle', name: 'Court Oracle', emoji: '🔮', description: 'The oracle predicts the verdict and gets the date almost right.', baseCost: { broth: 1_000_000_000_000, compute: 80_000_000_000 }, line: 'compute', costScale: 1.2, heat: 220_000_000, consumes: { briquettes: 2_000, refinedBroth: 100 }, produces: { compute: 400_000_000 }, unlock: { rate: { compute: 240_000_000 }, lifetime: { briquettes: 50_000_000 } } },
  { id: 'docket-tower', name: 'Docket Tower', emoji: '🏢', description: 'A tower of filings turns every objection into an exhibit.', baseCost: { broth: 10_000_000_000, compute: 1_000_000_000 }, line: 'evidence', costScale: 1.2, produces: { evidence: 700 }, unlock: { rate: { evidence: 420 } } },
  { id: 'precedent-vault', name: 'Precedent Vault', emoji: '🗄️', description: 'The vault stores enough evidence to make the clerk request shelves.', baseCost: { broth: 200_000_000_000, compute: 20_000_000_000 }, line: 'evidence', costScale: 1.2, produces: { evidence: 5_000 }, unlock: { rate: { evidence: 3_000 } } },
  { id: 'sludge-settler', name: 'Settling Pond', emoji: '🪨', description: 'Sludge sits in the dark until it can be called sediment.', baseCost: { broth: 2_000_000, sludge: 2_000 }, line: 'sediment', costScale: 1.15, consumes: { sludge: 12 }, produces: { sediment: 1 }, unlock: { lifetime: { sludge: 2_000 } } },
  { id: 'sediment-vault', name: 'Sediment Vault', emoji: '🏚️', description: 'A vault keeps the settled layers dry, labelled, and mostly silent.', baseCost: { broth: 80_000_000, sludge: 150_000 }, line: 'sediment', costScale: 1.17, consumes: { sludge: 60 }, produces: { sediment: 8 }, unlock: { rate: { sediment: 4.8 }, lifetime: { sludge: 150_000 } } },
  { id: 'copper-still', name: 'Copper Still', emoji: '⚗️', description: 'Copper gives the broth another pass and the methane a reason to behave.', baseCost: { broth: 2_500_000, peat: 5_000, methane: 1_000 }, line: 'refinedBroth', costScale: 1.15, consumes: { broth: 8, methane: 1 }, produces: { refinedBroth: 1 }, unlock: { lifetime: { broth: 5_000 } } },
  { id: 'fractionating-column', name: 'Fractionating Column', emoji: '🏺', description: 'The column separates the useful broth from the legal residue.', baseCost: { broth: 100_000_000, methane: 100_000 }, line: 'refinedBroth', costScale: 1.17, consumes: { broth: 40, methane: 5 }, produces: { refinedBroth: 8 }, unlock: { rate: { refinedBroth: 4.8 }, lifetime: { broth: 1_000_000 } } },
  { id: 'double-run-still', name: 'Double-Run Still', emoji: '♨️', description: 'The still runs twice and bills the same amount of methane.', baseCost: { broth: 5_000_000_000, methane: 2_000_000 }, line: 'refinedBroth', costScale: 1.2, consumes: { broth: 200, methane: 20 }, produces: { refinedBroth: 50 }, unlock: { rate: { refinedBroth: 30 }, lifetime: { broth: 100_000_000 } } },
  { id: 'essence-condenser', name: 'Essence Condenser', emoji: '✨', description: 'Sediment and refined broth are boiled down to the part that matters.', baseCost: { broth: 1_000_000_000, sediment: 10_000, refinedBroth: 2_000 }, line: 'essence', costScale: 1.15, consumes: { sediment: 10, refinedBroth: 2 }, produces: { essence: 1 }, unlock: { lifetime: { sediment: 1_000 } } },
  { id: 'celestial-alembic', name: 'Celestial Alembic', emoji: '🌠', description: 'The final vessel reaches upward and finds the bog waiting there.', baseCost: { broth: 50_000_000_000, sediment: 2_000_000, refinedBroth: 500_000 }, line: 'essence', costScale: 1.2, consumes: { sediment: 80, refinedBroth: 20 }, produces: { essence: 12 }, unlock: { rate: { essence: 7.2 }, lifetime: { sediment: 1_000_000 } } },
];

const BOOST_NAMES: Record<string, [string, string, string, string]> = {
  harvester: ['Bog Sodder', 'Wetland Pull', 'Cartwheel Shave', 'Blackwater Return'],
  vat: ['Yeast Docket', 'Warm Mash', 'Bubble Lot', 'Forty-Litre Pour'],
  pump: ['Water Table Draw', 'Pulley Thrum', 'Sump Pressure', 'Deep Intake'],
  dredger: ['Channel Bite', 'Trackside Slurry', 'Dredge Wake', 'Wide Widening'],
  refinery: ['Clear Runoff', 'Polish Coat', 'Settled Gloss', 'Reliable Stream'],
  still: ['Geothermal Rattle', 'Underheat Draft', 'Stone Boiler', 'Basalt Simmer'],
  biome: ['Sealed Canopy', 'Closed Ecology', 'Glass Habitat', 'Rainless Circuit'],
  fryer: ['Hot Oil Writ', 'Crisp Runoff', 'Fryer Rotation', 'Golden Drip'],
  kettle: ['Copper Bottom', 'Rolling Boil', 'Twin Burners', 'Kettle Chorus'],
  cutter: ['Upper Bog Slice', 'Sod Knife', 'Rootline Slice', 'Turf Register'],
  excavator: ['Trench Bite', 'Deep Shovel', 'Channel Teeth', 'Subsoil Claim'],
  bogwalker: ['Stepframe', 'Mire Stride', 'Walking Gear', 'Mudline March'],
  barge: ['Flatwater Haul', 'Sod Cargo', 'Floodplain Transit', 'Towpath Load'],
  nursery: ['Moss Cradle', 'Green Tray', 'Spore Ration', 'Damp Nursery'],
  terrace: ['Stepped Rise', 'Moss Stair', 'Raised Sprig', 'Garden Entry'],
  loom: ['Fibre Shuttle', 'Sphagnum Weave', 'Matting Shuttle', 'Threaded Insulation'],
  digester: ['Sealed Burp', 'Anaerobic Draft', 'Dark Gas', 'Tankside Methane'],
  gasdome: ['Tarp Crown', 'Captured Breath', 'Dome Pressure', 'Greenhouse Gas'],
  flare: ['Burnoff Spin', 'Exhaust Torque', 'Turbine Wake', 'Stack Dividend'],
  chiller: ['Pocket Frost', 'Cold Ledge', 'Rime Deposit', 'Chilled Margin'],
  mossbed: ['Living Sink', 'Green Cooling', 'Rootside Chill', 'Wet Heat'],
  tower: ['Steam Column', 'Evaporation Duty', 'Roof Vent', 'Cooling Plume'],
  glycol: ['Loop Charge', 'Blue Circuit', 'Return Flow', 'Jacketed Cold'],
  jacket: ['Moss Wrap', 'Rack Blanket', 'Damp Insulation', 'Soft Shell'],
  exchanger: ['Bogwater Trade', 'Heat Bargain', 'Thermal Swap', 'Wet Transfer'],
  cryo: ['Frozen Acre', 'Cryogenic Reach', 'Ice Boundary', 'Permafrost Ledger'],
  rack: ['Rack Spark', 'Silicon Plinth', 'First Flop', 'Server Hum'],
  pod: ['Sealed Compute', 'Pod Cluster', 'Mire Capsule', 'Boxed Flow'],
  hall: ['Hall Current', 'Raised Floor', 'Long Aisle', 'Facility Load'],
  cluster: ['Parallel Marsh', 'Vector Lot', 'Dense Array', 'Compute Lattice'],
  hyperscaler: ['Continental Draw', 'Grid Horizon', 'Vast Capacity', 'Scale Dividend'],
  turbinehall: ['Methane Vector', 'Exhaust Chamber', 'Gasline Compute', 'Rotating Capacity'],
  clerk: ['Filing Ink', 'Exhibit Stamp', 'Minute Book', 'Clerkship Return'],
  archive: ['Shelf Index', 'Paper Store', 'Boxed Evidence', 'Record Weight'],
  deposition: ['Witness Tape', 'Sworn Audio', 'Booth Transcript', 'Recorded Objection'],
  courthouse: ['Final Hearing', 'Reino Bench', 'Exhibit Hall', 'Nordic Record'],
  'peat-press': ['Compressed Sod', 'Brick Face', 'Press Stroke', 'Dry Block'],
  'drying-kiln': ['Kiln Mouth', 'Heat Coil', 'Fired Peat', 'Drying Cycle'],
  'briquette-works': ['Brickworks Ledger', 'Fuel Yard', 'Pressing Floor', 'Black Brick'],
  'arcane-extractor': ['Esoteric Pull', 'Hidden Stratum', 'Sigil Sluice', 'Unnamed Output'],
  'cosmic-condenser': ['Starfall Condensate', 'Orbital Drift', 'Nebula Drip', 'Skybound Reduction'],
  'peat-monument': ['Standing Sod', 'Survey Stone', 'Monument Marker', 'Acre Marker'],
  'peat-rail': ['Narrow Gauge', 'Sod Express', 'Bog Spur', 'Rail Consignment'],
  'peat-estate': ['Acre Charter', 'Land Grant', 'Turf Holdings', 'Marsh Valuation'],
  'moss-cathedral': ['Vaulted Moss', 'Hymnal Bloom', 'Green Nave', 'Cathedral Sprig'],
  'moss-reserve': ['Protected Frond', 'Reserve Charter', 'Quiet Flourish', 'Conservation Result'],
  'gas-orchard': ['Methane Rows', 'Orchard Pocket', 'Gas Harvest', 'Pearless Crop'],
  'gas-reservoir': ['Tank Farm', 'Stored Breath', 'Reservoir Head', 'Insurance Buffer'],
  'deep-freeze': ['Deep Rime', 'Cold Sink', 'Frozen Margin', 'Ice Plant'],
  'ice-gallery': ['Gallery Chill', 'Root Tunnel', 'Frost Arcade', 'Subterranean Cold'],
  'polar-mire': ['Polar Reach', 'Climate Engine', 'Whitewater Freeze', 'Latitude Drop'],
  'quantum-hall': ['Quantum Chamber', 'Jurisdiction Split', 'Entangled Rate', 'Parallel Hearing'],
  'mire-cluster': ['Peat Vector', 'Cluster Accord', 'Dense Basin', 'Rack Parliament'],
  'bog-supercomputer': ['Dried Peat Array', 'Supercompute Cycle', 'Brothless Logic', 'Giant Register'],
  'court-oracle': ['Oracle Docket', 'Prediction Desk', 'Verdict Forecast', 'Almost Right'],
  'docket-tower': ['Exhibit Tower', 'Filing Height', 'Docket Stack', 'Vertical Record'],
  'precedent-vault': ['Case Cache', 'Binding Folio', 'Prior Art', 'Vaulted Ruling'],
  'sludge-settler': ['Dark Basin', 'Quiet Sediment', 'Settling Interval', 'Brown Bed'],
  'sediment-vault': ['Strata Store', 'Dry Vein', 'Geological Writ', 'Vaulted Silt'],
  'copper-still': ['Red Metal Reflux', 'Bright Spirit', 'Stillhouse Pour', 'Methane Wash'],
  'fractionating-column': ['Column Split', 'Vapour Ladder', 'Useful Fraction', 'Residue Denial'],
  'double-run-still': ['Second Passage', 'Repeat Distill', 'Twin Vapour', 'Double Receipt'],
  'essence-condenser': ['Final Drop', 'Concentrate Glow', 'Essence Divide', 'Last Solvent'],
  'celestial-alembic': ['Astral Retort', 'Zenith Vessel', 'Star Glass', "Heaven's Condensate"],
};

export const BUILDINGS: BuildingDef[] = BASE_BUILDINGS.map((building) => {
  const lineBuildings = BASE_BUILDINGS.filter((candidate) => candidate.line === building.line);
  const tier = lineBuildings.indexOf(building) + 1;
  const costScale = building.costScale ?? (tier <= 3 ? 1.15 : tier <= 6 ? 1.17 : 1.2);
  return {
    ...building,
    costScale,
    boostNames: BOOST_NAMES[building.id],
  };
});

/** Resource conversion chains used by later production and UI surfaces. */
export const RESOURCE_CHAINS: ResourceChainDef[] = [
  { from: ['peat'], to: 'briquettes', line: 'briquettes' },
  { from: ['broth', 'methane'], to: 'refinedBroth', line: 'refinedBroth' },
  { from: ['sludge'], to: 'sediment', line: 'sediment' },
  { from: ['sediment', 'refinedBroth'], to: 'essence', line: 'essence' },
];

export const BUILDING_BY_ID: Record<string, BuildingDef> = Object.fromEntries(
  BUILDINGS.map((b) => [b.id, b]),
);

export type UpgradeKind = 'click' | 'building' | 'thermal' | 'resource' | 'offline' | 'synergy' | 'converter' | 'automation';

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
  offlineRateAdd?: number;
  coolingMultiplier?: number;
  heatMultiplier?: number;
  resourceMultiplier?: { resource: SpendableResource | 'all'; factor: number };
  synergy?: {
    source: SpendableResource | string;
    target: SpendableResource | 'all';
    perUnit: number;
    cap: number;
  };
  converterEfficiency?: { line: ProductionLine; factor: number };
  automation?: { line: ProductionLine; intervalSec: number };
}

function scaleCost(cost: ResourceCostSpec, factor: number): ResourceCostSpec {
  const out: ResourceCostSpec = {};
  for (const [resource, amount] of Object.entries(cost) as [SpendableResource, number][]) {
    out[resource] = amount * factor;
  }
  return out;
}

/** Generated output boost thresholds shared by every production building. */
export const BOOST_TIERS = [
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
    BOOST_TIERS.map(({ count, factor }, index): UpgradeDef => ({
      id: index === 0 ? `boost-${building.id}` : `boost-${building.id}-${count}`,
      name: building.boostNames[index],
      emoji: building.emoji,
      description: `${building.name} output ×${factor}.`,
      cost: scaleCost(building.baseCost, factor),
      kind: 'building',
      buildingId: building.id,
      requires: [{ buildingId: building.id, count }],
    })),
  ),
  ...[
    ['click-ladle', 'Long-Handled Ladle', 'A longer handle reaches the good broth.', 500, 2],
    ['click-scoop', 'Measured Scoop', 'The scoop is marked in useful increments.', 5_000, 2],
    ['click-crank', 'Counterweight Crank', 'The crank turns the harvest into a clerical certainty.', 50_000, 3],
    ['click-filing', 'Filed Harvest', 'Every scoop arrives with its exhibit number attached.', 500_000, 2],
    ['click-winch', 'Winch-Assisted Scoop', 'The winch does not ask what the bog is made of.', 5_000_000, 3],
    ['click-pump', 'Hand Pump Equity', 'A small share of the pump is still a share.', 50_000_000, 4],
    ['click-recess', 'Recess Extension', 'The harvest continues while the court finds its papers.', 500_000_000, 3],
    ['click-final', 'Final Scoop', 'The last scoop is never actually the last.', 5_000_000_000, 5],
  ].map(([id, name, description, broth, factor]) => ({
    id: String(id), name: String(name), emoji: '🫧', description: `${String(description)} Click power ×${factor}.`,
    cost: { broth: Number(broth) }, kind: 'click' as const, clickMultiplier: Number(factor),
  })),
  ...[
    ['offline-lantern', 'Ledger Lantern', 'A lamp remains lit over the night docket.', 0.01, 5_000],
    ['offline-watch', 'Watch Roster', 'The cutters receive a proper rota.', 0.02, 100_000],
    ['offline-clerk', 'After-Hours Clerk', 'One clerk keeps the figures moving.', 0.03, 2_000_000],
    ['offline-moon', 'Moon Filing', 'The moon gets its own copy of the schedule.', 0.04, 40_000_000],
    ['offline-tide', 'Tide Table', 'The bog is checked between tides.', 0.05, 800_000_000],
    ['offline-permanent', 'Permanent Night Shift', 'Someone has finally admitted this is a night job.', 0.06, 16_000_000_000],
  ].map(([id, name, description, add, broth]) => ({
    id: String(id), name: String(name), emoji: '🌙', description: `${String(description)} Offline rate +${Number(add) * 100}%.`,
    cost: { broth: Number(broth) }, kind: 'offline' as const, offlineRateAdd: Number(add),
  })),
  ...[
    ['synergy-chill', 'Chilled Compute Ledger', 'Each chiller gives the racks a little more room.', 'chiller', 'compute', 0.01, 3, 25_000],
    ['synergy-moss', 'Moss-Wrapped Peat', 'Moss makes the peat cutters less wasteful.', 'nursery', 'peat', 0.01, 2, 100_000],
    ['synergy-gas', 'Gas-Eyed Pumps', 'The pumps appreciate a reliable methane docket.', 'digester', 'broth', 0.01, 2.5, 400_000],
    ['synergy-evidence', 'Exhibit Conveyor', 'Evidence moves faster when the archive is full.', 'archive', 'evidence', 0.02, 3, 2_000_000],
    ['synergy-racks', 'Rack Census', 'The racks vote for more compute.', 'rack', 'compute', 0.005, 3, 10_000_000],
    ['synergy-peat', 'Briquette Accounting', 'Every press improves the next line item.', 'briquette-works', 'briquettes', 0.01, 3, 50_000_000],
    ['synergy-still', 'Stillwater Clause', 'The still and the broth now share a docket.', 'copper-still', 'refinedBroth', 0.02, 3, 250_000_000],
    ['synergy-sediment', 'Settled Accounts', 'Sediment settles the evidence ledger.', 'sediment-vault', 'evidence', 0.02, 3, 1_000_000_000],
    ['synergy-essence', 'Essence Witness', 'Essence makes every witness more concise.', 'essence-condenser', 'all', 0.01, 2, 5_000_000_000],
    ['synergy-peat-root', 'Root-and-Branch Filing', 'The old peat and new filings agree for once.', 'peat', 'broth', 0.01, 3, 25_000_000_000],
    ['synergy-methane', 'Methane Annex', 'The gas annex feeds every warm proceeding.', 'methane', 'compute', 0.01, 3, 100_000_000_000],
    ['synergy-cooling', 'Cold Casework', 'Cold cases are still cases.', 'cooling', 'evidence', 0.01, 3, 500_000_000_000],
  ].map(([id, name, description, source, target, perUnit, cap, broth]) => ({
    id: String(id), name: String(name), emoji: '🔗', description: `${String(description)} ${Number(perUnit) * 100}% per source, capped ×${cap}.`,
    cost: { broth: Number(broth) }, kind: 'synergy' as const,
    synergy: { source: String(source), target: String(target) as SpendableResource | 'all', perUnit: Number(perUnit), cap: Number(cap) },
  })),
  ...[
    ['converter-briquette', 'Dry Press Gearing', 'The press wastes less peat.', 'briquettes', 0.9, 100_000],
    ['converter-still', 'Copper Reflux', 'The still keeps the useful vapour.', 'refinedBroth', 0.9, 1_000_000],
    ['converter-sediment', 'Dark Settling', 'The pond is allowed to settle properly.', 'sediment', 0.88, 10_000_000],
    ['converter-essence', 'Alembic Patience', 'The alembic takes only what it needs.', 'essence', 0.88, 100_000_000],
    ['converter-briquette-works', 'Kiln Ledger', 'The works records every dry brick.', 'briquettes', 0.82, 1_000_000_000],
    ['converter-double-run', 'Second Distillation', 'A second run loses less to the floor.', 'refinedBroth', 0.82, 10_000_000_000],
    ['converter-vault', 'Vault Sluice', 'The vault receives measured sludge.', 'sediment', 0.8, 100_000_000_000],
    ['converter-celestial', 'Celestial Retort', 'The final vessel has learned restraint.', 'essence', 0.8, 1_000_000_000_000],
  ].map(([id, name, description, line, factor, broth]) => ({
    id: String(id), name: String(name), emoji: '⚗️', description: `${String(description)} Converter inputs ×${factor}.`,
    cost: { broth: Number(broth) }, kind: 'converter' as const,
    converterEfficiency: { line: String(line) as ProductionLine, factor: Number(factor) },
  })),
  ...[
    ['thermal-brine', 'Brine Heat Sink', 'A brine loop accepts the heat without comment.', 1.1, 10_000_000],
    ['thermal-moss', 'Moss Heat Exchange', 'The moss takes the warm side of the bargain.', 1.15, 100_000_000],
    ['thermal-night', 'Night Cooling', 'The cold arrives after adjournment.', 1.2, 1_000_000_000],
    ['thermal-deep', 'Deep Cooling Writ', 'The writ applies beneath the bog.', 1.25, 10_000_000_000],
    ['thermal-polar', 'Polar Filing', 'The clerk files the temperature as negligible.', 1.3, 100_000_000_000],
    ['thermal-final', 'Absolute Cooling', 'The racks remain cold out of professional pride.', 1.4, 1_000_000_000_000],
  ].map(([id, name, description, factor, broth]) => ({
    id: String(id), name: String(name), emoji: '❄️', description: `${String(description)} Cooling ×${factor}.`,
    cost: { broth: Number(broth) }, kind: 'thermal' as const, coolingMultiplier: Number(factor),
  })),
  ...[
    ['automation-broth', 'Broth Procurement Desk', 'The desk buys the cheapest broth-line unit every 30 seconds.', 'broth', 30, 1_000_000],
    ['automation-peat', 'Peat Procurement Desk', 'The desk buys the cheapest peat-line unit every 60 seconds.', 'peat', 60, 100_000_000],
    ['automation-compute', 'Rack Procurement Desk', 'The desk buys the cheapest compute-line unit every 120 seconds.', 'compute', 120, 10_000_000_000],
    ['automation-chain', 'Chain Procurement Desk', 'The desk buys the cheapest converter every 180 seconds.', 'briquettes', 180, 1_000_000_000_000],
  ].map(([id, name, description, line, intervalSec, broth]) => ({
    id: String(id), name: String(name), emoji: '🗂️', description: String(description),
    cost: { broth: Number(broth) }, kind: 'automation' as const,
    automation: { line: String(line) as ProductionLine, intervalSec: Number(intervalSec) },
  })),
  ...[
    ['essence-spark', 'Essence Spark', 'A spark of essence brightens every production line.', 1.1, 1_000],
    ['essence-glow', 'Essence Glow', 'The bog gives off a more useful light.', 1.2, 10_000],
    ['essence-aura', 'Essence Aura', 'The aura reaches the courthouse steps.', 1.35, 100_000],
    ['essence-crown', 'Essence Crown', 'The crown is accepted without a hearing.', 1.6, 1_000_000],
  ].map(([id, name, description, factor, essence]) => ({
    id: String(id), name: String(name), emoji: '✨', description: `${String(description)} All production ×${factor}.`,
    cost: { essence: Number(essence) }, kind: 'resource' as const,
    resourceMultiplier: { resource: 'all' as const, factor: Number(factor) },
  })),
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
  requires?: string[];
  effect: ResearchEffect;
}

/** Effects applied by completed research entries. */
export type ResearchEffect =
  | { kind: 'multiplier'; target: SpendableResource | 'click' | 'all'; factor: number }
  | { kind: 'heat'; factor: number }
  | { kind: 'cooling'; factor: number }
  | { kind: 'clickMultiplier'; factor: number }
  | { kind: 'offlineRate'; add: number }
  | { kind: 'converterEfficiency'; line: ProductionLine; factor: number }
  | { kind: 'unlockLine'; line: ProductionLine }
  | { kind: 'researchSlots'; add: number }
  | { kind: 'costScale'; line: ProductionLine; delta: number };

export const RESEARCH: ResearchDef[] = [
  {
    id: 'thermal-modelling',
    name: 'Thermal Modelling',
    emoji: '📈',
    description: 'Cooling effectiveness +25%.',
    cost: { compute: 500 },
    durationSec: 60,
    effect: { kind: 'cooling', factor: 1.25 },
  },
  {
    id: 'lubrication-clause',
    name: 'Strike the 5:00 AM Lubrication Clause',
    emoji: '📜',
    description: 'No more dawn greasing of the racks. All heat −15%.',
    cost: { compute: 2_000, evidence: 50 },
    durationSec: 180,
    effect: { kind: 'heat', factor: 0.85 },
  },
  {
    id: 'liquid-immersion',
    name: 'Liquid Immersion',
    emoji: '🛢️',
    description: 'All heat output −20%.',
    cost: { compute: 5000 },
    durationSec: 240,
    effect: { kind: 'heat', factor: 0.8 },
  },
  {
    id: 'broth-distillation',
    name: 'Broth Distillation',
    emoji: '⚗️',
    description: 'Broth production ×1.5.',
    cost: { compute: 20_000 },
    durationSec: 300,
    effect: { kind: 'multiplier', target: 'broth', factor: 1.5 },
  },
  {
    id: 'broth-standard',
    name: '40 L fp16 Compute Broth Standard',
    emoji: '🧴',
    description: 'Standardise every batch at 40 L fp16. Broth production ×1.25.',
    cost: { compute: 50_000 },
    durationSec: 420,
    effect: { kind: 'multiplier', target: 'broth', factor: 1.25 },
  },
  {
    id: 'edge-caching',
    name: 'Edge Caching',
    emoji: '🗄️',
    description: 'Compute production ×1.5.',
    cost: { compute: 100_000 },
    durationSec: 600,
    effect: { kind: 'multiplier', target: 'compute', factor: 1.5 },
  },
  {
    id: 'nordic-verdict',
    name: 'McFly & Chronicler LLP v Burger King Nordic',
    emoji: '⚖️',
    description: 'Win the case before Magistrate Reino. All production ×1.5.',
    cost: { compute: 250_000, evidence: 2_000 },
    durationSec: 1_200,
    effect: { kind: 'multiplier', target: 'all', factor: 1.5 },
  },
  {
    id: 'quantum-peat',
    name: 'Quantum Peat',
    emoji: '♾️',
    description: 'All production ×2.',
    cost: { compute: 1_000_000 },
    durationSec: 1_800,
    effect: { kind: 'multiplier', target: 'all', factor: 2 },
  },
  { id: 'thermal-docket', name: 'Thermal Docket', emoji: '🌡️', description: 'The heat ledger is kept before it becomes a problem.', cost: { compute: 2_000_000 }, durationSec: 2_400, requires: ['thermal-modelling'], effect: { kind: 'heat', factor: 0.92 } },
  { id: 'cooling-reserve', name: 'Cooling Reserve', emoji: '🧊', description: 'Spare cooling is held for the next hearing.', cost: { compute: 10_000_000 }, durationSec: 3_000, requires: ['thermal-docket'], effect: { kind: 'cooling', factor: 1.2 } },
  { id: 'heat-exemption', name: 'Heat Exemption', emoji: '📜', description: 'The racks receive a narrow exemption from thermal scrutiny.', cost: { compute: 50_000_000, evidence: 1_000 }, durationSec: 4_000, requires: ['cooling-reserve'], effect: { kind: 'heat', factor: 0.9 } },
  { id: 'cold-precedent', name: 'Cold Precedent', emoji: '⚖️', description: 'A prior ruling makes cooling admissible everywhere.', cost: { compute: 300_000_000, evidence: 10_000 }, durationSec: 5_000, requires: ['heat-exemption'], effect: { kind: 'cooling', factor: 1.25 } },
  { id: 'thermal-charter', name: 'Thermal Charter', emoji: '📗', description: 'Heat and cooling agree to share a margin.', cost: { compute: 2_000_000_000, evidence: 50_000 }, durationSec: 6_000, requires: ['cold-precedent'], effect: { kind: 'heat', factor: 0.85 } },
  { id: 'cold-finality', name: 'Cold Finality', emoji: '❄️', description: 'The final thermal argument is dismissed.', cost: { compute: 10_000_000_000, evidence: 250_000 }, durationSec: 8_000, requires: ['thermal-charter'], effect: { kind: 'cooling', factor: 1.3 } },
  { id: 'extraction-ledger', name: 'Extraction Ledger', emoji: '📒', description: 'Every cut is recorded before the bog closes over it.', cost: { compute: 5_000_000 }, durationSec: 2_400, requires: ['broth-distillation'], effect: { kind: 'multiplier', target: 'peat', factor: 1.3 } },
  { id: 'sludge-accounting', name: 'Sludge Accounting', emoji: '🟤', description: 'The byproduct gets its own line in the ledger.', cost: { compute: 25_000_000 }, durationSec: 3_000, requires: ['extraction-ledger'], effect: { kind: 'multiplier', target: 'sludge', factor: 1.4 } },
  { id: 'peat-standard', name: 'Peat Standard', emoji: '🧱', description: 'Pressed peat is measured to the same unpleasant standard.', cost: { compute: 150_000_000, evidence: 2_000 }, durationSec: 4_000, requires: ['sludge-accounting'], effect: { kind: 'unlockLine', line: 'briquettes' } },
  { id: 'press-efficiency', name: 'Press Efficiency', emoji: '🏭', description: 'The press gives back more of what it is given.', cost: { compute: 1_000_000_000, evidence: 20_000 }, durationSec: 6_000, requires: ['peat-standard'], effect: { kind: 'converterEfficiency', line: 'briquettes', factor: 0.9 } },
  { id: 'peat-scale', name: 'Peat Scale', emoji: '📈', description: 'The peat line receives a slightly friendlier cost schedule.', cost: { compute: 8_000_000_000, evidence: 100_000 }, durationSec: 8_000, requires: ['press-efficiency'], effect: { kind: 'costScale', line: 'briquettes', delta: -0.01 } },
  { id: 'deep-extraction', name: 'Deep Extraction', emoji: '⛏️', description: 'The cutters reach a layer the map did not mention.', cost: { compute: 60_000_000_000, evidence: 500_000 }, durationSec: 10_000, requires: ['peat-scale'], effect: { kind: 'multiplier', target: 'peat', factor: 1.5 } },
  { id: 'still-method', name: 'Still Method', emoji: '⚗️', description: 'The still is instructed to keep the useful vapour.', cost: { compute: 30_000_000 }, durationSec: 3_000, requires: ['broth-standard'], effect: { kind: 'unlockLine', line: 'refinedBroth' } },
  { id: 'fractionation', name: 'Fractionation', emoji: '🏺', description: 'Broth and methane are separated without an argument.', cost: { compute: 250_000_000, evidence: 5_000 }, durationSec: 5_000, requires: ['still-method'], effect: { kind: 'converterEfficiency', line: 'refinedBroth', factor: 0.9 } },
  { id: 'distillers-clause', name: 'Distiller’s Clause', emoji: '📜', description: 'The still may run after the courthouse closes.', cost: { compute: 2_000_000_000, evidence: 50_000 }, durationSec: 7_000, requires: ['fractionation'], effect: { kind: 'multiplier', target: 'refinedBroth', factor: 1.5 } },
  { id: 'double-run', name: 'Double Run', emoji: '♨️', description: 'The second pass is now considered routine.', cost: { compute: 15_000_000_000, evidence: 250_000 }, durationSec: 9_000, requires: ['distillers-clause'], effect: { kind: 'multiplier', target: 'broth', factor: 1.4 } },
  { id: 'distillation-scale', name: 'Distillation Scale', emoji: '📐', description: 'The still line receives a modest cost concession.', cost: { compute: 100_000_000_000, evidence: 1_000_000 }, durationSec: 12_000, requires: ['double-run'], effect: { kind: 'costScale', line: 'refinedBroth', delta: -0.01 } },
  { id: 'litigation-slots', name: 'Litigation Backlog', emoji: '🗃️', description: 'The clerks accept one more research docket.', cost: { compute: 100_000_000 }, durationSec: 4_000, requires: ['nordic-verdict'], effect: { kind: 'researchSlots', add: 1 } },
  { id: 'offline-brief', name: 'Offline Brief', emoji: '🕯️', description: 'The court prepares a brief before anyone arrives.', cost: { compute: 1_000_000_000, evidence: 20_000 }, durationSec: 6_000, requires: ['litigation-slots'], effect: { kind: 'offlineRate', add: 0.05 } },
  { id: 'evidence-multipliers', name: 'Evidence Multipliers', emoji: '📁', description: 'Every exhibit points to another exhibit.', cost: { compute: 10_000_000_000, evidence: 100_000 }, durationSec: 8_000, requires: ['offline-brief'], effect: { kind: 'multiplier', target: 'evidence', factor: 1.6 } },
  { id: 'research-office', name: 'Research Office', emoji: '🏛️', description: 'The office acquires another desk and calls it infrastructure.', cost: { compute: 80_000_000_000, evidence: 500_000 }, durationSec: 10_000, requires: ['evidence-multipliers'], effect: { kind: 'researchSlots', add: 1 } },
  { id: 'filing-scale', name: 'Filing Scale', emoji: '⚖️', description: 'Evidence buildings receive a cost schedule fit for a court.', cost: { compute: 500_000_000_000, evidence: 2_000_000 }, durationSec: 14_000, requires: ['research-office'], effect: { kind: 'costScale', line: 'evidence', delta: -0.01 } },
  { id: 'celestial-reading', name: 'Celestial Reading', emoji: '🌌', description: 'The stars are consulted on the matter of essence.', cost: { compute: 500_000_000 }, durationSec: 5_000, requires: ['quantum-peat'], effect: { kind: 'unlockLine', line: 'sediment' } },
  { id: 'sediment-method', name: 'Sediment Method', emoji: '🪨', description: 'The settled layer is granted a proper vessel.', cost: { compute: 5_000_000_000, evidence: 50_000 }, durationSec: 8_000, requires: ['celestial-reading'], effect: { kind: 'converterEfficiency', line: 'sediment', factor: 0.88 } },
  { id: 'essence-reading', name: 'Essence Reading', emoji: '✨', description: 'What remains after boiling is finally named.', cost: { compute: 50_000_000_000, evidence: 500_000 }, durationSec: 10_000, requires: ['sediment-method'], effect: { kind: 'unlockLine', line: 'essence' } },
  { id: 'alembic-scale', name: 'Alembic Scale', emoji: '⚗️', description: 'Essence equipment receives a careful cost adjustment.', cost: { compute: 500_000_000_000, evidence: 5_000_000 }, durationSec: 14_000, requires: ['essence-reading'], effect: { kind: 'costScale', line: 'essence', delta: -0.01 } },
  { id: 'essence-law', name: 'Essence Law', emoji: '📗', description: 'The final resource enters the statute book.', cost: { compute: 5_000_000_000_000, evidence: 25_000_000 }, durationSec: 18_000, requires: ['alembic-scale'], effect: { kind: 'multiplier', target: 'essence', factor: 2 } },
  { id: 'click-research', name: 'Manual Precedent', emoji: '🖋️', description: 'The hand still has standing.', cost: { compute: 1_000_000 }, durationSec: 3_000, requires: ['extraction-ledger'], effect: { kind: 'clickMultiplier', factor: 1.5 } },
  { id: 'automation-research', name: 'Routine Procurement', emoji: '🗂️', description: 'Routine purchases no longer require a hearing.', cost: { compute: 10_000_000_000 }, durationSec: 9_000, requires: ['research-office'], effect: { kind: 'multiplier', target: 'all', factor: 1.25 } },
  { id: 'offline-research', name: 'Night Research', emoji: '🌙', description: 'The research office continues with the lamps down.', cost: { compute: 100_000_000_000 }, durationSec: 12_000, requires: ['offline-brief'], effect: { kind: 'offlineRate', add: 0.08 } },
  { id: 'final-verdict', name: 'Final Verdict', emoji: '⚖️', description: 'The case is decided in favour of continued production.', cost: { compute: 1_000_000_000_000, evidence: 10_000_000 }, durationSec: 21_600, requires: ['essence-law'], effect: { kind: 'multiplier', target: 'all', factor: 1.5 } },
  { id: 'moss-annex', name: 'Moss Annex', emoji: '🌿', description: 'The moss receives a further annex and fills it promptly.', cost: { compute: 2_000_000_000 }, durationSec: 7_200, requires: ['extraction-ledger'], effect: { kind: 'multiplier', target: 'sphagnum', factor: 1.4 } },
];

export const RESEARCH_BY_ID: Record<string, ResearchDef> = Object.fromEntries(
  RESEARCH.map((r) => [r.id, r]),
);

/** Branches used to organize the Research tab. */
export type ResearchBranch = 'thermal' | 'extraction' | 'distillation' | 'litigation' | 'celestial';

/** Research branch labels and their short ledger descriptions. */
export const RESEARCH_BRANCHES: Record<ResearchBranch, { name: string; blurb: string }> = {
  thermal: { name: 'Thermal', blurb: 'Keep the racks cold enough to remain admissible.' },
  extraction: { name: 'Extraction', blurb: 'Pull useful matter from the bog before it closes.' },
  distillation: { name: 'Distillation', blurb: 'Run the still until the paperwork turns clear.' },
  litigation: { name: 'Litigation', blurb: 'Give the court more work than it can postpone.' },
  celestial: { name: 'Celestial', blurb: 'Ask the dark above the bog what remains below.' },
};

/** Return the authored branch for a Research definition. */
export function researchBranch(id: string): ResearchBranch {
  if (['thermal-modelling', 'lubrication-clause', 'liquid-immersion', 'thermal-docket', 'cooling-reserve', 'heat-exemption', 'cold-precedent', 'thermal-charter', 'cold-finality'].includes(id)) return 'thermal';
  if (['extraction-ledger', 'sludge-accounting', 'peat-standard', 'press-efficiency', 'peat-scale', 'deep-extraction', 'click-research', 'moss-annex'].includes(id)) return 'extraction';
  if (['broth-distillation', 'broth-standard', 'edge-caching', 'still-method', 'fractionation', 'distillers-clause', 'double-run', 'distillation-scale'].includes(id)) return 'distillation';
  if (['nordic-verdict', 'litigation-slots', 'offline-brief', 'evidence-multipliers', 'research-office', 'filing-scale', 'automation-research', 'offline-research', 'final-verdict'].includes(id)) return 'litigation';
  return 'celestial';
}

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

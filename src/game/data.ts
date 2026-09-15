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
  { id: 'broth', name: 'legal-compute tokens', emoji: '🪙', blurb: 'fp16-grade billing currency of the firm', tier: 1 },
  { id: 'peat', name: 'discovery dumps', emoji: '📄', blurb: 'raw discovery dumped by the pallet', tier: 1 },
  { id: 'sphagnum', name: 'privilege screens', emoji: '🧵', blurb: 'living fibre that keeps filings privileged', tier: 1 },
  { id: 'methane', name: 'leaked memos', emoji: '💨', blurb: 'leaked memos', tier: 1 },
  { id: 'compute', name: 'arbitrage compute', emoji: '⚡', blurb: 'arbitrage compute', tier: 1 },
  { id: 'evidence', name: 'case evidence', emoji: '📁', blurb: 'case evidence', tier: 1 },
  { id: 'sludge', name: 'dark-pool flow', emoji: '🟤', blurb: 'the flow the dredgers bring up', tier: 2 },
  { id: 'briquettes', name: 'exhibit bundles', emoji: '🧱', blurb: 'discovery pressed and kiln-bound', tier: 2 },
  { id: 'refinedBroth', name: 'certified tokens', emoji: '🏺', blurb: 'tokens run twice through the mint', tier: 2 },
  { id: 'sediment', name: 'settled claims', emoji: '🪨', blurb: 'what settles when flow is left in the dark', tier: 3 },
  { id: 'essence', name: 'alpha essence', emoji: '✨', blurb: 'what the book of business is, when everything else is boiled off', tier: 3 },
  { id: 'bogCores', name: 'precedents', emoji: '💠', blurb: 'banked prestige precedents', tier: 3 },
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
  { id: 'harvester', name: 'Billing Intern', emoji: '🧑‍💼', description: 'A first-year associate billing tokens by the minute.', baseCost: { broth: 15 }, produces: { broth: 0.5 }, line: 'broth'},
  { id: 'vat', name: 'Retainer Vat', emoji: '🧪', description: 'Slow-brews Sector 4 retainers into 40 L batches of legal-compute tokens.', baseCost: { broth: 100 }, produces: { broth: 4 }, line: 'broth'},
  { id: 'pump', name: 'Liquidity Pump', emoji: '⛽', description: 'Industrial pump on a Taylor C602 pulley, slurping tokens from the billing pipeline.', baseCost: { broth: 1100 }, produces: { broth: 25 }, line: 'broth'},
  { id: 'dredger', name: 'Channel Dredger', emoji: '🚜', description: 'A tracked dredger widening the dark-pool channels.', baseCost: { broth: 12_000 }, produces: { broth: 120, sludge: 2.4 }, line: 'broth', unlock: { rate: { broth: 50 } } },
  { id: 'refinery', name: 'Token Refinery', emoji: '🏗️', description: 'Polishes raw discovery into a dependable token stream.', baseCost: { broth: 130_000 }, produces: { broth: 700, sludge: 14 }, line: 'broth', unlock: { rate: { broth: 500 } } },
  { id: 'still', name: 'Geothermal Mint', emoji: '♨️', description: 'Draws sub-basement warmth through a continuous token mint.', baseCost: { broth: 1_400_000 }, produces: { broth: 4_000, sludge: 80 }, line: 'broth', unlock: { rate: { broth: 3_000 } } },
  { id: 'biome', name: 'Sealed Arbitration Chamber', emoji: '🫙', description: 'A sealed ecosystem that settles tokens at industrial scale.', baseCost: { broth: 20_000_000 }, produces: { broth: 25_000, sludge: 500 }, line: 'broth', unlock: { rate: { broth: 20_000 } } },
  { id: 'fryer', name: '120 kg Fryer Line', emoji: '🍟', description: 'Fries 120 kg of hot fries an hour; the runoff is surprisingly good tokens.', baseCost: { broth: 300_000_000 }, produces: { broth: 150_000, sludge: 3_000 }, line: 'broth', unlock: { rate: { broth: 150_000 } } },
  { id: 'kettle', name: 'Leak-Fired Kettle', emoji: '🫕', description: 'Boils tokens on leaked memos. Filed under "renewable" by the Chronicler.', baseCost: { broth: 4_000_000_000, methane: 2_000_000 }, produces: { broth: 1_200_000, sludge: 24_000 }, line: 'broth', unlock: { rate: { broth: 1_000_000 } } },
  { id: 'cutter', name: 'Junior Associate', emoji: '🔪', description: 'Cuts raw discovery from the upper record.', baseCost: { broth: 40 }, produces: { peat: 0.3 }, line: 'peat'},
  { id: 'excavator', name: 'Deep Discovery Rig', emoji: '⛏️', description: 'Digs deep channels through the record.', baseCost: { broth: 2_500, peat: 150 }, produces: { peat: 6 }, line: 'peat', unlock: { rate: { peat: 2 } } },
  { id: 'bogwalker', name: 'e-Discovery Crawler', emoji: '🦿', description: 'Strides across the file room on industrial legs.', baseCost: { broth: 400_000, peat: 20_000 }, produces: { peat: 150 }, line: 'peat', unlock: { rate: { peat: 40 } } },
  { id: 'barge', name: 'Subpoena Barge', emoji: '🛶', description: 'A flat barge hauling discovery dumps down the flooded channels.', baseCost: { broth: 30_000_000, methane: 20_000 }, produces: { peat: 3_000 }, line: 'peat', unlock: { rate: { peat: 800 } } },
  { id: 'nursery', name: 'Privilege Nursery', emoji: '🌱', description: 'Trays of living privilege screens raised on warm token runoff.', baseCost: { broth: 800, peat: 60 }, produces: { sphagnum: 0.4 }, line: 'sphagnum'},
  { id: 'terrace', name: 'Redaction Terrace', emoji: '🪴', description: 'Stepped terraces where the screens grow thick enough to cite. Almost.', baseCost: { broth: 60_000, peat: 4_000 }, produces: { sphagnum: 8 }, line: 'sphagnum', unlock: { rate: { sphagnum: 3 } } },
  { id: 'loom', name: 'Privilege Loom', emoji: '🧵', description: 'Weaves screens into insulating mats the racks are wrapped in.', baseCost: { broth: 5_000_000, sphagnum: 50_000 }, produces: { sphagnum: 200 }, line: 'sphagnum', unlock: { rate: { sphagnum: 60 } } },
  { id: 'digester', name: 'Whistleblower Digester', emoji: '🧫', description: 'Sealed filings rot in the dark and burp usable leaks.', baseCost: { broth: 15_000, peat: 800 }, produces: { methane: 0.5 }, line: 'methane'},
  { id: 'gasdome', name: 'Leak Capture Dome', emoji: '⛺', description: 'A tarp dome over the wettest source, catching what the record exhales.', baseCost: { broth: 800_000, sphagnum: 5_000 }, produces: { methane: 12 }, line: 'methane', unlock: { rate: { methane: 3 } } },
  { id: 'flare', name: 'Burn-Notice Turbine', emoji: '🔥', description: 'Burns off the surplus and spins a turbine while it does.', baseCost: { broth: 40_000_000, methane: 200_000 }, produces: { methane: 300 }, line: 'methane', unlock: { rate: { methane: 100 } } },
  { id: 'chiller', name: 'Edge Chiller', emoji: '❄️', description: 'Keeps a rack-sized latency budget frosty. Paid for in sanitized change.', baseCost: { broth: 600 }, line: 'cooling', cooling: 10 },
  { id: 'mossbed', name: 'Fiber Cooling Bed', emoji: '🌿', description: 'A bed of living screens that draws heat from the racks.', baseCost: { broth: 3_000, peat: 200 }, line: 'cooling', cooling: 40 },
  { id: 'tower', name: 'Colocation Tower', emoji: '🏭', description: 'Evaporative tower venting steam over the trading floor.', baseCost: { broth: 12_000 }, line: 'cooling', cooling: 120 },
  { id: 'glycol', name: 'Glycol Loop', emoji: '🧊', description: 'A closed loop of glycol carrying heat into the floor.', baseCost: { broth: 150_000 }, line: 'cooling', cooling: 1_400, unlock: { rate: { compute: 20 } } },
  { id: 'jacket', name: 'Screen Jacket', emoji: '🧣', description: 'Wet fibre wrapped around every rack. Cheap, damp, effective.', baseCost: { broth: 500_000, sphagnum: 3_000 }, line: 'cooling', cooling: 5_000, unlock: { rate: { compute: 100 } } },
  { id: 'exchanger', name: 'Latency Exchange', emoji: '🔁', description: 'Trades colocation water for rack heat at exceptional efficiency.', baseCost: { broth: 2_000_000 }, line: 'cooling', cooling: 15_000, unlock: { rate: { compute: 300 } } },
  { id: 'cryo', name: 'Cryo Plant', emoji: '🌬️', description: 'A cryogenic plant freezing the floor around the racks.', baseCost: { broth: 30_000_000, peat: 500_000 }, line: 'cooling', cooling: 180_000, unlock: { rate: { compute: 5_000 } } },
  { id: 'rack', name: 'Server Rack', emoji: '🖥️', description: 'A humming rack steeped in the book of business.', baseCost: { broth: 2_500 }, produces: { compute: 2 }, line: 'compute', heat: 8 },
  { id: 'pod', name: 'Compute Pod', emoji: '📦', description: 'A sealed pod of racks half-sunk in the dark pool.', baseCost: { broth: 50_000 }, produces: { compute: 20 }, line: 'compute', heat: 60, unlock: { rate: { compute: 1 } } },
  { id: 'hall', name: 'Data Hall', emoji: '🏢', description: 'A whole hall of servers drinking the order book dry.', baseCost: { broth: 1_000_000 }, produces: { compute: 250 }, line: 'compute', heat: 500, unlock: { rate: { compute: 50 } } },
  { id: 'cluster', name: 'fp16 Cluster', emoji: '🧮', description: 'A cluster of fp16 racks tuned for the docket.', baseCost: { broth: 8_000_000 }, produces: { compute: 2_000 }, line: 'compute', heat: 3_500, unlock: { rate: { compute: 500 } } },
  { id: 'hyperscaler', name: 'Colo Hyperscaler', emoji: '🌐', description: 'A continent-scale facility anointed in tokens.', baseCost: { broth: 120_000_000, compute: 500_000 }, produces: { compute: 30_000 }, line: 'compute', heat: 30_000, unlock: { rate: { compute: 5_000 } } },
  { id: 'turbinehall', name: 'Leak Turbine Hall', emoji: '🏭', description: 'Racks powered by leaked memos; the exhaust warms the courthouse.', baseCost: { broth: 1_500_000_000, methane: 300_000 }, produces: { compute: 300_000 }, line: 'compute', heat: 250_000, unlock: { rate: { compute: 100_000 } } },
  { id: 'clerk', name: "Chronicler's Clerk Desk", emoji: '🖋️', description: 'A clerk desk that turns events into evidence.', baseCost: { broth: 20_000, compute: 200 }, produces: { evidence: 0.2 }, line: 'evidence', unlock: { rate: { compute: 5 } } },
  { id: 'archive', name: 'Evidence Archive', emoji: '🗄️', description: 'Archives every filing from the Sector 4 litigation.', baseCost: { broth: 2_000_000, compute: 50_000 }, produces: { evidence: 4 }, line: 'evidence', unlock: { rate: { compute: 500 } } },
  { id: 'deposition', name: 'Deposition Booth', emoji: '🎙️', description: 'Witnesses depose on tape; the screens soak up the echo.', baseCost: { broth: 200_000, compute: 5_000, sphagnum: 500 }, produces: { evidence: 1 }, line: 'evidence', unlock: { rate: { compute: 50 } } },
  { id: 'courthouse', name: "Magistrate Reino's Courthouse Datacenter", emoji: '⚖️', description: 'Where McFly & Chronicler LLP v Burger King Nordic is finally heard — on 40 L of tokens per rack.', baseCost: { broth: 2_000_000_000, compute: 5_000_000 }, produces: { compute: 250_000, evidence: 60 }, line: 'evidence', heat: 200_000, unlock: { rate: { compute: 50_000 } } },
  { id: 'peat-press', name: 'Exhibit Press', emoji: '🧱', description: 'Pressed discovery leaves the pile in a shape the clerk can cite.', baseCost: { broth: 180_000, peat: 25_000 }, line: 'briquettes', costScale: 1.17, consumes: { peat: 6 }, produces: { briquettes: 0.8 }, unlock: { rate: { briquettes: 0.48 }, lifetime: { peat: 25_000 } } },
  { id: 'drying-kiln', name: 'Binding Kiln', emoji: '🔥', description: 'The second binder runs hotter and accepts no objections.', baseCost: { broth: 2_500_000, peat: 400_000 }, line: 'briquettes', costScale: 1.17, consumes: { peat: 18 }, produces: { briquettes: 3 }, unlock: { rate: { briquettes: 1.8 }, lifetime: { peat: 400_000 } } },
  { id: 'briquette-works', name: 'Exhibit Works', emoji: '🏭', description: 'A whole works presses the record into neat exhibit bundles.', baseCost: { broth: 36_000_000, peat: 7_000_000 }, line: 'briquettes', costScale: 1.2, consumes: { peat: 60 }, produces: { briquettes: 12 }, unlock: { rate: { briquettes: 7.2 }, lifetime: { peat: 7_000_000 } } },
  { id: 'arcane-extractor', name: 'Black-Box Extractor', emoji: '⚗️', description: 'An extractor so advanced the paperwork calls it proprietary and moves on.', baseCost: { broth: 48_000_000_000 }, line: 'broth', costScale: 1.2, produces: { broth: 8_000_000, sludge: 160_000 }, unlock: { rate: { broth: 4_800_000 } } },
  { id: 'cosmic-condenser', name: 'Cosmic Docket Condenser', emoji: '🌌', description: 'The order book is condensed until the courthouse lights notice.', baseCost: { broth: 650_000_000_000 }, line: 'broth', costScale: 1.2, produces: { broth: 60_000_000, sludge: 1_200_000 }, unlock: { rate: { broth: 36_000_000 } } },
  { id: 'peat-monument', name: 'Discovery Monument', emoji: '🗿', description: 'A dump so large Magistrate Reino requests a surveyor.', baseCost: { broth: 9_000_000_000 }, line: 'peat', costScale: 1.2, produces: { peat: 25_000 }, unlock: { rate: { peat: 15_000 } } },
  { id: 'peat-rail', name: 'Discovery Rail', emoji: '🚂', description: 'A narrow rail carries pallets past every filing cabinet in Sector 4.', baseCost: { broth: 140_000_000_000, methane: 2_000_000 }, line: 'peat', costScale: 1.2, produces: { peat: 200_000 }, unlock: { rate: { peat: 120_000 } } },
  { id: 'peat-estate', name: 'Document Estate', emoji: '🏞️', description: 'The firm acquires acreage and declines to discuss the valuation.', baseCost: { broth: 2_000_000_000_000, methane: 40_000_000 }, line: 'peat', costScale: 1.2, produces: { peat: 1_600_000 }, unlock: { rate: { peat: 960_000 } } },
  { id: 'moss-cathedral', name: 'Privilege Cathedral', emoji: '⛪', description: 'The screens grow under a vaulted roof and file their own hymns.', baseCost: { broth: 50_000_000, peat: 5_000_000 }, line: 'sphagnum', costScale: 1.2, produces: { sphagnum: 1_000 }, unlock: { rate: { sphagnum: 600 } } },
  { id: 'moss-reserve', name: 'Privilege Reserve', emoji: '🌿', description: 'A protected reserve where every screen has standing in court.', baseCost: { broth: 800_000_000, peat: 100_000_000 }, line: 'sphagnum', costScale: 1.2, produces: { sphagnum: 8_000 }, unlock: { rate: { sphagnum: 4_800 } } },
  { id: 'gas-orchard', name: 'Leak Orchard', emoji: '🍐', description: 'Leaks are cultivated in rows, though nothing is served at lunch.', baseCost: { broth: 250_000_000, peat: 10_000_000 }, line: 'methane', costScale: 1.2, produces: { methane: 2_000 }, unlock: { rate: { methane: 1_200 } } },
  { id: 'gas-reservoir', name: 'Leak Reservoir', emoji: '🛢️', description: 'The firm stores enough leaks to make the insurance clerk leave.', baseCost: { broth: 4_000_000_000, peat: 250_000_000 }, line: 'methane', costScale: 1.2, produces: { methane: 16_000 }, unlock: { rate: { methane: 9_600 } } },
  { id: 'deep-freeze', name: 'Deep Freeze', emoji: '🧊', description: 'A cold plant drops the rack temperature below the filing threshold.', baseCost: { broth: 400_000_000, peat: 20_000_000 }, line: 'cooling', costScale: 1.2, cooling: 700_000, unlock: { rate: { compute: 200_000 } } },
  { id: 'ice-gallery', name: 'Ice Gallery', emoji: '🏛️', description: 'Cooling galleries run beneath the exchange like very expensive roots.', baseCost: { broth: 6_000_000_000, peat: 300_000_000 }, line: 'cooling', costScale: 1.2, cooling: 5_000_000, unlock: { rate: { compute: 1_500_000 } } },
  { id: 'polar-mire', name: 'Polar Colo Plant', emoji: '🌨️', description: 'The datacenter becomes a climate and the racks stop complaining.', baseCost: { broth: 90_000_000_000, peat: 5_000_000_000 }, line: 'cooling', costScale: 1.2, cooling: 40_000_000, unlock: { rate: { compute: 12_000_000 } } },
  { id: 'quantum-hall', name: 'Quantum Rack Hall', emoji: '🌀', description: 'The racks run in several legal jurisdictions at once.', baseCost: { broth: 350_000_000, compute: 20_000_000 }, line: 'compute', costScale: 1.2, heat: 1_500_000, consumes: { briquettes: 20 }, produces: { compute: 1_000_000 }, unlock: { rate: { compute: 600_000 }, lifetime: { briquettes: 100_000 } } },
  { id: 'mire-cluster', name: 'Dark-Pool Cluster', emoji: '🧮', description: 'A cluster tuned to order flow and the most stubborn objections.', baseCost: { broth: 5_000_000_000, compute: 300_000_000 }, line: 'compute', costScale: 1.2, heat: 8_000_000, consumes: { briquettes: 120 }, produces: { compute: 7_000_000 }, unlock: { rate: { compute: 4_200_000 }, lifetime: { briquettes: 1_000_000 } } },
  { id: 'bog-supercomputer', name: 'Litigation Supercomputer', emoji: '💻', description: 'A supercomputer powered by bundled exhibits and procedural patience.', baseCost: { broth: 70_000_000_000, compute: 5_000_000_000 }, line: 'compute', costScale: 1.2, heat: 40_000_000, consumes: { briquettes: 600, refinedBroth: 20 }, produces: { compute: 50_000_000 }, unlock: { rate: { compute: 30_000_000 }, lifetime: { briquettes: 8_000_000 } } },
  { id: 'court-oracle', name: 'Court Oracle', emoji: '🔮', description: 'The oracle predicts the verdict and gets the date almost right.', baseCost: { broth: 1_000_000_000_000, compute: 80_000_000_000 }, line: 'compute', costScale: 1.2, heat: 220_000_000, consumes: { briquettes: 2_000, refinedBroth: 100 }, produces: { compute: 400_000_000 }, unlock: { rate: { compute: 240_000_000 }, lifetime: { briquettes: 50_000_000 } } },
  { id: 'docket-tower', name: 'Docket Tower', emoji: '🏢', description: 'A tower of filings turns every objection into an exhibit.', baseCost: { broth: 10_000_000_000, compute: 1_000_000_000 }, line: 'evidence', costScale: 1.2, produces: { evidence: 700 }, unlock: { rate: { evidence: 420 } } },
  { id: 'precedent-vault', name: 'Precedent Vault', emoji: '🗄️', description: 'The vault stores enough evidence to make the clerk request shelves.', baseCost: { broth: 200_000_000_000, compute: 20_000_000_000 }, line: 'evidence', costScale: 1.2, produces: { evidence: 5_000 }, unlock: { rate: { evidence: 3_000 } } },
  { id: 'sludge-settler', name: 'Settlement Pond', emoji: '🪨', description: 'Dark-pool flow sits in the dark until it can be called settled claims.', baseCost: { broth: 2_000_000, sludge: 2_000 }, line: 'sediment', costScale: 1.15, consumes: { sludge: 12 }, produces: { sediment: 1 }, unlock: { lifetime: { sludge: 2_000 } } },
  { id: 'sediment-vault', name: 'Claims Vault', emoji: '🏚️', description: 'A vault keeps the settled claims dry, labelled, and mostly silent.', baseCost: { broth: 80_000_000, sludge: 150_000 }, line: 'sediment', costScale: 1.17, consumes: { sludge: 60 }, produces: { sediment: 8 }, unlock: { rate: { sediment: 4.8 }, lifetime: { sludge: 150_000 } } },
  { id: 'copper-still', name: 'Certification Mint', emoji: '⚗️', description: 'Copper gives the tokens another pass and the leaks a reason to behave.', baseCost: { broth: 2_500_000, peat: 5_000, methane: 1_000 }, line: 'refinedBroth', costScale: 1.15, consumes: { broth: 8, methane: 1 }, produces: { refinedBroth: 1 }, unlock: { lifetime: { broth: 5_000 } } },
  { id: 'fractionating-column', name: 'Clearing Column', emoji: '🏺', description: 'The column separates the useful tokens from the legal residue.', baseCost: { broth: 100_000_000, methane: 100_000 }, line: 'refinedBroth', costScale: 1.17, consumes: { broth: 40, methane: 5 }, produces: { refinedBroth: 8 }, unlock: { rate: { refinedBroth: 4.8 }, lifetime: { broth: 1_000_000 } } },
  { id: 'double-run-still', name: 'Double-Run Mint', emoji: '♨️', description: 'The mint runs twice and bills the same amount of leaks.', baseCost: { broth: 5_000_000_000, methane: 2_000_000 }, line: 'refinedBroth', costScale: 1.2, consumes: { broth: 200, methane: 20 }, produces: { refinedBroth: 50 }, unlock: { rate: { refinedBroth: 30 }, lifetime: { broth: 100_000_000 } } },
  { id: 'essence-condenser', name: 'Alpha Condenser', emoji: '✨', description: 'Settled claims and certified tokens are boiled down to the part that matters.', baseCost: { broth: 1_000_000_000, sediment: 10_000, refinedBroth: 2_000 }, line: 'essence', costScale: 1.15, consumes: { sediment: 10, refinedBroth: 2 }, produces: { essence: 1 }, unlock: { lifetime: { sediment: 1_000 } } },
  { id: 'celestial-alembic', name: 'Supreme Alembic', emoji: '🌠', description: 'The final vessel reaches upward and finds the bench waiting there.', baseCost: { broth: 50_000_000_000, sediment: 2_000_000, refinedBroth: 500_000 }, line: 'essence', costScale: 1.2, consumes: { sediment: 80, refinedBroth: 20 }, produces: { essence: 12 }, unlock: { rate: { essence: 7.2 }, lifetime: { sediment: 1_000_000 } } },
];

const SECONDARY_COST_RATIOS: Record<SpendableResource, number> = {
  broth: 1,
  peat: 0.006,
  compute: 0.01,
  sphagnum: 0.0013,
  methane: 0.0003,
  evidence: 0.00005,
  sludge: 0.0003,
  briquettes: 0.0015,
  refinedBroth: 0.00075,
  sediment: 0.0003,
  essence: 0.00003,
};

const BUILDING_COST_RESOURCES: Record<string, SpendableResource[]> = {
  harvester: [],
  vat: ['peat'],
  pump: ['peat', 'sphagnum'],
  dredger: [],
  refinery: ['peat', 'evidence', 'methane'],
  still: ['peat', 'sphagnum', 'evidence'],
  biome: ['peat', 'sludge', 'evidence'],
  fryer: ['methane', 'sludge', 'evidence'],
  kettle: ['methane', 'sludge', 'evidence'],
  cutter: [],
  excavator: ['peat', 'sphagnum'],
  bogwalker: ['peat', 'evidence', 'methane'],
  barge: ['peat', 'methane', 'evidence'],
  nursery: ['peat'],
  terrace: ['peat', 'sphagnum'],
  loom: ['sphagnum', 'peat', 'evidence'],
  digester: ['peat'],
  gasdome: ['sphagnum', 'methane'],
  flare: ['methane', 'sphagnum', 'evidence'],
  chiller: [],
  mossbed: ['peat', 'sphagnum'],
  tower: ['peat', 'sphagnum'],
  glycol: ['sphagnum', 'methane', 'evidence'],
  jacket: ['sphagnum', 'methane', 'evidence'],
  exchanger: ['sphagnum', 'methane', 'sludge'],
  cryo: ['methane', 'evidence', 'sludge'],
  rack: [],
  pod: ['peat', 'evidence'],
  hall: ['evidence', 'sludge'],
  cluster: ['evidence', 'methane', 'sludge'],
  hyperscaler: ['evidence', 'sphagnum', 'sludge'],
  turbinehall: ['methane', 'evidence', 'sludge'],
  clerk: ['methane'],
  archive: ['evidence', 'sphagnum'],
  deposition: ['sphagnum'],
  courthouse: ['evidence', 'methane', 'sludge'],
  'peat-press': ['peat'],
  'drying-kiln': ['peat', 'sphagnum'],
  'briquette-works': ['peat', 'methane', 'evidence'],
  'arcane-extractor': ['sludge', 'briquettes', 'refinedBroth'],
  'cosmic-condenser': ['sludge', 'sediment', 'essence'],
  'peat-monument': ['peat', 'methane', 'sludge'],
  'peat-rail': ['peat', 'methane', 'sludge'],
  'peat-estate': ['peat', 'sediment', 'evidence'],
  'moss-cathedral': ['sphagnum', 'methane', 'sludge'],
  'moss-reserve': ['sphagnum', 'peat', 'evidence'],
  'gas-orchard': ['methane', 'sphagnum', 'sludge'],
  'gas-reservoir': ['methane', 'evidence', 'sludge'],
  'deep-freeze': ['sphagnum', 'methane', 'sediment'],
  'ice-gallery': ['sphagnum', 'refinedBroth', 'sediment'],
  'polar-mire': ['sphagnum', 'methane', 'essence'],
  'quantum-hall': ['evidence', 'briquettes', 'refinedBroth'],
  'mire-cluster': ['evidence', 'briquettes', 'sediment'],
  'bog-supercomputer': ['evidence', 'refinedBroth', 'essence'],
  'court-oracle': ['evidence', 'briquettes', 'essence'],
  'docket-tower': ['evidence', 'methane', 'sludge'],
  'precedent-vault': ['evidence', 'sphagnum', 'methane'],
  'sludge-settler': ['sludge'],
  'sediment-vault': ['sludge', 'sphagnum'],
  'copper-still': ['peat', 'methane', 'sludge'],
  'fractionating-column': ['methane', 'refinedBroth', 'sediment'],
  'double-run-still': ['methane', 'sediment', 'essence'],
  'essence-condenser': ['sediment', 'refinedBroth'],
  'celestial-alembic': ['sediment', 'refinedBroth', 'essence'],
};

function roundTwoSignificant(value: number): number {
  if (!Number.isFinite(value) || value === 0) return 0;
  const place = 10 ** (Math.floor(Math.log10(Math.abs(value))) - 1);
  return Math.round(value / place) * place;
}

function diversifiedBuildingCost(building: Omit<BuildingDef, 'boostNames'>, index: number): ResourceCostSpec {
  const broth = building.baseCost.broth ?? 0;
  const cost: ResourceCostSpec = { ...building.baseCost, broth };
  const tier = BASE_BUILDINGS.filter((candidate) => candidate.line === building.line).indexOf(building) + 1;
  for (const [resourceIndex, resource] of (BUILDING_COST_RESOURCES[building.id] ?? []).entries()) {
    if (cost[resource] !== undefined) continue;
    const variation = (0.5 + ((index + resourceIndex) % 6) * 0.1) *
      (tier >= 7 ? 2.9 : 1);
    cost[resource] = roundTwoSignificant(broth * SECONDARY_COST_RATIOS[resource] * variation);
  }
  return cost;
}

const BOOST_NAMES: Record<string, [string, string, string, string]> = {
  harvester: ['First Internship', 'Billable Sprint', 'Utilisation Drive', 'Partner Track'],
  vat: ['Retainer Tranche', 'Warm Retainer', 'Billable Batch', 'Forty-Litre Invoice'],
  pump: ['Prime-Broker Draw', 'Pulley Thrum', 'Flow Pressure', 'Deep Intake'],
  dredger: ['Order-Flow Bite', 'Dark-Pool Slurry', 'Channel Wake', 'Wide Widening'],
  refinery: ['Clear Margin', 'Polish Coat', 'Settled Gloss', 'Reliable Delta'],
  still: ['Sub-Basement Draft', 'Underheat Pulse', 'Stone Mint', 'Basalt Simmer'],
  biome: ['Sealed Proceeding', 'Closed Session', 'Glass Chamber', 'Binding Circuit'],
  fryer: ['Hot Oil Writ', 'Crisp Runoff', 'Fryer Rotation', 'Golden Drip'],
  kettle: ['Copper Bottom', 'Rolling Boil', 'Twin Burners', 'Boiler Chorus'],
  cutter: ['Pager Duty', 'Doc Review', 'Citation Slice', 'Diligence Register'],
  excavator: ['Trench Bite', 'Deep Shovel', 'Channel Teeth', 'Subpoena Claim'],
  bogwalker: ['Stepframe', 'Crawler Stride', 'Walking Gear', 'Dateline March'],
  barge: ['Flatwater Haul', 'Record Cargo', 'Floodplain Transit', 'Towpath Load'],
  nursery: ['Screen Cradle', 'Green Tray', 'Seal Ration', 'Quiet Nursery'],
  terrace: ['Stepped Rise', 'Redaction Stair', 'Raised Sprig', 'Hearing Entry'],
  loom: ['Fibre Shuttle', 'Privilege Weave', 'Matting Shuttle', 'Threaded Insulation'],
  digester: ['Sealed Burp', 'Anaerobic Draft', 'Dark Leak', 'Tankside Source'],
  gasdome: ['Tarp Crown', 'Captured Breath', 'Dome Pressure', 'Greenhouse Leak'],
  flare: ['Burnoff Spin', 'Exhaust Torque', 'Turbine Wake', 'Stack Dividend'],
  chiller: ['Pocket Frost', 'Cold Ledge', 'Rime Deposit', 'Chilled Margin'],
  mossbed: ['Living Sink', 'Green Latency', 'Rootside Chill', 'Wet Carry'],
  tower: ['Steam Column', 'Evaporation Duty', 'Roof Vent', 'Colo Plume'],
  glycol: ['Loop Charge', 'Blue Circuit', 'Return Flow', 'Jacketed Cold'],
  jacket: ['Screen Wrap', 'Rack Blanket', 'Damp Insulation', 'Soft Shell'],
  exchanger: ['Dark-Pool Trade', 'Margin Bargain', 'Latency Swap', 'Wet Transfer'],
  cryo: ['Frozen Acre', 'Cryogenic Reach', 'Ice Boundary', 'Cold-Storage Ledger'],
  rack: ['Rack Spark', 'Silicon Plinth', 'First Flop', 'Server Hum'],
  pod: ['Sealed Compute', 'Pod Cluster', 'Colo Capsule', 'Boxed Flow'],
  hall: ['Hall Current', 'Raised Floor', 'Long Aisle', 'Facility Load'],
  cluster: ['Parallel Book', 'Vector Lot', 'Dense Array', 'Compute Lattice'],
  hyperscaler: ['Continental Draw', 'Grid Horizon', 'Vast Capacity', 'Scale Dividend'],
  turbinehall: ['Leak Vector', 'Exhaust Stack', 'Pipeline Compute', 'Rotating Capacity'],
  clerk: ['Filing Ink', 'Exhibit Stamp', 'Minute Book', 'Clerkship Return'],
  archive: ['Shelf Index', 'Paper Store', 'Boxed Evidence', 'Record Weight'],
  deposition: ['Witness Tape', 'Sworn Audio', 'Booth Transcript', 'Recorded Objection'],
  courthouse: ['Final Hearing', 'Reino Bench', 'Exhibit Hall', 'Nordic Record'],
  'peat-press': ['Compressed Record', 'Bundle Face', 'Press Stroke', 'Bound Volume'],
  'drying-kiln': ['Kiln Mouth', 'Heat Coil', 'Bound Exhibit', 'Binding Cycle'],
  'briquette-works': ['Bindery Ledger', 'Evidence Yard', 'Pressing Floor', 'Black Volume'],
  'arcane-extractor': ['Proprietary Pull', 'Hidden Stratum', 'Sealed Channel', 'Unnamed Output'],
  'cosmic-condenser': ['Starfall Condensate', 'Orbital Drift', 'Nebula Drip', 'Skybound Reduction'],
  'peat-monument': ['Standing Exhibit', 'Survey Stone', 'Monument Marker', 'Territory Marker'],
  'peat-rail': ['Narrow Gauge', 'Record Express', 'Docket Spur', 'Rail Consignment'],
  'peat-estate': ['Acre Charter', 'Land Grant', 'Document Holdings', 'Market Valuation'],
  'moss-cathedral': ['Vaulted Screens', 'Hymnal Bloom', 'Silent Nave', 'Cathedral Seal'],
  'moss-reserve': ['Protected Screen', 'Reserve Charter', 'Quiet Flourish', 'Conservation Result'],
  'gas-orchard': ['Leak Rows', 'Orchard Pocket', 'Insider Harvest', 'Pearless Crop'],
  'gas-reservoir': ['Tank Farm', 'Stored Breath', 'Reservoir Head', 'Insurance Buffer'],
  'deep-freeze': ['Deep Rime', 'Cold Sink', 'Frozen Carry', 'Ice Plant'],
  'ice-gallery': ['Gallery Chill', 'Root Tunnel', 'Frost Arcade', 'Subterranean Cold'],
  'polar-mire': ['Polar Reach', 'Climate Engine', 'Whitewater Freeze', 'Latitude Drop'],
  'quantum-hall': ['Quantum Plenum', 'Jurisdiction Split', 'Entangled Rate', 'Parallel Hearing'],
  'mire-cluster': ['Flow Vector', 'Cluster Accord', 'Dense Folio', 'Rack Parliament'],
  'bog-supercomputer': ['Bundled Exhibit Array', 'Supercompute Cycle', 'Tokenless Logic', 'Giant Register'],
  'court-oracle': ['Oracle Docket', 'Prediction Desk', 'Verdict Forecast', 'Almost Right'],
  'docket-tower': ['Exhibit Tower', 'Filing Height', 'Docket Stack', 'Vertical Spine'],
  'precedent-vault': ['Case Cache', 'Binding Folio', 'Prior Art', 'Vaulted Ruling'],
  'sludge-settler': ['Dark Pool', 'Quiet Claims', 'Settling Interval', 'Settled Bed'],
  'sediment-vault': ['Strata Store', 'Dry Vein', 'Geological Writ', 'Vaulted Claims'],
  'copper-still': ['Red Metal Reflux', 'Bright Yield', 'Mint Pour', 'Leak Wash'],
  'fractionating-column': ['Column Split', 'Margin Ladder', 'Useful Fraction', 'Residue Denial'],
  'double-run-still': ['Second Passage', 'Repeat Clearing', 'Twin Yield', 'Double Receipt'],
  'essence-condenser': ['Final Drop', 'Concentrate Glow', 'Alpha Divide', 'Last Solvent'],
  'celestial-alembic': ['Astral Retort', 'Zenith Vessel', 'Star Glass', 'Heaven\'s Condensate'],
};

export const BUILDINGS: BuildingDef[] = BASE_BUILDINGS.map((building) => {
  const lineBuildings = BASE_BUILDINGS.filter((candidate) => candidate.line === building.line);
  const tier = lineBuildings.indexOf(building) + 1;
  const costScale = building.costScale ?? (tier <= 3 ? 1.15 : tier <= 6 ? 1.17 : 1.2);
  return {
    ...building,
    baseCost: diversifiedBuildingCost(building, BASE_BUILDINGS.indexOf(building)),
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

const BOOST_SECONDARY_RESOURCE: Partial<Record<ProductionLine, SpendableResource>> = {
  broth: 'sludge',
  peat: 'sphagnum',
  sphagnum: 'peat',
  methane: 'sphagnum',
  cooling: 'methane',
  compute: 'briquettes',
  evidence: 'sphagnum',
  briquettes: 'methane',
  refinedBroth: 'sediment',
  sediment: 'refinedBroth',
  essence: 'sediment',
};

const RESOURCE_PRODUCER_BROTH_COST: Partial<Record<SpendableResource, number>> = {
  peat: 40,
  compute: 2_500,
  sphagnum: 800,
  methane: 15_000,
  evidence: 20_000,
  sludge: 12_000,
  briquettes: 180_000,
  refinedBroth: 2_500_000,
  sediment: 2_000_000,
  essence: 1_000_000_000,
};

function boostCost(building: BuildingDef, factor: number, index: number): ResourceCostSpec {
  const cost = scaleCost(building.baseCost, factor);
  const secondary = BOOST_SECONDARY_RESOURCE[building.line];
  const broth = cost.broth ?? 0;
  if (
    index > 0 &&
    secondary &&
    cost[secondary] === undefined &&
    (RESOURCE_PRODUCER_BROTH_COST[secondary] ?? Infinity) < broth
  ) {
    const variation = 0.5 + index * 0.25;
    cost[secondary] = roundTwoSignificant(broth * SECONDARY_COST_RATIOS[secondary] * variation);
  }
  return cost;
}

/** Generated output boost thresholds shared by every production building. */
export const BOOST_TIERS = [
  { count: 10, factor: 10, roman: 'I' },
  { count: 50, factor: 100, roman: 'II' },
  { count: 100, factor: 1_000, roman: 'III' },
  { count: 200, factor: 10_000, roman: 'IV' },
];

const RAW_UPGRADES: UpgradeDef[] = [
  {
    id: 'spade',
    name: 'Sharper Pen',
    emoji: '🖋️',
    description: 'Click power ×2.',
    cost: { broth: 50 },
    kind: 'click',
    clickMultiplier: 2,
  },
  {
    id: 'gloves',
    name: 'Ergonomic Gloves',
    emoji: '🧤',
    description: 'Click power ×2.',
    cost: { broth: 500 },
    kind: 'click',
    clickMultiplier: 2,
  },
  {
    id: 'buckets',
    name: 'Twin Briefcases',
    emoji: '💼',
    description: 'Click power ×2.',
    cost: { broth: 5000 },
    kind: 'click',
    clickMultiplier: 2,
  },
  {
    id: 'hot-fries',
    name: '120 kg Hot Fries',
    emoji: '🍟',
    description: 'Feed the trading floor 120 kg of hot fries. Click power ×3.',
    cost: { broth: 20_000 },
    kind: 'click',
    clickMultiplier: 3,
  },
  {
    id: 'dredge',
    name: 'Mechanised Billing',
    emoji: '⚙️',
    description: 'Each click also gains +1% of your tokens/s.',
    cost: { broth: 50_000 },
    kind: 'click',
    clickBrothFraction: 0.01,
  },
  {
    id: 'pulley-equity',
    name: '15% Taylor C602 Pulley Equity',
    emoji: '🔩',
    description: 'Take 15% equity in the pulley. Each click also gains +1.5% of your tokens/s.',
    cost: { broth: 250_000 },
    kind: 'click',
    clickBrothFraction: 0.015,
  },
  {
    id: 'ladle',
    name: 'Neural Pricing Model',
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
    description: 'Recycle hot-fry oil into a 25% latency-budget boost.',
    cost: { broth: 5_000_000 },
    kind: 'thermal',
    coolingMultiplier: 1.25,
    requires: [{ buildingId: 'chiller', count: 25 }, { buildingId: 'fryer', count: 1 }],
  },
  {
    id: 'dawn-shift',
    name: 'Post-Lubrication Dawn Shift',
    emoji: '🌅',
    description: 'A later shift keeps rack latency down by 10%.',
    cost: { broth: 2_000_000, compute: 50_000 },
    kind: 'thermal',
    heatMultiplier: 0.9,
    requires: [{ buildingId: 'rack', count: 50 }],
  },
  { id: 'moss-mulch', name: 'Screen Mulch', emoji: '🌱', description: 'Spent screens mulched back into the stacks. Discovery production ×1.5.', cost: { sphagnum: 500 }, kind: 'resource', resourceMultiplier: { resource: 'peat', factor: 1.5 }, requires: [{ buildingId: 'nursery', count: 10 }] },
  { id: 'pilot-light', name: 'Insider Pilot Light', emoji: '🕯️', description: 'Every chamber gets a leaked-memo flame underneath. Token production ×1.25.', cost: { methane: 2_000 }, kind: 'resource', resourceMultiplier: { resource: 'broth', factor: 1.25 }, requires: [{ buildingId: 'digester', count: 10 }] },
  { id: 'evidence-press', name: 'Leak-Fired Evidence Press', emoji: '🗞️', description: 'Exhibits pressed flat and hot. Evidence production ×1.5.', cost: { methane: 20_000, evidence: 200 }, kind: 'resource', resourceMultiplier: { resource: 'evidence', factor: 1.5 }, requires: [{ buildingId: 'archive', count: 5 }] },
  { id: 'gas-scrubber', name: 'Compliance Scrubber', emoji: '🧯', description: 'Scrubbed exhaust runs colder. Latency budget +20%.', cost: { methane: 50_000 }, kind: 'thermal', coolingMultiplier: 1.2, requires: [{ buildingId: 'gasdome', count: 10 }] },
  { id: 'moss-membrane', name: 'Privilege Membrane', emoji: '🧻', description: 'A living membrane between rack and record. All latency −10%.', cost: { sphagnum: 20_000 }, kind: 'thermal', heatMultiplier: 0.9, requires: [{ buildingId: 'terrace', count: 10 }] },
  { id: 'wetland-charter', name: 'Market Charter', emoji: '📗', description: 'Magistrate Reino grants the screens protected status. Privilege production ×2.', cost: { evidence: 5_000, sphagnum: 100_000 }, kind: 'resource', resourceMultiplier: { resource: 'sphagnum', factor: 2 }, requires: [{ buildingId: 'loom', count: 5 }] },
  { id: 'flare-recovery', name: 'Flare Recovery Loop', emoji: '♻️', description: 'Nothing burns off unmetered. Leak production ×2.', cost: { methane: 1_000_000 }, kind: 'resource', resourceMultiplier: { resource: 'methane', factor: 2 }, requires: [{ buildingId: 'flare', count: 5 }] },
  { id: 'stenographer', name: 'Deposition Stenographer', emoji: '⌨️', description: 'Every keystroke is entered into the record. Click power ×4.', cost: { evidence: 2_000 }, kind: 'click', clickMultiplier: 4, requires: [{ buildingId: 'deposition', count: 5 }] },
  { id: 'pierre-spade', name: "Pierre's Cutting Pen", emoji: '🖋️', description: 'A worn pen found beside the old desk, edge still keen. Discovery production ×1.2.', cost: { peat: 20_000 }, kind: 'resource', requires: [{ buildingId: 'harvester', count: 25 }], resourceMultiplier: { resource: 'peat', factor: 1.2 } },
  { id: 'shrome-lantern', name: "Shrome's Signal Lamp", emoji: '🏮', description: 'A lamp that glows with living signal; the screens grow toward it. Privilege production ×1.2.', cost: { sphagnum: 5_000, broth: 500_000 }, kind: 'resource', requires: [{ buildingId: 'nursery', count: 10 }], resourceMultiplier: { resource: 'sphagnum', factor: 1.2 } },
  { id: 'samkals-ledger', name: "Samkals' Margin Ledger", emoji: '🪨', description: 'A rubbing taken from the sealed archive; the clerks copy its columns. Evidence production ×1.2.', cost: { evidence: 2_000, compute: 100_000 }, kind: 'resource', requires: [{ buildingId: 'clerk', count: 10 }], resourceMultiplier: { resource: 'evidence', factor: 1.2 } },
  { id: 'kreatix-gauge', name: "Kreatix's Pulley Gauge", emoji: '🧰', description: "The wright's own brass gauge; racks trued against it run cooler. Latency load −10%.", cost: { compute: 200_000 }, kind: 'thermal', requires: [{ buildingId: 'rack', count: 25 }], heatMultiplier: 0.9 },
  ...BUILDINGS.flatMap((building) =>
    BOOST_TIERS.map(({ count, factor }, index): UpgradeDef => ({
      id: index === 0 ? `boost-${building.id}` : `boost-${building.id}-${count}`,
      name: building.boostNames[index],
      emoji: building.emoji,
      description: `${building.name} output ×${factor}.`,
      cost: boostCost(building, factor, index),
      kind: 'building',
      buildingId: building.id,
      requires: [{ buildingId: building.id, count }],
    })),
  ),
  ...[
    ['click-ladle', 'Sharp Redline', 'A sharper pen reaches the good tokens.', 500, 2],
    ['click-scoop', 'Measured Filing', 'The stamp is marked in useful increments.', 5_000, 2],
    ['click-crank', 'Counterparty Crank', 'The crank turns billing into a clerical certainty.', 50_000, 3],
    ['click-filing', 'Filed Billing', 'Every invoice arrives with its exhibit number attached.', 500_000, 2],
    ['click-winch', 'Leveraged Filing', 'The leverage does not ask what the book is made of.', 5_000_000, 3],
    ['click-pump', 'Junior Equity', 'A small share of the desk is still a share.', 50_000_000, 4],
    ['click-recess', 'Recess Extension', 'The billing continues while the court finds its papers.', 500_000_000, 3],
    ['click-final', 'Final Invoice', 'The last invoice is never actually the last.', 5_000_000_000, 5],
  ].map(([id, name, description, broth, factor]) => ({
    id: String(id), name: String(name), emoji: '🪙', description: `${String(description)} Click power ×${factor}.`,
    cost: { broth: Number(broth) }, kind: 'click' as const, clickMultiplier: Number(factor),
  })),
  ...[
    ['offline-lantern', 'Ledger Lamp', 'A screen remains lit over the night docket.', 0.01, 5_000],
    ['offline-watch', 'Watch Roster', 'The associates receive a proper rota.', 0.02, 100_000],
    ['offline-clerk', 'After-Hours Clerk', 'One clerk keeps the figures moving.', 0.03, 2_000_000],
    ['offline-moon', 'Moon Filing', 'The moon gets its own copy of the schedule.', 0.04, 40_000_000],
    ['offline-tide', 'Market Table', 'The book is checked between sessions.', 0.05, 800_000_000],
    ['offline-permanent', 'Permanent Night Shift', 'Someone has finally admitted this is a night job.', 0.06, 16_000_000_000],
  ].map(([id, name, description, add, broth]) => ({
    id: String(id), name: String(name), emoji: '🌙', description: `${String(description)} Offline rate +${Number(add) * 100}%.`,
    cost: { broth: Number(broth) }, kind: 'offline' as const, offlineRateAdd: Number(add),
  })),
  ...[
    ['synergy-chill', 'Cooled Compute Ledger', 'Each chiller gives the racks a little more room.', 'chiller', 'compute', 0.01, 3, 25_000],
    ['synergy-moss', 'Screen-Wrapped Discovery', 'Screens make the associates less wasteful.', 'nursery', 'peat', 0.01, 2, 100_000],
    ['synergy-gas', 'Leak-Eyed Pumps', 'The pumps appreciate a reliable memo docket.', 'digester', 'broth', 0.01, 2.5, 400_000],
    ['synergy-evidence', 'Exhibit Conveyor', 'Evidence moves faster when the archive is full.', 'archive', 'evidence', 0.02, 3, 2_000_000],
    ['synergy-racks', 'Rack Census', 'The racks vote for more compute.', 'rack', 'compute', 0.005, 3, 10_000_000],
    ['synergy-peat', 'Bundle Accounting', 'Every press improves the next line item.', 'briquette-works', 'briquettes', 0.01, 3, 50_000_000],
    ['synergy-still', 'Clearing Clause', 'The mint and the tokens now share a docket.', 'copper-still', 'refinedBroth', 0.02, 3, 250_000_000],
    ['synergy-sediment', 'Settled Accounts', 'Settled claims tidy the evidence ledger.', 'sediment-vault', 'evidence', 0.02, 3, 1_000_000_000],
    ['synergy-essence', 'Alpha Witness', 'Alpha makes every witness more concise.', 'essence-condenser', 'all', 0.01, 2, 5_000_000_000],
    ['synergy-peat-root', 'Root-and-Branch Discovery', 'The old record and new filings agree for once.', 'peat', 'broth', 0.01, 3, 25_000_000_000],
    ['synergy-methane', 'Leak Annex', 'The memo annex feeds every warm proceeding.', 'methane', 'compute', 0.01, 3, 100_000_000_000],
    ['synergy-cooling', 'Cold Casework', 'Cold cases are still cases.', 'cooling', 'evidence', 0.01, 3, 500_000_000_000],
  ].map(([id, name, description, source, target, perUnit, cap, broth]) => ({
    id: String(id), name: String(name), emoji: '🔗', description: `${String(description)} ${Number(perUnit) * 100}% per source, capped ×${cap}.`,
    cost: { broth: Number(broth) }, kind: 'synergy' as const,
    synergy: { source: String(source), target: String(target) as SpendableResource | 'all', perUnit: Number(perUnit), cap: Number(cap) },
  })),
  ...[
    ['converter-briquette', 'Dry Press Gearing', 'The press wastes less discovery.', 'briquettes', 0.9, 100_000],
    ['converter-still', 'Copper Reflux', 'The mint keeps the useful margin.', 'refinedBroth', 0.9, 1_000_000],
    ['converter-sediment', 'Dark Settling', 'The pond is allowed to settle properly.', 'sediment', 0.88, 10_000_000],
    ['converter-essence', 'Alembic Patience', 'The alembic takes only what it needs.', 'essence', 0.88, 100_000_000],
    ['converter-briquette-works', 'Binding Ledger', 'The works records every bound volume.', 'briquettes', 0.82, 1_000_000_000],
    ['converter-double-run', 'Second Clearing', 'A second run loses less to the floor.', 'refinedBroth', 0.82, 10_000_000_000],
    ['converter-vault', 'Vault Channel', 'The vault receives measured flow.', 'sediment', 0.8, 100_000_000_000],
    ['converter-celestial', 'Celestial Retort', 'The final vessel has learned restraint.', 'essence', 0.8, 1_000_000_000_000],
  ].map(([id, name, description, line, factor, broth]) => ({
    id: String(id), name: String(name), emoji: '⚗️', description: `${String(description)} Converter inputs ×${factor}.`,
    cost: { broth: Number(broth) }, kind: 'converter' as const,
    converterEfficiency: { line: String(line) as ProductionLine, factor: Number(factor) },
  })),
  ...[
    ['thermal-brine', 'Brine Heat Sink', 'A brine loop accepts the load without comment.', 1.1, 10_000_000],
    ['thermal-moss', 'Screen Heat Exchange', 'The screens take the warm side of the bargain.', 1.15, 100_000_000],
    ['thermal-night', 'Night Cooling', 'The cold arrives after adjournment.', 1.2, 1_000_000_000],
    ['thermal-deep', 'Deep Latency Writ', 'The writ applies beneath the floor.', 1.25, 10_000_000_000],
    ['thermal-polar', 'Polar Filing', 'The clerk files the temperature as negligible.', 1.3, 100_000_000_000],
    ['thermal-final', 'Absolute Cooling', 'The racks remain cold out of professional pride.', 1.4, 1_000_000_000_000],
  ].map(([id, name, description, factor, broth]) => ({
    id: String(id), name: String(name), emoji: '❄️', description: `${String(description)} Latency budget ×${factor}.`,
    cost: { broth: Number(broth) }, kind: 'thermal' as const, coolingMultiplier: Number(factor),
  })),
  ...[
    ['automation-broth', 'Token Procurement Desk', 'The desk buys the cheapest token-line unit every 30 seconds.', 'broth', 30, 1_000_000],
    ['automation-peat', 'Discovery Procurement Desk', 'The desk buys the cheapest discovery-line unit every 60 seconds.', 'peat', 60, 100_000_000],
    ['automation-compute', 'Rack Procurement Desk', 'The desk buys the cheapest compute-line unit every 120 seconds.', 'compute', 120, 10_000_000_000],
    ['automation-chain', 'Chain Procurement Desk', 'The desk buys the cheapest converter every 180 seconds.', 'briquettes', 180, 1_000_000_000_000],
  ].map(([id, name, description, line, intervalSec, broth]) => ({
    id: String(id), name: String(name), emoji: '🗂️', description: String(description),
    cost: { broth: Number(broth) }, kind: 'automation' as const,
    automation: { line: String(line) as ProductionLine, intervalSec: Number(intervalSec) },
  })),
  ...[
    ['essence-spark', 'Alpha Spark', 'A spark of alpha brightens every production line.', 1.1, 1_000],
    ['essence-glow', 'Alpha Glow', 'The book gives off a more useful light.', 1.2, 10_000],
    ['essence-aura', 'Alpha Aura', 'The aura reaches the courthouse steps.', 1.35, 100_000],
    ['essence-crown', 'Alpha Crown', 'The crown is accepted without a hearing.', 1.6, 1_000_000],
  ].map(([id, name, description, factor, essence]) => ({
    id: String(id), name: String(name), emoji: '✨', description: `${String(description)} All production ×${factor}.`,
    cost: { essence: Number(essence) }, kind: 'resource' as const,
    resourceMultiplier: { resource: 'all' as const, factor: Number(factor) },
  })),
];

const UPGRADE_RESOURCE_FALLBACKS: Record<UpgradeKind, SpendableResource> = {
  click: 'peat',
  building: 'sludge',
  thermal: 'sphagnum',
  resource: 'sediment',
  offline: 'sphagnum',
  synergy: 'sphagnum',
  converter: 'methane',
  automation: 'evidence',
};

const UPGRADE_SECONDARY_FALLBACKS: Partial<Record<UpgradeKind, SpendableResource[]>> = {
  click: ['peat', 'evidence'],
  offline: ['sphagnum', 'evidence'],
  synergy: ['sphagnum', 'methane'],
  converter: ['methane'],
  thermal: ['sphagnum', 'methane', 'sediment'],
  automation: ['evidence', 'methane'],
  resource: ['sediment', 'refinedBroth'],
};

const CONVERTER_INPUTS: Partial<Record<ProductionLine, SpendableResource>> = {
  briquettes: 'briquettes',
  refinedBroth: 'refinedBroth',
  sediment: 'sediment',
  essence: 'essence',
};

const CONVERTER_PRODUCER_BUILDINGS: Partial<Record<SpendableResource, string>> = {
  briquettes: 'peat-press',
  refinedBroth: 'copper-still',
  sediment: 'sludge-settler',
  essence: 'essence-condenser',
};

const ESSENCE_UPGRADE_BROTH_COSTS: Record<string, number> = {
  'essence-spark': 2_000_000_000,
  'essence-glow': 20_000_000_000,
  'essence-aura': 200_000_000_000,
  'essence-crown': 2_000_000_000_000,
};

function diversifiedUpgradeCost(upgrade: UpgradeDef, index: number): ResourceCostSpec {
  if (upgrade.kind === 'building') return upgrade.cost;
  const existing = Object.keys(upgrade.cost).filter((resource) => resource !== 'broth') as SpendableResource[];
  const requiredResources = new Set(
    (upgrade.requires ?? []).flatMap(({ buildingId }) =>
      Object.keys(BASE_BUILDINGS.find((building) => building.id === buildingId)?.produces ?? [])),
  );
  const brothFromData = upgrade.cost.broth;
  const resourceFloor = existing.reduce(
    (floor, resource) => Math.max(floor, (RESOURCE_PRODUCER_BROTH_COST[resource] ?? 0) + 1),
    1_000,
  );
  const essenceTier = ESSENCE_UPGRADE_BROTH_COSTS[upgrade.id] ?? 0;
  const broth = brothFromData ?? Math.max(essenceTier, resourceFloor, ...existing.map((resource) => (upgrade.cost[resource] ?? 0) * 20));
  const resources = [...existing];
  const fallbacks = UPGRADE_SECONDARY_FALLBACKS[upgrade.kind] ?? [
    UPGRADE_RESOURCE_FALLBACKS[upgrade.kind],
  ];
  if (resources.length === 0) {
    if (upgrade.kind === 'converter' && upgrade.converterEfficiency) {
      const input = CONVERTER_INPUTS[upgrade.converterEfficiency.line];
      if (input) resources.push(input);
    }
    if (resources.length === 0) resources.push(fallbacks[0]);
  }
  for (const resource of fallbacks) {
    if (resources.length >= 2) break;
    if (
      !requiredResources.has(resource) &&
      (RESOURCE_PRODUCER_BROTH_COST[resource] ?? Infinity) >= broth
    ) continue;
    if (!resources.includes(resource)) resources.push(resource);
  }
  const cost: ResourceCostSpec = { ...upgrade.cost, broth };
  for (const [resourceIndex, resource] of resources.entries()) {
    if (cost[resource] !== undefined) continue;
    const tierScale = index < 100 ? 1 : index < 200 ? 2 : 3;
    const variation = (0.5 + ((index + resourceIndex) % 5) * 0.1) * tierScale;
    cost[resource] = roundTwoSignificant(broth * SECONDARY_COST_RATIOS[resource] * variation);
  }
  return cost;
}

export const UPGRADES: UpgradeDef[] = RAW_UPGRADES.map((upgrade) => {
  if (upgrade.kind === 'converter' && upgrade.converterEfficiency) {
    const input = CONVERTER_INPUTS[upgrade.converterEfficiency.line];
    const producer = input && CONVERTER_PRODUCER_BUILDINGS[input];
    if (input && producer && (RESOURCE_PRODUCER_BROTH_COST[input] ?? Infinity) >= (upgrade.cost.broth ?? 0)) {
      return { ...upgrade, requires: [{ buildingId: producer, count: 1 }] };
    }
  }
  return upgrade;
}).map((upgrade, index) => ({
  ...upgrade,
  cost: diversifiedUpgradeCost(upgrade, index),
}));

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
    name: 'Latency Modelling',
    emoji: '📈',
    description: 'Latency budget effectiveness +25%.',
    cost: { compute: 500 },
    durationSec: 60,
    effect: { kind: 'cooling', factor: 1.25 },
  },
  {
    id: 'lubrication-clause',
    name: 'Strike the 5:00 AM Lubrication Clause',
    emoji: '📜',
    description: 'No more dawn greasing of the racks. All latency −15%.',
    cost: { compute: 2_000, evidence: 50 },
    durationSec: 180,
    effect: { kind: 'heat', factor: 0.85 },
  },
  {
    id: 'liquid-immersion',
    name: 'Liquid Immersion',
    emoji: '🛢️',
    description: 'All latency output −20%.',
    cost: { compute: 5000 },
    durationSec: 240,
    effect: { kind: 'heat', factor: 0.8 },
  },
  {
    id: 'broth-distillation',
    name: 'Token Distillation',
    emoji: '⚗️',
    description: 'Token production ×1.5.',
    cost: { compute: 20_000 },
    durationSec: 300,
    effect: { kind: 'multiplier', target: 'broth', factor: 1.5 },
  },
  {
    id: 'broth-standard',
    name: '40 L fp16 Legal-Compute Token Standard',
    emoji: '🧴',
    description: 'Standardise every batch at 40 L fp16. Token production ×1.25.',
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
    name: 'Quantum Discovery',
    emoji: '♾️',
    description: 'All production ×2.',
    cost: { compute: 1_000_000 },
    durationSec: 1_800,
    effect: { kind: 'multiplier', target: 'all', factor: 2 },
  },
  { id: 'thermal-docket', name: 'Latency Docket', emoji: '🌡️', description: 'The latency ledger is kept before it becomes a problem.', cost: { compute: 2_000_000 }, durationSec: 2_400, requires: ['thermal-modelling'], effect: { kind: 'heat', factor: 0.92 } },
  { id: 'cooling-reserve', name: 'Latency Reserve', emoji: '🧊', description: 'Spare budget is held for the next hearing.', cost: { compute: 10_000_000 }, durationSec: 3_000, requires: ['thermal-docket'], effect: { kind: 'cooling', factor: 1.2 } },
  { id: 'heat-exemption', name: 'Latency Exemption', emoji: '📜', description: 'The racks receive a narrow exemption from latency scrutiny.', cost: { compute: 50_000_000, evidence: 1_000 }, durationSec: 4_000, requires: ['cooling-reserve'], effect: { kind: 'heat', factor: 0.9 } },
  { id: 'cold-precedent', name: 'Cold Precedent', emoji: '⚖️', description: 'A prior ruling makes latency admissible everywhere.', cost: { compute: 300_000_000, evidence: 10_000 }, durationSec: 5_000, requires: ['heat-exemption'], effect: { kind: 'cooling', factor: 1.25 } },
  { id: 'thermal-charter', name: 'Latency Charter', emoji: '📗', description: 'Load and budget agree to share a margin.', cost: { compute: 2_000_000_000, evidence: 50_000 }, durationSec: 6_000, requires: ['cold-precedent'], effect: { kind: 'heat', factor: 0.85 } },
  { id: 'cold-finality', name: 'Latency Finality', emoji: '❄️', description: 'The final latency argument is dismissed.', cost: { compute: 10_000_000_000, evidence: 250_000 }, durationSec: 8_000, requires: ['thermal-charter'], effect: { kind: 'cooling', factor: 1.3 } },
  { id: 'extraction-ledger', name: 'Discovery Ledger', emoji: '📒', description: 'Every cut is recorded before the file closes over it.', cost: { compute: 5_000_000 }, durationSec: 2_400, requires: ['broth-distillation'], effect: { kind: 'multiplier', target: 'peat', factor: 1.3 } },
  { id: 'sludge-accounting', name: 'Flow Accounting', emoji: '🟤', description: 'The byproduct gets its own line in the ledger.', cost: { compute: 25_000_000 }, durationSec: 3_000, requires: ['extraction-ledger'], effect: { kind: 'multiplier', target: 'sludge', factor: 1.4 } },
  { id: 'peat-standard', name: 'Exhibit Standard', emoji: '🧱', description: 'Pressed discovery is measured to the same unpleasant standard.', cost: { compute: 150_000_000, evidence: 2_000 }, durationSec: 4_000, requires: ['sludge-accounting'], effect: { kind: 'unlockLine', line: 'briquettes' } },
  { id: 'press-efficiency', name: 'Press Efficiency', emoji: '🏭', description: 'The press gives back more of what it is given.', cost: { compute: 1_000_000_000, evidence: 20_000 }, durationSec: 6_000, requires: ['peat-standard'], effect: { kind: 'converterEfficiency', line: 'briquettes', factor: 0.9 } },
  { id: 'peat-scale', name: 'Exhibit Scale', emoji: '📈', description: 'The exhibit line receives a slightly friendlier cost schedule.', cost: { compute: 8_000_000_000, evidence: 100_000 }, durationSec: 8_000, requires: ['press-efficiency'], effect: { kind: 'costScale', line: 'briquettes', delta: -0.01 } },
  { id: 'deep-extraction', name: 'Deep Discovery', emoji: '⛏️', description: 'The associates reach a layer the map did not mention.', cost: { compute: 60_000_000_000, evidence: 500_000 }, durationSec: 10_000, requires: ['peat-scale'], effect: { kind: 'multiplier', target: 'peat', factor: 1.5 } },
  { id: 'still-method', name: 'Mint Method', emoji: '⚗️', description: 'The mint is instructed to keep the useful margin.', cost: { compute: 30_000_000 }, durationSec: 3_000, requires: ['broth-standard'], effect: { kind: 'unlockLine', line: 'refinedBroth' } },
  { id: 'fractionation', name: 'Fractionation', emoji: '🏺', description: 'Tokens and leaks are separated without an argument.', cost: { compute: 250_000_000, evidence: 5_000 }, durationSec: 5_000, requires: ['still-method'], effect: { kind: 'converterEfficiency', line: 'refinedBroth', factor: 0.9 } },
  { id: 'distillers-clause', name: 'Mint Clause', emoji: '📜', description: 'The mint may run after the courthouse closes.', cost: { compute: 2_000_000_000, evidence: 50_000 }, durationSec: 7_000, requires: ['fractionation'], effect: { kind: 'multiplier', target: 'refinedBroth', factor: 1.5 } },
  { id: 'double-run', name: 'Double Run', emoji: '♨️', description: 'The second pass is now considered routine.', cost: { compute: 15_000_000_000, evidence: 250_000 }, durationSec: 9_000, requires: ['distillers-clause'], effect: { kind: 'multiplier', target: 'broth', factor: 1.4 } },
  { id: 'distillation-scale', name: 'Clearing Scale', emoji: '📐', description: 'The mint line receives a modest cost concession.', cost: { compute: 100_000_000_000, evidence: 1_000_000 }, durationSec: 12_000, requires: ['double-run'], effect: { kind: 'costScale', line: 'refinedBroth', delta: -0.01 } },
  { id: 'litigation-slots', name: 'Litigation Backlog', emoji: '🗃️', description: 'The clerks accept one more research docket.', cost: { compute: 100_000_000 }, durationSec: 4_000, requires: ['nordic-verdict'], effect: { kind: 'researchSlots', add: 1 } },
  { id: 'offline-brief', name: 'Offline Brief', emoji: '🕯️', description: 'The court prepares a brief before anyone arrives.', cost: { compute: 1_000_000_000, evidence: 20_000 }, durationSec: 6_000, requires: ['litigation-slots'], effect: { kind: 'offlineRate', add: 0.05 } },
  { id: 'evidence-multipliers', name: 'Evidence Multipliers', emoji: '📁', description: 'Every exhibit points to another exhibit.', cost: { compute: 10_000_000_000, evidence: 100_000 }, durationSec: 8_000, requires: ['offline-brief'], effect: { kind: 'multiplier', target: 'evidence', factor: 1.6 } },
  { id: 'research-office', name: 'Research Office', emoji: '🏛️', description: 'The office acquires another desk and calls it infrastructure.', cost: { compute: 80_000_000_000, evidence: 500_000 }, durationSec: 10_000, requires: ['evidence-multipliers'], effect: { kind: 'researchSlots', add: 1 } },
  { id: 'filing-scale', name: 'Filing Scale', emoji: '⚖️', description: 'Evidence buildings receive a cost schedule fit for a court.', cost: { compute: 500_000_000_000, evidence: 2_000_000 }, durationSec: 14_000, requires: ['research-office'], effect: { kind: 'costScale', line: 'evidence', delta: -0.01 } },
  { id: 'celestial-reading', name: 'Celestial Reading', emoji: '🌌', description: 'The stars are consulted on the matter of alpha.', cost: { compute: 500_000_000 }, durationSec: 5_000, requires: ['quantum-peat'], effect: { kind: 'unlockLine', line: 'sediment' } },
  { id: 'sediment-method', name: 'Settlement Method', emoji: '🪨', description: 'The settled layer is granted a proper vessel.', cost: { compute: 5_000_000_000, evidence: 50_000 }, durationSec: 8_000, requires: ['celestial-reading'], effect: { kind: 'converterEfficiency', line: 'sediment', factor: 0.88 } },
  { id: 'essence-reading', name: 'Alpha Reading', emoji: '✨', description: 'What remains after clearing is finally named.', cost: { compute: 50_000_000_000, evidence: 500_000 }, durationSec: 10_000, requires: ['sediment-method'], effect: { kind: 'unlockLine', line: 'essence' } },
  { id: 'alembic-scale', name: 'Alembic Scale', emoji: '⚗️', description: 'Alpha equipment receives a careful cost adjustment.', cost: { compute: 500_000_000_000, evidence: 5_000_000 }, durationSec: 14_000, requires: ['essence-reading'], effect: { kind: 'costScale', line: 'essence', delta: -0.01 } },
  { id: 'essence-law', name: 'Alpha Law', emoji: '📗', description: 'The final resource enters the statute book.', cost: { compute: 5_000_000_000_000, evidence: 25_000_000 }, durationSec: 18_000, requires: ['alembic-scale'], effect: { kind: 'multiplier', target: 'essence', factor: 2 } },
  { id: 'click-research', name: 'Manual Precedent', emoji: '🖋️', description: 'The hand still has standing.', cost: { compute: 1_000_000 }, durationSec: 3_000, requires: ['extraction-ledger'], effect: { kind: 'clickMultiplier', factor: 1.5 } },
  { id: 'automation-research', name: 'Routine Procurement', emoji: '🗂️', description: 'Routine purchases no longer require a hearing.', cost: { compute: 10_000_000_000 }, durationSec: 9_000, requires: ['research-office'], effect: { kind: 'multiplier', target: 'all', factor: 1.25 } },
  { id: 'offline-research', name: 'Night Research', emoji: '🌙', description: 'The research office continues with the lamps down.', cost: { compute: 100_000_000_000 }, durationSec: 12_000, requires: ['offline-brief'], effect: { kind: 'offlineRate', add: 0.08 } },
  { id: 'final-verdict', name: 'Final Verdict', emoji: '⚖️', description: 'The case is decided in favour of continued production.', cost: { compute: 1_000_000_000_000, evidence: 10_000_000 }, durationSec: 21_600, requires: ['essence-law'], effect: { kind: 'multiplier', target: 'all', factor: 1.5 } },
  { id: 'moss-annex', name: 'Privilege Annex', emoji: '🌿', description: 'The screens receive a further annex and fill it promptly.', cost: { compute: 2_000_000_000 }, durationSec: 7_200, requires: ['extraction-ledger'], effect: { kind: 'multiplier', target: 'sphagnum', factor: 1.4 } },
];

export const RESEARCH_BY_ID: Record<string, ResearchDef> = Object.fromEntries(
  RESEARCH.map((r) => [r.id, r]),
);

/** Branches used to organize the Research tab. */
export type ResearchBranch = 'thermal' | 'extraction' | 'distillation' | 'litigation' | 'celestial';

/** Research branch labels and their short ledger descriptions. */
export const RESEARCH_BRANCHES: Record<ResearchBranch, { name: string; blurb: string }> = {
  thermal: { name: 'Latency', blurb: 'Keep the racks cold enough to remain admissible.' },
  extraction: { name: 'Discovery', blurb: 'Pull useful matter from the record before it closes.' },
  distillation: { name: 'Clearing', blurb: 'Run the mint until the paperwork turns clear.' },
  litigation: { name: 'Litigation', blurb: 'Give the court more work than it can postpone.' },
  celestial: { name: 'Celestial', blurb: 'Ask the dark above the exchange what remains below.' },
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
  { id: 'click-1', name: 'First Billing', emoji: '🪙', description: 'Bill tokens for the first time.' },
  { id: 'click-100', name: 'Calloused Hands', emoji: '✋', description: 'Bill 100 times.' },
  { id: 'click-1000', name: 'Billing Drudge', emoji: '🏋️', description: 'Bill 1,000 times.' },
  { id: 'broth-1k', name: 'Token Pot', emoji: '🍲', description: 'Earn 1,000 total tokens.' },
  { id: 'broth-1m', name: 'Token Tycoon', emoji: '🎩', description: 'Earn 1,000,000 total tokens.' },
  { id: 'broth-1b', name: 'Token Ocean', emoji: '🌊', description: 'Earn 1,000,000,000 total tokens.' },
  { id: 'first-rack', name: 'Boot Sequence', emoji: '🖥️', description: 'Buy your first Server Rack.' },
  { id: 'chiller-10', name: 'Cold Snap', emoji: '❄️', description: 'Own 10 Edge Chillers.' },
  { id: 'chiller-50', name: 'Permafrost', emoji: '🧊', description: 'Own 50 Edge Chillers.' },
  { id: 'first-compute', name: 'First FLOP', emoji: '💡', description: 'Generate your first arbitrage compute.' },
  { id: 'compute-1m', name: 'Exascale Book', emoji: '🚀', description: 'Earn 1,000,000 total compute.' },
  { id: 'full-cool', name: 'Ice Cold', emoji: '🥶', description: 'Run fully provisioned with 100+ latency load.' },
  { id: 'prestige-1', name: 'Firm Reborn', emoji: '♻️', description: 'Restructure the firm for the first time.' },
  { id: 'cores-10', name: 'Precedent Hoard', emoji: '💎', description: 'Hold 10 precedents.' },
  { id: 'harvester-100', name: 'Billing Empire', emoji: '🏢', description: 'Own 100 Billing Interns.' },
  { id: 'hyperscaler', name: 'Hyperscaled', emoji: '🌐', description: 'Own a Colo Hyperscaler.' },
  { id: 'debt-free', name: 'WillMcfly, Debt-Free', emoji: '💵', description: 'Bank $59 of sanitized change (earn 59 total tokens).' },
  { id: 'hot-fries', name: '120 kg Hot Fries', emoji: '🍟', description: 'Buy the 120 kg Hot Fries upgrade.' },
  { id: 'pulley-equity', name: 'Pulley Shareholder', emoji: '🔩', description: 'Hold 15% Taylor C602 pulley equity.' },
  { id: 'clause-struck', name: 'Clause Struck', emoji: '📜', description: 'Remove the 5:00 AM lubrication clause.' },
  { id: 'reino-verdict', name: 'Magistrate Reino Rules', emoji: '⚖️', description: 'Win McFly & Chronicler LLP v Burger King Nordic.' },
  { id: 'moss-1k', name: 'Privileged Ground', emoji: '🌱', description: 'Earn 1,000 total privilege screens.' },
  { id: 'methane-1k', name: 'Insider Tip', emoji: '💨', description: 'Earn 1,000 total leaked memos.' },
  { id: 'charter-1', name: 'First Term Signed', emoji: '📗', description: 'Sign a Charter term.' },
  { id: 'charter-all', name: 'Full Charter', emoji: '📜', description: 'Sign every Charter term.' },
  { id: 'keepers-all', name: 'Partnership Council', emoji: '🕯️', description: 'Meet every Senior Partner.' },
  { id: 'relics-4', name: 'Relic Associate', emoji: '🏺', description: 'Recover all four Partner relics.' },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);

export const FIELD_NOTES: string[] = [
  'Field note 01: the book of business has entered a plea of damp.',
  'Field note 02: the first trade was clean. The second was personal.',
  'Field note 03: the screens are winning. Filed without objection.',
  'Field note 04: Exhibit C is a 40 L drum, labelled fp16, warm to the touch.',
  'Field note 05: Reino\'s clerk asks that the racks stop humming during recess.',
  'Field note 06: the 5:00 AM lubrication clause has been struck; the racks are still greasy.',
  'Field note 07: Burger King Nordic\'s counsel requests the fries be entered as evidence. Denied; eaten.',
  'Field note 08: $59 in sanitized change remains in escrow, smelling of toner.',
  'Field note 09: the Taylor C602 pulley turns 15% in our favour.',
  'Field note 10: leaked memos were found bubbling under the filing cabinet.',
  'Field note 11: the privilege screens have formed a committee and requested shade.',
  'Field note 12: the courthouse datacenter accepts tokens by the litre.',
  'Field note 13: the leaked memos are renewable, provided nobody asks where they came from.',
  'Field note 14: all objections are logged, bound, and returned to the record.',
  'Field note 15: the associates leave one file unopened in the deep archive. Pierre is under it, and he prefers the quiet.',
  'Field note 16: follow Mia\'s prints across the trading floor. Step where she did not, and the market files a claim on your boots.',
  'Field note 17: Shrome does not speak; the screens just glow a little greener where he has been.',
  'Field note 18: Samkals was subpoenaed, read, and put back. The ledger objected to being dry.',
  'Field note 19: the market light called Spaced rose over the digesters again. It was looking at the stars, not at us.',
  'Field note 20: nobody has seen vwh open the channel. The order flow is simply gone by morning.',
  'Field note 21: Hermano\'s boiler is never empty. The far desk is a long walk, and worth it.',
  'Field note 22: Tassie passed under the racks at 3:00 AM. The latency gauge has not stopped sulking.',
  'Field note 23: every pulley in the firm carries the wright\'s mark. Kreatix hung the first rack; the rest followed.',
  'Field note 24: Poke spoke in the vat again. Three ticks, then silence. The partners took it as a yes.',
];

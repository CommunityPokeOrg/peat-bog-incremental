import { lineUnlocked, productionPerSecond, thermalFactor, totalCooling, totalHeat } from './engine';
import type { GameState } from './state';
import { D, type Decimal } from './decimal';
import type { ProductionLine, SpendableResource } from './data';
import type { CharterEffect } from './charter';

/** Maximum repeatable bounty instance used for exponential scaling. */
export const BOUNTY_SCALE_CAP = 60;

/** Requirement types used by settlement quests. */
export type QuestRequirement =
  | { kind: 'lifetime'; resource: SpendableResource; target: number }
  | { kind: 'clicks'; target: number }
  | { kind: 'hits'; target: number }
  | { kind: 'cores'; target: number }
  | { kind: 'charter'; count: number }
  | { kind: 'owned'; buildingId: string; count: number }
  | { kind: 'rate'; resource: EarnedResource; perSecond: number }
  | { kind: 'line'; line: ProductionLine }
  | { kind: 'research'; id: string }
  | { kind: 'upgrade'; id: string }
  | { kind: 'quests'; ids: string[] }
  | { kind: 'cooled'; minHeat: number };

/** Targets that quest multipliers can affect. */
export type MultiplierTarget = SpendableResource | 'click' | 'all';
export type EarnedResource = SpendableResource;

/** Effects granted when a settlement quest is claimed. */
export type QuestReward =
  | { kind: 'resource'; resource: EarnedResource; amount: number }
  | { kind: 'production'; resource: EarnedResource; seconds: number; floor?: number }
  | { kind: 'multiplier'; target: MultiplierTarget; factor: number; durationSec?: number }
  | { kind: 'cores'; amount: number }
  | { kind: 'permanent'; effect: CharterEffect };

/** Static settlement quest definition. */
export interface QuestDef {
  id: string;
  name: string;
  emoji: string;
  brief: string;
  chapter: 'discovery' | 'litigation' | 'verdict' | 'keepers' | 'works' | 'appeals';
  requirement: QuestRequirement;
  reward: QuestReward;
  persistsThroughPrestige?: true;
}

/** A live timed quest multiplier stored in a save. */
export interface QuestBuff {
  questId: string;
  target: MultiplierTarget;
  factor: number;
  expiresAt: number;
}

/** A permanent effect granted by a claimed docket quest. */
export interface QuestPermanentEffect {
  questId: string;
  effect: CharterEffect;
}

/** A repeatable bounty template whose target and reward scale by completion count. */
export interface BountyDef {
  id: string;
  name: string;
  emoji: string;
  brief: (count: number) => string;
  requirement: (count: number) => QuestRequirement;
  reward: (count: number) => QuestReward;
}

/** Ordered settlement quest definitions shown by the temporary docket UI. */
export const QUESTS: QuestDef[] = [
  { id: 'q-first-scoop', name: 'First Scoop on Record', emoji: '🫧', brief: 'Harvest 10 times.', chapter: 'discovery', requirement: { kind: 'clicks', target: 10 }, reward: { kind: 'resource', resource: 'broth', amount: 50 } },
  { id: 'q-sanitized-change', name: '$59 Sanitized Change', emoji: '💵', brief: 'Earn 59 total broth.', chapter: 'discovery', requirement: { kind: 'lifetime', resource: 'broth', target: 59 }, reward: { kind: 'multiplier', target: 'click', factor: 2 } },
  { id: 'q-first-cut', name: 'Cut the First Sod', emoji: '🔪', brief: 'Earn 25 total peat.', chapter: 'discovery', requirement: { kind: 'lifetime', resource: 'peat', target: 25 }, reward: { kind: 'resource', resource: 'peat', amount: 100 } },
  { id: 'q-green-bed', name: 'Green Bed', emoji: '🌱', brief: 'Earn 50 total sphagnum.', chapter: 'discovery', requirement: { kind: 'lifetime', resource: 'sphagnum', target: 50 }, reward: { kind: 'resource', resource: 'sphagnum', amount: 200 } },
  { id: 'q-serve-nordic', name: 'Serve Burger King Nordic', emoji: '🍔', brief: 'Own 5 Fermentation Vats.', chapter: 'discovery', requirement: { kind: 'owned', buildingId: 'vat', count: 5 }, reward: { kind: 'production', resource: 'broth', seconds: 120, floor: 500 } },
  { id: 'q-boot-racks', name: 'Boot the Racks', emoji: '🖥️', brief: 'Own 3 Server Racks.', chapter: 'discovery', requirement: { kind: 'owned', buildingId: 'rack', count: 3 }, reward: { kind: 'production', resource: 'compute', seconds: 300, floor: 200 } },
  { id: 'q-cool-heads', name: 'Cool Heads', emoji: '❄️', brief: 'Cool at least 100 heat.', chapter: 'discovery', requirement: { kind: 'cooled', minHeat: 100 }, reward: { kind: 'multiplier', target: 'compute', factor: 1.15 } },
  { id: 'q-calibrated', name: 'Calibrated Hands', emoji: '🎯', brief: 'Land 25 calibration hits or full peat cuts.', chapter: 'litigation', requirement: { kind: 'hits', target: 25 }, reward: { kind: 'multiplier', target: 'compute', factor: 1.5, durationSec: 600 } },
  { id: 'q-hot-fries', name: '120 kg Hot Fries', emoji: '🍟', brief: 'Buy the Hot Fries upgrade.', chapter: 'litigation', requirement: { kind: 'upgrade', id: 'hot-fries' }, reward: { kind: 'resource', resource: 'peat', amount: 5_000 } },
  { id: 'q-pulley', name: '15% Pulley Equity', emoji: '🔩', brief: 'Buy Pulley Equity.', chapter: 'litigation', requirement: { kind: 'upgrade', id: 'pulley-equity' }, reward: { kind: 'multiplier', target: 'broth', factor: 1.15 } },
  { id: 'q-paper-trail', name: 'Paper Trail', emoji: '📁', brief: 'Earn 500 total evidence.', chapter: 'litigation', requirement: { kind: 'lifetime', resource: 'evidence', target: 500 }, reward: { kind: 'multiplier', target: 'evidence', factor: 1.5 } },
  { id: 'q-bog-gas', name: 'Bottled Bog Gas', emoji: '💨', brief: 'Earn 1,000 total methane.', chapter: 'litigation', requirement: { kind: 'lifetime', resource: 'methane', target: 1_000 }, reward: { kind: 'multiplier', target: 'methane', factor: 1.25 } },
  { id: 'q-clause', name: 'Strike the 5:00 AM Clause', emoji: '📜', brief: 'Complete the lubrication clause research.', chapter: 'litigation', requirement: { kind: 'research', id: 'lubrication-clause' }, reward: { kind: 'multiplier', target: 'all', factor: 1.1 }, persistsThroughPrestige: true },
  { id: 'q-rate-1k', name: 'Ten Thousand a Second', emoji: '📈', brief: 'Reach 10,000 broth per second.', chapter: 'litigation', requirement: { kind: 'rate', resource: 'broth', perSecond: 10_000 }, reward: { kind: 'production', resource: 'broth', seconds: 600 } },
  { id: 'q-verdict', name: 'Magistrate Reino Rules', emoji: '⚖️', brief: 'Complete the Nordic verdict research.', chapter: 'verdict', requirement: { kind: 'research', id: 'nordic-verdict' }, reward: { kind: 'cores', amount: 1 }, persistsThroughPrestige: true },
  { id: 'q-hyperscale', name: 'Hyperscale the Bog', emoji: '🌐', brief: 'Own a Bog Hyperscaler.', chapter: 'verdict', requirement: { kind: 'owned', buildingId: 'hyperscaler', count: 1 }, reward: { kind: 'multiplier', target: 'all', factor: 1.25 }, persistsThroughPrestige: true },
  { id: 'q-drained', name: 'Bog Reborn', emoji: '♻️', brief: 'Bank one Bog Core.', chapter: 'verdict', requirement: { kind: 'cores', target: 1 }, reward: { kind: 'multiplier', target: 'all', factor: 2, durationSec: 900 }, persistsThroughPrestige: true },
  { id: 'k-pierre', name: 'Pierre of the Peat', emoji: '🪦', brief: 'Earn 100,000 total peat. Somewhere in the deep cut lies a cutter the bog kept whole; the moss calls him Pierre.', chapter: 'keepers', requirement: { kind: 'lifetime', resource: 'peat', target: 100_000 }, reward: { kind: 'multiplier', target: 'peat', factor: 1.25 } },
  { id: 'k-mia', name: 'Mia the Patchstep', emoji: '🐾', brief: 'Land 100 calibration hits or full cuts. Mia knows which tussocks hold; every safe path across the mire follows her footprints.', chapter: 'keepers', requirement: { kind: 'hits', target: 100 }, reward: { kind: 'multiplier', target: 'click', factor: 1.5 } },
  { id: 'k-shrome', name: 'Shrome, Keeper of the Mycelium', emoji: '🍄', brief: 'Earn 25,000 total sphagnum. Under every green bed runs a single fungal thread, and Shrome tends it.', chapter: 'keepers', requirement: { kind: 'lifetime', resource: 'sphagnum', target: 25_000 }, reward: { kind: 'multiplier', target: 'sphagnum', factor: 1.25 } },
  { id: 'k-samkals', name: 'Samkals, the Sunken Archive', emoji: '🏺', brief: 'Earn 10,000 total evidence. A drowned stone ledger at the bog floor; whatever the peat is told, Samkals remembers.', chapter: 'keepers', requirement: { kind: 'lifetime', resource: 'evidence', target: 10_000 }, reward: { kind: 'multiplier', target: 'evidence', factor: 1.25 } },
  { id: 'k-spaced', name: 'Spaced, the Marsh Light', emoji: '🌌', brief: 'Earn 100,000 total methane. The wisp that drifts above the gas pools, always looking up at something the rest of us cannot see.', chapter: 'keepers', requirement: { kind: 'lifetime', resource: 'methane', target: 100_000 }, reward: { kind: 'multiplier', target: 'methane', factor: 1.25 } },
  { id: 'k-vwh', name: 'vwh, the Quiet Sluice', emoji: '🚰', brief: 'Bank 3 Bog Cores. Three letters cut into the oldest drainage sill. The gate opens without a sound, and the bog is lower by morning.', chapter: 'keepers', requirement: { kind: 'cores', target: 3 }, reward: { kind: 'cores', amount: 1 }, persistsThroughPrestige: true },
  { id: 'k-hermano', name: 'Hermano of the Far Bank', emoji: '🤝', brief: 'Reach 1,000,000 broth per second. The cutter across the water who shares his kettle with anyone who wades over.', chapter: 'keepers', requirement: { kind: 'rate', resource: 'broth', perSecond: 1_000_000 }, reward: { kind: 'production', resource: 'broth', seconds: 900, floor: 1_000_000 } },
  { id: 'k-tassie', name: 'Tassie, Devil of the Deep Bog', emoji: '😈', brief: 'Cool at least 50,000 heat. Something burrows under the southern peat and the racks run hot wherever it passes.', chapter: 'keepers', requirement: { kind: 'cooled', minHeat: 50_000 }, reward: { kind: 'multiplier', target: 'compute', factor: 1.25 } },
  { id: 'k-kreatix', name: 'Kreatix, the Bog Wright', emoji: '🔧', brief: 'Own 50 Server Racks. The wright who first hung a rack from a pulley and taught the bog to compute.', chapter: 'keepers', requirement: { kind: 'owned', buildingId: 'rack', count: 50 }, reward: { kind: 'multiplier', target: 'all', factor: 1.1 }, persistsThroughPrestige: true },
  { id: 'k-poke', name: 'Poke, Oracle of the Bog', emoji: '🔮', brief: 'Meet the other nine Keepers. The spirit the bog itself answers to; it speaks in bubbles and every Keeper listens.', chapter: 'keepers', requirement: { kind: 'quests', ids: ['k-pierre','k-mia','k-shrome','k-samkals','k-spaced','k-vwh','k-hermano','k-tassie','k-kreatix'] }, reward: { kind: 'multiplier', target: 'all', factor: 1.2 }, persistsThroughPrestige: true },
];

const WORKS_QUESTS: QuestDef[] = [
  { id: 'w-first-briquette', name: 'First Briquette Filed', emoji: '🧱', brief: 'Earn 1 dried briquette.', chapter: 'works', requirement: { kind: 'lifetime', resource: 'briquettes', target: 1 }, reward: { kind: 'production', resource: 'briquettes', seconds: 120, floor: 10 } },
  { id: 'w-first-refined-broth', name: 'Second Pass Accepted', emoji: '🏺', brief: 'Earn 1 refined broth.', chapter: 'works', requirement: { kind: 'lifetime', resource: 'refinedBroth', target: 1 }, reward: { kind: 'production', resource: 'refinedBroth', seconds: 180, floor: 10 } },
  { id: 'w-first-essence', name: 'Essence Entered', emoji: '✨', brief: 'Earn 1 bog essence.', chapter: 'works', requirement: { kind: 'lifetime', resource: 'essence', target: 1 }, reward: { kind: 'production', resource: 'essence', seconds: 240, floor: 10 } },
  { id: 'w-sludge-accounts', name: 'Three Settling Ponds', emoji: '🟤', brief: 'Own 3 sludge settlers.', chapter: 'works', requirement: { kind: 'owned', buildingId: 'sludge-settler', count: 3 }, reward: { kind: 'multiplier', target: 'sludge', factor: 1.2 } },
  { id: 'w-briquette-stack', name: 'Stack the Briquettes', emoji: '🧱', brief: 'Earn 100 total briquettes.', chapter: 'works', requirement: { kind: 'lifetime', resource: 'briquettes', target: 100 }, reward: { kind: 'multiplier', target: 'briquettes', factor: 1.25 } },
  { id: 'w-refined-reserve', name: 'Refined Reserve', emoji: '🏺', brief: 'Earn 100 total refined broth.', chapter: 'works', requirement: { kind: 'lifetime', resource: 'refinedBroth', target: 100 }, reward: { kind: 'multiplier', target: 'refinedBroth', factor: 1.3 } },
  { id: 'w-sediment-settles', name: 'Two Sediment Vaults', emoji: '🪨', brief: 'Own 2 sediment vaults.', chapter: 'works', requirement: { kind: 'owned', buildingId: 'sediment-vault', count: 2 }, reward: { kind: 'production', resource: 'sediment', seconds: 600, floor: 25 } },
  { id: 'w-essence-reserve', name: 'Three Essence Condensers', emoji: '✨', brief: 'Own 3 essence condensers.', chapter: 'works', requirement: { kind: 'owned', buildingId: 'essence-condenser', count: 3 }, reward: { kind: 'multiplier', target: 'essence', factor: 1.4 } },
  { id: 'w-broth-line', name: 'Three Presses Running', emoji: '🫕', brief: 'Own 3 peat presses.', chapter: 'works', requirement: { kind: 'owned', buildingId: 'peat-press', count: 3 }, reward: { kind: 'production', resource: 'broth', seconds: 1200 } },
  { id: 'w-peat-line', name: 'Peat Line at Work', emoji: '🟫', brief: 'Unlock the peat production line.', chapter: 'works', requirement: { kind: 'line', line: 'peat' }, reward: { kind: 'production', resource: 'peat', seconds: 1200 } },
  { id: 'w-refinery-line', name: 'The Refinery Answers', emoji: '🏺', brief: 'Unlock the refined broth line.', chapter: 'works', requirement: { kind: 'line', line: 'refinedBroth' }, reward: { kind: 'production', resource: 'refinedBroth', seconds: 900 } },
  { id: 'w-sediment-line', name: 'A Settled Line', emoji: '🪨', brief: 'Unlock the sediment line.', chapter: 'works', requirement: { kind: 'line', line: 'sediment' }, reward: { kind: 'production', resource: 'sediment', seconds: 900 } },
  { id: 'w-essence-line', name: 'The Last Line', emoji: '✨', brief: 'Unlock the essence line.', chapter: 'works', requirement: { kind: 'line', line: 'essence' }, reward: { kind: 'production', resource: 'essence', seconds: 900 } },
  { id: 'w-chain-rate', name: 'Chain at Full Pressure', emoji: '📈', brief: 'Reach 100 essence per second.', chapter: 'works', requirement: { kind: 'rate', resource: 'essence', perSecond: 100 }, reward: { kind: 'cores', amount: 2 } },
  { id: 'w-celestial-converters', name: 'The Celestial Bench', emoji: '🌠', brief: 'Own 2 celestial alembics.', chapter: 'works', requirement: { kind: 'owned', buildingId: 'celestial-alembic', count: 2 }, reward: { kind: 'multiplier', target: 'essence', factor: 1.5 } },
];

const APPEAL_QUESTS: QuestDef[] = [
  { id: 'a-notice-served', name: 'Notice Served on Sector 4', emoji: '📬', brief: 'McFly & Chronicler LLP serve Sector 4 notice on the Magistrate.', chapter: 'appeals', requirement: { kind: 'charter', count: 20 }, reward: { kind: 'permanent', effect: { kind: 'multiplier', target: 'all', factor: 1.05 } }, persistsThroughPrestige: true },
  { id: 'a-record-opened', name: 'The Record Is Opened', emoji: '📖', brief: 'McFly & Chronicler LLP complete Essence Law before the Magistrate.', chapter: 'appeals', requirement: { kind: 'research', id: 'essence-law' }, reward: { kind: 'permanent', effect: { kind: 'coreGain', factor: 1.1 } }, persistsThroughPrestige: true },
  { id: 'a-essence-exhibit', name: 'Exhibit E: The Essence', emoji: '✨', brief: 'McFly & Chronicler LLP enter 1,000 essence against the Magistrate.', chapter: 'appeals', requirement: { kind: 'lifetime', resource: 'essence', target: 1_000 }, reward: { kind: 'permanent', effect: { kind: 'multiplier', target: 'all', factor: 1.08 } }, persistsThroughPrestige: true },
  { id: 'a-magistrate-deposed', name: 'A Challenge to the Seal', emoji: '⚖️', brief: 'McFly & Chronicler LLP sign 60 terms the Magistrate cannot erase.', chapter: 'appeals', requirement: { kind: 'charter', count: 60 }, reward: { kind: 'permanent', effect: { kind: 'multiplier', target: 'all', factor: 1.1 } }, persistsThroughPrestige: true },
  { id: 'a-final-verdict-filed', name: 'Final Verdict Filed', emoji: '📜', brief: 'McFly & Chronicler LLP file the final verdict against the Magistrate.', chapter: 'appeals', requirement: { kind: 'research', id: 'final-verdict' }, reward: { kind: 'permanent', effect: { kind: 'coreGain', factor: 1.15 } }, persistsThroughPrestige: true },
  { id: 'a-deep-exhibit', name: 'The Deep Exhibit', emoji: '🪨', brief: 'McFly & Chronicler LLP submit 10,000 essence beneath the Magistrate’s seal.', chapter: 'appeals', requirement: { kind: 'lifetime', resource: 'essence', target: 10_000 }, reward: { kind: 'permanent', effect: { kind: 'multiplier', target: 'essence', factor: 1.25 } }, persistsThroughPrestige: true },
  { id: 'a-charter-majority', name: 'Charter Majority', emoji: '💠', brief: 'McFly & Chronicler LLP carry 120 Sector 4 terms past the Magistrate.', chapter: 'appeals', requirement: { kind: 'charter', count: 120 }, reward: { kind: 'permanent', effect: { kind: 'multiplier', target: 'all', factor: 1.12 } }, persistsThroughPrestige: true },
  { id: 'a-llp-brief', name: 'The LLP Brief', emoji: '🖋️', brief: 'McFly & Chronicler LLP place Routine Procurement before the Magistrate.', chapter: 'appeals', requirement: { kind: 'research', id: 'automation-research' }, reward: { kind: 'permanent', effect: { kind: 'offlineRate', add: 0.05 } }, persistsThroughPrestige: true },
  { id: 'a-millionth-drop', name: 'The Millionth Drop', emoji: '✨', brief: 'McFly & Chronicler LLP count 1,000,000 essence in Sector 4.', chapter: 'appeals', requirement: { kind: 'lifetime', resource: 'essence', target: 1_000_000 }, reward: { kind: 'permanent', effect: { kind: 'multiplier', target: 'all', factor: 1.15 } }, persistsThroughPrestige: true },
  { id: 'a-sector-four-settlement', name: 'Sector 4 Settlement', emoji: '⚖️', brief: 'McFly & Chronicler LLP settle Sector 4 with the Magistrate.', chapter: 'appeals', requirement: { kind: 'charter', count: 200 }, reward: { kind: 'permanent', effect: { kind: 'coreGain', factor: 1.25 } }, persistsThroughPrestige: true },
];

/** The authored industrial and late-arc docket chapters. */
export const STORY_QUESTS: QuestDef[] = [...WORKS_QUESTS, ...APPEAL_QUESTS];

const BOUNTY_DEFS: BountyDef[] = [
  { id: 'bounty-peat', name: 'Peat Delivery Order', emoji: '🟫', brief: (n) => `Deliver ${formatBountyNumber(10_000, n)} peat from the upper bog.`, requirement: (n) => ({ kind: 'lifetime', resource: 'peat', target: bountyTarget(10_000, n) }), reward: (n) => ({ kind: 'resource', resource: 'broth', amount: bountyReward(500, n) }) },
  { id: 'bounty-broth', name: 'Broth Transfer', emoji: '🫧', brief: (n) => `Move ${formatBountyNumber(50_000, n)} broth through the line.`, requirement: (n) => ({ kind: 'lifetime', resource: 'broth', target: bountyTarget(50_000, n) }), reward: (n) => ({ kind: 'resource', resource: 'compute', amount: bountyReward(1_000, n) }) },
  { id: 'bounty-sphagnum', name: 'Moss Packing List', emoji: '🌱', brief: (n) => `Pack ${formatBountyNumber(10_000, n)} sphagnum.`, requirement: (n) => ({ kind: 'lifetime', resource: 'sphagnum', target: bountyTarget(10_000, n) }), reward: () => ({ kind: 'multiplier', target: 'sphagnum', factor: 1.5, durationSec: 600 }) },
  { id: 'bounty-methane', name: 'Gas Collection Warrant', emoji: '💨', brief: (n) => `Collect ${formatBountyNumber(5_000, n)} methane.`, requirement: (n) => ({ kind: 'lifetime', resource: 'methane', target: bountyTarget(5_000, n) }), reward: (n) => ({ kind: 'resource', resource: 'broth', amount: bountyReward(2_000, n) }) },
  { id: 'bounty-evidence', name: 'Exhibit Intake', emoji: '📁', brief: (n) => `File ${formatBountyNumber(2_500, n)} evidence.`, requirement: (n) => ({ kind: 'lifetime', resource: 'evidence', target: bountyTarget(2_500, n) }), reward: () => ({ kind: 'multiplier', target: 'evidence', factor: 1.5, durationSec: 600 }) },
  { id: 'bounty-sludge', name: 'Sludge Manifest', emoji: '🟤', brief: (n) => `Account for ${formatBountyNumber(1_000, n)} sludge.`, requirement: (n) => ({ kind: 'lifetime', resource: 'sludge', target: bountyTarget(1_000, n) }), reward: (n) => ({ kind: 'resource', resource: 'briquettes', amount: bountyReward(100, n) }) },
  { id: 'bounty-refined', name: 'Refinery Requisition', emoji: '🏺', brief: (n) => `Produce ${formatBountyNumber(500, n)} refined broth.`, requirement: (n) => ({ kind: 'lifetime', resource: 'refinedBroth', target: bountyTarget(500, n) }), reward: (n) => ({ kind: 'resource', resource: 'sediment', amount: bountyReward(50, n) }) },
  { id: 'bounty-essence', name: 'Essence Affidavit', emoji: '✨', brief: (n) => `Submit ${formatBountyNumber(100, n)} essence.`, requirement: (n) => ({ kind: 'lifetime', resource: 'essence', target: bountyTarget(100, n) }), reward: (n) => ({ kind: 'cores', amount: Math.min(n, BOUNTY_SCALE_CAP) }) },
];

function bountyTarget(base: number, instance: number): number {
  return base * 2.5 ** (Math.min(instance, BOUNTY_SCALE_CAP) - 1);
}

function bountyReward(base: number, instance: number): number {
  return base * 2 ** (Math.min(instance, BOUNTY_SCALE_CAP) - 1);
}

function formatBountyNumber(base: number, instance: number): string {
  return Math.round(bountyTarget(base, instance)).toLocaleString('en-US');
}

/** Repeatable procedural bounty definitions shown in the Docket. */
export const BOUNTIES: BountyDef[] = BOUNTY_DEFS;

/** All authored one-time quests, including the existing four chapters. */
export const ALL_QUESTS: QuestDef[] = [...QUESTS, ...STORY_QUESTS];

function requirementValue(state: GameState, requirement: QuestRequirement): Decimal {
  switch (requirement.kind) {
    case 'lifetime':
      return state.lifetime[requirement.resource];
    case 'clicks':
      return D(state.totalClicks);
    case 'hits':
      return D(state.minigameHits);
    case 'cores':
      return state.wallet.bogCores;
    case 'charter':
      return D(state.charter.length);
    case 'owned':
      return D(state.buildings[requirement.buildingId] ?? 0);
    case 'rate':
      return productionPerSecond(state)[requirement.resource];
    case 'line':
      return lineUnlocked(state, requirement.line) ? D(1) : D(0);
    case 'research':
      return D(state.research.includes(requirement.id) ? 1 : 0);
    case 'upgrade':
      return D(state.upgrades.includes(requirement.id) ? 1 : 0);
    case 'quests':
      return D(requirement.ids.filter((id) => state.quests.claimed.includes(id)).length);
    case 'cooled': {
      const heat = totalHeat(state);
      if (heat.gte(requirement.minHeat) && thermalFactor(state).gte(1)) return D(requirement.minHeat);
      if (heat.lt(requirement.minHeat)) return heat;
      return totalCooling(state).min(requirement.minHeat);
    }
  }
}

function requirementTarget(requirement: QuestRequirement): Decimal {
  switch (requirement.kind) {
    case 'lifetime':
    case 'clicks':
    case 'hits':
    case 'cores':
      return D(requirement.target);
    case 'charter':
      return D(requirement.count);
    case 'owned': return D(requirement.count);
    case 'rate': return D(requirement.perSecond);
    case 'line': return D(1);
    case 'research':
    case 'upgrade': return D(1);
    case 'quests': return D(requirement.ids.length);
    case 'cooled': return D(requirement.minHeat);
  }
}

/** Return current progress, target, and clamped fraction for a quest. */
export function questProgress(
  state: GameState,
  quest: QuestDef,
): { current: Decimal; target: Decimal; fraction: number } {
  const current = requirementValue(state, quest.requirement);
  const target = requirementTarget(quest.requirement);
  return { current, target, fraction: target.lte(0) ? 1 : Math.min(1, current.div(target).toNumber()) };
}

/** Return whether a quest requirement is currently satisfied. */
export function questReady(state: GameState, quest: QuestDef): boolean {
  const progress = questProgress(state, quest);
  return progress.target.lte(0) || progress.current.gte(progress.target);
}

function addResource(state: GameState, resource: EarnedResource, amount: Decimal | number): void {
  const value = D(amount);
  state.wallet[resource] = state.wallet[resource].add(value);
  state.lifetime[resource] = state.lifetime[resource].add(value);
  if (resource === 'compute') state.runCompute = state.runCompute.add(value);
}

function applyReward(state: GameState, questId: string, reward: QuestReward, now: number): void {
  if (reward.kind === 'resource') addResource(state, reward.resource, reward.amount);
  if (reward.kind === 'production') {
    const amount = productionPerSecond(state)[reward.resource].mul(reward.seconds).max(reward.floor ?? 0);
    addResource(state, reward.resource, amount);
  }
  if (reward.kind === 'cores') state.wallet.bogCores = state.wallet.bogCores.add(reward.amount);
  if (reward.kind === 'permanent') state.quests.permanent.push({ questId, effect: reward.effect });
  if (reward.kind === 'multiplier' && reward.durationSec) {
    state.quests.buffs.push({
      questId,
      target: reward.target,
      factor: reward.factor,
      expiresAt: now + reward.durationSec * 1000,
    });
  }
}

/** Apply a ready quest reward once and return its definition reward. */
export function claimQuest(state: GameState, id: string, now = Date.now()): QuestReward | null {
  const quest = ALL_QUESTS.find((candidate) => candidate.id === id);
  if (!quest || state.quests.claimed.includes(id) || !questReady(state, quest)) return null;
  state.quests.claimed.push(id);
  const reward = quest.reward;
  applyReward(state, quest.id, reward, now);
  return reward;
}

/** Return the current one-based bounty instance number. */
export function bountyInstance(state: GameState, id: string): number {
  return (state.quests.bountyCount[id] ?? 0) + 1;
}

/** Capture the lifetime starting point for a bounty instance. */
export function acceptBounty(state: GameState, id: string): void {
  if (state.quests.bountyBase[id] !== undefined) return;
  const bounty = BOUNTIES.find((candidate) => candidate.id === id);
  const requirement = bounty?.requirement(bountyInstance(state, id));
  if (requirement?.kind === 'lifetime') {
    state.quests.bountyBase[id] = state.lifetime[requirement.resource].toString();
  }
}

/** Return progress for a repeatable bounty measured from its accepted snapshot. */
export function bountyProgress(
  state: GameState,
  id: string,
): { current: Decimal; target: Decimal; fraction: number } {
  const bounty = BOUNTIES.find((candidate) => candidate.id === id);
  if (!bounty) return { current: D(0), target: D(1), fraction: 0 };
  const requirement = bounty.requirement(bountyInstance(state, id));
  if (requirement.kind !== 'lifetime') return { current: D(0), target: D(1), fraction: 0 };
  const base = D(state.quests.bountyBase[id] ?? state.lifetime[requirement.resource].toString());
  const current = state.lifetime[requirement.resource].sub(base).max(0);
  const target = D(requirement.target);
  return { current, target, fraction: target.lte(0) ? 1 : Math.min(1, current.div(target).toNumber()) };
}

/** Claim a completed bounty and roll its next instance. */
export function claimBounty(state: GameState, id: string, now = Date.now()): QuestReward | null {
  const bounty = BOUNTIES.find((candidate) => candidate.id === id);
  if (!bounty) return null;
  acceptBounty(state, id);
  const progress = bountyProgress(state, id);
  if (progress.current.lt(progress.target)) return null;
  const instance = bountyInstance(state, id);
  const reward = bounty.reward(instance);
  applyReward(state, id, reward, now);
  state.quests.bountyCount[id] = instance;
  delete state.quests.bountyBase[id];
  acceptBounty(state, id);
  return reward;
}

/** Multiply a production or click target by all active quest effects. */
export function questMultiplier(
  state: GameState,
  target: MultiplierTarget,
  now = Date.now(),
): Decimal {
  let multiplier = D(1);
  for (const id of state.quests.claimed) {
    const quest = ALL_QUESTS.find((candidate) => candidate.id === id);
    const reward = quest?.reward;
    if (reward?.kind === 'multiplier' && !reward.durationSec &&
      (reward.target === target || reward.target === 'all')) {
      if (Number.isFinite(reward.factor) && reward.factor > 0) multiplier = multiplier.mul(reward.factor);
    }
  }
  for (const buff of state.quests.buffs) {
    if (buff.expiresAt > now && (buff.target === target || buff.target === 'all')) {
      if (Number.isFinite(buff.factor) && buff.factor > 0) multiplier = multiplier.mul(buff.factor);
    }
  }
  for (const permanent of state.quests.permanent) {
    const effect = permanent.effect;
    if (effect.kind === 'multiplier' &&
      (effect.target === target || effect.target === 'all') &&
      Number.isFinite(effect.factor) && effect.factor > 0) multiplier = multiplier.mul(effect.factor);
  }
  return multiplier;
}

/** Return the product of permanent quest effects for a Charter effect kind. */
export function questPermanentFactor(state: GameState, kind: 'coreGain'): Decimal {
  let factor = D(1);
  for (const permanent of state.quests.permanent) {
    const effect = permanent.effect;
    if (effect.kind === kind && Number.isFinite(effect.factor) && effect.factor > 0) {
      factor = factor.mul(effect.factor);
    }
  }
  return factor;
}

/** Remove quest buffs whose injected expiry time has passed. */
export function expireBuffs(state: GameState, now = Date.now()): void {
  state.quests.buffs = state.quests.buffs.filter((buff) => buff.expiresAt > now);
}

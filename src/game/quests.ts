import { productionPerSecond, thermalFactor, totalCooling, totalHeat } from './engine';
import type { GameState } from './state';

/** Requirement types used by settlement quests. */
export type QuestRequirement =
  | { kind: 'stat'; stat: 'totalBrothEarned' | 'totalComputeEarned' | 'totalPeatEarned' | 'totalSphagnumEarned' | 'totalMethaneEarned' | 'totalEvidenceEarned' | 'totalClicks' | 'bogCores' | 'minigameHits'; target: number }
  | { kind: 'owned'; buildingId: string; count: number }
  | { kind: 'rate'; resource: EarnedResource; perSecond: number }
  | { kind: 'research'; id: string }
  | { kind: 'upgrade'; id: string }
  | { kind: 'quests'; ids: string[] }
  | { kind: 'cooled'; minHeat: number };

/** Targets that quest multipliers can affect. */
export type MultiplierTarget = EarnedResource | 'click' | 'all';
export type EarnedResource = 'broth' | 'compute' | 'peat' | 'sphagnum' | 'methane' | 'evidence';

/** Effects granted when a settlement quest is claimed. */
export type QuestReward =
  | { kind: 'resource'; resource: EarnedResource; amount: number }
  | { kind: 'production'; resource: EarnedResource; seconds: number; floor?: number }
  | { kind: 'multiplier'; target: MultiplierTarget; factor: number; durationSec?: number }
  | { kind: 'cores'; amount: number };

/** Static settlement quest definition. */
export interface QuestDef {
  id: string;
  name: string;
  emoji: string;
  brief: string;
  chapter: 'discovery' | 'litigation' | 'verdict' | 'keepers';
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

/** Ordered settlement quest definitions shown by the temporary docket UI. */
export const QUESTS: QuestDef[] = [
  { id: 'q-first-scoop', name: 'First Scoop on Record', emoji: '🫧', brief: 'Harvest 10 times.', chapter: 'discovery', requirement: { kind: 'stat', stat: 'totalClicks', target: 10 }, reward: { kind: 'resource', resource: 'broth', amount: 50 } },
  { id: 'q-sanitized-change', name: '$59 Sanitized Change', emoji: '💵', brief: 'Earn 59 total broth.', chapter: 'discovery', requirement: { kind: 'stat', stat: 'totalBrothEarned', target: 59 }, reward: { kind: 'multiplier', target: 'click', factor: 2 } },
  { id: 'q-first-cut', name: 'Cut the First Sod', emoji: '🔪', brief: 'Earn 25 total peat.', chapter: 'discovery', requirement: { kind: 'stat', stat: 'totalPeatEarned', target: 25 }, reward: { kind: 'resource', resource: 'peat', amount: 100 } },
  { id: 'q-green-bed', name: 'Green Bed', emoji: '🌱', brief: 'Earn 50 total sphagnum.', chapter: 'discovery', requirement: { kind: 'stat', stat: 'totalSphagnumEarned', target: 50 }, reward: { kind: 'resource', resource: 'sphagnum', amount: 200 } },
  { id: 'q-serve-nordic', name: 'Serve Burger King Nordic', emoji: '🍔', brief: 'Own 5 Fermentation Vats.', chapter: 'discovery', requirement: { kind: 'owned', buildingId: 'vat', count: 5 }, reward: { kind: 'production', resource: 'broth', seconds: 120, floor: 500 } },
  { id: 'q-boot-racks', name: 'Boot the Racks', emoji: '🖥️', brief: 'Own 3 Server Racks.', chapter: 'discovery', requirement: { kind: 'owned', buildingId: 'rack', count: 3 }, reward: { kind: 'production', resource: 'compute', seconds: 300, floor: 200 } },
  { id: 'q-cool-heads', name: 'Cool Heads', emoji: '❄️', brief: 'Cool at least 100 heat.', chapter: 'discovery', requirement: { kind: 'cooled', minHeat: 100 }, reward: { kind: 'multiplier', target: 'compute', factor: 1.15 } },
  { id: 'q-calibrated', name: 'Calibrated Hands', emoji: '🎯', brief: 'Land 25 calibration hits or full peat cuts.', chapter: 'litigation', requirement: { kind: 'stat', stat: 'minigameHits', target: 25 }, reward: { kind: 'multiplier', target: 'compute', factor: 1.5, durationSec: 600 } },
  { id: 'q-hot-fries', name: '120 kg Hot Fries', emoji: '🍟', brief: 'Buy the Hot Fries upgrade.', chapter: 'litigation', requirement: { kind: 'upgrade', id: 'hot-fries' }, reward: { kind: 'resource', resource: 'peat', amount: 5_000 } },
  { id: 'q-pulley', name: '15% Pulley Equity', emoji: '🔩', brief: 'Buy Pulley Equity.', chapter: 'litigation', requirement: { kind: 'upgrade', id: 'pulley-equity' }, reward: { kind: 'multiplier', target: 'broth', factor: 1.15 } },
  { id: 'q-paper-trail', name: 'Paper Trail', emoji: '📁', brief: 'Earn 500 total evidence.', chapter: 'litigation', requirement: { kind: 'stat', stat: 'totalEvidenceEarned', target: 500 }, reward: { kind: 'multiplier', target: 'evidence', factor: 1.5 } },
  { id: 'q-bog-gas', name: 'Bottled Bog Gas', emoji: '💨', brief: 'Earn 1,000 total methane.', chapter: 'litigation', requirement: { kind: 'stat', stat: 'totalMethaneEarned', target: 1_000 }, reward: { kind: 'multiplier', target: 'methane', factor: 1.25 } },
  { id: 'q-clause', name: 'Strike the 5:00 AM Clause', emoji: '📜', brief: 'Complete the lubrication clause research.', chapter: 'litigation', requirement: { kind: 'research', id: 'lubrication-clause' }, reward: { kind: 'multiplier', target: 'all', factor: 1.1 }, persistsThroughPrestige: true },
  { id: 'q-rate-1k', name: 'Ten Thousand a Second', emoji: '📈', brief: 'Reach 10,000 broth per second.', chapter: 'litigation', requirement: { kind: 'rate', resource: 'broth', perSecond: 10_000 }, reward: { kind: 'production', resource: 'broth', seconds: 600 } },
  { id: 'q-verdict', name: 'Magistrate Reino Rules', emoji: '⚖️', brief: 'Complete the Nordic verdict research.', chapter: 'verdict', requirement: { kind: 'research', id: 'nordic-verdict' }, reward: { kind: 'cores', amount: 1 }, persistsThroughPrestige: true },
  { id: 'q-hyperscale', name: 'Hyperscale the Bog', emoji: '🌐', brief: 'Own a Bog Hyperscaler.', chapter: 'verdict', requirement: { kind: 'owned', buildingId: 'hyperscaler', count: 1 }, reward: { kind: 'multiplier', target: 'all', factor: 1.25 }, persistsThroughPrestige: true },
  { id: 'q-drained', name: 'Bog Reborn', emoji: '♻️', brief: 'Bank one Bog Core.', chapter: 'verdict', requirement: { kind: 'stat', stat: 'bogCores', target: 1 }, reward: { kind: 'multiplier', target: 'all', factor: 2, durationSec: 900 }, persistsThroughPrestige: true },
  { id: 'k-pierre', name: 'Pierre of the Peat', emoji: '🪦', brief: 'Earn 100,000 total peat. Somewhere in the deep cut lies a cutter the bog kept whole; the moss calls him Pierre.', chapter: 'keepers', requirement: { kind: 'stat', stat: 'totalPeatEarned', target: 100_000 }, reward: { kind: 'multiplier', target: 'peat', factor: 1.25 } },
  { id: 'k-mia', name: 'Mia the Patchstep', emoji: '🐾', brief: 'Land 100 calibration hits or full cuts. Mia knows which tussocks hold; every safe path across the mire follows her footprints.', chapter: 'keepers', requirement: { kind: 'stat', stat: 'minigameHits', target: 100 }, reward: { kind: 'multiplier', target: 'click', factor: 1.5 } },
  { id: 'k-shrome', name: 'Shrome, Keeper of the Mycelium', emoji: '🍄', brief: 'Earn 25,000 total sphagnum. Under every green bed runs a single fungal thread, and Shrome tends it.', chapter: 'keepers', requirement: { kind: 'stat', stat: 'totalSphagnumEarned', target: 25_000 }, reward: { kind: 'multiplier', target: 'sphagnum', factor: 1.25 } },
  { id: 'k-samkals', name: 'Samkals, the Sunken Archive', emoji: '🏺', brief: 'Earn 10,000 total evidence. A drowned stone ledger at the bog floor; whatever the peat is told, Samkals remembers.', chapter: 'keepers', requirement: { kind: 'stat', stat: 'totalEvidenceEarned', target: 10_000 }, reward: { kind: 'multiplier', target: 'evidence', factor: 1.25 } },
  { id: 'k-spaced', name: 'Spaced, the Marsh Light', emoji: '🌌', brief: 'Earn 100,000 total methane. The wisp that drifts above the gas pools, always looking up at something the rest of us cannot see.', chapter: 'keepers', requirement: { kind: 'stat', stat: 'totalMethaneEarned', target: 100_000 }, reward: { kind: 'multiplier', target: 'methane', factor: 1.25 } },
  { id: 'k-vwh', name: 'vwh, the Quiet Sluice', emoji: '🚰', brief: 'Bank 3 Bog Cores. Three letters cut into the oldest drainage sill. The gate opens without a sound, and the bog is lower by morning.', chapter: 'keepers', requirement: { kind: 'stat', stat: 'bogCores', target: 3 }, reward: { kind: 'cores', amount: 1 }, persistsThroughPrestige: true },
  { id: 'k-hermano', name: 'Hermano of the Far Bank', emoji: '🤝', brief: 'Reach 1,000,000 broth per second. The cutter across the water who shares his kettle with anyone who wades over.', chapter: 'keepers', requirement: { kind: 'rate', resource: 'broth', perSecond: 1_000_000 }, reward: { kind: 'production', resource: 'broth', seconds: 900, floor: 1_000_000 } },
  { id: 'k-tassie', name: 'Tassie, Devil of the Deep Bog', emoji: '😈', brief: 'Cool at least 50,000 heat. Something burrows under the southern peat and the racks run hot wherever it passes.', chapter: 'keepers', requirement: { kind: 'cooled', minHeat: 50_000 }, reward: { kind: 'multiplier', target: 'compute', factor: 1.25 } },
  { id: 'k-kreatix', name: 'Kreatix, the Bog Wright', emoji: '🔧', brief: 'Own 50 Server Racks. The wright who first hung a rack from a pulley and taught the bog to compute.', chapter: 'keepers', requirement: { kind: 'owned', buildingId: 'rack', count: 50 }, reward: { kind: 'multiplier', target: 'all', factor: 1.1 }, persistsThroughPrestige: true },
  { id: 'k-poke', name: 'Poke, Oracle of the Bog', emoji: '🔮', brief: 'Meet the other nine Keepers. The spirit the bog itself answers to; it speaks in bubbles and every Keeper listens.', chapter: 'keepers', requirement: { kind: 'quests', ids: ['k-pierre','k-mia','k-shrome','k-samkals','k-spaced','k-vwh','k-hermano','k-tassie','k-kreatix'] }, reward: { kind: 'multiplier', target: 'all', factor: 1.2 }, persistsThroughPrestige: true },
];

function requirementValue(state: GameState, requirement: QuestRequirement): number {
  switch (requirement.kind) {
    case 'stat':
      return state[requirement.stat];
    case 'owned':
      return state.buildings[requirement.buildingId] ?? 0;
    case 'rate':
      return productionPerSecond(state)[requirement.resource];
    case 'research':
      return state.research.includes(requirement.id) ? 1 : 0;
    case 'upgrade':
      return state.upgrades.includes(requirement.id) ? 1 : 0;
    case 'quests':
      return requirement.ids.filter((id) => state.quests.claimed.includes(id)).length;
    case 'cooled': {
      const heat = totalHeat(state);
      if (heat >= requirement.minHeat && thermalFactor(state) >= 1) return requirement.minHeat;
      if (heat < requirement.minHeat) return heat;
      return Math.min(requirement.minHeat, totalCooling(state));
    }
  }
}

function requirementTarget(requirement: QuestRequirement): number {
  switch (requirement.kind) {
    case 'stat': return requirement.target;
    case 'owned': return requirement.count;
    case 'rate': return requirement.perSecond;
    case 'research':
    case 'upgrade': return 1;
    case 'quests': return requirement.ids.length;
    case 'cooled': return requirement.minHeat;
  }
}

/** Return current progress, target, and clamped fraction for a quest. */
export function questProgress(
  state: GameState,
  quest: QuestDef,
): { current: number; target: number; fraction: number } {
  const current = requirementValue(state, quest.requirement);
  const target = requirementTarget(quest.requirement);
  return { current, target, fraction: target <= 0 ? 1 : Math.min(1, current / target) };
}

/** Return whether a quest requirement is currently satisfied. */
export function questReady(state: GameState, quest: QuestDef): boolean {
  return questProgress(state, quest).fraction >= 1;
}

function addResource(state: GameState, resource: EarnedResource, amount: number): void {
  state[resource] += amount;
  if (resource === 'broth') state.totalBrothEarned += amount;
  if (resource === 'compute') {
    state.totalComputeEarned += amount;
    state.totalComputeThisRun += amount;
  }
  if (resource === 'peat') state.totalPeatEarned += amount;
  if (resource === 'sphagnum') state.totalSphagnumEarned += amount;
  if (resource === 'methane') state.totalMethaneEarned += amount;
  if (resource === 'evidence') state.totalEvidenceEarned += amount;
}

/** Apply a ready quest reward once and return its definition reward. */
export function claimQuest(state: GameState, id: string, now = Date.now()): QuestReward | null {
  const quest = QUESTS.find((candidate) => candidate.id === id);
  if (!quest || state.quests.claimed.includes(id) || !questReady(state, quest)) return null;
  state.quests.claimed.push(id);
  const reward = quest.reward;
  if (reward.kind === 'resource') addResource(state, reward.resource, reward.amount);
  if (reward.kind === 'production') {
    const amount = Math.max(reward.floor ?? 0, productionPerSecond(state)[reward.resource] * reward.seconds);
    addResource(state, reward.resource, amount);
  }
  if (reward.kind === 'cores') state.bogCores += reward.amount;
  if (reward.kind === 'multiplier') {
    if (reward.durationSec) {
      state.quests.buffs.push({
        questId: quest.id,
        target: reward.target,
        factor: reward.factor,
        expiresAt: now + reward.durationSec * 1000,
      });
    }
  }
  return reward;
}

/** Multiply a production or click target by all active quest effects. */
export function questMultiplier(
  state: GameState,
  target: MultiplierTarget,
  now = Date.now(),
): number {
  let multiplier = 1;
  for (const id of state.quests.claimed) {
    const quest = QUESTS.find((candidate) => candidate.id === id);
    const reward = quest?.reward;
    if (reward?.kind === 'multiplier' && !reward.durationSec &&
      (reward.target === target || reward.target === 'all')) {
      multiplier *= reward.factor;
    }
  }
  for (const buff of state.quests.buffs) {
    if (buff.expiresAt > now && (buff.target === target || buff.target === 'all')) {
      multiplier *= buff.factor;
    }
  }
  return multiplier;
}

/** Remove quest buffs whose injected expiry time has passed. */
export function expireBuffs(state: GameState, now = Date.now()): void {
  state.quests.buffs = state.quests.buffs.filter((buff) => buff.expiresAt > now);
}

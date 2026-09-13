import type { MultiplierTarget } from './quests';
import type { GameState } from './state';

export type CharterEffect =
  | { kind: 'multiplier'; target: MultiplierTarget; factor: number }
  | { kind: 'heat'; factor: number }
  | { kind: 'cooling'; factor: number }
  | { kind: 'researchSpeed'; factor: number }
  | { kind: 'offlineRate'; add: number }
  | { kind: 'clickBrothFraction'; fraction: number }
  | { kind: 'coreGain'; factor: number }
  | { kind: 'startingBroth'; amount: number };

export type CharterBranch = 'seal' | 'roots' | 'kindling' | 'filing';

export const CHARTER_ROOT_ID = 'seal';

export interface CharterNodeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  branch: CharterBranch;
  cost: number;
  requires?: string;
  effects: CharterEffect[];
}

export const CHARTER_BRANCHES: Record<CharterBranch, { name: string; blurb: string }> = {
  seal: { name: 'The Seal', blurb: 'Every term hangs from the Magistrate\'s seal.' },
  roots: { name: 'Roots', blurb: 'What the bog remembers between drainings.' },
  kindling: { name: 'Kindling', blurb: 'Heat, gas, and the racks that run on both.' },
  filing: { name: 'Filing', blurb: 'The court keeps working while you are away.' },
};

export const CHARTER: CharterNodeDef[] = [
  { id: CHARTER_ROOT_ID, name: "Magistrate's Seal", emoji: '💠', description: 'The wax that makes the Drainage Charter binding. Every branch grows from here.', branch: 'seal', cost: 1, effects: [{ kind: 'multiplier', target: 'all', factor: 1.05 }] },
  { id: 'roots-1', name: 'Deep Roots', emoji: '🌿', description: 'The harvesters know where the good peat is now.', branch: 'roots', cost: 1, requires: CHARTER_ROOT_ID, effects: [{ kind: 'multiplier', target: 'broth', factor: 1.25 }] },
  { id: 'roots-2', name: 'Old Growth', emoji: '🪵', description: 'Moss and peat hold the bog together.', branch: 'roots', cost: 2, requires: 'roots-1', effects: [{ kind: 'multiplier', target: 'peat', factor: 1.5 }, { kind: 'multiplier', target: 'sphagnum', factor: 1.5 }] },
  { id: 'roots-3', name: 'Head Start', emoji: '🪣', description: 'A drained bog refills faster than the paperwork says.', branch: 'roots', cost: 2, requires: 'roots-2', effects: [{ kind: 'startingBroth', amount: 10_000 }] },
  { id: 'roots-4', name: 'Bog Memory', emoji: '🧠', description: 'The bog keeps a copy of every useful habit.', branch: 'roots', cost: 4, requires: 'roots-3', effects: [{ kind: 'multiplier', target: 'all', factor: 1.5 }] },
  { id: 'roots-3b', name: 'Moss Ledger', emoji: '🌾', description: 'The moss keeps its own accounts, and they favour us.', branch: 'roots', cost: 3, requires: 'roots-2', effects: [{ kind: 'multiplier', target: 'sphagnum', factor: 2 }] },
  { id: 'kindling-1', name: 'Warm Racks', emoji: '🔥', description: 'The racks waste less heat into the courthouse.', branch: 'kindling', cost: 1, requires: CHARTER_ROOT_ID, effects: [{ kind: 'heat', factor: 0.9 }] },
  { id: 'kindling-2', name: 'Methane Bloom', emoji: '💨', description: 'The gas rises on schedule and pays its share.', branch: 'kindling', cost: 2, requires: 'kindling-1', effects: [{ kind: 'multiplier', target: 'methane', factor: 1.5 }] },
  { id: 'kindling-3', name: 'Quick Study', emoji: '📚', description: 'Research clerks stop losing the docket between pages.', branch: 'kindling', cost: 3, requires: 'kindling-2', effects: [{ kind: 'researchSpeed', factor: 2 }] },
  { id: 'kindling-4', name: 'Overclocked Verdict', emoji: '⚡', description: 'Compute gets the ruling before lunch.', branch: 'kindling', cost: 4, requires: 'kindling-3', effects: [{ kind: 'multiplier', target: 'compute', factor: 2 }] },
  { id: 'kindling-3b', name: 'Flare Discipline', emoji: '🕯️', description: 'The flare stacks burn only what the racks cannot use.', branch: 'kindling', cost: 3, requires: 'kindling-2', effects: [{ kind: 'heat', factor: 0.85 }] },
  { id: 'filing-1', name: "Clerk's Favour", emoji: '🖋️', description: 'Evidence receives the attention it has always deserved.', branch: 'filing', cost: 1, requires: CHARTER_ROOT_ID, effects: [{ kind: 'multiplier', target: 'evidence', factor: 1.5 }] },
  { id: 'filing-2', name: 'Standing Order', emoji: '🕰️', description: 'The court keeps its lamps on after adjournment.', branch: 'filing', cost: 2, requires: 'filing-1', effects: [{ kind: 'offlineRate', add: 0.10 }] },
  { id: 'filing-3', name: 'Pulley Dividend', emoji: '🔩', description: 'Every click carries a little more broth into evidence.', branch: 'filing', cost: 2, requires: 'filing-2', effects: [{ kind: 'clickBrothFraction', fraction: 0.02 }] },
  { id: 'filing-4', name: "Reino's Precedent", emoji: '⚖️', description: 'The Magistrate allows a larger core award.', branch: 'filing', cost: 5, requires: 'filing-3', effects: [{ kind: 'coreGain', factor: 1.5 }] },
  { id: 'filing-5', name: 'Night Clerk', emoji: '🌙', description: 'A clerk stays past adjournment and keeps the ledger moving.', branch: 'filing', cost: 3, requires: 'filing-2', effects: [{ kind: 'offlineRate', add: 0.15 }] },
];

export const CHARTER_BY_ID: Record<string, CharterNodeDef> = Object.fromEntries(
  CHARTER.map((node) => [node.id, node]),
);

export function charterAvailable(state: GameState, node: CharterNodeDef): boolean {
  return !state.charter.includes(node.id) &&
    (!node.requires || state.charter.includes(node.requires)) &&
    state.wallet.bogCores.gte(node.cost);
}

export function buyCharter(state: GameState, id: string): boolean {
  const node = CHARTER_BY_ID[id];
  if (!node || !charterAvailable(state, node)) return false;
  state.wallet.bogCores = state.wallet.bogCores.sub(node.cost);
  state.charter.push(id);
  return true;
}

export function charterEffects(state: GameState): CharterEffect[] {
  return state.charter.flatMap((id) => CHARTER_BY_ID[id]?.effects ?? []);
}

export function charterMultiplier(state: GameState, target: MultiplierTarget): number {
  return charterEffects(state)
    .filter((effect): effect is Extract<CharterEffect, { kind: 'multiplier' }> =>
      effect.kind === 'multiplier' && (effect.target === target || effect.target === 'all'),
    )
    .reduce((product, effect) => product * effect.factor, 1);
}

export function charterFactor(
  state: GameState,
  kind: 'heat' | 'cooling' | 'researchSpeed' | 'coreGain',
): number {
  return charterEffects(state)
    .filter((effect): effect is Extract<CharterEffect, { kind: typeof kind }> => effect.kind === kind)
    .reduce((product, effect) => product * effect.factor, 1);
}

export function charterSum(
  state: GameState,
  kind: 'offlineRate' | 'clickBrothFraction' | 'startingBroth',
): number {
  return charterEffects(state).reduce((sum, effect) => {
    if (effect.kind === kind) {
      return sum + ('add' in effect ? effect.add : 'fraction' in effect ? effect.fraction : effect.amount);
    }
    return sum;
  }, 0);
}

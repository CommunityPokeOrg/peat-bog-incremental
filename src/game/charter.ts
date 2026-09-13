import type { MultiplierTarget } from './quests';
import type { GameState } from './state';
import type { SpendableResource } from './data';

export type CharterEffect =
  | { kind: 'multiplier'; target: MultiplierTarget; factor: number }
  | { kind: 'heat'; factor: number }
  | { kind: 'cooling'; factor: number }
  | { kind: 'researchSpeed'; factor: number }
  | { kind: 'offlineRate'; add: number }
  | { kind: 'offlineCap'; addSeconds: number }
  | { kind: 'offlineMultiplier'; factor: number }
  | { kind: 'clickBrothFraction'; fraction: number }
  | { kind: 'fieldwork'; factor: number }
  | { kind: 'costScale'; line: import('./data').ProductionLine; delta: number }
  | { kind: 'freeBuildings'; buildingId: string; count: number }
  | { kind: 'converterEfficiency'; line: import('./data').ProductionLine; factor: number }
  | { kind: 'byproduct'; line: import('./data').ProductionLine; resource: import('./data').SpendableResource; fraction: number }
  | { kind: 'perQuest'; target: MultiplierTarget; perUnit: number; cap: number }
  | { kind: 'perAchievement'; target: MultiplierTarget; perUnit: number; cap: number }
  | { kind: 'coreGain'; factor: number }
  | { kind: 'startingBroth'; amount: number }
  | { kind: 'starting'; resource: import('./data').SpendableResource; amount: number };

export type CharterBranch = 'seal' | 'roots' | 'kindling' | 'filing'
  | 'hands' | 'engines' | 'lamps' | 'stills' | 'keepers';

export const CHARTER_ROOT_ID = 'seal';

export interface CharterNodeDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  branch: CharterBranch;
  cost: number;
  requires?: string;
  requiresAny?: string[];
  effects: CharterEffect[];
}

export const CHARTER_BRANCHES: Record<CharterBranch, { name: string; blurb: string }> = {
  seal: { name: 'The Seal', blurb: 'Every term hangs from the Magistrate\'s seal.' },
  roots: { name: 'Roots', blurb: 'What the bog remembers between drainings.' },
  kindling: { name: 'Kindling', blurb: 'Heat, gas, and the racks that run on both.' },
  filing: { name: 'Filing', blurb: 'The court keeps working while you are away.' },
  hands: { name: 'Hands', blurb: 'Clicks, fieldwork, and the practical business of moving peat.' },
  engines: { name: 'Engines', blurb: 'Passive production, cooling, and the machinery underneath the docket.' },
  lamps: { name: 'Lamps', blurb: 'The lights that stay on after the cutters go home.' },
  stills: { name: 'Stills', blurb: 'Transmutation, refinement, and useful residue.' },
  keepers: { name: 'Keepers', blurb: 'The people and filings the bog refuses to forget.' },
};

const BASE_CHARTER: CharterNodeDef[] = [
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

const WING_ROMANS = ['I', 'II', 'III', 'IV', 'V', 'VI'] as const;
const WING_SPECS: {
  branch: Exclude<CharterBranch, 'seal'>;
  anchor: string;
  clusters: [string, string, string, string];
  emoji: string;
}[] = [
  { branch: 'roots', anchor: 'roots-4', clusters: ['Living Ledger', 'Tussock Memory', 'Waterlogged Archive', 'Peat Inheritance'], emoji: '🌿' },
  { branch: 'kindling', anchor: 'kindling-4', clusters: ['Gas Jurisprudence', 'Rack Ember', 'Heat Petition', 'Verdict Spark'], emoji: '🔥' },
  { branch: 'filing', anchor: 'filing-4', clusters: ['Night Docket', 'Clerk Circuit', 'Away Record', 'Lamp Continuance'], emoji: '🕯️' },
  { branch: 'hands', anchor: CHARTER_ROOT_ID, clusters: ['Copper Grip', 'Field Rhythm', 'Calibration Palm', 'Click Equity'], emoji: '🖐️' },
  { branch: 'engines', anchor: CHARTER_ROOT_ID, clusters: ['Broth Machinery', 'Cooling Estate', 'Rack Ordinance', 'Production Spine'], emoji: '⚙️' },
  { branch: 'lamps', anchor: CHARTER_ROOT_ID, clusters: ['Midnight Office', 'Moon Ledger', 'Long Watch', 'Closed Hours'], emoji: '🕯️' },
  { branch: 'stills', anchor: CHARTER_ROOT_ID, clusters: ['Sludge Alchemy', 'Refining Bench', 'Sediment Method', 'Essence Practice'], emoji: '⚗️' },
  { branch: 'keepers', anchor: CHARTER_ROOT_ID, clusters: ["Pierre's Furrow", "Shrome's Thread", "Samkals's Shelf", "McFly's Filing"], emoji: '🔮' },
];

function wingEffect(
  branch: Exclude<CharterBranch, 'seal'>,
  cluster: number,
  tier: number,
): CharterEffect {
  const multiplierTargets: MultiplierTarget[] = ['broth', 'peat', 'sphagnum', 'methane', 'compute', 'evidence'];
  const lines = ['broth', 'peat', 'sphagnum', 'methane', 'compute', 'briquettes', 'refinedBroth', 'sediment', 'essence'] as const;
  const factor = [1.25, 1.5, 2, 3, 5, 7][tier];
  if (branch === 'hands') {
    if (cluster === 0) return { kind: 'multiplier', target: 'click', factor };
    if (cluster === 1) return { kind: 'fieldwork', factor };
    if (cluster === 2) return { kind: 'clickBrothFraction', fraction: [0.01, 0.02, 0.03, 0.04, 0.05, 0.06][tier] };
    return { kind: 'multiplier', target: 'click', factor: [1.1, 1.2, 1.3, 1.4, 1.5, 1.6][tier] };
  }
  if (branch === 'engines') {
    if (cluster === 0) return { kind: 'multiplier', target: multiplierTargets[tier % multiplierTargets.length], factor };
    if (cluster === 1) return { kind: 'cooling', factor: [1.05, 1.1, 1.2, 1.3, 1.4, 1.5][tier] };
    if (cluster === 2) return { kind: 'costScale', line: lines[tier % lines.length], delta: -[0.005, 0.008, 0.01, 0.012, 0.015, 0.02][tier] };
    return { kind: 'freeBuildings', buildingId: ['harvester', 'rack', 'chiller', 'kettle', 'copper-still', 'bog-supercomputer'][tier], count: tier + 1 };
  }
  if (branch === 'lamps') {
    if (cluster === 0) return { kind: 'offlineRate', add: [0.01, 0.02, 0.03, 0.04, 0.05, 0.06][tier] };
    if (cluster === 1) return { kind: 'offlineCap', addSeconds: [1800, 3600, 7200, 10_800, 14_400, 21_600][tier] };
    if (cluster === 2) return { kind: 'offlineMultiplier', factor: [1.1, 1.2, 1.3, 1.4, 1.5, 1.6][tier] };
    return { kind: 'offlineRate', add: [0.015, 0.025, 0.035, 0.045, 0.055, 0.065][tier] };
  }
  if (branch === 'stills') {
    if (cluster === 0) return { kind: 'converterEfficiency', line: lines[(tier + 5) % lines.length], factor: [0.98, 0.95, 0.9, 0.85, 0.8, 0.75][tier] };
    if (cluster === 1) {
      const chainTargets: SpendableResource[] = ['sludge', 'briquettes', 'refinedBroth', 'sediment', 'essence', 'broth'];
      return { kind: 'multiplier', target: chainTargets[tier], factor };
    }
    if (cluster === 2) {
      const byproducts: SpendableResource[] = ['sludge', 'sediment', 'briquettes', 'essence', 'refinedBroth', 'sludge'];
      return { kind: 'byproduct', line: lines[(tier + 1) % lines.length], resource: byproducts[tier], fraction: [0.02, 0.03, 0.04, 0.05, 0.06, 0.08][tier] };
    }
    return { kind: 'converterEfficiency', line: lines[(tier + 2) % lines.length], factor: [0.97, 0.94, 0.9, 0.86, 0.82, 0.78][tier] };
  }
  if (branch === 'keepers') {
    if (cluster === 0) return { kind: 'perQuest', target: 'all', perUnit: [0.01, 0.015, 0.02, 0.025, 0.03, 0.035][tier], cap: [1.1, 1.15, 1.2, 1.25, 1.3, 1.4][tier] };
    if (cluster === 1) return { kind: 'perAchievement', target: 'all', perUnit: [0.005, 0.008, 0.01, 0.012, 0.015, 0.02][tier], cap: [1.05, 1.08, 1.12, 1.16, 1.2, 1.3][tier] };
    if (cluster === 2) return { kind: 'researchSpeed', factor: [1.05, 1.1, 1.2, 1.3, 1.4, 1.5][tier] };
    return tier % 2 === 0
      ? { kind: 'starting', resource: 'broth', amount: [100, 250, 500, 1000, 2000, 4000][tier] }
      : { kind: 'coreGain', factor: [1.05, 1.1, 1.15, 1.2, 1.3, 1.4][tier] };
  }
  if (branch === 'roots') return { kind: 'multiplier', target: multiplierTargets[(cluster + tier) % multiplierTargets.length], factor };
  if (branch === 'kindling') return cluster === 0
    ? { kind: 'heat', factor: [0.98, 0.96, 0.94, 0.92, 0.9, 0.88][tier] }
    : cluster === 1
      ? { kind: 'multiplier', target: 'methane', factor }
      : cluster === 2
        ? { kind: 'researchSpeed', factor: [1.05, 1.1, 1.2, 1.3, 1.4, 1.5][tier] }
        : { kind: 'multiplier', target: 'compute', factor };
  return cluster === 0
    ? { kind: 'offlineRate', add: [0.01, 0.02, 0.03, 0.04, 0.05, 0.06][tier] }
    : cluster === 1
      ? { kind: 'clickBrothFraction', fraction: [0.01, 0.02, 0.03, 0.04, 0.05, 0.06][tier] }
      : cluster === 2
        ? { kind: 'coreGain', factor: [1.05, 1.1, 1.15, 1.2, 1.3, 1.4][tier] }
        : { kind: 'multiplier', target: 'evidence', factor };
}

function makeWing(spec: (typeof WING_SPECS)[number]): CharterNodeDef[] {
  const nodes: CharterNodeDef[] = [];
  for (let cluster = 0; cluster < spec.clusters.length; cluster += 1) {
    const clusterName = spec.clusters[cluster];
    let previous = spec.anchor;
    const spine: CharterNodeDef[] = [];
    for (let tier = 0; tier < WING_ROMANS.length; tier += 1) {
      const id = `${spec.branch}-${cluster + 1}-${tier + 1}`;
      const node: CharterNodeDef = {
        id,
        name: `${clusterName} ${WING_ROMANS[tier]}`,
        emoji: spec.emoji,
        description: `${clusterName} tier ${WING_ROMANS[tier]} puts another careful hand on the bog's machinery.`,
        branch: spec.branch,
        cost: Math.round([2, 4, 6, 8][cluster] * 1.6 ** tier),
        requires: previous,
        effects: [wingEffect(spec.branch, cluster, tier)],
      };
      nodes.push(node);
      spine.push(node);
      previous = id;
    }
    const leaves = cluster === 0 ? ['Annex', 'Side Letter', 'Footnote'] : ['Annex', 'Side Letter'];
    for (const leaf of leaves) {
      const node: CharterNodeDef = {
        id: `${spec.branch}-${cluster + 1}-${leaf.toLowerCase().replace(' ', '-')}`,
        name: `${clusterName} ${leaf}`,
        emoji: spec.emoji,
        description: `${clusterName} ${leaf.toLowerCase()} records the useful exception nobody filed on time.`,
        branch: spec.branch,
        cost: 3 + cluster * 2,
        requires: spine[spine.length - 1].id,
        effects: [wingEffect(spec.branch, cluster, Math.min(5, leaf === 'Annex' ? 2 : 3))],
      };
      nodes.push(node);
    }
  }
  const final = nodes[nodes.length - 1].id;
  const cross = spec.branch === 'hands' ? 'roots-1' : spec.branch === 'engines' ? 'kindling-1' : 'hands-1-1';
  for (let index = 0; index < 3; index += 1) {
    nodes.push({
      id: `${spec.branch}-capstone-${index + 1}`,
      name: `${spec.clusters[index]} Capstone`,
      emoji: spec.emoji,
      description: `${spec.clusters[index]} closes the ${spec.branch} wing with a ruling nobody can appeal.`,
      branch: spec.branch,
      cost: 650 + index * 75,
      requires: final,
      requiresAny: [cross],
      effects: [wingEffect(spec.branch, index, 5)],
    });
  }
  return nodes;
}

const EXPANDED_CHARTER = WING_SPECS.flatMap(makeWing);
export const CHARTER: CharterNodeDef[] = [...BASE_CHARTER, ...EXPANDED_CHARTER];

export const CHARTER_BY_ID: Record<string, CharterNodeDef> = Object.fromEntries(
  CHARTER.map((node) => [node.id, node]),
);

export function charterAvailable(state: GameState, node: CharterNodeDef): boolean {
  return !state.charter.includes(node.id) &&
    (!node.requires || state.charter.includes(node.requires)) &&
    (!node.requiresAny || node.requiresAny.some((id) => state.charter.includes(id))) &&
    state.wallet.bogCores.gte(node.cost);
}

export function buyCharter(state: GameState, id: string): boolean {
  const node = CHARTER_BY_ID[id];
  if (!node || !charterAvailable(state, node)) return false;
  state.wallet.bogCores = state.wallet.bogCores.sub(node.cost);
  state.charter.push(id);
  return true;
}

/** Return the active effects granted by every signed Charter term. */
export function charterEffects(state: GameState): CharterEffect[] {
  return state.charter.flatMap((id) => CHARTER_BY_ID[id]?.effects ?? []);
}

export function charterMultiplier(state: GameState, target: MultiplierTarget): number {
  const effects = charterEffects(state);
  const direct = effects
    .filter((effect): effect is Extract<CharterEffect, { kind: 'multiplier' }> =>
      effect.kind === 'multiplier' && (effect.target === target || effect.target === 'all'),
    )
    .reduce((product, effect) => product * effect.factor, 1);
  const questCount = state.quests.claimed.length;
  const achievementCount = state.achievements.length;
  const scaled = effects.reduce((product, effect) => {
    if (effect.kind === 'perQuest' && (effect.target === target || effect.target === 'all')) {
      return product * Math.min(effect.cap, 1 + questCount * effect.perUnit);
    }
    if (effect.kind === 'perAchievement' && (effect.target === target || effect.target === 'all')) {
      return product * Math.min(effect.cap, 1 + achievementCount * effect.perUnit);
    }
    return product;
  }, 1);
  return direct * scaled;
}

export function charterFactor(
  state: GameState,
  kind: 'heat' | 'cooling' | 'researchSpeed' | 'coreGain' | 'fieldwork',
): number {
  return charterEffects(state)
    .filter((effect): effect is Extract<CharterEffect, { kind: typeof kind }> => effect.kind === kind)
    .reduce((product, effect) => product * effect.factor, 1);
}

export function charterSum(
  state: GameState,
  kind: 'offlineRate' | 'clickBrothFraction' | 'startingBroth' | 'offlineCap',
): number {
  return charterEffects(state).reduce((sum, effect) => {
    if (effect.kind === kind) {
      if ('add' in effect) return sum + effect.add;
      if ('addSeconds' in effect) return sum + effect.addSeconds;
      if ('fraction' in effect) return sum + effect.fraction;
      return sum + effect.amount;
    }
    return sum;
  }, 0);
}

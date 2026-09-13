import {
  ACHIEVEMENTS,
  BUILDING_BY_ID,
  BUILDINGS,
  COST_SCALE,
  RESEARCH_BY_ID,
  UPGRADE_BY_ID,
  type BuildingDef,
  type ResourceCost,
  type SpendableResource,
  type UpgradeDef,
} from './data';
import type { GameState } from './state';
import { QUESTS, expireBuffs, questMultiplier } from './quests';
import { CHARTER, charterFactor, charterMultiplier, charterSum } from './charter';

export const SPENDABLE_RESOURCES: SpendableResource[] = ['broth', 'peat', 'sphagnum', 'methane', 'compute', 'evidence'];
/** Maximum number of research items that may be queued at once. */
export const MAX_RESEARCH_QUEUE = 3;

export function buildingCost(def: BuildingDef, owned: number): ResourceCost {
  const factor = Math.pow(COST_SCALE, owned);
  const out: ResourceCost = {};
  for (const resource of SPENDABLE_RESOURCES) {
    if (def.baseCost[resource] !== undefined) out[resource] = def.baseCost[resource]! * factor;
  }
  return out;
}

/** Total cost of buying `qty` units starting at `owned`. */
export function bulkCost(def: BuildingDef, owned: number, qty: number): ResourceCost {
  const geom = (Math.pow(COST_SCALE, qty) - 1) / (COST_SCALE - 1);
  const base = buildingCost(def, owned);
  const out: ResourceCost = {};
  for (const resource of SPENDABLE_RESOURCES) {
    if (base[resource] !== undefined) out[resource] = base[resource]! * geom;
  }
  return out;
}

/** Max quantity affordable with current resources. */
export function maxAffordable(def: BuildingDef, owned: number, state: GameState): number {
  let qty = 0;
  // Each resource budget contributes a bound; take the minimum across costs.
  for (const key of SPENDABLE_RESOURCES) {
    const base = def.baseCost[key];
    if (base === undefined) continue;
    const price = base * Math.pow(COST_SCALE, owned);
    const budget = state[key];
    if (price <= 0) continue;
    const n = Math.floor(
      Math.log((budget * (COST_SCALE - 1)) / price + 1) / Math.log(COST_SCALE),
    );
    qty = qty === 0 ? n : Math.min(qty, n);
  }
  return qty;
}

export function canAfford(state: GameState, cost: ResourceCost): boolean {
  return SPENDABLE_RESOURCES.every((resource) =>
    cost[resource] === undefined || state[resource] >= cost[resource]!,
  );
}

/** Subtract a generic resource cost from the state wallet. */
export function payCost(state: GameState, cost: ResourceCost): void {
  for (const resource of SPENDABLE_RESOURCES) {
    if (cost[resource] !== undefined) state[resource] -= cost[resource]!;
  }
}

// --- multipliers -----------------------------------------------------------

/** +5% per Bog Core, +1% per achievement. */
export function globalMultiplier(state: GameState): number {
  return 1 + state.bogCores * 0.05 + state.achievements.length * 0.01;
}

export function buildingMultiplier(state: GameState, buildingId: string): number {
  return 2 ** state.upgrades.filter((id) => {
    const upgrade = UPGRADE_BY_ID[id];
    return upgrade?.kind === 'building' && upgrade.buildingId === buildingId;
  }).length;
}

export function totalHeat(state: GameState): number {
  let heatMult = 1;
  if (state.research.includes('liquid-immersion')) heatMult *= 0.8;
  if (state.research.includes('lubrication-clause')) heatMult *= 0.85;
  for (const id of state.upgrades) {
    const upgrade = UPGRADE_BY_ID[id];
    if (upgrade?.kind === 'thermal' && upgrade.heatMultiplier) {
      heatMult *= upgrade.heatMultiplier;
    }
  }
  let heat = 0;
  for (const b of BUILDINGS) {
    if (b.heat) heat += (state.buildings[b.id] ?? 0) * b.heat;
  }
  return heat * heatMult * charterFactor(state, 'heat');
}

export function totalCooling(state: GameState): number {
  let coolMult = state.research.includes('thermal-modelling') ? 1.25 : 1;
  for (const id of state.upgrades) {
    const upgrade = UPGRADE_BY_ID[id];
    if (upgrade?.kind === 'thermal' && upgrade.coolingMultiplier) {
      coolMult *= upgrade.coolingMultiplier;
    }
  }
  let cooling = 0;
  for (const b of BUILDINGS) {
    if (b.cooling) cooling += (state.buildings[b.id] ?? 0) * b.cooling;
  }
  return cooling * coolMult * charterFactor(state, 'cooling');
}

/** Fraction of full speed the racks run at: min(1, cooling/heat). */
export function thermalFactor(state: GameState): number {
  const heat = totalHeat(state);
  if (heat <= 0) return 1;
  return Math.min(1, totalCooling(state) / heat);
}

/** Current production rates for all generated resources. */
export interface Rates {
  broth: number;
  peat: number;
  sphagnum: number;
  methane: number;
  compute: number;
  evidence: number;
}

export function productionPerSecond(state: GameState, now = Date.now()): Rates {
  const global = globalMultiplier(state);
  const brothMult =
    global *
    (state.research.includes('broth-distillation') ? 1.5 : 1) *
    (state.research.includes('broth-standard') ? 1.25 : 1) *
    (state.research.includes('nordic-verdict') ? 1.5 : 1) *
    (state.research.includes('quantum-peat') ? 2 : 1);
  const computeMult =
    global *
    (state.research.includes('edge-caching') ? 1.5 : 1) *
    (state.research.includes('nordic-verdict') ? 1.5 : 1) *
    (state.research.includes('quantum-peat') ? 2 : 1);

  let broth = 0;
  let compute = 0;
  let peat = 0;
  let sphagnum = 0;
  let methane = 0;
  let evidence = 0;
  for (const b of BUILDINGS) {
    const owned = state.buildings[b.id] ?? 0;
    if (!owned) continue;
    const mult = buildingMultiplier(state, b.id);
    if (b.brothPerSecond) broth += owned * b.brothPerSecond * mult;
    if (b.computePerSecond) compute += owned * b.computePerSecond * mult;
    if (b.peatPerSecond) peat += owned * b.peatPerSecond * mult;
    if (b.sphagnumPerSecond) sphagnum += owned * b.sphagnumPerSecond * mult;
    if (b.methanePerSecond) methane += owned * b.methanePerSecond * mult;
    if (b.evidencePerSecond) evidence += owned * b.evidencePerSecond * mult;
  }
  const resourceMult = (resource: keyof Rates): number => {
    const charter = charterMultiplier(state, resource as 'broth' | 'peat' | 'sphagnum' | 'methane' | 'compute' | 'evidence');
    const upgrades = state.upgrades.reduce((product, id) => {
      const upgrade = UPGRADE_BY_ID[id];
      return upgrade?.kind === 'resource' && upgrade.resourceMultiplier?.resource === resource
        ? product * upgrade.resourceMultiplier.factor
        : product;
    }, 1);
    return charter * upgrades;
  };
  return {
    broth: broth * brothMult * resourceMult('broth') * questMultiplier(state, 'broth', now),
    peat: peat * global * resourceMult('peat') * questMultiplier(state, 'peat', now),
    sphagnum: sphagnum * global * resourceMult('sphagnum') * questMultiplier(state, 'sphagnum', now),
    methane: methane * global * resourceMult('methane') * questMultiplier(state, 'methane', now),
    compute: compute * computeMult * thermalFactor(state) * resourceMult('compute') * questMultiplier(state, 'compute', now),
    evidence: evidence * global * resourceMult('evidence') * questMultiplier(state, 'evidence', now),
  };
}

export function clickPower(state: GameState, now = Date.now()): number {
  let power = 1;
  let brothFraction = 0;
  for (const id of state.upgrades) {
    const u = UPGRADE_BY_ID[id];
    if (!u || u.kind !== 'click') continue;
    if (u.clickMultiplier) power *= u.clickMultiplier;
    if (u.clickBrothFraction) brothFraction += u.clickBrothFraction;
  }
  brothFraction += charterSum(state, 'clickBrothFraction');
  power += productionPerSecond(state, now).broth * brothFraction;
  return power * globalMultiplier(state) * charterMultiplier(state, 'click') * questMultiplier(state, 'click', now);
}

// --- actions ----------------------------------------------------------------

/** Advance the simulation by dtSeconds (the rAF loop clamps dt to ≤1s per frame). */
export function tick(state: GameState, dtSeconds: number, now = Date.now()): GameState {
  if (dtSeconds <= 0) return state;
  expireBuffs(state, now);
  advanceResearch(state, dtSeconds * charterFactor(state, 'researchSpeed'));
  const dt = dtSeconds;
  const rates = productionPerSecond(state, now);
  const gains = {
    broth: rates.broth * dt,
    compute: rates.compute * dt,
    peat: rates.peat * dt,
    sphagnum: rates.sphagnum * dt,
    methane: rates.methane * dt,
    evidence: rates.evidence * dt,
  };
  state.broth += gains.broth;
  state.compute += gains.compute;
  state.peat += gains.peat;
  state.sphagnum += gains.sphagnum;
  state.methane += gains.methane;
  state.evidence += gains.evidence;
  state.totalBrothEarned += gains.broth;
  state.totalComputeEarned += gains.compute;
  state.totalPeatEarned += gains.peat;
  state.totalSphagnumEarned += gains.sphagnum;
  state.totalMethaneEarned += gains.methane;
  state.totalEvidenceEarned += gains.evidence;
  state.totalComputeThisRun += gains.compute;
  return state;
}

export function click(state: GameState): number {
  const gain = clickPower(state);
  state.broth += gain;
  state.totalBrothEarned += gain;
  state.totalClicks += 1;
  return gain;
}

export function buyBuilding(state: GameState, id: string, qty: number): boolean {
  const def = BUILDING_BY_ID[id];
  if (!def || qty <= 0 || !buildingVisible(state, def)) return false;
  const owned = state.buildings[id] ?? 0;
  const cost = bulkCost(def, owned, qty);
  if (!canAfford(state, cost)) return false;
  payCost(state, cost);
  state.buildings[id] = owned + qty;
  return true;
}

export function upgradeVisible(state: GameState, u: UpgradeDef): boolean {
  if (state.upgrades.includes(u.id)) return true;
  if (u.requires?.length) {
    return u.requires.every(
      ({ buildingId, count }) => (state.buildings[buildingId] ?? 0) >= count,
    );
  }
  return SPENDABLE_RESOURCES.every((resource) => {
    const cost = u.cost[resource];
    if (cost === undefined) return true;
    const earned = resource === 'broth'
      ? state.totalBrothEarned
      : resource === 'peat'
        ? state.totalPeatEarned
        : resource === 'sphagnum'
          ? state.totalSphagnumEarned
          : resource === 'methane'
            ? state.totalMethaneEarned
            : resource === 'compute'
              ? state.totalComputeEarned
              : state.totalEvidenceEarned;
    return earned >= cost * 0.1;
  });
}

export function buildingVisible(state: GameState, def: BuildingDef): boolean {
  return !def.unlock || state.revealed.includes(def.id);
}

export function revealBuildings(state: GameState): string[] {
  const rates = productionPerSecond(state);
  const newlyRevealed: string[] = [];
  for (const def of BUILDINGS) {
    if (!def.unlock || state.revealed.includes(def.id)) continue;
    const brothReady =
      def.unlock.brothPerSecond === undefined ||
      rates.broth >= def.unlock.brothPerSecond;
    const computeReady =
      def.unlock.computePerSecond === undefined ||
      rates.compute >= def.unlock.computePerSecond;
    const peatReady =
      def.unlock.peatPerSecond === undefined ||
      rates.peat >= def.unlock.peatPerSecond;
    const sphagnumReady =
      def.unlock.sphagnumPerSecond === undefined ||
      rates.sphagnum >= def.unlock.sphagnumPerSecond;
    const methaneReady =
      def.unlock.methanePerSecond === undefined ||
      rates.methane >= def.unlock.methanePerSecond;
    if (brothReady && computeReady && peatReady && sphagnumReady && methaneReady) {
      state.revealed.push(def.id);
      newlyRevealed.push(def.id);
    }
  }
  return newlyRevealed;
}

export function buyUpgrade(state: GameState, id: string): boolean {
  const def = UPGRADE_BY_ID[id];
  if (!def || state.upgrades.includes(id) || !upgradeVisible(state, def)) return false;
  if (!canAfford(state, def.cost)) return false;
  payCost(state, def.cost);
  state.upgrades.push(id);
  return true;
}

export function buyResearch(state: GameState, id: string): boolean {
  const def = RESEARCH_BY_ID[id];
  if (!def || state.research.includes(id) ||
    state.researchQueue.some((entry) => entry.id === id) ||
    state.researchQueue.length >= MAX_RESEARCH_QUEUE) return false;
  if (!canAfford(state, def.cost)) return false;
  payCost(state, def.cost);
  state.researchQueue.push({ id, remaining: def.durationSec });
  return true;
}

/** Cancel queued research and refund its full cost. */
export function cancelResearch(state: GameState, id: string): boolean {
  const index = state.researchQueue.findIndex((entry) => entry.id === id);
  if (index < 0) return false;
  state.researchQueue.splice(index, 1);
  const def = RESEARCH_BY_ID[id];
  if (def) {
    for (const resource of SPENDABLE_RESOURCES) {
      if (def.cost[resource] !== undefined) state[resource] += def.cost[resource]!;
    }
  }
  return true;
}

/** Return queued research progress, or null for research not in the queue. */
export function researchProgress(
  state: GameState,
  id: string,
): { fraction: number; remaining: number } | null {
  const entry = state.researchQueue.find((item) => item.id === id);
  if (!entry) return null;
  const duration = RESEARCH_BY_ID[id]?.durationSec ?? entry.remaining;
  return {
    fraction: Math.max(0, Math.min(1, 1 - entry.remaining / duration)),
    remaining: entry.remaining,
  };
}

/** Advance queued research in order and return ids completed during the advance. */
export function advanceResearch(state: GameState, seconds: number): string[] {
  let remaining = Math.max(0, seconds);
  const completed: string[] = [];
  while (remaining > 0 && state.researchQueue.length > 0) {
    const head = state.researchQueue[0];
    if (head.remaining > remaining) {
      head.remaining -= remaining;
      remaining = 0;
      break;
    }
    remaining -= head.remaining;
    state.researchQueue.shift();
    if (!state.research.includes(head.id)) state.research.push(head.id);
    completed.push(head.id);
  }
  return completed;
}

// --- prestige ---------------------------------------------------------------

export const PRESTIGE_THRESHOLD = 1_000_000;

export function prestigeGain(state: GameState): number {
  return Math.floor(Math.sqrt(state.totalComputeThisRun / PRESTIGE_THRESHOLD) * charterFactor(state, 'coreGain'));
}

export function canPrestige(state: GameState): boolean {
  return prestigeGain(state) > 0;
}

/** Drain the bog: bank Bog Cores, reset the run, keep achievements/cores/lifetime totals. */
export function prestige(state: GameState): number {
  const gain = prestigeGain(state);
  if (gain <= 0) return 0;
  state.bogCores += gain;
  state.broth = 0;
  state.compute = 0;
  state.peat = 0;
  state.sphagnum = 0;
  state.methane = 0;
  state.evidence = 0;
  state.totalComputeThisRun = 0;
  state.calibrationStreak = 0;
  state.calibrationTarget = 0.5;
  state.buildings = {};
  state.revealed = [];
  state.upgrades = [];
  state.research = [];
  state.researchQueue = [];
  state.quests.claimed = state.quests.claimed.filter((id) =>
    QUESTS.find((quest) => quest.id === id)?.persistsThroughPrestige === true,
  );
  state.quests.buffs = [];
  state.broth = charterSum(state, 'startingBroth');
  return gain;
}

// --- achievements -------------------------------------------------------------

/** Unlock any newly-earned achievements; returns the newly unlocked ids. */
export function checkAchievements(state: GameState): string[] {
  const owned = (id: string) => state.buildings[id] ?? 0;
  const has = (id: string) => state.achievements.includes(id);
  const checks: Record<string, boolean> = {
    'click-1': state.totalClicks >= 1,
    'debt-free': state.totalBrothEarned >= 59,
    'click-100': state.totalClicks >= 100,
    'click-1000': state.totalClicks >= 1000,
    'broth-1k': state.totalBrothEarned >= 1_000,
    'broth-1m': state.totalBrothEarned >= 1_000_000,
    'broth-1b': state.totalBrothEarned >= 1_000_000_000,
    'first-rack': owned('rack') >= 1,
    'chiller-10': owned('chiller') >= 10,
    'chiller-50': owned('chiller') >= 50,
    'first-compute': state.totalComputeEarned >= 1,
    'compute-1m': state.totalComputeEarned >= 1_000_000,
    'full-cool': totalHeat(state) >= 100 && thermalFactor(state) >= 1,
    'prestige-1': state.bogCores >= 1,
    'cores-10': state.bogCores >= 10,
    'harvester-100': owned('harvester') >= 100,
    hyperscaler: owned('hyperscaler') >= 1,
    'hot-fries': state.upgrades.includes('hot-fries'),
    'pulley-equity': state.upgrades.includes('pulley-equity'),
    'clause-struck': state.research.includes('lubrication-clause'),
    'reino-verdict': state.research.includes('nordic-verdict'),
    'moss-1k': state.totalSphagnumEarned >= 1_000,
    'methane-1k': state.totalMethaneEarned >= 1_000,
    'charter-1': state.charter.length >= 1,
    'charter-all': CHARTER.every((node) => state.charter.includes(node.id)),
    'keepers-all': QUESTS.filter((quest) => quest.chapter === 'keepers')
      .every((quest) => state.quests.claimed.includes(quest.id)),
    'relics-4': ['pierre-spade', 'shrome-lantern', 'samkals-ledger', 'kreatix-gauge']
      .every((id) => state.upgrades.includes(id)),
  };
  const newly: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!has(a.id) && checks[a.id]) {
      state.achievements.push(a.id);
      newly.push(a.id);
    }
  }
  return newly;
}

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
import { D, Decimal, safe } from './decimal';
import { NIGHT_WATCH_MAX_LEVEL, type GameState } from './state';
import { QUESTS, expireBuffs, questMultiplier } from './quests';
import { CHARTER, charterFactor, charterMultiplier, charterSum } from './charter';

export const SPENDABLE_RESOURCES: SpendableResource[] = ['broth', 'peat', 'sphagnum', 'methane', 'compute', 'evidence'];
/** Maximum number of research items that may be queued at once. */
export const MAX_RESEARCH_QUEUE = 3;

export function buildingCost(def: BuildingDef, owned: number): ResourceCost {
  const factor = Decimal.pow(COST_SCALE, owned);
  const out: ResourceCost = {};
  for (const resource of SPENDABLE_RESOURCES) {
    if (def.baseCost[resource] !== undefined) out[resource] = D(def.baseCost[resource]!).mul(factor);
  }
  return out;
}

/** Total cost of buying `qty` units starting at `owned`. */
export function bulkCost(def: BuildingDef, owned: number, qty: number): ResourceCost {
  const geom = qty === 1 ? D(1) : Decimal.pow(COST_SCALE, qty).sub(1).div(COST_SCALE - 1);
  const base = buildingCost(def, owned);
  const out: ResourceCost = {};
  for (const resource of SPENDABLE_RESOURCES) {
    if (base[resource] !== undefined) out[resource] = base[resource]!.mul(geom);
  }
  return out;
}

/** Max quantity affordable with current resources. */
export function maxAffordable(def: BuildingDef, owned: number, state: GameState): number {
  let qty: number | null = null;
  for (const resource of SPENDABLE_RESOURCES) {
    const base = def.baseCost[resource];
    if (base === undefined) continue;
    const budget = state[resource];
    if (budget.lte(0)) return 0;
    const price = D(base).mul(Decimal.pow(COST_SCALE, owned));
    const n = Math.floor(
      budget.mul(COST_SCALE - 1).div(price).add(1).log10() / Math.log10(COST_SCALE),
    );
    qty = qty === null ? Math.max(0, n) : Math.min(qty, Math.max(0, n));
  }
  return qty ?? 0;
}

export function canAfford(state: GameState, cost: ResourceCost | Partial<Record<SpendableResource, number>>): boolean {
  return SPENDABLE_RESOURCES.every((resource) =>
    cost[resource] === undefined || state[resource].gte(D(cost[resource]!)),
  );
}

/** Subtract a generic resource cost from the state wallet. */
export function payCost(state: GameState, cost: ResourceCost | Partial<Record<SpendableResource, number>>): void {
  for (const resource of SPENDABLE_RESOURCES) {
    if (cost[resource] !== undefined) state[resource] = state[resource].sub(D(cost[resource]!));
  }
}

export function nightWatchCost(level: number): ResourceCost {
  return { broth: D(Math.round(2_500 * 1.9 ** level)) };
}

export function buyNightWatch(state: GameState): boolean {
  if (state.nightWatch >= NIGHT_WATCH_MAX_LEVEL) return false;
  const cost = nightWatchCost(state.nightWatch);
  if (!canAfford(state, cost)) return false;
  payCost(state, cost);
  state.nightWatch += 1;
  return true;
}

/** +5% per Bog Core, +1% per achievement. */
export function globalMultiplier(state: GameState): Decimal {
  return D(1).add(state.bogCores.mul(0.05)).add(state.achievements.length * 0.01);
}

export function buildingMultiplier(state: GameState, buildingId: string): number {
  return 2 ** state.upgrades.filter((id) => {
    const upgrade = UPGRADE_BY_ID[id];
    return upgrade?.kind === 'building' && upgrade.buildingId === buildingId;
  }).length;
}

export function totalHeat(state: GameState): Decimal {
  let heatMult = 1;
  if (state.research.includes('liquid-immersion')) heatMult *= 0.8;
  if (state.research.includes('lubrication-clause')) heatMult *= 0.85;
  for (const id of state.upgrades) {
    const upgrade = UPGRADE_BY_ID[id];
    if (upgrade?.kind === 'thermal' && upgrade.heatMultiplier) heatMult *= upgrade.heatMultiplier;
  }
  let heat = D(0);
  for (const b of BUILDINGS) {
    if (b.heat) heat = heat.add(D(b.heat).mul(state.buildings[b.id] ?? 0));
  }
  return heat.mul(heatMult).mul(charterFactor(state, 'heat'));
}

export function totalCooling(state: GameState): Decimal {
  let coolMult = state.research.includes('thermal-modelling') ? 1.25 : 1;
  for (const id of state.upgrades) {
    const upgrade = UPGRADE_BY_ID[id];
    if (upgrade?.kind === 'thermal' && upgrade.coolingMultiplier) coolMult *= upgrade.coolingMultiplier;
  }
  let cooling = D(0);
  for (const b of BUILDINGS) {
    if (b.cooling) cooling = cooling.add(D(b.cooling).mul(state.buildings[b.id] ?? 0));
  }
  return cooling.mul(coolMult).mul(charterFactor(state, 'cooling'));
}

/** Fraction of full speed the racks run at: min(1, cooling/heat). */
export function thermalFactor(state: GameState): Decimal {
  const heat = totalHeat(state);
  if (heat.lte(0)) return D(1);
  return totalCooling(state).div(heat).min(1);
}

/** Current production rates for all generated resources. */
export interface Rates {
  broth: Decimal;
  peat: Decimal;
  sphagnum: Decimal;
  methane: Decimal;
  compute: Decimal;
  evidence: Decimal;
}

export function productionPerSecond(state: GameState, now = Date.now()): Rates {
  const global = globalMultiplier(state);
  const brothMult = global
    .mul(state.research.includes('broth-distillation') ? 1.5 : 1)
    .mul(state.research.includes('broth-standard') ? 1.25 : 1)
    .mul(state.research.includes('nordic-verdict') ? 1.5 : 1)
    .mul(state.research.includes('quantum-peat') ? 2 : 1);
  const computeMult = global
    .mul(state.research.includes('edge-caching') ? 1.5 : 1)
    .mul(state.research.includes('nordic-verdict') ? 1.5 : 1)
    .mul(state.research.includes('quantum-peat') ? 2 : 1);
  const totals: Rates = {
    broth: D(0),
    compute: D(0),
    peat: D(0),
    sphagnum: D(0),
    methane: D(0),
    evidence: D(0),
  };
  for (const b of BUILDINGS) {
    const owned = state.buildings[b.id] ?? 0;
    if (!owned) continue;
    const mult = buildingMultiplier(state, b.id);
    if (b.brothPerSecond) totals.broth = totals.broth.add(D(b.brothPerSecond).mul(owned).mul(mult));
    if (b.computePerSecond) totals.compute = totals.compute.add(D(b.computePerSecond).mul(owned).mul(mult));
    if (b.peatPerSecond) totals.peat = totals.peat.add(D(b.peatPerSecond).mul(owned).mul(mult));
    if (b.sphagnumPerSecond) totals.sphagnum = totals.sphagnum.add(D(b.sphagnumPerSecond).mul(owned).mul(mult));
    if (b.methanePerSecond) totals.methane = totals.methane.add(D(b.methanePerSecond).mul(owned).mul(mult));
    if (b.evidencePerSecond) totals.evidence = totals.evidence.add(D(b.evidencePerSecond).mul(owned).mul(mult));
  }
  const resourceMult = (resource: keyof Rates): number => {
    const charter = charterMultiplier(state, resource as 'broth' | 'peat' | 'sphagnum' | 'methane' | 'compute' | 'evidence');
    return state.upgrades.reduce((product, id) => {
      const upgrade = UPGRADE_BY_ID[id];
      return upgrade?.kind === 'resource' && upgrade.resourceMultiplier?.resource === resource
        ? product * upgrade.resourceMultiplier.factor
        : product;
    }, charter);
  };
  return {
    broth: totals.broth.mul(brothMult).mul(resourceMult('broth')).mul(questMultiplier(state, 'broth', now)),
    peat: totals.peat.mul(global).mul(resourceMult('peat')).mul(questMultiplier(state, 'peat', now)),
    sphagnum: totals.sphagnum.mul(global).mul(resourceMult('sphagnum')).mul(questMultiplier(state, 'sphagnum', now)),
    methane: totals.methane.mul(global).mul(resourceMult('methane')).mul(questMultiplier(state, 'methane', now)),
    compute: totals.compute.mul(computeMult).mul(thermalFactor(state)).mul(resourceMult('compute')).mul(questMultiplier(state, 'compute', now)),
    evidence: totals.evidence.mul(global).mul(resourceMult('evidence')).mul(questMultiplier(state, 'evidence', now)),
  };
}

export function clickPower(state: GameState, now = Date.now()): Decimal {
  let power = D(1);
  let brothFraction = 0;
  for (const id of state.upgrades) {
    const u = UPGRADE_BY_ID[id];
    if (!u || u.kind !== 'click') continue;
    if (u.clickMultiplier) power = power.mul(u.clickMultiplier);
    if (u.clickBrothFraction) brothFraction += u.clickBrothFraction;
  }
  brothFraction += charterSum(state, 'clickBrothFraction');
  power = power.add(productionPerSecond(state, now).broth.mul(brothFraction));
  return power.mul(globalMultiplier(state)).mul(charterMultiplier(state, 'click')).mul(questMultiplier(state, 'click', now));
}

/** Advance the simulation by dtSeconds (the rAF loop clamps dt to ≤1s per frame). */
export function tick(state: GameState, dtSeconds: number, now = Date.now()): GameState {
  if (dtSeconds <= 0) return state;
  expireBuffs(state, now);
  advanceResearch(state, dtSeconds * charterFactor(state, 'researchSpeed'));
  const rates = productionPerSecond(state, now);
  const gains = {
    broth: safe(rates.broth.mul(dtSeconds)),
    compute: safe(rates.compute.mul(dtSeconds)),
    peat: safe(rates.peat.mul(dtSeconds)),
    sphagnum: safe(rates.sphagnum.mul(dtSeconds)),
    methane: safe(rates.methane.mul(dtSeconds)),
    evidence: safe(rates.evidence.mul(dtSeconds)),
  };
  state.broth = state.broth.add(gains.broth);
  state.compute = state.compute.add(gains.compute);
  state.peat = state.peat.add(gains.peat);
  state.sphagnum = state.sphagnum.add(gains.sphagnum);
  state.methane = state.methane.add(gains.methane);
  state.evidence = state.evidence.add(gains.evidence);
  state.totalBrothEarned = state.totalBrothEarned.add(gains.broth);
  state.totalComputeEarned = state.totalComputeEarned.add(gains.compute);
  state.totalPeatEarned = state.totalPeatEarned.add(gains.peat);
  state.totalSphagnumEarned = state.totalSphagnumEarned.add(gains.sphagnum);
  state.totalMethaneEarned = state.totalMethaneEarned.add(gains.methane);
  state.totalEvidenceEarned = state.totalEvidenceEarned.add(gains.evidence);
  state.totalComputeThisRun = state.totalComputeThisRun.add(gains.compute);
  return state;
}

export function click(state: GameState): Decimal {
  const gain = clickPower(state);
  state.broth = state.broth.add(gain);
  state.totalBrothEarned = state.totalBrothEarned.add(gain);
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
  if (u.requires?.length) return u.requires.every(({ buildingId, count }) => (state.buildings[buildingId] ?? 0) >= count);
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
    return earned.gte(D(cost).mul(0.1));
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
    const ready = (key: keyof Rates, threshold?: number): boolean =>
      threshold === undefined || rates[key].gte(threshold);
    if (ready('broth', def.unlock.brothPerSecond) &&
      ready('compute', def.unlock.computePerSecond) &&
      ready('peat', def.unlock.peatPerSecond) &&
      ready('sphagnum', def.unlock.sphagnumPerSecond) &&
      ready('methane', def.unlock.methanePerSecond)) {
      state.revealed.push(def.id);
      newlyRevealed.push(def.id);
    }
  }
  return newlyRevealed;
}

function decimalCost(spec: Partial<Record<SpendableResource, number>>): ResourceCost {
  return Object.fromEntries(
    Object.entries(spec).map(([resource, amount]) => [resource, D(amount)]),
  ) as ResourceCost;
}

export function buyUpgrade(state: GameState, id: string): boolean {
  const def = UPGRADE_BY_ID[id];
  if (!def || state.upgrades.includes(id) || !upgradeVisible(state, def)) return false;
  const cost = decimalCost(def.cost);
  if (!canAfford(state, cost)) return false;
  payCost(state, cost);
  state.upgrades.push(id);
  return true;
}

export function buyResearch(state: GameState, id: string): boolean {
  const def = RESEARCH_BY_ID[id];
  if (!def || state.research.includes(id) || state.researchQueue.some((entry) => entry.id === id) ||
    state.researchQueue.length >= MAX_RESEARCH_QUEUE) return false;
  const cost = decimalCost(def.cost);
  if (!canAfford(state, cost)) return false;
  payCost(state, cost);
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
      if (def.cost[resource] !== undefined) state[resource] = state[resource].add(def.cost[resource]!);
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

export const PRESTIGE_THRESHOLD = 1_000_000;

export function prestigeGain(state: GameState): Decimal {
  return state.totalComputeThisRun.div(PRESTIGE_THRESHOLD).sqrt().mul(charterFactor(state, 'coreGain')).floor();
}

export function canPrestige(state: GameState): boolean {
  return prestigeGain(state).gt(0);
}

/** Drain the bog: bank Bog Cores, reset the run, keep achievements/cores/lifetime totals. */
export function prestige(state: GameState): Decimal {
  const gain = prestigeGain(state);
  if (gain.lte(0)) return D(0);
  state.bogCores = state.bogCores.add(gain);
  state.broth = D(0);
  state.compute = D(0);
  state.peat = D(0);
  state.sphagnum = D(0);
  state.methane = D(0);
  state.evidence = D(0);
  state.totalComputeThisRun = D(0);
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
  state.broth = D(charterSum(state, 'startingBroth'));
  return gain;
}

/** Unlock any newly-earned achievements; returns the newly unlocked ids. */
export function checkAchievements(state: GameState): string[] {
  const owned = (id: string) => state.buildings[id] ?? 0;
  const has = (id: string) => state.achievements.includes(id);
  const checks: Record<string, boolean> = {
    'click-1': state.totalClicks >= 1,
    'debt-free': state.totalBrothEarned.gte(59),
    'click-100': state.totalClicks >= 100,
    'click-1000': state.totalClicks >= 1000,
    'broth-1k': state.totalBrothEarned.gte(1_000),
    'broth-1m': state.totalBrothEarned.gte(1_000_000),
    'broth-1b': state.totalBrothEarned.gte(1_000_000_000),
    'first-rack': owned('rack') >= 1,
    'chiller-10': owned('chiller') >= 10,
    'chiller-50': owned('chiller') >= 50,
    'first-compute': state.totalComputeEarned.gte(1),
    'compute-1m': state.totalComputeEarned.gte(1_000_000),
    'full-cool': totalHeat(state).gte(100) && thermalFactor(state).gte(1),
    'prestige-1': state.bogCores.gte(1),
    'cores-10': state.bogCores.gte(10),
    'harvester-100': owned('harvester') >= 100,
    hyperscaler: owned('hyperscaler') >= 1,
    'hot-fries': state.upgrades.includes('hot-fries'),
    'pulley-equity': state.upgrades.includes('pulley-equity'),
    'clause-struck': state.research.includes('lubrication-clause'),
    'reino-verdict': state.research.includes('nordic-verdict'),
    'moss-1k': state.totalSphagnumEarned.gte(1_000),
    'methane-1k': state.totalMethaneEarned.gte(1_000),
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

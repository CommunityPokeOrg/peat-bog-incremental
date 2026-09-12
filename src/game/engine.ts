import {
  ACHIEVEMENTS,
  BUILDING_BY_ID,
  BUILDINGS,
  COST_SCALE,
  RESEARCH_BY_ID,
  UPGRADE_BY_ID,
  type BuildingDef,
  type ResourceCost,
  type UpgradeDef,
} from './data';
import type { GameState } from './state';

export function buildingCost(def: BuildingDef, owned: number): ResourceCost {
  const factor = Math.pow(COST_SCALE, owned);
  const out: ResourceCost = {};
  if (def.baseCost.broth !== undefined) out.broth = def.baseCost.broth * factor;
  if (def.baseCost.compute !== undefined) out.compute = def.baseCost.compute * factor;
  return out;
}

/** Total cost of buying `qty` units starting at `owned`. */
export function bulkCost(def: BuildingDef, owned: number, qty: number): ResourceCost {
  const geom = (Math.pow(COST_SCALE, qty) - 1) / (COST_SCALE - 1);
  const base = buildingCost(def, owned);
  const out: ResourceCost = {};
  if (base.broth !== undefined) out.broth = base.broth * geom;
  if (base.compute !== undefined) out.compute = base.compute * geom;
  return out;
}

/** Max quantity affordable with current resources. */
export function maxAffordable(def: BuildingDef, owned: number, state: GameState): number {
  let qty = 0;
  // Broth and compute scale independently; take the min over both resources.
  for (const key of ['broth', 'compute'] as const) {
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
  if (cost.broth !== undefined && state.broth < cost.broth) return false;
  if (cost.compute !== undefined && state.compute < cost.compute) return false;
  return true;
}

function payCost(state: GameState, cost: ResourceCost): void {
  if (cost.broth !== undefined) state.broth -= cost.broth;
  if (cost.compute !== undefined) state.compute -= cost.compute;
}

// --- multipliers -----------------------------------------------------------

/** +5% per Bog Core, +1% per achievement. */
export function globalMultiplier(state: GameState): number {
  return 1 + state.bogCores * 0.05 + state.achievements.length * 0.01;
}

function buildingMultiplier(state: GameState, buildingId: string): number {
  return state.upgrades.includes(`boost-${buildingId}`) ? 2 : 1;
}

export function totalHeat(state: GameState): number {
  const heatMult = state.research.includes('liquid-immersion') ? 0.8 : 1;
  let heat = 0;
  for (const b of BUILDINGS) {
    if (b.heat) heat += (state.buildings[b.id] ?? 0) * b.heat;
  }
  return heat * heatMult;
}

export function totalCooling(state: GameState): number {
  const coolMult = state.research.includes('thermal-modelling') ? 1.25 : 1;
  let cooling = 0;
  for (const b of BUILDINGS) {
    if (b.cooling) cooling += (state.buildings[b.id] ?? 0) * b.cooling;
  }
  return cooling * coolMult;
}

/** Fraction of full speed the racks run at: min(1, cooling/heat). */
export function thermalFactor(state: GameState): number {
  const heat = totalHeat(state);
  if (heat <= 0) return 1;
  return Math.min(1, totalCooling(state) / heat);
}

export interface Rates {
  brothPerSecond: number;
  computePerSecond: number;
}

export function productionPerSecond(state: GameState): Rates {
  const global = globalMultiplier(state);
  const brothMult =
    global *
    (state.research.includes('broth-distillation') ? 1.5 : 1) *
    (state.research.includes('quantum-peat') ? 2 : 1);
  const computeMult =
    global *
    (state.research.includes('edge-caching') ? 1.5 : 1) *
    (state.research.includes('quantum-peat') ? 2 : 1);

  let broth = 0;
  let compute = 0;
  for (const b of BUILDINGS) {
    const owned = state.buildings[b.id] ?? 0;
    if (!owned) continue;
    const mult = buildingMultiplier(state, b.id);
    if (b.brothPerSecond) broth += owned * b.brothPerSecond * mult;
    if (b.computePerSecond) compute += owned * b.computePerSecond * mult;
  }
  return {
    brothPerSecond: broth * brothMult,
    computePerSecond: compute * computeMult * thermalFactor(state),
  };
}

export function clickPower(state: GameState): number {
  let power = 1;
  let brothFraction = 0;
  for (const id of state.upgrades) {
    const u = UPGRADE_BY_ID[id];
    if (!u || u.kind !== 'click') continue;
    if (u.clickMultiplier) power *= u.clickMultiplier;
    if (u.clickBrothFraction) brothFraction += u.clickBrothFraction;
  }
  power += productionPerSecond(state).brothPerSecond * brothFraction;
  return power * globalMultiplier(state);
}

// --- actions ----------------------------------------------------------------

/** Advance the simulation by dtSeconds (the rAF loop clamps dt to ≤1s per frame). */
export function tick(state: GameState, dtSeconds: number): GameState {
  if (dtSeconds <= 0) return state;
  const dt = dtSeconds;
  const rates = productionPerSecond(state);
  const brothGain = rates.brothPerSecond * dt;
  const computeGain = rates.computePerSecond * dt;
  state.broth += brothGain;
  state.compute += computeGain;
  state.totalBrothEarned += brothGain;
  state.totalComputeEarned += computeGain;
  state.totalComputeThisRun += computeGain;
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
  if (!def || qty <= 0) return false;
  const owned = state.buildings[id] ?? 0;
  const cost = bulkCost(def, owned, qty);
  if (!canAfford(state, cost)) return false;
  payCost(state, cost);
  state.buildings[id] = owned + qty;
  return true;
}

export function upgradeVisible(state: GameState, u: UpgradeDef): boolean {
  if (u.requiresOwned !== undefined) {
    return (state.buildings[u.buildingId ?? ''] ?? 0) >= u.requiresOwned;
  }
  return true;
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
  if (!def || state.research.includes(id)) return false;
  if (!canAfford(state, def.cost)) return false;
  payCost(state, def.cost);
  state.research.push(id);
  return true;
}

// --- prestige ---------------------------------------------------------------

export const PRESTIGE_THRESHOLD = 1_000_000;

export function prestigeGain(state: GameState): number {
  return Math.floor(Math.sqrt(state.totalComputeThisRun / PRESTIGE_THRESHOLD));
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
  state.totalComputeThisRun = 0;
  state.buildings = {};
  state.upgrades = [];
  state.research = [];
  return gain;
}

// --- achievements -------------------------------------------------------------

/** Unlock any newly-earned achievements; returns the newly unlocked ids. */
export function checkAchievements(state: GameState): string[] {
  const owned = (id: string) => state.buildings[id] ?? 0;
  const has = (id: string) => state.achievements.includes(id);
  const checks: Record<string, boolean> = {
    'click-1': state.totalClicks >= 1,
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

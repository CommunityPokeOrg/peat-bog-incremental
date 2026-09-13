import {
  ACHIEVEMENTS,
  BUILDING_BY_ID,
  BUILDINGS,
  COST_SCALE,
  RESOURCES,
  RESEARCH_BY_ID,
  UPGRADE_BY_ID,
  type BuildingDef,
  type ProductionLine,
  type ResourceCost,
  type ResearchEffect,
  type SpendableResource,
  type UpgradeDef,
} from './data';
import { D, Decimal, safe } from './decimal';
import { NIGHT_WATCH_MAX_LEVEL, type GameState } from './state';
import { QUESTS, expireBuffs, questMultiplier } from './quests';
import { CHARTER, charterFactor, charterMultiplier, charterSum } from './charter';

export const SPENDABLE_RESOURCES: SpendableResource[] = RESOURCES
  .filter((resource) => resource.id !== 'bogCores')
  .map((resource) => resource.id as SpendableResource);

/** Maximum number of research items that may be queued at once. */
export const MAX_RESEARCH_QUEUE = 3;

function zeroRates(): Rates {
  return Object.fromEntries(SPENDABLE_RESOURCES.map((resource) => [resource, D(0)])) as Rates;
}

/** Return the research-adjusted cost scale for a production line. */
export function costScaleFor(state: GameState, def: BuildingDef): number {
  const delta = state.research.reduce((total, id) => {
    const effect = RESEARCH_BY_ID[id]?.effect;
    return total + (effect?.kind === 'costScale' && effect.line === def.line ? effect.delta : 0);
  }, 0);
  return Math.max(1.05, (def.costScale ?? COST_SCALE) + delta);
}

export function buildingCost(def: BuildingDef, owned: number, state?: GameState): ResourceCost {
  const factor = Decimal.pow(state ? costScaleFor(state, def) : (def.costScale ?? COST_SCALE), owned);
  const out: ResourceCost = {};
  for (const resource of SPENDABLE_RESOURCES) {
    if (def.baseCost[resource] !== undefined) out[resource] = D(def.baseCost[resource]!).mul(factor);
  }
  return out;
}

/** Total cost of buying `qty` units starting at `owned`. */
export function bulkCost(def: BuildingDef, owned: number, qty: number, state?: GameState): ResourceCost {
  const scale = state ? costScaleFor(state, def) : (def.costScale ?? COST_SCALE);
  const geom = qty === 1 ? D(1) : Decimal.pow(scale, qty).sub(1).div(scale - 1);
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
  const scale = costScaleFor(state, def);
  for (const resource of SPENDABLE_RESOURCES) {
    const base = def.baseCost[resource];
    if (base === undefined) continue;
    const budget = state.wallet[resource];
    if (budget.lte(0)) return 0;
    const price = D(base).mul(Decimal.pow(scale, owned));
    const n = Math.floor(
      budget.mul(scale - 1).div(price).add(1).log10() / Math.log10(scale),
    );
    qty = qty === null ? Math.max(0, n) : Math.min(qty, Math.max(0, n));
  }
  return qty ?? 0;
}

export function canAfford(state: GameState, cost: ResourceCost | Partial<Record<SpendableResource, number>>): boolean {
  return SPENDABLE_RESOURCES.every((resource) =>
    cost[resource] === undefined || state.wallet[resource].gte(D(cost[resource]!)),
  );
}

/** Subtract a generic resource cost from the state wallet. */
export function payCost(state: GameState, cost: ResourceCost | Partial<Record<SpendableResource, number>>): void {
  for (const resource of SPENDABLE_RESOURCES) {
    if (cost[resource] !== undefined) state.wallet[resource] = state.wallet[resource].sub(D(cost[resource]!));
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
  return D(1).add(state.wallet.bogCores.mul(0.05)).add(state.achievements.length * 0.01);
}

export function buildingMultiplier(state: GameState, buildingId: string): number {
  return 2 ** state.upgrades.filter((id) => {
    const upgrade = UPGRADE_BY_ID[id];
    return upgrade?.kind === 'building' && upgrade.buildingId === buildingId;
  }).length;
}

/** Combine completed research effects of the requested kind. */
export function researchFactor(
  state: GameState,
  kind: ResearchEffect['kind'],
  target?: SpendableResource | 'click' | 'all',
): number {
  return state.research.reduce((product, id) => {
    const effect = RESEARCH_BY_ID[id]?.effect;
    if (!effect || effect.kind !== kind) return product;
    if (effect.kind === 'multiplier' && target !== undefined &&
      effect.target !== target && effect.target !== 'all') return product;
    if (effect.kind === 'multiplier' && target === undefined) return product;
    if ('factor' in effect) return product * effect.factor;
    return product;
  }, 1);
}

/** Return the multiplier applied to converter inputs on one production line. */
export function converterEfficiency(state: GameState, line: ProductionLine): number {
  return Math.max(0.01, state.research.reduce((product, id) => {
    const effect = RESEARCH_BY_ID[id]?.effect;
    return effect?.kind === 'converterEfficiency' && effect.line === line
      ? product * effect.factor
      : product;
  }, 1) * UPGRADES_FOR_STATE(state)
    .filter((upgrade) => upgrade.kind === 'converter' && upgrade.converterEfficiency?.line === line)
    .reduce((product, upgrade) => product * (upgrade.converterEfficiency?.factor ?? 1), 1));
}

function UPGRADES_FOR_STATE(state: GameState): UpgradeDef[] {
  return state.upgrades.map((id) => UPGRADE_BY_ID[id]).filter((upgrade): upgrade is UpgradeDef => Boolean(upgrade));
}

/** Whether a production line has been opened by research. */
export function lineUnlocked(state: GameState, line: ProductionLine): boolean {
  if (!['briquettes', 'refinedBroth', 'sediment', 'essence'].includes(line)) return true;
  return state.research.some((id) => {
    const effect = RESEARCH_BY_ID[id]?.effect;
    return effect?.kind === 'unlockLine' && effect.line === line;
  });
}

/** Maximum number of research items that may be queued after upgrades. */
export function maxResearchQueue(state: GameState): number {
  return MAX_RESEARCH_QUEUE + state.research.reduce((total, id) => {
    const effect = RESEARCH_BY_ID[id]?.effect;
    return total + (effect?.kind === 'researchSlots' ? effect.add : 0);
  }, 0);
}

export function totalHeat(state: GameState): Decimal {
  let heatMult = 1;
  heatMult *= researchFactor(state, 'heat');
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
  let coolMult = researchFactor(state, 'cooling');
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
export type Rates = Record<SpendableResource, Decimal>;

function researchMultiplier(state: GameState, resource: SpendableResource): number {
  return researchFactor(state, 'multiplier', resource);
}

/** Combine every multiplier affecting one resource's production. */
export function resourceMultiplier(state: GameState, resource: SpendableResource, now = Date.now()): Decimal {
  let multiplier = globalMultiplier(state)
    .mul(researchMultiplier(state, resource))
    .mul(charterMultiplier(state, resource))
    .mul(questMultiplier(state, resource, now));
  if (resource === 'compute') multiplier = multiplier.mul(thermalFactor(state));
  for (const upgrade of UPGRADES_FOR_STATE(state)) {
    if (upgrade.kind === 'resource' && upgrade.resourceMultiplier &&
      (upgrade.resourceMultiplier.resource === resource || upgrade.resourceMultiplier.resource === 'all')) {
      multiplier = multiplier.mul(upgrade.resourceMultiplier.factor);
    }
    if (upgrade.kind === 'synergy' && upgrade.synergy &&
      (upgrade.synergy.target === resource || upgrade.synergy.target === 'all')) {
      const sourceValue = state.buildings[upgrade.synergy.source] ?? state.wallet[upgrade.synergy.source as SpendableResource]?.toNumber() ?? 0;
      multiplier = multiplier.mul(Math.min(upgrade.synergy.cap, 1 + sourceValue * upgrade.synergy.perUnit));
    }
  }
  return multiplier;
}

export function productionPerSecond(state: GameState, now = Date.now()): Rates {
  const totals = zeroRates();
  for (const building of BUILDINGS) {
    const owned = state.buildings[building.id] ?? 0;
    if (!owned || !building.produces) continue;
    const multiplier = buildingMultiplier(state, building.id);
    for (const [resource, amount] of Object.entries(building.produces) as [SpendableResource, number][]) {
      totals[resource] = totals[resource].add(D(amount).mul(owned).mul(multiplier));
    }
  }
  for (const resource of SPENDABLE_RESOURCES) {
    totals[resource] = totals[resource].mul(resourceMultiplier(state, resource, now));
  }
  return totals;
}

export function consumptionPerSecond(state: GameState, now = Date.now()): Rates {
  void now;
  const totals = zeroRates();
  for (const building of BUILDINGS) {
    const owned = state.buildings[building.id] ?? 0;
    if (!owned || !building.consumes) continue;
    const multiplier = buildingMultiplier(state, building.id);
    for (const [resource, amount] of Object.entries(building.consumes) as [SpendableResource, number][]) {
      totals[resource] = totals[resource].add(
        D(amount).mul(owned).mul(multiplier).mul(converterEfficiency(state, building.line)),
      );
    }
  }
  return totals;
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
  return power
    .mul(researchFactor(state, 'clickMultiplier'))
    .mul(researchFactor(state, 'multiplier', 'click'))
    .mul(globalMultiplier(state)).mul(charterMultiplier(state, 'click')).mul(questMultiplier(state, 'click', now));
}

export interface Settlement {
  gained: Rates;
  spent: Rates;
}

/** Settle one production interval, throttling consuming buildings by available inputs. */
export function settleTick(state: GameState, dtSeconds: number, now = Date.now()): Settlement {
  const gained = zeroRates();
  const spent = zeroRates();
  if (dtSeconds <= 0) return { gained, spent };
  const available = Object.fromEntries(
    SPENDABLE_RESOURCES.map((resource) => [resource, state.wallet[resource]]),
  ) as Rates;
  for (const building of BUILDINGS) {
    const owned = state.buildings[building.id] ?? 0;
    if (!owned) continue;
    const multiplier = buildingMultiplier(state, building.id);
    const throttle = Object.entries(building.consumes ?? {}).reduce((limit, [resource, amount]) => {
      const need = D(amount).mul(owned).mul(multiplier)
        .mul(converterEfficiency(state, building.line));
      return need.lte(0)
        ? limit
        : Math.min(limit, available[resource as SpendableResource].div(need.mul(dtSeconds)).toNumber());
    }, 1);
    const factor = Math.max(0, Math.min(1, throttle));
    for (const [resource, amount] of Object.entries(building.consumes ?? {}) as [SpendableResource, number][]) {
      const cost = safe(D(amount).mul(owned).mul(multiplier)
        .mul(converterEfficiency(state, building.line)).mul(dtSeconds * factor));
      spent[resource] = spent[resource].add(cost);
      available[resource] = available[resource].sub(cost).max(0);
    }
    for (const [resource, amount] of Object.entries(building.produces ?? {}) as [SpendableResource, number][]) {
      const output = safe(D(amount).mul(owned).mul(multiplier)
        .mul(resourceMultiplier(state, resource, now)).mul(dtSeconds * factor));
      gained[resource] = gained[resource].add(output);
    }
  }
  return { gained, spent };
}

function applySettlement(state: GameState, settlement: Settlement): void {
  for (const resource of SPENDABLE_RESOURCES) {
    state.wallet[resource] = state.wallet[resource].sub(settlement.spent[resource]).add(settlement.gained[resource]);
    state.lifetime[resource] = state.lifetime[resource].add(settlement.gained[resource]);
  }
  state.runCompute = state.runCompute.add(settlement.gained.compute);
}

/** Buy the cheapest affordable building for each owned automation desk. */
export function autoBuy(state: GameState, dtSeconds: number): void {
  for (const upgrade of UPGRADES_FOR_STATE(state)) {
    if (upgrade.kind !== 'automation' || !upgrade.automation) continue;
    const timer = (state.automationTimers[upgrade.id] ?? 0) + Math.max(0, dtSeconds);
    if (timer < upgrade.automation.intervalSec) {
      state.automationTimers[upgrade.id] = timer;
      continue;
    }
    state.automationTimers[upgrade.id] = timer % upgrade.automation.intervalSec;
    const candidates = BUILDINGS
      .filter((building) => building.line === upgrade.automation!.line && buildingVisible(state, building))
      .sort((a, b) => (a.baseCost.broth ?? 0) - (b.baseCost.broth ?? 0));
    for (const building of candidates) {
      if (buyBuilding(state, building.id, 1)) break;
    }
  }
}

/** Advance the simulation by dtSeconds (the rAF loop clamps dt to ≤1s per frame). */
export function tick(state: GameState, dtSeconds: number, now = Date.now()): GameState {
  if (dtSeconds <= 0) return state;
  expireBuffs(state, now);
  advanceResearch(state, dtSeconds * charterFactor(state, 'researchSpeed'));
  applySettlement(state, settleTick(state, dtSeconds, now));
  autoBuy(state, dtSeconds);
  return state;
}

export function click(state: GameState): Decimal {
  const gain = clickPower(state);
  state.wallet.broth = state.wallet.broth.add(gain);
  state.lifetime.broth = state.lifetime.broth.add(gain);
  state.totalClicks += 1;
  return gain;
}

export function buyBuilding(state: GameState, id: string, qty: number): boolean {
  const def = BUILDING_BY_ID[id];
  if (!def || qty <= 0 || !buildingVisible(state, def)) return false;
  const owned = state.buildings[id] ?? 0;
  const cost = bulkCost(def, owned, qty, state);
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
    return cost === undefined || state.lifetime[resource].gte(D(cost).mul(0.1));
  });
}

export function buildingVisible(state: GameState, def: BuildingDef, rates = productionPerSecond(state)): boolean {
  if (!lineUnlocked(state, def.line)) return false;
  if (!def.unlock) return true;
  if (state.revealed.includes(def.id)) return true;
  return Object.entries(def.unlock.rate ?? {}).every(([resource, threshold]) =>
    rates[resource as SpendableResource].gte(threshold),
  ) && Object.entries(def.unlock.lifetime ?? {}).every(([resource, threshold]) =>
    state.lifetime[resource as SpendableResource].gte(threshold),
  );
}

export function revealBuildings(state: GameState): string[] {
  const newlyRevealed: string[] = [];
  const rates = productionPerSecond(state);
  for (const def of BUILDINGS) {
    if (!def.unlock || state.revealed.includes(def.id) || !buildingVisible(state, def, rates)) continue;
    state.revealed.push(def.id);
    newlyRevealed.push(def.id);
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
    state.researchQueue.length >= maxResearchQueue(state) ||
    (def.requires ?? []).some((required) => !state.research.includes(required))) return false;
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
      if (def.cost[resource] !== undefined) state.wallet[resource] = state.wallet[resource].add(def.cost[resource]!);
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
  return state.runCompute.div(PRESTIGE_THRESHOLD).sqrt().mul(charterFactor(state, 'coreGain')).floor();
}

export function canPrestige(state: GameState): boolean {
  return prestigeGain(state).gt(0);
}

/** Drain the bog: bank Bog Cores, reset the run, keep achievements/cores/lifetime totals. */
export function prestige(state: GameState): Decimal {
  const gain = prestigeGain(state);
  if (gain.lte(0)) return D(0);
  state.wallet.bogCores = state.wallet.bogCores.add(gain);
  for (const resource of SPENDABLE_RESOURCES) state.wallet[resource] = D(0);
  state.runCompute = D(0);
  state.calibrationStreak = 0;
  state.calibrationTarget = 0.5;
  state.buildings = {};
  state.revealed = [];
  state.upgrades = [];
  state.research = [];
  state.researchQueue = [];
  state.automationTimers = {};
  state.quests.claimed = state.quests.claimed.filter((id) =>
    QUESTS.find((quest) => quest.id === id)?.persistsThroughPrestige === true,
  );
  state.quests.buffs = [];
  state.wallet.broth = D(charterSum(state, 'startingBroth'));
  return gain;
}

/** Unlock any newly-earned achievements; returns the newly unlocked ids. */
export function checkAchievements(state: GameState): string[] {
  const owned = (id: string) => state.buildings[id] ?? 0;
  const has = (id: string) => state.achievements.includes(id);
  const checks: Record<string, boolean> = {
    'click-1': state.totalClicks >= 1,
    'debt-free': state.lifetime.broth.gte(59),
    'click-100': state.totalClicks >= 100,
    'click-1000': state.totalClicks >= 1000,
    'broth-1k': state.lifetime.broth.gte(1_000),
    'broth-1m': state.lifetime.broth.gte(1_000_000),
    'broth-1b': state.lifetime.broth.gte(1_000_000_000),
    'first-rack': owned('rack') >= 1,
    'chiller-10': owned('chiller') >= 10,
    'chiller-50': owned('chiller') >= 50,
    'first-compute': state.lifetime.compute.gte(1),
    'compute-1m': state.lifetime.compute.gte(1_000_000),
    'full-cool': totalHeat(state).gte(100) && thermalFactor(state).gte(1),
    'prestige-1': state.wallet.bogCores.gte(1),
    'cores-10': state.wallet.bogCores.gte(10),
    'harvester-100': owned('harvester') >= 100,
    hyperscaler: owned('hyperscaler') >= 1,
    'hot-fries': state.upgrades.includes('hot-fries'),
    'pulley-equity': state.upgrades.includes('pulley-equity'),
    'clause-struck': state.research.includes('lubrication-clause'),
    'reino-verdict': state.research.includes('nordic-verdict'),
    'moss-1k': state.lifetime.sphagnum.gte(1_000),
    'methane-1k': state.lifetime.methane.gte(1_000),
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

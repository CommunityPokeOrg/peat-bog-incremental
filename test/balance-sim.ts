import { CHARTER, buyCharter, charterAvailable, type CharterNodeDef } from '../src/game/charter';
import { BUILDINGS, UPGRADES, type ResourceCost, type ResourceCostSpec } from '../src/game/data';
import {
  buildingCost,
  buyBuilding,
  buyUpgrade,
  canAfford,
  lineUnlocked,
  prestige,
  prestigeGain,
  productionPerSecond,
  SPENDABLE_RESOURCES,
  tick,
  totalCooling,
  totalHeat,
  upgradeVisible,
} from '../src/game/engine';
import { D } from '../src/game/decimal';
import type { GameState } from '../src/game/state';
import { createInitialState } from '../src/game/state';

/** Broth a steady clicker adds per simulated second (stand-in for the harvest button). */
const CLICK_BROTH_PER_SECOND = 20;

function secondsToAfford(
  state: GameState,
  cost: ResourceCost | ResourceCostSpec,
  rates = productionPerSecond(state),
): number {
  return Math.max(...SPENDABLE_RESOURCES.map((resource) => {
    const amount = cost[resource];
    if (!amount) return 0;
    const rate = rates[resource].toNumber();
    const numericAmount = typeof amount === 'number' ? amount : amount.toNumber();
    return rate > 0 ? numericAmount / rate : Number.POSITIVE_INFINITY;
  }));
}

/** Simulation step; the greedy player acts once per step. */
const STEP_SECONDS = 5;

/** One greedy run: buy the cheapest affordable building/upgrade each step, tick, sample hourly. */
export function simulateRun(state: GameState, hours: number): { hourly: number[]; peak: number } {
  const hourly: number[] = [];
  let peak = 0;
  for (let second = STEP_SECONDS; second <= hours * 3600; second += STEP_SECONDS) {
    const clicked = CLICK_BROTH_PER_SECOND * STEP_SECONDS;
    state.wallet.broth = state.wallet.broth.add(clicked);
    state.lifetime.broth = state.lifetime.broth.add(clicked);
    const rates = productionPerSecond(state);
    const upgrade = UPGRADES
      .filter((u) => !state.upgrades.includes(u.id) && upgradeVisible(state, u, rates) && canAfford(state, u.cost))
      .sort((a, b) => secondsToAfford(state, a.cost, rates) - secondsToAfford(state, b.cost, rates))[0];
    if (upgrade) buyUpgrade(state, upgrade.id);
    const affordable = BUILDINGS
      .filter((b) => lineUnlocked(state, b.line))
      .map((b) => ({ b, cost: buildingCost(b, state.buildings[b.id] ?? 0, state) }))
      .filter(({ cost }) => canAfford(state, cost));
    const heat = totalHeat(state);
    const cooling = totalCooling(state);
    const balanced = affordable.filter(({ b }) => !b.heat || heat.add(D(b.heat)).lte(cooling));
    const candidates = balanced.length > 0 ? balanced : affordable;
    const cheapest = candidates
      .sort((a, b) => secondsToAfford(state, a.cost, rates) - secondsToAfford(state, b.cost, rates))[0];
    if (cheapest) buyBuilding(state, cheapest.b.id, 1);
    tick(state, STEP_SECONDS);
    const rate = productionPerSecond(state).broth.toNumber();
    peak = Math.max(peak, rate);
    if (second % 3600 === 0) hourly.push(rate);
  }
  return { hourly, peak };
}

/** Drain the bog with the real core award, then sign the cheapest available terms. */
export function drainAndSign(state: GameState): { cores: number; signed: number } {
  const cores = prestigeGain(state).toNumber();
  prestige(state);
  let signed = 0;
  const helpsBroth = (n: CharterNodeDef) => n.effects.some((e) =>
    (e.kind === 'multiplier' && (e.target === 'broth' || e.target === 'all')) ||
    (e.kind === 'costScale' && e.line === 'broth') || e.kind === 'coreGain' || e.kind === 'freeBuildings');
  for (;;) {
    const available = CHARTER.filter((n) => charterAvailable(state, n)).sort((a, b) => a.cost - b.cost);
    const next = available.find(helpsBroth) ?? available[0];
    if (!next || !buyCharter(state, next.id)) break;
    signed += 1;
  }
  return { cores, signed };
}

export function simulateCareer(runs: number, hoursPerRun: number) {
  const state = createInitialState();
  const out = [];
  for (let run = 0; run < runs; run += 1) {
    const result = simulateRun(state, hoursPerRun);
    const runCompute = state.runCompute.toNumber();
    const drain = drainAndSign(state);
    out.push({ ...result, runCompute, ...drain });
  }
  return out;
}

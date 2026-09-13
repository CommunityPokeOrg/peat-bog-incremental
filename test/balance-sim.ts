import { CHARTER, buyCharter, charterAvailable, type CharterNodeDef } from '../src/game/charter';
import { BUILDINGS, UPGRADES, type ResourceCost } from '../src/game/data';
import {
  buildingCost,
  buyBuilding,
  buyUpgrade,
  canAfford,
  lineUnlocked,
  prestige,
  prestigeGain,
  productionPerSecond,
  tick,
  upgradeVisible,
} from '../src/game/engine';
import type { GameState } from '../src/game/state';
import { createInitialState } from '../src/game/state';

/** Broth a steady clicker adds per simulated second (stand-in for the harvest button). */
const CLICK_BROTH_PER_SECOND = 20;

function costKey(cost: ResourceCost): number {
  return Object.values(cost).reduce<number>((sum, amount) => sum + (amount?.toNumber() ?? 0), 0);
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
    const upgrade = UPGRADES.find((u) => !state.upgrades.includes(u.id) && upgradeVisible(state, u) && canAfford(state, u.cost));
    if (upgrade) buyUpgrade(state, upgrade.id);
    const cheapest = BUILDINGS
      .filter((b) => lineUnlocked(state, b.line))
      .map((b) => ({ b, cost: buildingCost(b, state.buildings[b.id] ?? 0, state) }))
      .filter(({ cost }) => canAfford(state, cost))
      .sort((x, y) => costKey(x.cost) - costKey(y.cost))[0];
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

import type { Decimal } from '../decimal';
import type { GameState } from '../state';
import { award, fieldworkDef } from './shared';

export interface SettleRun {
  valve: number;
  band: number;
  bandHalf: number;
  drift: number;
  startedAt: number;
  inBandMs: number;
  lastAt: number;
  alive: boolean;
  outOfBandMs?: number;
  gustAt: number;
  lastGustAt?: number;
}

function gustDelay(rng: () => number): number {
  return 6_000 + Math.max(0, Math.min(1, rng())) * 3_000;
}

export function startSettle(now = Date.now(), rng = Math.random): SettleRun {
  return {
    valve: rng(),
    band: rng(),
    bandHalf: 0.12,
    drift: (rng() * 2 - 1) * 0.08,
    startedAt: now,
    inBandMs: 0,
    lastAt: now,
    alive: true,
    outOfBandMs: 0,
    gustAt: now + gustDelay(rng),
  };
}

export function moveValve(run: SettleRun, delta: number): SettleRun {
  return { ...run, valve: Math.max(0, Math.min(1, run.valve + (Number.isFinite(delta) ? delta : 0))) };
}

export function advanceSettle(run: SettleRun, now: number, rng = Math.random): SettleRun {
  if (!run.alive) return run;
  const dtMs = Math.max(0, now - run.lastAt);
  const dt = dtMs / 1_000;
  let band = Math.max(0, Math.min(1, run.band + run.drift * dt));
  const drift = Math.max(-0.08, Math.min(0.08, run.drift + (rng() * 2 - 1) * 0.01 * dt));
  const elapsed = Math.max(0, now - run.startedAt);
  const bandHalf = Math.max(0.06, 0.12 - 0.06 * Math.min(1, elapsed / 30_000));
  let gustAt = run.gustAt;
  let lastGustAt = run.lastGustAt;
  if (now >= gustAt) {
    band = Math.max(0, Math.min(1, band + (rng() < 0.5 ? -0.25 : 0.25)));
    lastGustAt = now;
    gustAt = now + gustDelay(rng);
  }
  const inBand = Math.abs(run.valve - band) <= bandHalf;
  const outOfBandMs = inBand ? 0 : (run.outOfBandMs ?? 0) + dtMs;
  const grace = lastGustAt !== undefined && now < lastGustAt + 1_000 ? 900 : 600;
  return {
    ...run,
    band,
    bandHalf,
    drift,
    lastAt: now,
    inBandMs: run.inBandMs + (inBand ? dtMs : 0),
    outOfBandMs,
    gustAt,
    lastGustAt,
    alive: outOfBandMs <= grace,
  };
}

export function endSettle(state: GameState, run: SettleRun, wall = Date.now()): Decimal {
  const value = award(state, 'sludge', run.inBandMs / 1_000 * 2, 1, Math.min(8, 1 + run.inBandMs / 5_000), 8);
  const progress = state.fieldwork.settle;
  progress.best = Math.max(progress.best, run.inBandMs / 1_000);
  progress.runs += 1;
  progress.cooldownUntil = wall + fieldworkDef('settle').cooldownMs;
  return value;
}

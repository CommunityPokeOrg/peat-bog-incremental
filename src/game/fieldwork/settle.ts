import type { Decimal } from '../decimal';
import type { GameState } from '../state';
import { award, fieldworkDef } from './shared';

export interface SettleRun {
  valve: number;
  band: number;
  bandHalf: 0.12;
  drift: number;
  startedAt: number;
  inBandMs: number;
  lastAt: number;
  alive: boolean;
  outOfBandMs?: number;
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
  };
}

export function moveValve(run: SettleRun, delta: number): SettleRun {
  return { ...run, valve: Math.max(0, Math.min(1, run.valve + (Number.isFinite(delta) ? delta : 0))) };
}

export function advanceSettle(run: SettleRun, now: number, rng = Math.random): SettleRun {
  if (!run.alive) return run;
  const dtMs = Math.max(0, now - run.lastAt);
  const dt = dtMs / 1_000;
  const band = Math.max(0, Math.min(1, run.band + run.drift * dt));
  const drift = Math.max(-0.08, Math.min(0.08, run.drift + (rng() * 2 - 1) * 0.01 * dt));
  const inBand = Math.abs(run.valve - band) <= run.bandHalf;
  const outOfBandMs = inBand ? 0 : (run.outOfBandMs ?? 0) + dtMs;
  return {
    ...run,
    band,
    drift,
    lastAt: now,
    inBandMs: run.inBandMs + (inBand ? dtMs : 0),
    outOfBandMs,
    alive: outOfBandMs <= 600,
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

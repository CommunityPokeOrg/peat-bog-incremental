import type { Decimal } from '../decimal';
import type { GameState } from '../state';
import { award, fieldworkDef } from './shared';

export interface StrataRun {
  beatMs: number;
  startedAt: number;
  cuts: number;
  combo: number;
  alive: boolean;
}

export function startStrata(now = Date.now()): StrataRun {
  return { beatMs: 700, startedAt: now, cuts: 0, combo: 0, alive: true };
}

export function bladeDepth(run: StrataRun, now: number): number {
  const elapsed = Math.max(0, now - run.startedAt);
  return ((elapsed / run.beatMs) % 5 + 5) % 5;
}

export function cutStrata(
  run: StrataRun,
  now: number,
): { run: StrataRun; grade: 'perfect' | 'good' | 'miss' } {
  if (!run.alive) return { run, grade: 'miss' };
  const elapsed = Math.max(0, now - run.startedAt);
  const nearest = Math.round(elapsed / run.beatMs);
  const offset = Math.abs(elapsed - nearest * run.beatMs);
  if (offset >= 180) return { run: { ...run, alive: false }, grade: 'miss' };
  const perfect = offset < 80;
  const next = {
    ...run,
    cuts: run.cuts + 1,
    combo: perfect ? run.combo + 1 : run.combo,
    beatMs: run.cuts + 1 >= 10 ? 450 : run.beatMs,
  };
  return { run: next, grade: perfect ? 'perfect' : 'good' };
}

export function endStrata(state: GameState, run: StrataRun, wall = Date.now()): Decimal {
  const value = award(state, 'peat', run.cuts * 3, 5, Math.min(12, 1 + 0.25 * run.combo), 12);
  const progress = state.fieldwork.strata;
  progress.best = Math.max(progress.best, run.cuts);
  progress.runs += 1;
  progress.cooldownUntil = wall + fieldworkDef('strata').cooldownMs;
  return value;
}

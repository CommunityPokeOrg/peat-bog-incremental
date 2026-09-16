import type { Decimal } from '../decimal';
import type { GameState } from '../state';
import { award, fieldworkDef } from './shared';

export interface PressRun {
  pressure: number;
  last: 'L' | 'R' | null;
  compressedMs: number;
  bricks: number;
  quenches: number;
  lastAt: number;
  startedAt: number;
  alive: boolean;
}

export function startPress(now = Date.now()): PressRun {
  return { pressure: 0, last: null, compressedMs: 0, bricks: 0, quenches: 0, lastAt: now, startedAt: now, alive: true };
}

export function advancePress(run: PressRun, now: number): PressRun {
  if (!run.alive) return run;
  const dtMs = Math.max(0, now - run.lastAt);
  const pressure = Math.max(0, run.pressure - (0.08 + 0.03 * run.bricks) * dtMs / 1_000);
  const compressedMs = run.compressedMs + (run.pressure >= 0.6 && run.pressure <= 0.9 ? dtMs : 0);
  return {
    ...run,
    pressure,
    compressedMs,
    bricks: Math.floor(compressedMs / 4_000),
    lastAt: now,
    alive: run.pressure <= 1,
  };
}

export function quench(run: PressRun, now: number): PressRun {
  const advanced = advancePress(run, now);
  if (advanced.quenches >= advanced.bricks) return advanced;
  return { ...advanced, pressure: Math.max(0, advanced.pressure - 0.3), quenches: advanced.quenches + 1 };
}

export function pedal(run: PressRun, side: 'L' | 'R', now: number): PressRun {
  const advanced = advancePress(run, now);
  if (!advanced.alive) return advanced;
  const pressure = advanced.last === side
    ? Math.max(0, advanced.pressure - 0.2)
    : advanced.pressure + 0.15;
  return { ...advanced, pressure, last: side, alive: pressure <= 1 };
}

export function endPress(state: GameState, run: PressRun, wall = Date.now()): Decimal {
  const value = award(
    state,
    'briquettes',
    run.compressedMs / 1_000 * 3 + run.bricks * 6,
    0.5,
    Math.min(8, 1 + run.compressedMs / 4_000 + run.bricks * 0.5),
    8,
  );
  const progress = state.fieldwork.press;
  progress.best = Math.max(progress.best, run.compressedMs / 1_000);
  progress.runs += 1;
  progress.cooldownUntil = wall + fieldworkDef('press').cooldownMs;
  return value;
}

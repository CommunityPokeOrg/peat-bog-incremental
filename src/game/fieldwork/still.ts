import type { Decimal } from '../decimal';
import type { GameState } from '../state';
import { award, fieldworkDef } from './shared';

export interface StillRun {
  drops: { spawnedAt: number }[];
  caught: number;
  missed: number;
  startedAt: number;
  nextSpawnAt: number;
  alive: boolean;
}

export const DROP_FALL_MS = 1_200;

function nextDelay(rng: () => number): number {
  return 600 + Math.max(0, Math.min(1, rng())) * 800;
}

export function startStill(now = Date.now(), rng = Math.random): StillRun {
  return {
    drops: [],
    caught: 0,
    missed: 0,
    startedAt: now,
    nextSpawnAt: now + nextDelay(rng),
    alive: true,
  };
}

export function advanceStill(run: StillRun, now: number, rng = Math.random): StillRun {
  if (!run.alive) return run;
  const drops = [...run.drops];
  let nextSpawnAt = run.nextSpawnAt;
  while (nextSpawnAt <= now) {
    drops.push({ spawnedAt: nextSpawnAt });
    nextSpawnAt += nextDelay(rng);
  }
  let missed = run.missed;
  const active = drops.filter((drop) => {
    if (now - drop.spawnedAt <= DROP_FALL_MS + 120) return true;
    missed += 1;
    return false;
  });
  return { ...run, drops: active, missed, nextSpawnAt, alive: missed < 3 };
}

export function tapStill(run: StillRun, now: number): { run: StillRun; hit: boolean } {
  if (!run.alive) return { run, hit: false };
  const index = run.drops.findIndex((drop) => Math.abs(now - (drop.spawnedAt + 1_200)) <= 120);
  if (index < 0) return { run, hit: false };
  const drops = run.drops.slice();
  drops.splice(index, 1);
  return { run: { ...run, drops, caught: run.caught + 1 }, hit: true };
}

export function endStill(state: GameState, run: StillRun, wall = Date.now()): Decimal {
  const value = award(state, 'refinedBroth', run.caught * 1.5, 0.5, Math.min(10, 1 + run.caught * 0.2), 10);
  const progress = state.fieldwork.still;
  progress.best = Math.max(progress.best, run.caught);
  progress.runs += 1;
  progress.cooldownUntil = wall + fieldworkDef('still').cooldownMs;
  return value;
}

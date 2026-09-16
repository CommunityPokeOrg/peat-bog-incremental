import type { Decimal } from '../decimal';
import type { GameState } from '../state';
import { award, fieldworkDef } from './shared';

export interface StillRun {
  drops: { spawnedAt: number; sour: boolean }[];
  caught: number;
  missed: number;
  heat: 1 | 2 | 3;
  startedAt: number;
  nextSpawnAt: number;
  alive: boolean;
}

export const DROP_FALL_MS = 1_200;

function nextDelay(rng: () => number): number {
  return 600 + Math.max(0, Math.min(1, rng())) * 800;
}

export function dropFallMs(run: StillRun): number {
  return DROP_FALL_MS / (0.75 + run.heat * 0.25);
}

export function setHeat(run: StillRun, heat: 1 | 2 | 3): void {
  run.heat = heat;
}

export function startStill(now = Date.now(), rng = Math.random): StillRun {
  return {
    drops: [],
    caught: 0,
    missed: 0,
    heat: 1,
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
    const spawnedAt = nextSpawnAt;
    drops.push({ spawnedAt, sour: rng() < 0.15 });
    nextSpawnAt += nextDelay(rng) / run.heat;
  }
  let missed = run.missed;
  const active = drops.filter((drop) => {
    if (now - drop.spawnedAt <= dropFallMs(run) + 120) return true;
    if (!drop.sour) missed += 1;
    return false;
  });
  return { ...run, drops: active, missed, nextSpawnAt, alive: missed < 3 };
}

export function tapStill(run: StillRun, now: number): { run: StillRun; hit: boolean } {
  if (!run.alive) return { run, hit: false };
  const index = run.drops.findIndex((drop) => Math.abs(now - (drop.spawnedAt + dropFallMs(run))) <= 120);
  if (index < 0) return { run, hit: false };
  const drops = run.drops.slice();
  const drop = drops[index];
  drops.splice(index, 1);
  if (drop.sour) {
    const missed = run.missed + 1;
    return { run: { ...run, drops, missed, alive: missed < 3 }, hit: false };
  }
  return { run: { ...run, drops, caught: run.caught + 1 }, hit: true };
}

export function endStill(state: GameState, run: StillRun, wall = Date.now()): Decimal {
  const value = award(
    state,
    'refinedBroth',
    run.caught * 1.5,
    0.5,
    Math.min(12, (1 + run.caught * 0.2) * (1 + (run.heat - 1) * 0.35)),
    12,
  );
  const progress = state.fieldwork.still;
  progress.best = Math.max(progress.best, run.caught);
  progress.runs += 1;
  progress.cooldownUntil = wall + fieldworkDef('still').cooldownMs;
  return value;
}

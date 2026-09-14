import type { Decimal } from '../decimal';
import type { GameState } from '../state';
import { award, fieldworkDef } from './shared';

export interface ConstellationRun {
  sequence: number[];
  input: number[];
  round: number;
  showing: boolean;
  alive: boolean;
}

export const CONSTELLATION_STARS = 7;

function star(rng: () => number): number {
  return Math.max(0, Math.min(CONSTELLATION_STARS - 1,
    Math.floor(Math.max(0, Math.min(1, rng())) * CONSTELLATION_STARS)));
}

export function startConstellation(rng = Math.random): ConstellationRun {
  return { sequence: [star(rng), star(rng)], input: [], round: 1, showing: true, alive: true };
}

export function revealDone(run: ConstellationRun): ConstellationRun {
  return { ...run, showing: false };
}

export function pickStar(run: ConstellationRun, value: number, rng = Math.random): ConstellationRun {
  if (!run.alive || run.showing || !Number.isInteger(value) ||
    value < 0 || value >= CONSTELLATION_STARS) return run;
  const expected = run.sequence[run.input.length];
  if (value !== expected) return { ...run, alive: false };
  const input = [...run.input, value];
  if (input.length < run.sequence.length) return { ...run, input };
  return {
    ...run,
    input: [],
    round: run.round + 1,
    sequence: [...run.sequence, star(rng)],
    showing: true,
  };
}

export function endConstellation(state: GameState, run: ConstellationRun, wall = Date.now()): Decimal {
  const value = award(state, 'essence', run.round * 4, 0.1, Math.min(20, 1.5 ** run.round), 20);
  const progress = state.fieldwork.constellation;
  progress.best = Math.max(progress.best, Math.max(0, run.round - 1));
  progress.runs += 1;
  progress.cooldownUntil = wall + fieldworkDef('constellation').cooldownMs;
  return value;
}

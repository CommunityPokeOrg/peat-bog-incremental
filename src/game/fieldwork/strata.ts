import type { Decimal } from '../decimal';
import type { GameState } from '../state';
import { award, fieldworkDef } from './shared';

export interface StrataRun {
  beatMs: number;
  startedAt: number;
  layers: ('peat' | 'root')[];
  cuts: number;
  combo: number;
  lastCutBeat: number;
  alive: boolean;
}

export function startStrata(now = Date.now(), rng = Math.random): StrataRun {
  const layers: ('peat' | 'root')[] = ['peat'];
  while (layers.length < 5) {
    layers.push(rng() < 0.25 && layers[layers.length - 1] !== 'root' ? 'root' : 'peat');
  }
  return { beatMs: 700, startedAt: now, layers, cuts: 0, combo: 0, lastCutBeat: -1, alive: true };
}

export function bladeDepth(run: StrataRun, now: number): number {
  const elapsed = Math.max(0, now - run.startedAt);
  return ((elapsed / run.beatMs) % 5 + 5) % 5;
}

export function advanceStrata(run: StrataRun, now: number): StrataRun {
  if (!run.alive) return run;
  const elapsed = Math.max(0, now - run.startedAt);
  const currentBeat = Math.floor(elapsed / run.beatMs);
  let next = run;
  for (let beat = run.lastCutBeat + 1; beat < currentBeat; beat += 1) {
    const layer = run.layers[beat % run.layers.length];
    if (layer === 'root') {
      next = { ...next, combo: next.combo + 1, lastCutBeat: beat };
    } else if (now >= run.startedAt + (beat + 1) * run.beatMs + 180) {
      return { ...next, alive: false, lastCutBeat: beat };
    }
  }
  return next;
}

export function cutStrata(
  run: StrataRun,
  now: number,
): { run: StrataRun; grade: 'perfect' | 'good' | 'miss' } {
  const advanced = advanceStrata(run, now);
  if (!advanced.alive) return { run: advanced, grade: 'miss' };
  const elapsed = Math.max(0, now - advanced.startedAt);
  const nearest = Math.round(elapsed / advanced.beatMs);
  const offset = Math.abs(elapsed - nearest * advanced.beatMs);
  if (offset >= 180 || nearest === advanced.lastCutBeat) return { run: { ...advanced, alive: false }, grade: 'miss' };
  if (advanced.layers[nearest % advanced.layers.length] === 'root') {
    return { run: { ...advanced, alive: false, lastCutBeat: nearest }, grade: 'miss' };
  }
  const perfect = offset < 80;
  const next = {
    ...advanced,
    cuts: advanced.cuts + 1,
    combo: perfect ? advanced.combo + 1 : advanced.combo,
    lastCutBeat: nearest,
    beatMs: advanced.cuts + 1 >= 10 ? 450 : advanced.beatMs,
  };
  return { run: next, grade: perfect ? 'perfect' : 'good' };
}

export function endStrata(state: GameState, run: StrataRun, wall = Date.now()): Decimal {
  const value = award(state, 'peat', run.cuts * 3, 5, Math.min(15, 1 + 0.25 * run.combo), 15);
  const progress = state.fieldwork.strata;
  progress.best = Math.max(progress.best, run.cuts);
  progress.runs += 1;
  progress.cooldownUntil = wall + fieldworkDef('strata').cooldownMs;
  return value;
}

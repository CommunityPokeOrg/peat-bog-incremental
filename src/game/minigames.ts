import { productionPerSecond } from './engine';
import type { GameState } from './state';

/** Return the calibration needle position for a timestamp in milliseconds. */
export function calibrationNeedle(t: number): number {
  return 0.5 + 0.5 * Math.sin(t / 650);
}

/** Resolve a calibration attempt and award compute and evidence on a hit. */
export function calibrate(
  state: GameState,
  t: number,
): { hit: boolean; compute: number; evidence: number } {
  const hit = calibrationNeedle(t) >= 0.42 && calibrationNeedle(t) <= 0.58;
  if (!hit) return { hit: false, compute: 0, evidence: 0 };
  const rates = productionPerSecond(state);
  const compute = Math.max(10, 20 * rates.compute);
  const evidence = Math.max(1, 5 * rates.evidence);
  state.compute += compute;
  state.evidence += evidence;
  state.totalComputeEarned += compute;
  state.totalComputeThisRun += compute;
  state.totalEvidenceEarned += evidence;
  state.minigameHits += 1;
  return { hit: true, compute, evidence };
}

/** Convert a peat-cut hold duration into a clamped charge fraction. */
export function peatCutCharge(elapsedMs: number): number {
  const elapsed = Math.max(0, elapsedMs);
  if (elapsed < 1500) return elapsed / 1500;
  if (elapsed <= 2000) return 1;
  if (elapsed < 3000) return 1 - (elapsed - 2000) / 2000;
  return 0.5;
}

/** Cut peat at a charge fraction and count a near-perfect cut as a hit. */
export function cutPeat(state: GameState, chargeFraction: number): number {
  const fraction = Math.max(0, Math.min(1, chargeFraction));
  const peat = Math.max(5, 15 * productionPerSecond(state).peat) * fraction;
  state.peat += peat;
  state.totalPeatEarned += peat;
  if (fraction >= 0.95) state.minigameHits += 1;
  return peat;
}

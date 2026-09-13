import { productionPerSecond } from './engine';
import type { GameState } from './state';

/** Maximum streak value that increases calibration difficulty. */
export const STREAK_DIFFICULTY_CAP = 12;
/** Maximum calibration payout multiplier. */
export const STREAK_REWARD_CAP = 20;

/** Result of a calibration attempt, including its updated streak state. */
export interface CalibrationResult {
  hit: boolean;
  compute: number;
  evidence: number;
  streak: number;
  multiplier: number;
}

/** Return the needle period in milliseconds for a calibration streak. */
export function calibrationPeriod(streak: number): number {
  return 4084 / (1 + 0.16 * Math.min(streak, STREAK_DIFFICULTY_CAP));
}

/** Return the half-width of the calibration hit zone for a streak. */
export function calibrationZone(streak: number): number {
  return 0.08 - 0.00375 * Math.min(streak, STREAK_DIFFICULTY_CAP);
}

/** Return the calibration needle position for elapsed milliseconds. */
export function calibrationNeedle(elapsedMs: number, streak = 0): number {
  return 0.5 + 0.5 * Math.sin((2 * Math.PI * elapsedMs) / calibrationPeriod(streak));
}

/** Return the bounded payout multiplier for a successful calibration streak. */
export function streakMultiplier(streak: number): number {
  return Math.min(STREAK_REWARD_CAP, 1.3 ** (Math.max(1, streak) - 1));
}

/** Resolve a calibration attempt and award streak-scaled compute and evidence. */
export function calibrate(
  state: GameState,
  needlePos: number,
  rng: () => number = Math.random,
): CalibrationResult {
  const zone = calibrationZone(state.calibrationStreak);
  const hit = Math.abs(needlePos - state.calibrationTarget) <= zone;
  if (!hit) {
    state.calibrationStreak = 0;
    state.calibrationTarget = 0.5;
    return { hit: false, compute: 0, evidence: 0, streak: 0, multiplier: 1 };
  }
  const rates = productionPerSecond(state);
  const streak = state.calibrationStreak + 1;
  const multiplier = streakMultiplier(streak);
  const compute = Math.max(2, 2 * rates.compute) * multiplier;
  const evidence = Math.max(0.2, 0.5 * rates.evidence) * multiplier;
  state.calibrationStreak = streak;
  const nextZone = calibrationZone(streak);
  state.calibrationTarget = nextZone + rng() * (1 - 2 * nextZone);
  state.compute += compute;
  state.evidence += evidence;
  state.totalComputeEarned += compute;
  state.totalComputeThisRun += compute;
  state.totalEvidenceEarned += evidence;
  state.minigameHits += 1;
  return { hit: true, compute, evidence, streak, multiplier };
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

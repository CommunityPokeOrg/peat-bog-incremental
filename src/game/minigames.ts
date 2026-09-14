import { productionPerSecond } from './engine';
import { charterFactor } from './charter';
import type { GameState } from './state';
import { Decimal, type Decimal as DecimalType } from './decimal';

/** Maximum streak value that increases calibration difficulty. */
export const STREAK_DIFFICULTY_CAP = 12;
/** Maximum calibration payout multiplier. */
export const STREAK_REWARD_CAP = 20;

/** Result of a calibration attempt, including its updated streak state. */
export interface CalibrationResult {
  hit: boolean;
  compute: DecimalType;
  evidence: DecimalType;
  streak: number;
  multiplier: number;
}

/** Maximum age of a displayed needle frame considered at click time. */
export const CALIBRATION_GRACE_MS = 120;

/** A needle position drawn at a specific clock time. */
export interface NeedleFrame {
  at: number;
  pos: number;
}

/** Choose the displayed needle position most likely to explain a click. */
export function needleAtClick(
  frames: readonly NeedleFrame[],
  target: number,
  now: number,
  graceMs = CALIBRATION_GRACE_MS,
): number {
  if (frames.length === 0) return 0.5;
  const latest = frames.reduce((newest, frame) => (frame.at > newest.at ? frame : newest));
  let closest: NeedleFrame | undefined;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const frame of frames) {
    const age = now - frame.at;
    if (age < 0 || age > graceMs) continue;
    const distance = Math.abs(frame.pos - target);
    if (distance < closestDistance) {
      closest = frame;
      closestDistance = distance;
    }
  }
  return closest?.pos ?? latest.pos;
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
    return { hit: false, compute: Decimal.fromNumber(0), evidence: Decimal.fromNumber(0), streak: 0, multiplier: 1 };
  }
  const rates = productionPerSecond(state);
  const streak = state.calibrationStreak + 1;
  const multiplier = streakMultiplier(streak);
  const fieldworkFactor = charterFactor(state, 'fieldwork');
  const compute = Decimal.max(2, rates.compute.mul(2)).mul(multiplier).mul(fieldworkFactor);
  const evidence = Decimal.max(0.2, rates.evidence.mul(0.5)).mul(multiplier).mul(fieldworkFactor);
  state.calibrationStreak = streak;
  const nextZone = calibrationZone(streak);
  state.calibrationTarget = nextZone + rng() * (1 - 2 * nextZone);
  state.wallet.compute = state.wallet.compute.add(compute);
  state.wallet.evidence = state.wallet.evidence.add(evidence);
  state.lifetime.compute = state.lifetime.compute.add(compute);
  state.runCompute = state.runCompute.add(compute);
  state.lifetime.evidence = state.lifetime.evidence.add(evidence);
  state.minigameHits += 1;
  return { hit: true, compute, evidence, streak, multiplier };
}

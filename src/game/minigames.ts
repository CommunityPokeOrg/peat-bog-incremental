import { productionPerSecond } from './engine';
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
  const compute = Decimal.max(2, rates.compute.mul(2)).mul(multiplier);
  const evidence = Decimal.max(0.2, rates.evidence.mul(0.5)).mul(multiplier);
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

/** Convert a peat-cut hold duration into a clamped charge fraction. */
export function peatCutCharge(elapsedMs: number): number {
  const elapsed = Math.max(0, elapsedMs);
  if (elapsed < 1500) return elapsed / 1500;
  if (elapsed <= 2000) return 1;
  if (elapsed < 3000) return 1 - (elapsed - 2000) / 2000;
  return 0.5;
}

/** Cut peat at a charge fraction and count a near-perfect cut as a hit. */
export function cutPeat(state: GameState, chargeFraction: number): DecimalType {
  const fraction = Math.max(0, Math.min(1, chargeFraction));
  const peat = Decimal.max(5, productionPerSecond(state).peat.mul(15)).mul(fraction);
  state.wallet.peat = state.wallet.peat.add(peat);
  state.lifetime.peat = state.lifetime.peat.add(peat);
  if (fraction >= 0.95) state.minigameHits += 1;
  return peat;
}

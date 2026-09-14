import { describe, expect, it } from 'vitest';
import {
  calibrationNeedle,
  calibrationPeriod,
  calibrationZone,
  calibrate,
  needleAtClick,
  streakMultiplier,
  STREAK_DIFFICULTY_CAP,
  STREAK_REWARD_CAP,
} from '../src/game/minigames';
import { createInitialState } from '../src/game/state';

describe('minigame engine', () => {
  it('shrinks and caps streak difficulty', () => {
    expect(calibrationPeriod(0)).toBeCloseTo(4084);
    expect(calibrationPeriod(1)).toBeLessThan(calibrationPeriod(0));
    expect(calibrationPeriod(STREAK_DIFFICULTY_CAP)).toBeCloseTo(
      calibrationPeriod(STREAK_DIFFICULTY_CAP + 5),
    );
    expect(calibrationZone(1)).toBeLessThan(calibrationZone(0));
    expect(calibrationZone(STREAK_DIFFICULTY_CAP)).toBeCloseTo(
      calibrationZone(STREAK_DIFFICULTY_CAP + 5),
    );
    expect(calibrationNeedle(0)).toBeCloseTo(0.5);
  });

  it('caps streak payout multipliers', () => {
    expect(streakMultiplier(1)).toBe(1);
    expect(streakMultiplier(2)).toBeCloseTo(1.3);
    expect(streakMultiplier(3)).toBeCloseTo(1.69);
    expect(streakMultiplier(13)).toBe(STREAK_REWARD_CAP);
    expect(streakMultiplier(30)).toBe(STREAK_REWARD_CAP);
  });

  it('chooses the closest recently displayed needle frame', () => {
    expect(needleAtClick([
      { at: 100, pos: 0.55 },
      { at: 140, pos: 0.8 },
    ], 0.5, 180)).toBe(0.55);
    expect(needleAtClick([
      { at: -120, pos: 0.5 },
      { at: 140, pos: 0.8 },
    ], 0.5, 180)).toBe(0.8);
    expect(needleAtClick([], 0.5, 180)).toBe(0.5);
  });

  it('awards a growing payout for consecutive hits', () => {
    const state = createInitialState();
    state.buildings.rack = 1;
    state.buildings.chiller = 1;
    const first = calibrate(state, state.calibrationTarget, () => 0.5);
    const second = calibrate(state, state.calibrationTarget, () => 0.5);
    const third = calibrate(state, state.calibrationTarget, () => 0.5);
    expect(first).toMatchObject({ hit: true, streak: 1, multiplier: 1 });
    expect(first.compute.eq(4)).toBe(true);
    expect(second).toMatchObject({ hit: true, streak: 2, multiplier: 1.3 });
    expect(third).toMatchObject({ hit: true, streak: 3 });
    expect(third.multiplier).toBeCloseTo(1.69);
    expect(second.compute.div(first.compute).toNumber()).toBeCloseTo(1.3);
    expect(third.compute.div(first.compute).toNumber()).toBeCloseTo(1.69);
    expect(state.minigameHits).toBe(3);
    expect(state.calibrationStreak).toBe(3);
  });

  it('uses the current target and exact zone boundaries', () => {
    const state = createInitialState();
    const zone = calibrationZone(0);
    expect(calibrate(state, 0.5 + zone, () => 0.25).hit).toBe(true);

    const miss = createInitialState();
    expect(calibrate(miss, 0.5 + zone + 0.001).hit).toBe(false);
  });

  it('moves the target after hits and recentres it after misses', () => {
    const left = createInitialState();
    calibrate(left, 0.5, () => 0);
    expect(left.calibrationTarget).toBeCloseTo(calibrationZone(1));

    const right = createInitialState();
    calibrate(right, 0.5, () => 1);
    expect(right.calibrationTarget).toBeCloseTo(1 - calibrationZone(1));

    const middle = createInitialState();
    calibrate(middle, 0.5, () => 0.25);
    expect(middle.calibrationTarget).not.toBeCloseTo(left.calibrationTarget);

    const miss = createInitialState();
    miss.calibrationStreak = 4;
    miss.calibrationTarget = 0.7;
    const result = calibrate(miss, 0.5);
    expect(result).toMatchObject({ hit: false, streak: 0, multiplier: 1 });
    expect(result.compute.eq(0)).toBe(true);
    expect(result.evidence.eq(0)).toBe(true);
    expect(miss.calibrationTarget).toBe(0.5);
    expect(calibrationPeriod(0)).toBeCloseTo(4084);
    expect(calibrationZone(0)).toBeCloseTo(0.08);
  });

  it('gets harder at high streak for the same target', () => {
    const low = createInitialState();
    expect(calibrate(low, 0.57).hit).toBe(true);
    const high = createInitialState();
    high.calibrationStreak = STREAK_DIFFICULTY_CAP;
    expect(calibrate(high, 0.57).hit).toBe(false);
  });

  it('uses the bounded base payout even with zero production', () => {
    const state = createInitialState();
    const base = calibrate(state, state.calibrationTarget, () => 0.5).compute;
    expect(base.eq(2)).toBe(true);
    let final = base;
    for (let index = 1; index < 13; index += 1) {
      final = calibrate(state, state.calibrationTarget, () => 0.5).compute;
    }
    expect(final.toNumber()).toBeCloseTo(base.toNumber() * STREAK_REWARD_CAP);
  });
});

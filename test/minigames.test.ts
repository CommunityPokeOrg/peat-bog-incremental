import { describe, expect, it } from 'vitest';
import { calibrationNeedle, calibrate, cutPeat, peatCutCharge } from '../src/game/minigames';
import { createInitialState } from '../src/game/state';

describe('minigame engine', () => {
  it('resolves calibration hits and misses with reward floors', () => {
    const state = createInitialState();
    expect(calibrationNeedle(0)).toBeCloseTo(0.5);
    expect(calibrate(state, 0)).toEqual({ hit: true, compute: 10, evidence: 1 });
    expect(state.minigameHits).toBe(1);
    expect(calibrate(state, 650 * Math.PI / 2).hit).toBe(false);
  });

  it('awards peat by charge and counts full cuts', () => {
    const state = createInitialState();
    expect(cutPeat(state, 0.5)).toBeCloseTo(2.5);
    expect(cutPeat(state, 1)).toBeCloseTo(5);
    expect(state.minigameHits).toBe(1);
    expect(state.totalPeatEarned).toBeCloseTo(7.5);
  });

  it('follows the hold charge curve and overhold decay', () => {
    expect(peatCutCharge(0)).toBe(0);
    expect(peatCutCharge(750)).toBeCloseTo(0.5);
    expect(peatCutCharge(1500)).toBe(1);
    expect(peatCutCharge(2000)).toBe(1);
    expect(peatCutCharge(2500)).toBeCloseTo(0.75);
    expect(peatCutCharge(3000)).toBeCloseTo(0.5);
    expect(peatCutCharge(4000)).toBeCloseTo(0.5);
  });
});

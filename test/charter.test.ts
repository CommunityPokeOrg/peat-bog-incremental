import { describe, expect, it } from 'vitest';
import {
  buyCharter,
  charterAvailable,
  charterMultiplier,
} from '../src/game/charter';
import { computeOfflineEarnings, deserialize, offlineRate } from '../src/game/save';
import { createInitialState } from '../src/game/state';
import { prestige, prestigeGain, tick } from '../src/game/engine';

describe('Drainage Charter', () => {
  it('requires a parent and banked cores', () => {
    const state = createInitialState();
    const first = { id: 'roots-1', name: 'Deep Roots', emoji: '🌿', description: '', branch: 'roots' as const, cost: 1, effects: [] };
    const child = { ...first, id: 'roots-2', cost: 2, requires: 'roots-1' };
    expect(charterAvailable(state, first)).toBe(false);
    state.bogCores = 2;
    expect(charterAvailable(state, child)).toBe(false);
    expect(charterAvailable(state, first)).toBe(true);
  });

  it('spends cores and blocks a double purchase', () => {
    const state = createInitialState();
    state.bogCores = 1;
    expect(buyCharter(state, 'roots-1')).toBe(true);
    expect(state.bogCores).toBe(0);
    expect(buyCharter(state, 'roots-1')).toBe(false);
  });

  it('applies Charter multipliers and preserves terms through prestige', () => {
    const state = createInitialState();
    state.charter = ['kindling-1', 'kindling-2', 'kindling-3', 'kindling-4', 'roots-3'];
    state.bogCores = 1;
    expect(charterMultiplier(state, 'compute')).toBe(2);
    state.totalComputeThisRun = 1_000_000;
    expect(prestige(state)).toBe(1);
    expect(state.charter).toContain('kindling-4');
    expect(state.broth).toBe(10_000);
  });

  it('multiplies prestige gain with Reino precedent', () => {
    const state = createInitialState();
    state.charter = ['filing-4'];
    state.totalComputeThisRun = 4_000_000;
    expect(prestigeGain(state)).toBe(3);
  });

  it('adds Charter offline rate', () => {
    const state = createInitialState();
    state.buildings.harvester = 10;
    state.charter = ['filing-1', 'filing-2'];
    expect(computeOfflineEarnings(state, 100).broth).toBeCloseTo(5 * 100 * 0.11);
    expect(offlineRate(state)).toBeCloseTo(0.11);
  });

  it('advances research at double speed with Quick Study', () => {
    const state = createInitialState();
    state.charter = ['kindling-1', 'kindling-2', 'kindling-3'];
    state.researchQueue = [{ id: 'thermal-modelling', remaining: 10 }];
    tick(state, 5);
    expect(state.research).toEqual(['thermal-modelling']);
  });

  it('defaults expansion fields when loading a v3 save', () => {
    const state = deserialize(JSON.stringify({
      version: 3,
      broth: 0,
      compute: 0,
      bogCores: 0,
      totalBrothEarned: 0,
      totalComputeEarned: 0,
      totalComputeThisRun: 0,
      totalClicks: 0,
      buildings: {},
      revealed: [],
      upgrades: [],
      research: [],
      achievements: [],
      lastSaveTime: 0,
    }));
    expect(state?.sphagnum).toBe(0);
    expect(state?.methane).toBe(0);
    expect(state?.charter).toEqual([]);
    expect(state?.nightWatch).toBe(0);
  });

  it('round-trips Charter terms', () => {
    const state = createInitialState();
    state.charter = ['roots-1'];
    state.nightWatch = 7;
    state.calibrationTarget = 0.3;
    const roundTrip = deserialize(JSON.stringify(state));
    expect(roundTrip?.charter).toEqual(['roots-1']);
    expect(roundTrip?.nightWatch).toBe(7);
  });

  it('clamps a valid oversized Night Watch level on load', () => {
    const state = createInitialState();
    const raw = JSON.stringify({ ...state, nightWatch: 999 });
    expect(deserialize(raw)?.nightWatch).toBe(49);
  });
});

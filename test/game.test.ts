import { describe, expect, it } from 'vitest';
import { BUILDING_BY_ID } from '../src/game/data';
import {
  buildingCost,
  bulkCost,
  buyBuilding,
  checkAchievements,
  click,
  clickPower,
  maxAffordable,
  prestige,
  prestigeGain,
  productionPerSecond,
  thermalFactor,
  tick,
  totalCooling,
  totalHeat,
} from '../src/game/engine';
import { formatNumber } from '../src/game/format';
import {
  computeOfflineEarnings,
  deserialize,
  serialize,
  OFFLINE_CAP_SECONDS,
} from '../src/game/save';
import { createInitialState } from '../src/game/state';

describe('formatNumber', () => {
  it('formats small numbers plainly with up to 1 decimal', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(15)).toBe('15');
    expect(formatNumber(15.34)).toBe('15.3');
    expect(formatNumber(999.96)).toBe('1000'); // rounds over the boundary to a plain integer
  });
  it('uses suffixes', () => {
    expect(formatNumber(1000)).toBe('1.00K');
    expect(formatNumber(12_500)).toBe('12.5K');
    expect(formatNumber(1_000_000)).toBe('1.00M');
    expect(formatNumber(2_500_000_000)).toBe('2.50B');
    expect(formatNumber(1e12)).toBe('1.00T');
    expect(formatNumber(1e15)).toBe('1.00Qa');
    expect(formatNumber(1e33)).toBe('1.00Dc');
  });
  it('falls back to scientific beyond Dc', () => {
    expect(formatNumber(1e36)).toBe('1.00e+36');
  });
});

describe('buildingCost / bulkCost', () => {
  it('scales by 1.15 per owned', () => {
    const h = BUILDING_BY_ID['harvester'];
    expect(buildingCost(h, 0).broth).toBeCloseTo(15);
    expect(buildingCost(h, 1).broth).toBeCloseTo(17.25);
    expect(buildingCost(h, 10).broth).toBeCloseTo(15 * Math.pow(1.15, 10));
  });
  it('bulkCost sums the geometric series', () => {
    const h = BUILDING_BY_ID['harvester'];
    const single = buildingCost(h, 0).broth!;
    expect(bulkCost(h, 0, 1).broth).toBeCloseTo(single);
    expect(bulkCost(h, 0, 2).broth).toBeCloseTo(single + single * 1.15);
  });
  it('maxAffordable respects the wallet', () => {
    const state = createInitialState();
    const h = BUILDING_BY_ID['harvester'];
    state.broth = 15 + 15 * 1.15 - 0.001;
    expect(maxAffordable(h, 0, state)).toBe(1);
    state.broth += 0.002;
    expect(maxAffordable(h, 0, state)).toBe(2);
  });
});

describe('tick', () => {
  it('produces expected broth over time', () => {
    const state = createInitialState();
    state.buildings['harvester'] = 10; // 5 broth/s
    tick(state, 2);
    expect(state.broth).toBeCloseTo(10);
    expect(state.totalBrothEarned).toBeCloseTo(10);
  });
  it('ignores non-positive dt', () => {
    const state = createInitialState();
    state.buildings['harvester'] = 10;
    tick(state, 0);
    tick(state, -3);
    expect(state.broth).toBe(0);
  });
});

describe('thermal throttle', () => {
  it('multiplies compute by min(1, cooling/heat)', () => {
    const state = createInitialState();
    state.buildings['rack'] = 10; // 20 compute/s raw, 80 heat
    state.buildings['chiller'] = 4; // 40 cooling
    expect(totalHeat(state)).toBeCloseTo(80);
    expect(totalCooling(state)).toBeCloseTo(40);
    expect(thermalFactor(state)).toBeCloseTo(0.5);
    expect(productionPerSecond(state).computePerSecond).toBeCloseTo(10);
    state.buildings['chiller'] = 8; // 80 cooling
    expect(thermalFactor(state)).toBeCloseTo(1);
    expect(productionPerSecond(state).computePerSecond).toBeCloseTo(20);
  });
  it('no heat means factor 1', () => {
    const state = createInitialState();
    expect(thermalFactor(state)).toBe(1);
  });
});

describe('economy', () => {
  it('buyBuilding spends broth and adds units', () => {
    const state = createInitialState();
    state.broth = 100;
    expect(buyBuilding(state, 'harvester', 1)).toBe(true);
    expect(state.buildings['harvester']).toBe(1);
    expect(state.broth).toBeCloseTo(85);
    expect(buyBuilding(state, 'harvester', 99)).toBe(false);
  });
  it('click adds broth and counts', () => {
    const state = createInitialState();
    const gained = click(state);
    expect(gained).toBeCloseTo(1);
    expect(state.broth).toBeCloseTo(1);
    expect(state.totalClicks).toBe(1);
  });
  it('click upgrades multiply power', () => {
    const state = createInitialState();
    state.upgrades.push('spade', 'gloves');
    expect(clickPower(state)).toBeCloseTo(4);
  });
});

describe('save', () => {
  it('deserialize returns null on garbage', () => {
    expect(deserialize(null)).toBeNull();
    expect(deserialize('not json')).toBeNull();
    expect(deserialize('{"a":1}')).toBeNull();
    expect(deserialize('42')).toBeNull();
  });
  it('roundtrips a real state', () => {
    const state = createInitialState();
    state.broth = 123.5;
    state.buildings['harvester'] = 7;
    state.upgrades.push('spade');
    state.achievements.push('click-1');
    const back = deserialize(serialize(state));
    expect(back).not.toBeNull();
    expect(back!.broth).toBeCloseTo(123.5);
    expect(back!.buildings['harvester']).toBe(7);
    expect(back!.upgrades).toEqual(['spade']);
    expect(back!.achievements).toEqual(['click-1']);
  });
});

describe('offline earnings', () => {
  it('pays 50% rate and caps at 8 hours', () => {
    const state = createInitialState();
    state.buildings['harvester'] = 10; // 5 broth/s
    const e1 = computeOfflineEarnings(state, 100);
    expect(e1.broth).toBeCloseTo(5 * 100 * 0.5);
    const e2 = computeOfflineEarnings(state, OFFLINE_CAP_SECONDS * 4);
    expect(e2.seconds).toBe(OFFLINE_CAP_SECONDS);
    expect(e2.broth).toBeCloseTo(5 * OFFLINE_CAP_SECONDS * 0.5);
  });
});

describe('prestige', () => {
  it('gain is floor(sqrt(totalComputeThisRun / 1e6))', () => {
    const state = createInitialState();
    state.totalComputeThisRun = 999_999;
    expect(prestigeGain(state)).toBe(0);
    state.totalComputeThisRun = 4_000_000;
    expect(prestigeGain(state)).toBe(2);
  });
  it('resets the run and banks cores', () => {
    const state = createInitialState();
    state.totalComputeThisRun = 4_000_000;
    state.broth = 500;
    state.buildings['rack'] = 5;
    state.achievements.push('click-1');
    expect(prestige(state)).toBe(2);
    expect(state.bogCores).toBe(2);
    expect(state.broth).toBe(0);
    expect(state.totalComputeThisRun).toBe(0);
    expect(state.buildings).toEqual({});
    expect(state.achievements).toEqual(['click-1']);
    expect(prestige(state)).toBe(0); // cannot prestige twice
  });
});

describe('achievements', () => {
  it('unlocks first click and production achievements once', () => {
    const state = createInitialState();
    click(state);
    const newly = checkAchievements(state);
    expect(newly).toContain('click-1');
    expect(checkAchievements(state)).toEqual([]);
  });
  it('full-cool requires 100+ heat at 100% cooling', () => {
    const state = createInitialState();
    state.buildings['rack'] = 13; // 104 heat
    state.buildings['chiller'] = 11; // 110 cooling
    expect(checkAchievements(state)).toContain('full-cool');
  });
});

import { describe, expect, it } from 'vitest';
import { BUILDING_BY_ID, UPGRADE_BY_ID } from '../src/game/data';
import {
  buildingCost,
  buildingMultiplier,
  buildingVisible,
  bulkCost,
  buyBuilding,
  checkAchievements,
  click,
  clickPower,
  canAfford,
  maxAffordable,
  prestige,
  payCost,
  prestigeGain,
  productionPerSecond,
  revealBuildings,
  thermalFactor,
  tick,
  totalCooling,
  totalHeat,
  upgradeVisible,
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
  it('accrues peat and evidence alongside broth and compute', () => {
    const state = createInitialState();
    state.buildings.cutter = 10;
    state.buildings.clerk = 5;
    tick(state, 2);
    expect(state.peat).toBeCloseTo(6);
    expect(state.totalPeatEarned).toBeCloseTo(6);
    expect(state.evidence).toBeCloseTo(2);
    expect(state.totalEvidenceEarned).toBeCloseTo(2);
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
    expect(productionPerSecond(state).compute).toBeCloseTo(10);
    state.buildings['chiller'] = 8; // 80 cooling
    expect(thermalFactor(state)).toBeCloseTo(1);
    expect(productionPerSecond(state).compute).toBeCloseTo(20);
  });
  it('no heat means factor 1', () => {
    const state = createInitialState();
    expect(thermalFactor(state)).toBe(1);
  });
});

describe('economy', () => {
  it('handles peat and evidence costs generically', () => {
    const state = createInitialState();
    state.peat = 20;
    state.evidence = 4;
    expect(canAfford(state, { peat: 20, evidence: 4 })).toBe(true);
    payCost(state, { peat: 3, evidence: 2 });
    expect(state.peat).toBe(17);
    expect(state.evidence).toBe(2);
    expect(canAfford(state, { peat: 18 })).toBe(false);
  });
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

  it('multiplies a building for each owned overclock tier', () => {
    const state = createInitialState();
    state.buildings.harvester = 5;
    state.upgrades.push('boost-harvester', 'boost-harvester-50');
    expect(buildingMultiplier(state, 'harvester')).toBe(4);
    expect(productionPerSecond(state).broth).toBeCloseTo(10);
  });
});

describe('progressive building gating', () => {
  it('reveals buildings when production thresholds are met', () => {
    const state = createInitialState();
    expect(buildingVisible(state, BUILDING_BY_ID.dredger)).toBe(false);
    state.buildings.harvester = 100;
    expect(revealBuildings(state)).toContain('dredger');
    expect(buildingVisible(state, BUILDING_BY_ID.dredger)).toBe(true);
  });

  it('refuses to buy hidden buildings', () => {
    const state = createInitialState();
    state.broth = 100_000;
    expect(buyBuilding(state, 'dredger', 1)).toBe(false);
    state.buildings.harvester = 100;
    revealBuildings(state);
    expect(buyBuilding(state, 'dredger', 1)).toBe(true);
  });

  it('requires all building requirements for an upgrade', () => {
    const state = createInitialState();
    const upgrade = UPGRADE_BY_ID['fry-oil-coolant'];
    state.buildings.chiller = 25;
    expect(upgradeVisible(state, upgrade)).toBe(false);
    state.buildings.fryer = 1;
    expect(upgradeVisible(state, upgrade)).toBe(true);
  });

  it('gates click upgrades by lifetime earnings', () => {
    const state = createInitialState();
    expect(upgradeVisible(state, UPGRADE_BY_ID.spade)).toBe(false);
    state.totalBrothEarned = 5;
    expect(upgradeVisible(state, UPGRADE_BY_ID.spade)).toBe(true);
    expect(upgradeVisible(state, UPGRADE_BY_ID.buckets)).toBe(false);
  });

  it('applies thermal upgrade multipliers', () => {
    const state = createInitialState();
    state.buildings.rack = 10;
    state.buildings.chiller = 4;
    state.upgrades.push('fry-oil-coolant', 'dawn-shift');
    expect(totalHeat(state)).toBeCloseTo(80 * 0.9);
    expect(totalCooling(state)).toBeCloseTo(40 * 1.25);
  });
});

describe('save', () => {
  it('deserialize returns null on garbage', () => {
    expect(deserialize(null)).toBeNull();
    expect(deserialize('not json')).toBeNull();
    expect(deserialize('{"a":1}')).toBeNull();
    expect(deserialize('42')).toBeNull();
  });

  it('loads a literal version 1 save without revealed buildings', () => {
    const raw = JSON.stringify({
      version: 1,
      broth: 12,
      compute: 3,
      bogCores: 0,
      totalBrothEarned: 12,
      totalComputeEarned: 3,
      totalComputeThisRun: 3,
      totalClicks: 2,
      buildings: { harvester: 1 },
      upgrades: [],
      research: [],
      achievements: [],
      lastSaveTime: 123,
    });
    const loaded = deserialize(raw);
    expect(loaded?.broth).toBe(12);
    expect(loaded?.revealed).toEqual([]);
  });
  it('loads a version 2 save with new resources and queues defaulted', () => {
    const raw = JSON.stringify({
      version: 2,
      broth: 12,
      compute: 3,
      bogCores: 0,
      totalBrothEarned: 12,
      totalComputeEarned: 3,
      totalComputeThisRun: 3,
      totalClicks: 2,
      buildings: { harvester: 1 },
      revealed: [],
      upgrades: [],
      research: [],
      achievements: [],
      lastSaveTime: 123,
    });
    const loaded = deserialize(raw)!;
    expect(loaded.version).toBe(2);
    expect(loaded.peat).toBe(0);
    expect(loaded.evidence).toBe(0);
    expect(loaded.researchQueue).toEqual([]);
    expect(loaded.quests).toEqual({ claimed: [], buffs: [] });
  });
  it('roundtrips a real state', () => {
    const state = createInitialState();
    state.broth = 123.5;
    state.buildings['harvester'] = 7;
    state.upgrades.push('spade');
    state.achievements.push('click-1');
    state.peat = 4;
    state.evidence = 5;
    state.researchQueue.push({ id: 'thermal-modelling', remaining: 12 });
    state.quests.claimed.push('q-clause');
    const back = deserialize(serialize(state));
    expect(back).not.toBeNull();
    expect(back!.broth).toBeCloseTo(123.5);
    expect(back!.buildings['harvester']).toBe(7);
    expect(back!.upgrades).toEqual(['spade']);
    expect(back!.achievements).toEqual(['click-1']);
    expect(back!.peat).toBe(4);
    expect(back!.evidence).toBe(5);
    expect(back!.researchQueue).toEqual([{ id: 'thermal-modelling', remaining: 12 }]);
    expect(back!.quests.claimed).toEqual(['q-clause']);
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

describe('Sector 4 research and upgrades', () => {
  it('reduces heat with the lubrication clause', () => {
    const state = createInitialState();
    state.buildings.rack = 10;
    state.research.push('lubrication-clause');
    expect(totalHeat(state)).toBeCloseTo(80 * 0.85);
  });

  it('multiplies both production rates after the Nordic verdict', () => {
    const state = createInitialState();
    state.buildings.harvester = 10;
    state.buildings.rack = 10;
    state.buildings.chiller = 8;
    const before = productionPerSecond(state);
    state.research.push('nordic-verdict');
    const after = productionPerSecond(state);
    expect(after.broth).toBeCloseTo(before.broth * 1.5);
    expect(after.compute).toBeCloseTo(before.compute * 1.5);
  });

  it('triples click power with hot fries', () => {
    const state = createInitialState();
    state.upgrades.push('hot-fries');
    expect(clickPower(state)).toBeCloseTo(3);
  });
});

describe('new docket achievements', () => {
  it('unlocks debt-free at 59 broth', () => {
    const state = createInitialState();
    state.totalBrothEarned = 59;
    expect(checkAchievements(state)).toContain('debt-free');
  });

  it('unlocks the Reino verdict after research', () => {
    const state = createInitialState();
    state.research.push('nordic-verdict');
    expect(checkAchievements(state)).toContain('reino-verdict');
  });
});

import { describe, expect, it } from 'vitest';
import { D } from '../src/game/decimal';
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
  buyNightWatch,
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
  nightWatchCost,
} from '../src/game/engine';
import { formatCost, formatNumber } from '../src/game/format';
import {
  computeOfflineEarnings,
  deserialize,
  offlineRate,
  offlineRateBreakdown,
  sanitizeElapsedSeconds,
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
    expect(formatNumber(1e36)).toBe('1.00e36');
  });
});

describe('buildingCost / bulkCost', () => {
  it('scales by 1.15 per owned', () => {
    const h = BUILDING_BY_ID['harvester'];
    expect(buildingCost(h, 0).broth!.toNumber()).toBeCloseTo(15);
    expect(buildingCost(h, 1).broth!.toNumber()).toBeCloseTo(17.25);
    expect(buildingCost(h, 10).broth!.toNumber()).toBeCloseTo(15 * Math.pow(1.15, 10));
  });
  it('bulkCost sums the geometric series', () => {
    const h = BUILDING_BY_ID['harvester'];
    const single = buildingCost(h, 0).broth!;
    expect(bulkCost(h, 0, 1).broth!.toNumber()).toBeCloseTo(single.toNumber());
    expect(bulkCost(h, 0, 2).broth!.toNumber()).toBeCloseTo(single.toNumber() + single.toNumber() * 1.15);
  });
  it('maxAffordable respects the wallet', () => {
    const state = createInitialState();
    const h = BUILDING_BY_ID['harvester'];
  state.wallet.broth = D(15 + 15 * 1.15 - 0.001);
    expect(maxAffordable(h, 0, state)).toBe(1);
  state.wallet.broth = state.wallet.broth.add(0.002);
    expect(maxAffordable(h, 0, state)).toBe(2);
  });
});

describe('tick', () => {
  it('produces expected broth over time', () => {
    const state = createInitialState();
    state.buildings['harvester'] = 10; // 5 broth/s
    tick(state, 2);
    expect(state.wallet.broth.toNumber()).toBeCloseTo(10);
    expect(state.lifetime.broth.toNumber()).toBeCloseTo(10);
  });
  it('accrues peat and evidence alongside broth and compute', () => {
    const state = createInitialState();
    state.buildings.cutter = 10;
    state.buildings.clerk = 5;
    tick(state, 2);
    expect(state.wallet.peat.toNumber()).toBeCloseTo(6);
    expect(state.lifetime.peat.toNumber()).toBeCloseTo(6);
    expect(state.wallet.evidence.toNumber()).toBeCloseTo(2);
    expect(state.lifetime.evidence.toNumber()).toBeCloseTo(2);
  });
  it('produces sphagnum and methane from the new buildings', () => {
    const state = createInitialState();
    state.buildings.nursery = 2;
    state.buildings.digester = 4;
    tick(state, 5);
    expect(state.wallet.sphagnum.toNumber()).toBeCloseTo(4);
    expect(state.wallet.methane.toNumber()).toBeCloseTo(10);
    expect(state.lifetime.sphagnum.toNumber()).toBeCloseTo(4);
    expect(state.lifetime.methane.toNumber()).toBeCloseTo(10);
  });
  it('ignores non-positive dt', () => {
    const state = createInitialState();
    state.buildings['harvester'] = 10;
    tick(state, 0);
    tick(state, -3);
    expect(state.wallet.broth.eq(0)).toBe(true);
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
    expect(productionPerSecond(state).compute.toNumber()).toBeCloseTo(10);
    state.buildings['chiller'] = 8; // 80 cooling
    expect(thermalFactor(state)).toBeCloseTo(1);
    expect(productionPerSecond(state).compute.toNumber()).toBeCloseTo(20);
  });
  it('no heat means factor 1', () => {
    const state = createInitialState();
    expect(thermalFactor(state).toNumber()).toBe(1);
  });
});

describe('economy', () => {
  it('handles peat and evidence costs generically', () => {
    const state = createInitialState();
  state.wallet.peat = D(20);
  state.wallet.evidence = D(4);
    expect(canAfford(state, { peat: 20, evidence: 4 })).toBe(true);
    payCost(state, { peat: 3, evidence: 2 });
    expect(state.wallet.peat.toNumber()).toBe(17);
    expect(state.wallet.evidence.toNumber()).toBe(2);
    expect(canAfford(state, { peat: 18 })).toBe(false);
  });
  it('formats the expanded resource cost order', () => {
    expect(formatCost({ broth: 1, peat: 2, sphagnum: 3, methane: 4, compute: 5, evidence: 6 }))
      .toBe('1 fp16 compute broth · 2 raw peat · 3 sphagnum moss · 4 bog methane · 5 compute · 6 case evidence');
  });
  it('pays sphagnum building costs', () => {
    const state = createInitialState();
    state.revealed.push('deposition');
  state.wallet.broth = D(200_000);
  state.wallet.compute = D(5_000);
  state.wallet.sphagnum = D(500);
    expect(buyBuilding(state, 'deposition', 1)).toBe(true);
    expect(state.wallet.sphagnum.eq(0)).toBe(true);
  });
  it('reveals the Moss Terrace at 3 sphagnum per second', () => {
    const state = createInitialState();
    state.buildings.nursery = 8;
    expect(revealBuildings(state)).toContain('terrace');
  });
  it('buyBuilding spends broth and adds units', () => {
    const state = createInitialState();
  state.wallet.broth = D(100);
    expect(buyBuilding(state, 'harvester', 1)).toBe(true);
    expect(state.buildings['harvester']).toBe(1);
    expect(state.wallet.broth.toNumber()).toBeCloseTo(85);
    expect(buyBuilding(state, 'harvester', 99)).toBe(false);
  });
  it('click adds broth and counts', () => {
    const state = createInitialState();
    const gained = click(state);
    expect(gained.toNumber()).toBeCloseTo(1);
    expect(state.wallet.broth.toNumber()).toBeCloseTo(1);
    expect(state.totalClicks).toBe(1);
  });
  it('click upgrades multiply power', () => {
    const state = createInitialState();
    state.upgrades.push('spade', 'gloves');
    expect(clickPower(state)).toBeCloseTo(4);
  });
  it('resource upgrades multiply only their target rate', () => {
    const state = createInitialState();
    state.buildings.cutter = 10;
    state.buildings.nursery = 10;
    state.upgrades.push('moss-mulch');
    const rates = productionPerSecond(state);
    expect(rates.peat.toNumber()).toBeCloseTo(4.5);
    expect(rates.sphagnum.toNumber()).toBeCloseTo(4);
  });
  it('applies the Pierre relic to peat production', () => {
    const state = createInitialState();
    state.buildings.cutter = 10;
    state.upgrades.push('pierre-spade');
    expect(productionPerSecond(state).peat.toNumber()).toBeCloseTo(3.6);
  });

  it('multiplies a building for each owned overclock tier', () => {
    const state = createInitialState();
    state.buildings.harvester = 5;
    state.upgrades.push('boost-harvester', 'boost-harvester-50');
    expect(buildingMultiplier(state, 'harvester')).toBe(4);
    expect(productionPerSecond(state).broth.toNumber()).toBeCloseTo(10);
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
  state.wallet.broth = D(100_000);
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
    state.lifetime.broth = D(5);
    state.lifetime.peat = D(1);
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
    expect(loaded?.wallet.broth.eq(12)).toBe(true);
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
    expect(loaded.version).toBe(7);
    expect(loaded.wallet.peat.eq(0)).toBe(true);
    expect(loaded.wallet.evidence.eq(0)).toBe(true);
    expect(loaded.wallet.sphagnum.eq(0)).toBe(true);
    expect(loaded.wallet.methane.eq(0)).toBe(true);
    expect(loaded.lifetime.sphagnum.eq(0)).toBe(true);
    expect(loaded.lifetime.methane.eq(0)).toBe(true);
    expect(loaded.charter).toEqual([]);
    expect(loaded.calibrationStreak).toBe(0);
    expect(loaded.calibrationTarget).toBe(0.5);
    expect(loaded.researchQueue).toEqual([]);
    expect(loaded.quests).toEqual({
      claimed: [],
      buffs: [],
      permanent: [],
      bountyCount: {},
      bountyBase: {},
    });
  });
  it('roundtrips a real state', () => {
    const state = createInitialState();
  state.wallet.broth = D(123.5);
    state.buildings['harvester'] = 7;
    state.upgrades.push('spade');
    state.achievements.push('click-1');
  state.wallet.peat = D(4);
  state.wallet.evidence = D(5);
  state.wallet.sphagnum = D(6);
  state.wallet.methane = D(7);
  state.lifetime.sphagnum = D(8);
  state.lifetime.methane = D(9);
    state.charter.push('seal', 'roots-1');
    state.calibrationStreak = 7;
    state.calibrationTarget = 0.3;
    state.researchQueue.push({ id: 'thermal-modelling', remaining: 12 });
    state.quests.claimed.push('q-clause');
    const back = deserialize(serialize(state));
    expect(back).not.toBeNull();
    expect(back!.wallet.broth.toNumber()).toBeCloseTo(123.5);
    expect(back!.buildings['harvester']).toBe(7);
    expect(back!.upgrades).toEqual(['spade']);
    expect(back!.achievements).toEqual(['click-1']);
    expect(back!.wallet.peat.eq(4)).toBe(true);
    expect(back!.wallet.evidence.eq(5)).toBe(true);
    expect(back!.wallet.sphagnum.eq(6)).toBe(true);
    expect(back!.wallet.methane.eq(7)).toBe(true);
    expect(back!.lifetime.sphagnum.eq(8)).toBe(true);
    expect(back!.lifetime.methane.eq(9)).toBe(true);
    expect(back!.charter).toEqual(['seal', 'roots-1']);
    expect(back!.calibrationStreak).toBe(7);
    expect(back!.calibrationTarget).toBe(0.3);
    expect(back!.researchQueue).toEqual([{ id: 'thermal-modelling', remaining: 12 }]);
    expect(back!.quests.claimed).toEqual(['q-clause']);
  });
});

describe('offline earnings', () => {
  it('composes baseline, Night Watch, and Charter offline rates and caps at 8 hours', () => {
    const state = createInitialState();
    state.buildings['harvester'] = 10; // 5 broth/s
    expect(offlineRate(state)).toBeCloseTo(0.01);
    state.nightWatch = 5;
    expect(offlineRate(state)).toBeCloseTo(0.06);
    state.charter = ['filing-1', 'filing-2'];
    expect(offlineRateBreakdown(state)).toEqual({
      base: 0.01,
      nightWatch: 0.05,
      charter: 0.1,
      total: 0.16,
    });
    const e1 = computeOfflineEarnings(state, 100);
    expect(e1.rate).toBeCloseTo(0.16);
    expect(e1.broth.toNumber()).toBeCloseTo(5 * 100 * 0.16);
    state.nightWatch = 100;
    state.charter = ['filing-1', 'filing-2', 'filing-5'];
    expect(offlineRate(state)).toBe(1);
    const e2 = computeOfflineEarnings(state, OFFLINE_CAP_SECONDS * 4);
    expect(e2.seconds).toBe(OFFLINE_CAP_SECONDS);
    expect(e2.broth.toNumber()).toBeCloseTo(5 * OFFLINE_CAP_SECONDS);
  });

  it('sanitizes wall-clock jumps against monotonic elapsed time', () => {
    expect(sanitizeElapsedSeconds(10_000, 12_000)).toBe(10);
    expect(sanitizeElapsedSeconds(-1, 12_000)).toBe(12);
    expect(sanitizeElapsedSeconds(400_001, 100_000)).toBe(100);
    expect(sanitizeElapsedSeconds(Number.NaN, 12_000)).toBe(12);
  });

  it('buys Night Watch levels with exponential costs and preserves them through prestige', () => {
    const state = createInitialState();
    expect(nightWatchCost(1).broth!.toNumber()).toBe(Math.round(nightWatchCost(0).broth!.toNumber() * 1.9));
  state.wallet.broth = nightWatchCost(0).broth!;
    expect(buyNightWatch(state)).toBe(true);
    expect(state.nightWatch).toBe(1);
    expect(state.wallet.broth.eq(0)).toBe(true);
    state.nightWatch = 49;
  state.wallet.broth = D(1e100);
    expect(buyNightWatch(state)).toBe(false);
    state.nightWatch = 7;
  state.runCompute = D(1_000_000);
    expect(prestige(state).toNumber()).toBe(1);
    expect(state.nightWatch).toBe(7);
  });
});

describe('prestige', () => {
  it('gain is floor(sqrt(totalComputeThisRun / 1e6))', () => {
    const state = createInitialState();
  state.runCompute = D(999_999);
    expect(prestigeGain(state).eq(0)).toBe(true);
  state.runCompute = D(4_000_000);
    state.calibrationStreak = 5;
    state.calibrationTarget = 0.3;
    expect(prestigeGain(state).toNumber()).toBe(2);
  });
  it('resets the run and banks cores', () => {
    const state = createInitialState();
  state.runCompute = D(4_000_000);
  state.wallet.broth = D(500);
    state.buildings['rack'] = 5;
    state.achievements.push('click-1');
    expect(prestige(state).toNumber()).toBe(2);
    expect(state.wallet.bogCores.eq(2)).toBe(true);
    expect(state.wallet.broth.eq(0)).toBe(true);
    expect(state.runCompute.eq(0)).toBe(true);
    expect(state.calibrationStreak).toBe(0);
    expect(state.calibrationTarget).toBe(0.5);
    expect(state.buildings).toEqual({});
    expect(state.achievements).toEqual(['click-1']);
    expect(prestige(state).eq(0)).toBe(true); // cannot prestige twice
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
    expect(after.broth.toNumber()).toBeCloseTo(before.broth.toNumber() * 1.5);
    expect(after.compute.toNumber()).toBeCloseTo(before.compute.toNumber() * 1.5);
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
  state.lifetime.broth = D(59);
    expect(checkAchievements(state)).toContain('debt-free');
  });

  it('unlocks the Reino verdict after research', () => {
    const state = createInitialState();
    state.research.push('nordic-verdict');
    expect(checkAchievements(state)).toContain('reino-verdict');
  });

  it('unlocks Keeper and relic achievements', () => {
    const state = createInitialState();
    state.quests.claimed = ['k-pierre', 'k-mia', 'k-shrome', 'k-samkals', 'k-spaced', 'k-vwh', 'k-hermano', 'k-tassie', 'k-kreatix', 'k-poke'];
    state.upgrades.push('pierre-spade', 'shrome-lantern', 'samkals-ledger', 'kreatix-gauge');
    expect(checkAchievements(state)).toEqual(expect.arrayContaining(['keepers-all', 'relics-4']));
  });
});

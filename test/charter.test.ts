import { describe, expect, it } from 'vitest';
import { D } from '../src/game/decimal';
import {
  CHARTER,
  CHARTER_ROOT_ID,
  buyCharter,
  charterAvailable,
  charterMultiplier,
} from '../src/game/charter';
import { BUILDINGS } from '../src/game/data';
import { calibrate, cutPeat } from '../src/game/minigames';
import { computeOfflineEarnings, deserialize, offlineRate } from '../src/game/save';
import { createInitialState } from '../src/game/state';
import {
  buildingCost,
  costScaleFor,
  prestige,
  prestigeGain,
  productionPerSecond,
  settleTick,
  tick,
} from '../src/game/engine';

describe('Drainage Charter', () => {
  it('contains a complete distinct reachable Charter graph', () => {
    expect(CHARTER.length).toBeGreaterThanOrEqual(300);
    for (const field of ['id', 'name', 'description'] as const) {
      expect(new Set(CHARTER.map((node) => node[field])).size).toBe(CHARTER.length);
    }
    const ids = new Set(CHARTER.map((node) => node.id));
    for (const node of CHARTER) {
      if (node.requires) expect(ids).toContain(node.requires);
      for (const requirement of node.requiresAny ?? []) expect(ids).toContain(requirement);
      expect(!(node.requires && node.requiresAny?.includes(node.requires))).toBe(true);
    }
    const reachable = new Set<string>();
    const visit = (id: string): void => {
      if (reachable.has(id)) return;
      reachable.add(id);
      for (const node of CHARTER) {
        if (node.requires === id || node.requiresAny?.includes(id)) visit(node.id);
      }
    };
    visit(CHARTER_ROOT_ID);
    expect(reachable.size).toBe(CHARTER.length);
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const walk = (id: string): void => {
      if (visiting.has(id)) throw new Error(`cycle at ${id}`);
      if (visited.has(id)) return;
      visiting.add(id);
      const node = CHARTER.find((candidate) => candidate.id === id);
      if (node?.requires) walk(node.requires);
      for (const requirement of node?.requiresAny ?? []) walk(requirement);
      visiting.delete(id);
      visited.add(id);
    };
    for (const node of CHARTER) walk(node.id);
    expect(CHARTER.reduce((sum, node) => sum + node.cost, 0)).toBeGreaterThanOrEqual(20_000);
    expect(CHARTER.reduce((sum, node) => sum + node.cost, 0)).toBeLessThanOrEqual(30_000);
  });

  it('puts at least 40 nodes within a 60-core purchase path', () => {
    const costToReach = new Map<string, number>();
    const resolve = (id: string): number => {
      const cached = costToReach.get(id);
      if (cached !== undefined) return cached;
      const node = CHARTER.find((candidate) => candidate.id === id)!;
      const parentCost = node.requires ? resolve(node.requires) : 0;
      const alternateCost = node.requiresAny?.length
        ? Math.min(...node.requiresAny.map(resolve))
        : 0;
      const total = node.cost + parentCost + alternateCost;
      costToReach.set(id, total);
      return total;
    };
    expect(CHARTER.filter((node) => resolve(node.id) <= 60).length).toBeGreaterThanOrEqual(40);
  });

  it('requires a parent and banked cores', () => {
    const state = createInitialState();
    const first = { id: 'roots-1', name: 'Deep Roots', emoji: '🌿', description: '', branch: 'roots' as const, cost: 1, effects: [] };
    const child = { ...first, id: 'roots-2', cost: 2, requires: 'roots-1' };
    expect(charterAvailable(state, first)).toBe(false);
    state.wallet.bogCores = D(2);
    expect(charterAvailable(state, child)).toBe(false);
    expect(charterAvailable(state, first)).toBe(true);
  });

  it('spends cores and blocks a double purchase', () => {
    const state = createInitialState();
    state.wallet.bogCores = D(2);
    expect(buyCharter(state, 'roots-1')).toBe(false);
    expect(buyCharter(state, 'seal')).toBe(true);
    expect(buyCharter(state, 'roots-1')).toBe(true);
    expect(state.wallet.bogCores.eq(0)).toBe(true);
    expect(buyCharter(state, 'roots-1')).toBe(false);
  });

  it('applies Charter multipliers and preserves terms through prestige', () => {
    const state = createInitialState();
    state.charter = ['kindling-1', 'kindling-2', 'kindling-3', 'kindling-4', 'roots-3'];
    state.wallet.bogCores = D(1);
    expect(charterMultiplier(state, 'compute')).toBe(2);
    state.runCompute = D(1_000_000);
    expect(prestige(state).toNumber()).toBe(1);
    expect(state.charter).toContain('kindling-4');
    expect(state.wallet.broth.eq(10_000)).toBe(true);
  });

  it('multiplies prestige gain with Reino precedent', () => {
    const state = createInitialState();
    state.charter = ['filing-4'];
    state.runCompute = D(4_000_000);
    expect(prestigeGain(state).toNumber()).toBe(3);
  });

  it('adds Charter offline rate', () => {
    const state = createInitialState();
    state.buildings.harvester = 10;
    state.charter = ['filing-1', 'filing-2'];
    expect(computeOfflineEarnings(state, 100).broth.toNumber()).toBeCloseTo(5 * 100 * 0.11);
    expect(offlineRate(state)).toBeCloseTo(0.11);
  });

  it('applies fieldwork rewards through calibration and peat cutting', () => {
    const baseline = createInitialState();
    baseline.calibrationTarget = 0.5;
    const baseCalibration = calibrate(baseline, 0.5, () => 0.5);
    const boosted = createInitialState();
    boosted.charter = ['hands-2-1'];
    boosted.calibrationTarget = 0.5;
    const boostedCalibration = calibrate(boosted, 0.5, () => 0.5);
    expect(boostedCalibration.compute.gt(baseCalibration.compute)).toBe(true);
    const peatState = createInitialState();
    const basePeat = cutPeat(peatState, 1);
    const charterPeatState = createInitialState();
    charterPeatState.charter = ['hands-2-1'];
    expect(cutPeat(charterPeatState, 1).gt(basePeat)).toBe(true);
  });

  it('applies cost-scale deltas without crossing the floor', () => {
    const state = createInitialState();
    state.charter = ['engines-3-6'];
    const source = BUILDINGS.find((building) => building.line === 'briquettes')!;
    expect(costScaleFor(state, { ...source, costScale: 1.06 })).toBe(1.05);
  });

  it('counts free buildings for production but not for cost', () => {
    const state = createInitialState();
    state.charter = ['engines-4-1'];
    const harvester = BUILDINGS.find((building) => building.id === 'harvester')!;
    expect(productionPerSecond(state).broth.gt(0)).toBe(true);
    expect(buildingCost(harvester, 0, state).broth?.eq(buildingCost(harvester, 0).broth!)).toBe(true);
  });

  it('extends the offline cap and applies offline-only multipliers', () => {
    const state = createInitialState();
    state.buildings.harvester = 1;
    state.charter = ['lamps-2-1', 'lamps-3-1'];
    const earnings = computeOfflineEarnings(state, 8 * 3600 + 1800);
    expect(earnings.seconds).toBe(8 * 3600 + 1800);
    const baseline = computeOfflineEarnings({ ...createInitialState(), buildings: { harvester: 1 } }, earnings.seconds);
    expect(earnings.broth.gt(baseline.broth)).toBe(true);
  });

  it('adds Charter byproducts during settlement', () => {
    const state = createInitialState();
    state.buildings.nursery = 1;
    state.charter = ['stills-3-2'];
    const settlement = settleTick(state, 1);
    expect(settlement.gained.sphagnum.gt(0)).toBe(true);
    expect(settlement.gained.sediment.gt(0)).toBe(true);
  });

  it('caps per-quest Charter scaling', () => {
    const state = createInitialState();
    state.charter = ['keepers-1-1'];
    state.quests.claimed = Array.from({ length: 100 }, (_, index) => `quest-${index}`);
    expect(charterMultiplier(state, 'broth')).toBeCloseTo(1.1);
  });

  it('grants generalized starting resources on drain', () => {
    const state = createInitialState();
    state.charter = ['keepers-4-1'];
    state.runCompute = D(1_000_000);
    prestige(state);
    expect(state.wallet.broth.eq(100)).toBe(true);
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
    expect(state?.wallet.sphagnum.eq(0)).toBe(true);
    expect(state?.wallet.methane.eq(0)).toBe(true);
    expect(state?.charter).toEqual([]);
    expect(state?.nightWatch).toBe(0);
  });

  it('round-trips Charter terms', () => {
    const state = createInitialState();
    state.charter = ['seal', 'roots-1'];
    state.nightWatch = 7;
    state.calibrationTarget = 0.3;
    const roundTrip = deserialize(JSON.stringify(state));
    expect(roundTrip?.charter).toEqual(['seal', 'roots-1']);
    expect(roundTrip?.nightWatch).toBe(7);
  });

  it('grants the Seal to older saves that already hold Charter terms', () => {
    const state = createInitialState();
    state.charter = ['roots-1'];
    expect(deserialize(JSON.stringify(state))?.charter).toEqual(['seal', 'roots-1']);
    state.charter = [];
    expect(deserialize(JSON.stringify(state))?.charter).toEqual([]);
  });

  it('clamps a valid oversized Night Watch level on load', () => {
    const state = createInitialState();
    const raw = JSON.stringify({ ...state, nightWatch: 999 });
    expect(deserialize(raw)?.nightWatch).toBe(49);
  });
});

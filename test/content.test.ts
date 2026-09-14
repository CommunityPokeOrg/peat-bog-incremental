import { describe, expect, it } from 'vitest';
import { BUILDINGS, RESEARCH, UPGRADES, type ProductionLine, type SpendableResource } from '../src/game/data';
import { D } from '../src/game/decimal';
import {
  buildingCost,
  buildingVisible,
  buyBuilding,
  canAfford,
  lineUnlocked,
  productionPerSecond,
  resourceDiscovered,
  SPENDABLE_RESOURCES,
  tick,
} from '../src/game/engine';
import { formatCost } from '../src/game/format';
import { createInitialState } from '../src/game/state';

describe('content wave', () => {
  it('has resolved, distinct progression data', () => {
    const ids = [...BUILDINGS, ...UPGRADES, ...RESEARCH].map((item) => item.id);
    const names = [...BUILDINGS, ...UPGRADES, ...RESEARCH].map((item) => item.name);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
    const boostNames = BUILDINGS.flatMap((building) => building.boostNames);
    expect(boostNames).toHaveLength(BUILDINGS.length * 4);
    expect(new Set(boostNames).size).toBe(boostNames.length);
    const boostSuffixes = new Map<string, number>();
    for (const boostName of boostNames) {
      const words = boostName.split(/\s+/);
      const suffix = words[words.length - 1] ?? '';
      boostSuffixes.set(suffix, (boostSuffixes.get(suffix) ?? 0) + 1);
    }
    expect(Math.max(...boostSuffixes.values())).toBeLessThan(3);
    for (const building of BUILDINGS) {
      for (const boostName of building.boostNames) {
        expect(boostName.toLowerCase()).not.toContain(building.name.toLowerCase());
      }
    }
    expect(BUILDINGS.length).toBeGreaterThanOrEqual(62);
    expect(UPGRADES.length).toBeGreaterThanOrEqual(300);
    expect(RESEARCH.length).toBeGreaterThanOrEqual(40);

    const buildingIds = new Set(BUILDINGS.map((building) => building.id));
    const researchIds = new Set(RESEARCH.map((research) => research.id));
    const produced = new Set(BUILDINGS.flatMap((building) => Object.keys(building.produces ?? {})));
    for (const building of BUILDINGS) {
      for (const resource of Object.keys(building.consumes ?? {})) expect(produced).toContain(resource);
    }
    for (const research of RESEARCH) {
      for (const required of research.requires ?? []) expect(researchIds).toContain(required);
      const effect = research.effect;
      if (effect.kind === 'unlockLine') {
        expect(BUILDINGS.some((building) => building.line === effect.line)).toBe(true);
      }
    }
    for (const upgrade of UPGRADES) {
      for (const requirement of upgrade.requires ?? []) expect(buildingIds).toContain(requirement.buildingId);
    }
    const newLines: ProductionLine[] = ['briquettes', 'refinedBroth', 'sediment', 'essence'];
    for (const line of newLines) {
      expect(RESEARCH.some((research) =>
        research.effect.kind === 'unlockLine' && research.effect.line === line,
      )).toBe(true);
    }
  });

  it('diversifies building and upgrade costs without breaking availability', () => {
    const producerCost = new Map<string, number>();
    for (const building of BUILDINGS) {
      for (const resource of Object.keys(building.produces ?? {})) {
        const current = producerCost.get(resource);
        const broth = building.baseCost.broth ?? Number.POSITIVE_INFINITY;
        if (current === undefined || broth < current) producerCost.set(resource, broth);
      }
    }
    for (const building of BUILDINGS) {
      expect(building.baseCost.broth).toBeTypeOf('number');
      for (const resource of Object.keys(building.baseCost)) {
        if (resource === 'broth') continue;
        expect(producerCost.get(resource)).toBeLessThan(building.baseCost.broth!);
      }
    }
    const coreLines = new Set<ProductionLine>([
      'broth',
      'peat',
      'sphagnum',
      'methane',
      'cooling',
      'compute',
      'evidence',
    ]);
    const coreResources = new Set<SpendableResource>([
      'peat',
      'sphagnum',
      'methane',
      'compute',
      'evidence',
      'sludge',
    ]);
    for (const building of BUILDINGS) {
      const tier = BUILDINGS.filter((candidate) => candidate.line === building.line).indexOf(building) + 1;
      if (!coreLines.has(building.line) || tier > 6) continue;
      for (const resource of Object.keys(building.baseCost)) {
        if (resource !== 'broth') expect(coreResources.has(resource as SpendableResource)).toBe(true);
      }
    }
    for (const upgrade of UPGRADES) {
      expect(upgrade.cost.broth).toBeTypeOf('number');
      const requiredResources = new Set(
        (upgrade.requires ?? []).flatMap(({ buildingId }) =>
          Object.keys(BUILDINGS.find((building) => building.id === buildingId)?.produces ?? [])),
      );
      for (const resource of Object.keys(upgrade.cost)) {
        if (resource === 'broth') continue;
        const producedByCheaperBuilding = (producerCost.get(resource) ?? Infinity) < upgrade.cost.broth!;
        expect(producedByCheaperBuilding || requiredResources.has(resource)).toBe(true);
      }
    }

    const buildingSizes = BUILDINGS.map((building) => Object.keys(building.baseCost).length);
    const setCounts = new Map<string, number>();
    for (const building of BUILDINGS) {
      const key = Object.keys(building.baseCost).sort().join(',');
      setCounts.set(key, (setCounts.get(key) ?? 0) + 1);
    }
    const upgradeSizes = UPGRADES.map((upgrade) => Object.keys(upgrade.cost).length);
    const buildingResourceCoverage = Object.fromEntries(SPENDABLE_RESOURCES.map((resource) => [
      resource,
      BUILDINGS.filter((building) => building.baseCost[resource] !== undefined).length,
    ]));
    const upgradeResourceCoverage = Object.fromEntries(SPENDABLE_RESOURCES.map((resource) => [
      resource,
      UPGRADES.filter((upgrade) => upgrade.cost[resource] !== undefined).length,
    ]));
    const stats = {
      buildingsWithTwoPlus: buildingSizes.filter((size) => size >= 2).length,
      buildingsWithThreePlus: buildingSizes.filter((size) => size >= 3).length,
      maxIdenticalBuildingSets: Math.max(...setCounts.values()),
      upgradesWithTwoPlus: upgradeSizes.filter((size) => size >= 2).length,
      buildingResourceCoverage,
      upgradeResourceCoverage,
    };
    console.info(`[cost-diversity] ${JSON.stringify(stats)}`);
    expect(stats.buildingsWithTwoPlus).toBeGreaterThanOrEqual(48);
    expect(stats.buildingsWithThreePlus).toBeGreaterThanOrEqual(20);
    expect(stats.maxIdenticalBuildingSets).toBeLessThanOrEqual(8);
    expect(Object.values(buildingResourceCoverage).every((count) => count >= 3)).toBe(true);
    expect(stats.upgradesWithTwoPlus).toBeGreaterThanOrEqual(200);
    expect(Object.values(upgradeResourceCoverage).every((count) => count >= 5)).toBe(true);
  });

  it('handles mixed affordability and large multi-resource costs', () => {
    const state = createInitialState();
    const target = BUILDINGS.find((building) => building.id === 'pump')!;
    const targetCost = buildingCost(target, 0);
    const targetEntries = Object.entries(targetCost) as [SpendableResource, NonNullable<typeof targetCost[SpendableResource]>][];
    for (const [resource, amount] of targetEntries) state.wallet[resource] = D(amount);
    const missing = targetEntries[0][0];
    state.wallet[missing] = D(0);
    expect(canAfford(state, targetCost)).toBe(false);
    state.wallet[missing] = D(targetCost[missing]!);
    expect(canAfford(state, targetCost)).toBe(true);
    expect(buyBuilding(state, target.id, 1)).toBe(true);
    for (const [resource, amount] of targetEntries) {
      expect(state.wallet[resource]).toBeDefined();
      expect(state.wallet[resource].lt(D(amount))).toBe(true);
    }

    const celestial = BUILDINGS.find((building) => building.id === 'celestial-alembic')!;
    const hugeCost = buildingCost(celestial, 5_000);
    for (const cost of Object.values(hugeCost)) {
      expect(Number.isNaN(cost!.mantissa)).toBe(false);
      expect(Number.isFinite(cost!.exponent)).toBe(true);
    }
    expect(formatCost(hugeCost)).not.toMatch(/NaN|∞|Infinity/);
  });

  it('uses representative early, mid, and late cost shapes', () => {
    const early = BUILDINGS.find((building) => building.id === 'cutter')!;
    const mid = BUILDINGS.find((building) => building.id === 'copper-still')!;
    const late = BUILDINGS.find((building) => building.id === 'court-oracle')!;
    expect(Object.keys(early.baseCost)).toEqual(['broth']);
    expect(Object.keys(mid.baseCost).length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(late.baseCost).length).toBeGreaterThanOrEqual(3);
  });

  it('does not reveal cost resources before their line can produce them', () => {
    const state = createInitialState();
    state.wallet.broth = D(1e9);
    state.lifetime.broth = D(1e9);
    state.buildings.harvester = 10;
    const settler = BUILDINGS.find((building) => building.id === 'sludge-settler')!;
    expect(resourceDiscovered(state, 'sludge')).toBe(false);
    expect(buildingVisible(state, settler)).toBe(false);
    state.lifetime.sludge = D(2_000);
    state.research.push('celestial-reading');
    expect(resourceDiscovered(state, 'sludge')).toBe(true);
    expect(buildingVisible(state, settler)).toBe(true);
  });

  it('keeps the six-hour greedy run below the broth wall while reaching prestige', () => {
    const simulate = (charter: string[] = []) => {
      const state = createInitialState();
      state.wallet.bogCores = D(20);
      state.charter = charter;
      state.wallet.broth = D(100);
      for (let second = 0; second < 6 * 3600; second += 1) {
        state.wallet.broth = state.wallet.broth.add(20);
        state.lifetime.broth = state.lifetime.broth.add(20);
        const affordable = BUILDINGS
          .filter((building) => lineUnlocked(state, building.line))
          .map((building) => ({ building, cost: buildingCost(building, state.buildings[building.id] ?? 0, state) }))
          .filter(({ cost }) => Object.entries(cost).every(([resource, amount]) =>
            state.wallet[resource as keyof typeof state.wallet].gte(amount!),
          ))
          .sort((a, b) => (a.cost.broth?.toNumber() ?? Number.POSITIVE_INFINITY) -
            (b.cost.broth?.toNumber() ?? Number.POSITIVE_INFINITY));
        if (affordable[0]) buyBuilding(state, affordable[0].building.id, 1);
        tick(state, 1);
      }
      return { state, peakBroth: productionPerSecond(state).broth.toNumber() };
    };

    const first = simulate();
    const chartered = simulate(['seal', 'roots-1', 'roots-2', 'roots-3', 'roots-4']);
    expect(first.state.runCompute.gte(1_000_000)).toBe(true);
    expect(first.peakBroth).toBeLessThan(1_000_000_000);
    expect(chartered.peakBroth).toBeGreaterThanOrEqual(first.peakBroth * 3);
    for (const building of BUILDINGS) {
      const brothCost = buildingCost(building, 5_000, first.state).broth;
      expect(brothCost && Number.isFinite(brothCost.exponent)).toBe(true);
    }
  });
});

import { describe, expect, it } from 'vitest';
import { BUILDINGS, RESEARCH, UPGRADES, type ProductionLine } from '../src/game/data';
import { D } from '../src/game/decimal';
import {
  buildingCost,
  buyBuilding,
  lineUnlocked,
  productionPerSecond,
  tick,
} from '../src/game/engine';
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

import { describe, expect, it } from 'vitest';
import { UPGRADE_BY_ID } from '../src/game/data';
import { clickPower, prestige, productionPerSecond } from '../src/game/engine';
import {
  QUESTS,
  claimQuest,
  expireBuffs,
  questMultiplier,
  questProgress,
  questReady,
} from '../src/game/quests';
import { createInitialState } from '../src/game/state';

const quest = (id: string) => QUESTS.find((candidate) => candidate.id === id)!;

describe('settlement quests', () => {
  it('reports progress for stat, owned, rate, research, upgrade, and cooled requirements', () => {
    const state = createInitialState();
    state.totalClicks = 5;
    expect(questProgress(state, quest('q-first-scoop'))).toMatchObject({ current: 5, target: 10 });
    state.buildings.vat = 3;
    expect(questProgress(state, quest('q-serve-nordic'))).toMatchObject({ current: 3, target: 5 });
    state.buildings.harvester = 20_000;
    expect(questProgress(state, quest('q-rate-1k')).fraction).toBe(1);
    state.buildings.rack = 13;
    state.buildings.chiller = 11;
    expect(questReady(state, quest('q-cool-heads'))).toBe(true);
    state.research.push('lubrication-clause');
    expect(questReady(state, quest('q-clause'))).toBe(true);
    state.upgrades.push('hot-fries');
    expect(questReady(state, quest('q-hot-fries'))).toBe(true);
  });

  it('claims each reward kind once and applies production floors', () => {
    const state = createInitialState();
    state.totalClicks = 10;
    expect(claimQuest(state, 'q-first-scoop')).toEqual(quest('q-first-scoop').reward);
    expect(state.broth).toBe(50);
    expect(claimQuest(state, 'q-first-scoop')).toBeNull();

    state.buildings.vat = 5;
    expect(claimQuest(state, 'q-serve-nordic')?.kind).toBe('production');
    expect(state.broth).toBeGreaterThanOrEqual(500);

    state.research.push('nordic-verdict');
    expect(claimQuest(state, 'q-verdict')?.kind).toBe('cores');
    expect(state.bogCores).toBe(1);
  });

  it('applies permanent and timed multipliers and expires timed buffs', () => {
    const state = createInitialState();
    state.totalBrothEarned = 59;
    expect(claimQuest(state, 'q-sanitized-change')?.kind).toBe('multiplier');
    expect(clickPower(state)).toBeCloseTo(2);

    state.minigameHits = 25;
    expect(claimQuest(state, 'q-calibrated', 1_000)?.kind).toBe('multiplier');
    expect(questMultiplier(state, 'compute', 1_000)).toBeCloseTo(1.5);
    expireBuffs(state, 601_001);
    expect(questMultiplier(state, 'compute', 601_001)).toBe(1);

    state.buildings.harvester = 10;
    const before = productionPerSecond(state).broth;
    state.upgrades.push('pulley-equity');
    state.totalBrothEarned = 250_000;
    expect(claimQuest(state, 'q-pulley')?.kind).toBe('multiplier');
    expect(productionPerSecond(state).broth).toBeCloseTo(before * 1.15);
  });

  it('keeps only persistent quest claims through prestige', () => {
    const state = createInitialState();
    state.totalClicks = 10;
    claimQuest(state, 'q-first-scoop');
    state.research.push('lubrication-clause');
    claimQuest(state, 'q-clause');
    state.totalComputeThisRun = 1_000_000;
    expect(prestige(state)).toBe(1);
    expect(state.quests.claimed).toEqual(['q-clause']);
    expect(state.quests.buffs).toEqual([]);
  });

  it('uses upgrade requirements without needing the upgrade definition object', () => {
    const state = createInitialState();
    state.upgrades.push(UPGRADE_BY_ID['hot-fries'].id);
    expect(questReady(state, quest('q-hot-fries'))).toBe(true);
  });
});

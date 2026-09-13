import { describe, expect, it } from 'vitest';
import { D } from '../src/game/decimal';
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
    expect(questProgress(state, quest('q-first-scoop')).current.eq(5)).toBe(true);
    expect(questProgress(state, quest('q-first-scoop')).target.eq(10)).toBe(true);
    state.buildings.vat = 3;
    expect(questProgress(state, quest('q-serve-nordic')).current.eq(3)).toBe(true);
    expect(questProgress(state, quest('q-serve-nordic')).target.eq(5)).toBe(true);
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
    expect(state.broth.eq(50)).toBe(true);
    expect(claimQuest(state, 'q-first-scoop')).toBeNull();

    state.buildings.vat = 5;
    expect(claimQuest(state, 'q-serve-nordic')?.kind).toBe('production');
    expect(state.broth.gte(500)).toBe(true);

    state.research.push('nordic-verdict');
    expect(claimQuest(state, 'q-verdict')?.kind).toBe('cores');
    expect(state.bogCores.eq(1)).toBe(true);
  });

  it('applies permanent and timed multipliers and expires timed buffs', () => {
    const state = createInitialState();
    state.totalBrothEarned = D(59);
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
    state.totalBrothEarned = D(250_000);
    expect(claimQuest(state, 'q-pulley')?.kind).toBe('multiplier');
    expect(productionPerSecond(state).broth.toNumber()).toBeCloseTo(before.toNumber() * 1.15);
  });

  it('keeps only persistent quest claims through prestige', () => {
    const state = createInitialState();
    state.totalClicks = 10;
    claimQuest(state, 'q-first-scoop');
    state.research.push('lubrication-clause');
    claimQuest(state, 'q-clause');
    state.totalComputeThisRun = D(1_000_000);
    expect(prestige(state).toNumber()).toBe(1);
    expect(state.quests.claimed).toEqual(['q-clause']);
    expect(state.quests.buffs).toEqual([]);
  });

  it('uses upgrade requirements without needing the upgrade definition object', () => {
    const state = createInitialState();
    state.upgrades.push(UPGRADE_BY_ID['hot-fries'].id);
    expect(questReady(state, quest('q-hot-fries'))).toBe(true);
  });

  it('counts claimed Keeper quests and gates Poke on all nine others', () => {
    const state = createInitialState();
    const keeperIds = ['k-pierre', 'k-mia', 'k-shrome', 'k-samkals', 'k-spaced', 'k-vwh', 'k-hermano', 'k-tassie', 'k-kreatix'];
    state.quests.claimed = keeperIds.slice(0, 8);
    expect(questProgress(state, quest('k-poke')).current.eq(8)).toBe(true);
    expect(questProgress(state, quest('k-poke')).target.eq(9)).toBe(true);
    expect(questReady(state, quest('k-poke'))).toBe(false);
    state.quests.claimed.push(keeperIds[8]);
    expect(questReady(state, quest('k-poke'))).toBe(true);
    expect(claimQuest(state, 'k-poke')?.kind).toBe('multiplier');
  });

  it('keeps the Kreatix reward through prestige', () => {
    const state = createInitialState();
    state.buildings.rack = 50;
    expect(claimQuest(state, 'k-kreatix')?.kind).toBe('multiplier');
    expect(questMultiplier(state, 'broth')).toBeCloseTo(1.1);
    state.totalComputeThisRun = D(1_000_000);
    expect(prestige(state).toNumber()).toBe(1);
    expect(state.quests.claimed).toContain('k-kreatix');
  });
});

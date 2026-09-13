import { describe, expect, it } from 'vitest';
import { CHARTER, buyCharter, charterAvailable } from '../src/game/charter';
import { BUILDINGS, RESEARCH_BY_ID } from '../src/game/data';
import { D } from '../src/game/decimal';
import { prestige, productionPerSecond, tick } from '../src/game/engine';
import { deserialize, serialize } from '../src/game/save';
import {
  ALL_QUESTS,
  BOUNTIES,
  questReady,
} from '../src/game/quests';
import { createInitialState } from '../src/game/state';

describe('Stage D progression balance', () => {
  it('keeps a late-run wall while each drained run grows broth output', () => {
    const state = createInitialState();
    const peaks: number[] = [];
    for (let run = 0; run < 3; run += 1) {
      state.wallet.broth = D('1e30');
      state.buildings = { harvester: 100 * 3 ** run, vat: 20 * 3 ** run };
      let atThreeHours = 0;
      let atFourHours = 0;
      let peak = 0;
      for (let seconds = 0; seconds < 4 * 3600; seconds += 60) {
        tick(state, 60);
        const rate = productionPerSecond(state).broth.toNumber();
        peak = Math.max(peak, rate);
        if (seconds + 60 === 3 * 3600) atThreeHours = rate;
        if (seconds + 60 === 4 * 3600) atFourHours = rate;
      }
      peaks.push(peak);
      expect(atFourHours).toBeLessThan(atThreeHours * 1.5);
      state.runCompute = D('1e12');
      state.wallet.bogCores = state.wallet.bogCores.add(10_000);
      prestige(state);
      let bought = true;
      while (bought) {
        const next = CHARTER
          .filter((node) => charterAvailable(state, node))
          .sort((a, b) => a.cost - b.cost)[0];
        bought = Boolean(next && buyCharter(state, next.id));
      }
    }
    expect(peaks[1]).toBeGreaterThanOrEqual(peaks[0] * 2.5);
    expect(peaks[2]).toBeGreaterThanOrEqual(peaks[1] * 2.5);
  });

  it('can satisfy every authored one-time quest requirement', () => {
    for (const quest of ALL_QUESTS) {
      const state = createInitialState();
      const requirement = quest.requirement;
      if (requirement.kind === 'lifetime') state.lifetime[requirement.resource] = D(requirement.target);
      if (requirement.kind === 'owned') state.buildings[requirement.buildingId] = requirement.count;
      if (requirement.kind === 'charter') state.charter = CHARTER.slice(0, requirement.count).map((node) => node.id);
      if (requirement.kind === 'research') state.research.push(requirement.id);
      if (requirement.kind === 'line') {
        const unlock = Object.values(RESEARCH_BY_ID).find((research) =>
          research.effect.kind === 'unlockLine' && research.effect.line === requirement.line);
        if (unlock) state.research.push(unlock.id);
      }
      if (requirement.kind === 'rate') {
        const building = BUILDINGS.find((candidate) => candidate.produces?.[requirement.resource] !== undefined);
        if (building) state.buildings[building.id] = 1_000_000_000;
      }
      if (requirement.kind === 'clicks') state.totalClicks = requirement.target;
      if (requirement.kind === 'hits') state.minigameHits = requirement.target;
      if (requirement.kind === 'cores') state.wallet.bogCores = D(requirement.target);
      if (requirement.kind === 'upgrade') state.upgrades.push(requirement.id);
      if (requirement.kind === 'quests') state.quests.claimed = [...requirement.ids];
      if (requirement.kind === 'cooled') {
        state.buildings.chiller = Math.ceil(requirement.minHeat / 10);
        state.buildings.rack = Math.ceil(requirement.minHeat / 8);
      }
      expect(questReady(state, quest), quest.id).toBe(true);
    }
  });

  it('keeps tenth bounty instances finite and round-trips their permanent state', () => {
    for (const bounty of BOUNTIES) {
      const requirement = bounty.requirement(10);
      expect(requirement.kind).toBe('lifetime');
      if (requirement.kind === 'lifetime') {
        expect(Number.isFinite(requirement.target)).toBe(true);
        expect(requirement.target).toBeLessThan(1e30);
      }
      const reward = bounty.reward(10);
      if (reward.kind === 'resource') expect(Number.isFinite(reward.amount)).toBe(true);
    }
    const state = createInitialState();
    state.quests.bountyCount['bounty-peat'] = 9;
    state.quests.bountyBase['bounty-peat'] = '1e18';
    state.quests.permanent.push({
      questId: 'a-record-opened',
      effect: { kind: 'coreGain', factor: 1.1 },
    });
    const loaded = deserialize(serialize(state))!;
    expect(loaded.quests.bountyCount['bounty-peat']).toBe(9);
    expect(loaded.quests.bountyBase['bounty-peat']).toBe('1e18');
    expect(loaded.quests.permanent).toEqual(state.quests.permanent);
  });
});

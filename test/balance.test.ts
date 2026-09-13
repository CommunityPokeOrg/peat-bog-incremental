import { describe, expect, it } from 'vitest';
import { CHARTER } from '../src/game/charter';
import { BUILDINGS, RESEARCH_BY_ID } from '../src/game/data';
import { D } from '../src/game/decimal';
import { deserialize, serialize } from '../src/game/save';
import {
  ALL_QUESTS,
  BOUNTIES,
  questReady,
} from '../src/game/quests';
import { createInitialState } from '../src/game/state';
import { simulateCareer } from './balance-sim';

describe('Stage D progression balance', () => {
  it('grows each drained run while late runs hit a wall', () => {
    const career = simulateCareer(5, 4);
    for (let run = 1; run < career.length; run += 1) {
      expect(career[run].peak, `run ${run + 1} peak`).toBeGreaterThanOrEqual(career[run - 1].peak * 2);
      expect(career[run].cores, `run ${run + 1} cores`).toBeGreaterThan(career[run - 1].cores);
    }
    const first = career[0].hourly;
    expect(first[3] / first[2]).toBeLessThan(first[1] / first[0]);
    const last = career[career.length - 1].hourly;
    expect(last[3] / last[0]).toBeLessThan(2);
    expect(last[3] / last[0]).toBeLessThan((first[3] / first[0]) / 4);
  }, 180_000);

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

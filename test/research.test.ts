import { describe, expect, it } from 'vitest';
import { RESEARCH_BY_ID } from '../src/game/data';
import {
  MAX_RESEARCH_QUEUE,
  advanceResearch,
  buyResearch,
  cancelResearch,
  researchProgress,
} from '../src/game/engine';
import { computeOfflineEarnings } from '../src/game/save';
import { createInitialState } from '../src/game/state';

describe('research queue', () => {
  it('enqueues research, pays costs, and rejects duplicates and a full queue', () => {
    const state = createInitialState();
    state.compute = 1_000_000;
    state.evidence = 10_000;
    expect(buyResearch(state, 'thermal-modelling')).toBe(true);
    expect(state.researchQueue[0]).toEqual({ id: 'thermal-modelling', remaining: 60 });
    expect(buyResearch(state, 'thermal-modelling')).toBe(false);
    expect(buyResearch(state, 'lubrication-clause')).toBe(true);
    expect(buyResearch(state, 'liquid-immersion')).toBe(true);
    expect(state.researchQueue).toHaveLength(MAX_RESEARCH_QUEUE);
    expect(buyResearch(state, 'broth-distillation')).toBe(false);
  });

  it('advances and completes queued research in order', () => {
    const state = createInitialState();
    state.compute = 1_000_000;
    state.evidence = 10_000;
    buyResearch(state, 'thermal-modelling');
    buyResearch(state, 'lubrication-clause');
    expect(researchProgress(state, 'thermal-modelling')?.fraction).toBe(0);
    expect(advanceResearch(state, 60)).toEqual(['thermal-modelling']);
    expect(state.research).toEqual(['thermal-modelling']);
    expect(advanceResearch(state, 180)).toEqual(['lubrication-clause']);
    expect(state.research).toEqual(['thermal-modelling', 'lubrication-clause']);
  });

  it('cancels queued research and refunds its full cost', () => {
    const state = createInitialState();
    const cost = RESEARCH_BY_ID['thermal-modelling'].cost.compute!;
    state.compute = cost;
    expect(buyResearch(state, 'thermal-modelling')).toBe(true);
    expect(state.compute).toBe(0);
    expect(cancelResearch(state, 'thermal-modelling')).toBe(true);
    expect(state.compute).toBe(cost);
    expect(cancelResearch(state, 'thermal-modelling')).toBe(false);
  });

  it('advances queued research during offline elapsed time', () => {
    const state = createInitialState();
    state.compute = 1_000;
    buyResearch(state, 'thermal-modelling');
    const offline = computeOfflineEarnings(state, 90);
    advanceResearch(state, offline.seconds);
    expect(state.research).toContain('thermal-modelling');
  });
});

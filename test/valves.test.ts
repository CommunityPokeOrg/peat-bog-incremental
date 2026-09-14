import { describe, expect, it } from 'vitest';
import { D } from '../src/game/decimal';
import {
  consumptionPerSecond,
  productionPerSecond,
  toggleValve,
} from '../src/game/engine';
import { deserialize, serialize } from '../src/game/save';
import { createInitialState } from '../src/game/state';

describe('still-room valves', () => {
  it('shuts a consuming line without affecting non-consuming production', () => {
    const state = createInitialState();
    state.research.push('still-method');
    state.buildings['copper-still'] = 1;
    state.buildings.harvester = 1;

    const beforeConsumption = consumptionPerSecond(state);
    const beforeProduction = productionPerSecond(state);
    expect(beforeConsumption.broth.eq(8)).toBe(true);
    expect(beforeProduction.refinedBroth.eq(1)).toBe(true);
    expect(beforeProduction.broth.eq(0.5)).toBe(true);

    expect(toggleValve(state, 'refinedBroth')).toBe(false);

    expect(consumptionPerSecond(state).broth.eq(0)).toBe(true);
    expect(productionPerSecond(state).refinedBroth.eq(0)).toBe(true);
    expect(productionPerSecond(state).broth.eq(beforeProduction.broth)).toBe(true);
  });

  it('round-trips known valves and drops unknown or legacy values', () => {
    const state = createInitialState();
    state.closedValves = ['refinedBroth', 'essence'];
    const loaded = deserialize(serialize(state));
    expect(loaded?.closedValves).toEqual(['refinedBroth', 'essence']);

    const raw = JSON.parse(serialize(state)) as Record<string, unknown>;
    raw.closedValves = ['refinedBroth', 'not-a-line', 'cooling'];
    expect(deserialize(raw)?.closedValves).toEqual(['refinedBroth', 'cooling']);

    delete raw.closedValves;
    raw.version = 6;
    expect(deserialize(raw)?.closedValves).toEqual([]);
  });

  it('ignores malformed valve values', () => {
    const state = createInitialState();
    state.wallet.broth = D(1);
    const raw = JSON.parse(serialize(state)) as Record<string, unknown>;
    raw.closedValves = 'refinedBroth';
    expect(deserialize(raw)?.closedValves).toEqual([]);
  });
});

import { afterEach, describe, expect, it } from 'vitest';
import { BUILDINGS, type BuildingDef } from '../src/game/data';
import { D } from '../src/game/decimal';
import { settleTick } from '../src/game/engine';
import { computeOfflineEarnings } from '../src/game/save';
import { createInitialState } from '../src/game/state';

const converter: BuildingDef = {
  id: 'test-converter',
  name: 'Test converter',
  emoji: '⚗️',
  description: 'test',
  line: 'briquettes',
  baseCost: {},
  produces: { briquettes: 1 },
  consumes: { peat: 2 },
};

describe('settleTick', () => {
  afterEach(() => {
    const index = BUILDINGS.findIndex((building) => building.id === converter.id);
    if (index >= 0) BUILDINGS.splice(index, 1);
  });

  it('throttles converter output by available input', () => {
    BUILDINGS.push(converter);
    const state = createInitialState();
    state.buildings[converter.id] = 3;
    state.wallet.peat = D(3);
    const limited = settleTick(state, 1);
    expect(limited.gained.briquettes.toNumber()).toBeCloseTo(1.5);
    expect(limited.spent.peat.toNumber()).toBeCloseTo(3);

    state.wallet.peat = D(100);
    const ample = settleTick(state, 1);
    expect(ample.gained.briquettes.toNumber()).toBeCloseTo(3);
    expect(ample.spent.peat.toNumber()).toBeCloseTo(6);
  });

  it('uses the same effective duration for offline settlement', () => {
    BUILDINGS.push(converter);
    const state = createInitialState();
    state.buildings[converter.id] = 3;
    state.wallet.peat = D(3);
    const online = settleTick(state, 1);
    const offline = computeOfflineEarnings(state, 100);
    expect(offline.gained.briquettes.toNumber()).toBeCloseTo(online.gained.briquettes.toNumber() * 1);
    expect(offline.spent.peat.toNumber()).toBeCloseTo(online.spent.peat.toNumber());
  });
});

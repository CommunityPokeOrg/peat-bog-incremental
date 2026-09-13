import { describe, expect, it } from 'vitest';
import { D, toDecimalOrZero } from '../src/game/decimal';
import { BUILDING_BY_ID } from '../src/game/data';
import { productionPerSecond, tick } from '../src/game/engine';
import { formatNumber } from '../src/game/format';
import { deserialize, serialize } from '../src/game/save';
import { createInitialState } from '../src/game/state';

describe('large Decimal values', () => {
  it('formats very large values and rates without overflow text', () => {
    const state = createInitialState();
    state.buildings.harvester = 10_000;
    const rate = productionPerSecond(state).broth;
    expect(formatNumber(D('1e500'))).not.toMatch(/NaN|∞/);
    expect(formatNumber(D('1e9000'))).not.toMatch(/NaN|∞/);
    expect(formatNumber(rate)).not.toMatch(/NaN|∞/);
  });

  it('ticks an eight-hour interval with huge wallets and finite growth', () => {
    const state = createInitialState();
    state.wallet.broth = D('1e300');
    state.buildings.harvester = 1e300;
    tick(state, 8 * 3600);
    expect(Number.isFinite(state.wallet.broth.exponent)).toBe(true);
    expect(state.wallet.broth.gt('1e300')).toBe(true);
  });

  it('round-trips a 1e600 wallet through save serialization', () => {
    const state = createInitialState();
    state.wallet.broth = D('1e600');
    const loaded = deserialize(serialize(state));
    expect(loaded?.wallet.broth.eq('1e600')).toBe(true);
  });

  it('sanitizes invalid and negative Decimal inputs', () => {
    expect(toDecimalOrZero('Infinity').eq(0)).toBe(true);
    expect(toDecimalOrZero('NaN').eq(0)).toBe(true);
    expect(toDecimalOrZero(-5).eq(0)).toBe(true);
    expect(toDecimalOrZero('').eq(0)).toBe(true);
    expect(toDecimalOrZero({}).eq(0)).toBe(true);
  });

  it('keeps thousands of permanent multipliers finite and visible', () => {
    const state = createInitialState();
    state.buildings[BUILDING_BY_ID.harvester.id] = 1;
    for (let index = 0; index < 10_000; index += 1) {
      state.quests.permanent.push({
        questId: `legacy-${index}`,
        effect: { kind: 'multiplier', target: 'broth', factor: 1.5 },
      });
    }
    const rate = productionPerSecond(state).broth;
    expect(Number.isFinite(rate.exponent)).toBe(true);
    expect(rate.gt(0)).toBe(true);
    expect(formatNumber(rate)).not.toBe('0');
  });
});

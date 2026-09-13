import { describe, expect, it } from 'vitest';
import { D, safe } from '../src/game/decimal';
import { BUILDING_BY_ID } from '../src/game/data';
import { bulkCost, maxAffordable, prestigeGain, tick } from '../src/game/engine';
import { formatNumber } from '../src/game/format';
import { createInitialState } from '../src/game/state';

describe('Decimal numerics', () => {
  it('formats plain, suffix, and scientific tiers', () => {
    expect(formatNumber(D('999.9'))).toBe('999.9');
    expect(formatNumber(D('1000'))).toBe('1.00K');
    expect(formatNumber(D('1.5e6'))).toBe('1.50M');
    expect(formatNumber(D('1e33'))).toBe('1.00Dc');
    expect(formatNumber(D('1e45'))).toBe('1.00e45');
    expect(formatNumber(D('1e400'))).toBe('1.00e400');
  });

  it('keeps large affordability and bulk costs finite', () => {
    const state = createInitialState();
    state.broth = D('1e300');
    const count = maxAffordable(BUILDING_BY_ID.harvester, 0, state);
    expect(Number.isFinite(count)).toBe(true);
    expect(count).toBeGreaterThan(0);
    expect(bulkCost(BUILDING_BY_ID.harvester, 0, 5000).broth!.mantissa).not.toBeNaN();
    expect(Number.isFinite(bulkCost(BUILDING_BY_ID.harvester, 0, 5000).broth!.exponent)).toBe(true);
  });

  it('ticks huge rates without overflow', () => {
    const state = createInitialState();
    state.buildings.harvester = 1e300;
    tick(state, 1_000_000);
    expect(Number.isFinite(state.broth.exponent)).toBe(true);
  });

  it('computes finite positive prestige gains at huge totals', () => {
    const state = createInitialState();
    state.totalComputeThisRun = D('1e310');
    const gain = prestigeGain(state);
    expect(gain.gt(0)).toBe(true);
    expect(Number.isFinite(gain.exponent)).toBe(true);
  });

  it('sanitizes invalid Decimal values', () => {
    expect(safe(D(NaN)).eq(0)).toBe(true);
  });
});

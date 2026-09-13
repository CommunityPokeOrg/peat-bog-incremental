import { describe, expect, it } from 'vitest';
import { deserialize, serialize } from '../src/game/save';
import { D } from '../src/game/decimal';
import { createInitialState } from '../src/game/state';

describe('Decimal save migration', () => {
  it('loads v3 numeric wallets as Decimal values and upgrades the version', () => {
    const loaded = deserialize({
      version: 3,
      broth: 123.5,
      compute: 42,
      peat: 4,
      sphagnum: 5,
      methane: 6,
      evidence: 7,
      bogCores: 8,
      totalBrothEarned: 9,
      totalComputeEarned: 10,
      totalPeatEarned: 11,
      totalSphagnumEarned: 12,
      totalMethaneEarned: 13,
      totalEvidenceEarned: 14,
      totalComputeThisRun: 15,
      totalClicks: 0,
      lastSaveTime: 0,
      buildings: {},
      upgrades: [],
      research: [],
      achievements: [],
    });
    expect(loaded?.version).toBe(4);
    expect(loaded?.broth.eq(123.5)).toBe(true);
    expect(loaded?.bogCores.eq(8)).toBe(true);
  });

  it('round-trips v4 Decimal strings', () => {
    const state = createInitialState();
    state.broth = D('1e400');
    state.totalComputeThisRun = D('1e310');
    const raw = serialize(state);
    expect(JSON.parse(raw).broth).toBe(D('1e400').toString());
    const loaded = deserialize(raw);
    expect(loaded?.broth.eq(D('1e400'))).toBe(true);
    expect(loaded?.totalComputeThisRun.eq(D('1e310'))).toBe(true);
  });

  it('turns corrupt Decimal fields into zero', () => {
    const loaded = deserialize({
      version: 4,
      broth: 'abc',
      compute: 'NaN',
      peat: 'Infinity',
      totalClicks: 0,
      lastSaveTime: 0,
      buildings: {},
      upgrades: [],
      research: [],
      achievements: [],
    });
    expect(loaded?.broth.eq(0)).toBe(true);
    expect(loaded?.compute.eq(0)).toBe(true);
    expect(loaded?.peat.eq(0)).toBe(true);
  });
});

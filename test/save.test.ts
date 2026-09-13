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
    expect(loaded?.version).toBe(5);
    expect(loaded?.wallet.broth.eq(123.5)).toBe(true);
    expect(loaded?.wallet.bogCores.eq(8)).toBe(true);
  });

  it('round-trips v4 Decimal strings', () => {
    const state = createInitialState();
    state.wallet.broth = D('1e400');
    state.runCompute = D('1e310');
    const raw = serialize(state);
    expect(JSON.parse(raw).wallet.broth).toBe(D('1e400').toString());
    const loaded = deserialize(raw);
    expect(loaded?.wallet.broth.eq(D('1e400'))).toBe(true);
    expect(loaded?.runCompute.eq(D('1e310'))).toBe(true);
  });

  it('loads a v4 flat string save and drops unknown v5 resource keys', () => {
    const v4 = deserialize({
      version: 4,
      broth: '12.5',
      compute: '3',
      totalBrothEarned: '20',
      totalComputeThisRun: '3',
      totalClicks: 0,
      lastSaveTime: 0,
      buildings: {},
      upgrades: [],
      research: [],
      achievements: [],
    });
    expect(v4?.wallet.broth.eq('12.5')).toBe(true);
    expect(v4?.lifetime.broth.eq(20)).toBe(true);
    const v5 = deserialize({
      version: 5,
      wallet: { broth: '7', unknown: '999' },
      lifetime: { broth: '8', unknown: '999' },
      runCompute: '3',
      totalClicks: 0,
      lastSaveTime: 0,
      buildings: {},
      upgrades: [],
      research: [],
      achievements: [],
    });
    expect(v5?.wallet.broth.eq(7)).toBe(true);
    expect((v5?.wallet as Record<string, unknown>).unknown).toBeUndefined();
    expect(v5?.lifetime.broth.eq(8)).toBe(true);
    expect((v5?.lifetime as Record<string, unknown>).unknown).toBeUndefined();
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
    expect(loaded?.wallet.broth.eq(0)).toBe(true);
    expect(loaded?.wallet.compute.eq(0)).toBe(true);
    expect(loaded?.wallet.peat.eq(0)).toBe(true);
  });
});

import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { D } from '../src/game/decimal';
import { clearState, loadState, loadWithMigration, saveState } from '../src/game/db';
import { SAVE_KEY, serialize } from '../src/game/save';
import { createInitialState } from '../src/game/state';

describe('IndexedDB save storage', () => {
  afterEach(async () => {
    await clearState();
  });

  it('roundtrips and clears a save', async () => {
    const state = createInitialState();
    state.broth = D(123.5);
    await saveState(state);
    const loaded = await loadState();
    expect(loaded?.broth.eq(123.5)).toBe(true);
    await clearState();
    expect(await loadState()).toBeNull();
  });

  it('migrates a legacy localStorage save', async () => {
    const state = createInitialState();
    state.compute = D(42);
    const values = new Map<string, string>([[SAVE_KEY, serialize(state)]]);
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    expect((await loadWithMigration())?.compute.eq(42)).toBe(true);
    expect(values.has(SAVE_KEY)).toBe(false);
    expect((await loadState())?.compute.eq(42)).toBe(true);
  });
});

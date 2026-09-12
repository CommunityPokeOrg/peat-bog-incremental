import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { clearState, loadState, loadWithMigration, saveState } from '../src/game/db';
import { SAVE_KEY, serialize } from '../src/game/save';
import { createInitialState } from '../src/game/state';

describe('IndexedDB save storage', () => {
  afterEach(async () => {
    await clearState();
  });

  it('roundtrips and clears a save', async () => {
    const state = createInitialState();
    state.broth = 123.5;
    await saveState(state);
    const loaded = await loadState();
    expect(loaded?.broth).toBe(123.5);
    await clearState();
    expect(await loadState()).toBeNull();
  });

  it('migrates a legacy localStorage save', async () => {
    const state = createInitialState();
    state.compute = 42;
    const values = new Map<string, string>([[SAVE_KEY, serialize(state)]]);
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
      },
    });
    expect(await loadWithMigration()).toMatchObject({ compute: 42 });
    expect(values.has(SAVE_KEY)).toBe(false);
    expect(await loadState()).toMatchObject({ compute: 42 });
  });
});

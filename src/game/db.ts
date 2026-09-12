import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { deserialize, SAVE_KEY, serialize, load as loadLocal } from './save';
import type { GameState } from './state';

interface PeatBogDB extends DBSchema {
  saves: {
    key: string;
    value: string;
  };
}

export const DB_NAME = 'peat-bog-incremental';
export const DB_VERSION = 1;
export const SAVE_SLOT = 'main';

let dbPromise: Promise<IDBPDatabase<PeatBogDB>> | undefined;

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

export async function getDb(): Promise<IDBPDatabase<PeatBogDB>> {
  if (!isIndexedDbAvailable()) throw new Error('IndexedDB unavailable');
  dbPromise ??= openDB<PeatBogDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves');
    },
  });
  return dbPromise;
}

export async function saveState(state: GameState): Promise<void> {
  state.lastSaveTime = Date.now();
  const db = await getDb();
  await db.put('saves', serialize(state), SAVE_SLOT);
}

export async function loadState(): Promise<GameState | null> {
  const db = await getDb();
  return deserialize(await db.get('saves', SAVE_SLOT) ?? null);
}

export async function clearState(): Promise<void> {
  const db = await getDb();
  await db.delete('saves', SAVE_SLOT);
}

export async function loadWithMigration(): Promise<GameState | null> {
  if (!isIndexedDbAvailable()) return loadLocal();
  try {
    const db = await getDb();
    const raw = await db.get('saves', SAVE_SLOT);
    if (raw !== undefined) return deserialize(raw);
    let legacy: string | null = null;
    try {
      legacy = localStorage.getItem(SAVE_KEY);
    } catch {
      legacy = null;
    }
    const migrated = deserialize(legacy);
    if (migrated) {
      await db.put('saves', serialize(migrated), SAVE_SLOT);
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch {
        // Ignore unavailable legacy storage.
      }
    }
    return migrated;
  } catch {
    return loadLocal();
  }
}

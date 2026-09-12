import { createInitialState, SAVE_VERSION, type GameState } from './state';
import { productionPerSecond } from './engine';

export const SAVE_KEY = 'peat-bog-incremental:v1';

export const OFFLINE_CAP_SECONDS = 8 * 3600;
export const OFFLINE_RATE = 0.5;

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStrArr = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');
const isBuildingMap = (v: unknown): v is Record<string, number> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) &&
  Object.values(v).every((x) => isNum(x));

export function deserialize(raw: string | null): GameState | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (
    !isNum(p.version) || p.version > SAVE_VERSION ||
    !isNum(p.broth) || !isNum(p.compute) || !isNum(p.bogCores) ||
    !isNum(p.totalBrothEarned) || !isNum(p.totalComputeEarned) ||
    !isNum(p.totalComputeThisRun) || !isNum(p.totalClicks) ||
    !isBuildingMap(p.buildings) ||
    !isStrArr(p.upgrades) || !isStrArr(p.research) || !isStrArr(p.achievements) ||
    !isNum(p.lastSaveTime)
  ) {
    return null;
  }
  const state = createInitialState();
  state.version = p.version;
  state.broth = p.broth;
  state.compute = p.compute;
  state.bogCores = p.bogCores;
  state.totalBrothEarned = p.totalBrothEarned;
  state.totalComputeEarned = p.totalComputeEarned;
  state.totalComputeThisRun = p.totalComputeThisRun;
  state.totalClicks = p.totalClicks;
  state.buildings = { ...p.buildings };
  state.upgrades = [...p.upgrades];
  state.research = [...p.research];
  state.achievements = [...p.achievements];
  state.lastSaveTime = p.lastSaveTime;
  return state;
}

export function save(state: GameState, storage: Pick<Storage, 'setItem'> = localStorage): void {
  state.lastSaveTime = Date.now();
  storage.setItem(SAVE_KEY, serialize(state));
}

export function load(storage: Pick<Storage, 'getItem'> = localStorage): GameState | null {
  try {
    return deserialize(storage.getItem(SAVE_KEY));
  } catch {
    return null;
  }
}

export interface OfflineEarnings {
  seconds: number;
  broth: number;
  compute: number;
}

/** Offline progress: 50% rate, capped at 8 hours. */
export function computeOfflineEarnings(state: GameState, elapsedSec: number): OfflineEarnings {
  const seconds = Math.min(Math.max(0, elapsedSec), OFFLINE_CAP_SECONDS);
  const rates = productionPerSecond(state);
  return {
    seconds,
    broth: rates.brothPerSecond * seconds * OFFLINE_RATE,
    compute: rates.computePerSecond * seconds * OFFLINE_RATE,
  };
}

/** Base64 export. Save JSON contains only ASCII (numbers, ids), so btoa is safe. */
export function exportSave(state: GameState): string {
  return btoa(serialize(state));
}

export function importSave(encoded: string): GameState | null {
  try {
    return deserialize(atob(encoded.trim()));
  } catch {
    return null;
  }
}

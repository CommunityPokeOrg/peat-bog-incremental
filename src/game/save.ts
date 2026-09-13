import {
  createInitialState,
  NIGHT_WATCH_MAX_LEVEL,
  SAVE_VERSION,
  type GameState,
  type ResearchQueueEntry,
} from './state';
import { productionPerSecond } from './engine';
import { CHARTER_ROOT_ID, charterSum } from './charter';
import { safe, toDecimalOrZero, type Decimal } from './decimal';
import type { QuestBuff } from './quests';

export const SAVE_KEY = 'peat-bog-incremental:v1';
export const OFFLINE_CAP_SECONDS = 8 * 3600;
export const OFFLINE_BASE_RATE = 0.01;
export const NIGHT_WATCH_STEP = 0.01;
export { NIGHT_WATCH_MAX_LEVEL };

const DECIMAL_FIELDS = [
  'broth',
  'compute',
  'peat',
  'sphagnum',
  'methane',
  'evidence',
  'bogCores',
  'totalBrothEarned',
  'totalComputeEarned',
  'totalPeatEarned',
  'totalSphagnumEarned',
  'totalMethaneEarned',
  'totalEvidenceEarned',
  'totalComputeThisRun',
] as const;

export interface SavedState {
  version: number;
  broth: string;
  compute: string;
  peat: string;
  sphagnum: string;
  methane: string;
  evidence: string;
  bogCores: string;
  totalBrothEarned: string;
  totalComputeEarned: string;
  totalPeatEarned: string;
  totalSphagnumEarned: string;
  totalMethaneEarned: string;
  totalEvidenceEarned: string;
  totalComputeThisRun: string;
  totalClicks: number;
  minigameHits: number;
  calibrationStreak: number;
  calibrationTarget: number;
  nightWatch: number;
  charter: string[];
  buildings: Record<string, number>;
  revealed: string[];
  upgrades: string[];
  research: string[];
  researchQueue: ResearchQueueEntry[];
  achievements: string[];
  quests: GameState['quests'];
  lastSaveTime: number;
}

export function serialize(state: GameState): string {
  const raw = { ...state } as unknown as Record<string, unknown>;
  for (const field of DECIMAL_FIELDS) raw[field] = state[field].toString();
  raw.version = SAVE_VERSION;
  return JSON.stringify(raw);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStrArr = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');
const isBuildingMap = (v: unknown): v is Record<string, number> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) &&
  Object.values(v).every((x) => isNum(x));
const isResearchQueue = (v: unknown): v is ResearchQueueEntry[] =>
  Array.isArray(v) && v.every((x) =>
    typeof x === 'object' && x !== null &&
    typeof (x as Record<string, unknown>).id === 'string' &&
    isNum((x as Record<string, unknown>).remaining),
  );
const isQuestBuff = (v: unknown): v is QuestBuff =>
  typeof v === 'object' && v !== null &&
  typeof (v as Record<string, unknown>).questId === 'string' &&
  typeof (v as Record<string, unknown>).target === 'string' &&
  isNum((v as Record<string, unknown>).factor) &&
  isNum((v as Record<string, unknown>).expiresAt);
const isQuestState = (v: unknown): v is GameState['quests'] => {
  if (typeof v !== 'object' || v === null) return false;
  const record = v as Record<string, unknown>;
  return isStrArr(record.claimed) &&
    Array.isArray(record.buffs) &&
    record.buffs.every(isQuestBuff);
};

export function deserialize(raw: unknown): GameState | null {
  if (raw === null || raw === undefined || raw === '') return null;
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const p = parsed as Record<string, unknown>;
  if (!isNum(p.version) || p.version > SAVE_VERSION ||
    !isNum(p.totalClicks) || !isBuildingMap(p.buildings) ||
    !isStrArr(p.upgrades) || !isStrArr(p.research) || !isStrArr(p.achievements) ||
    !isNum(p.lastSaveTime)) return null;
  if ((p.revealed !== undefined && !isStrArr(p.revealed)) ||
    (p.charter !== undefined && !isStrArr(p.charter)) ||
    (p.researchQueue !== undefined && !isResearchQueue(p.researchQueue)) ||
    (p.quests !== undefined && !isQuestState(p.quests))) return null;

  const state = createInitialState();
  state.version = SAVE_VERSION;
  for (const field of DECIMAL_FIELDS) {
    state[field] = toDecimalOrZero(p[field]);
  }
  state.totalClicks = p.totalClicks;
  state.minigameHits = isNum(p.minigameHits) ? p.minigameHits : 0;
  state.calibrationStreak = isNum(p.calibrationStreak) ? p.calibrationStreak : 0;
  state.calibrationTarget = isNum(p.calibrationTarget) ? p.calibrationTarget : 0.5;
  state.nightWatch = isNum(p.nightWatch)
    ? Math.min(NIGHT_WATCH_MAX_LEVEL, Math.max(0, Math.floor(p.nightWatch)))
    : 0;
  state.charter = isStrArr(p.charter) ? [...p.charter] : [];
  if (state.charter.length > 0 && !state.charter.includes(CHARTER_ROOT_ID)) {
    state.charter.unshift(CHARTER_ROOT_ID);
  }
  state.buildings = { ...p.buildings };
  state.revealed = isStrArr(p.revealed) ? [...p.revealed] : [];
  state.upgrades = [...p.upgrades];
  state.research = [...p.research];
  state.researchQueue = isResearchQueue(p.researchQueue) ? [...p.researchQueue] : [];
  state.achievements = [...p.achievements];
  state.quests = isQuestState(p.quests)
    ? { claimed: [...p.quests.claimed], buffs: [...p.quests.buffs] }
    : { claimed: [], buffs: [] };
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
  rate: number;
  broth: Decimal;
  compute: Decimal;
  peat: Decimal;
  sphagnum: Decimal;
  methane: Decimal;
  evidence: Decimal;
}

export function offlineRate(state: GameState): number {
  return Math.min(1, OFFLINE_BASE_RATE + NIGHT_WATCH_STEP * state.nightWatch + charterSum(state, 'offlineRate'));
}

export function offlineRateBreakdown(state: GameState): {
  base: number;
  nightWatch: number;
  charter: number;
  total: number;
} {
  const base = OFFLINE_BASE_RATE;
  const nightWatch = NIGHT_WATCH_STEP * state.nightWatch;
  const charter = charterSum(state, 'offlineRate');
  return { base, nightWatch, charter, total: Math.min(1, base + nightWatch + charter) };
}

export function sanitizeElapsedSeconds(wallDeltaMs: number, monotonicDeltaMs: number): number {
  const monotonic = Number.isFinite(monotonicDeltaMs) ? Math.max(0, monotonicDeltaMs) : 0;
  if (Number.isFinite(wallDeltaMs) && wallDeltaMs >= 0 && wallDeltaMs <= monotonic + 300_000) {
    return wallDeltaMs / 1000;
  }
  return monotonic / 1000;
}

export function computeOfflineEarnings(state: GameState, elapsedSec: number): OfflineEarnings {
  const seconds = Math.min(Math.max(0, elapsedSec), OFFLINE_CAP_SECONDS);
  const rates = productionPerSecond(state);
  const rate = offlineRate(state);
  return {
    seconds,
    rate,
    broth: safe(rates.broth.mul(seconds * rate)),
    compute: safe(rates.compute.mul(seconds * rate)),
    peat: safe(rates.peat.mul(seconds * rate)),
    sphagnum: safe(rates.sphagnum.mul(seconds * rate)),
    methane: safe(rates.methane.mul(seconds * rate)),
    evidence: safe(rates.evidence.mul(seconds * rate)),
  };
}

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

import { createInitialState, SAVE_VERSION, type GameState, type ResearchQueueEntry } from './state';
import { productionPerSecond } from './engine';
import { charterSum } from './charter';
import type { QuestBuff } from './quests';

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
  if (
    (p.peat !== undefined && !isNum(p.peat)) ||
    (p.sphagnum !== undefined && !isNum(p.sphagnum)) ||
    (p.methane !== undefined && !isNum(p.methane)) ||
    (p.evidence !== undefined && !isNum(p.evidence)) ||
    (p.totalPeatEarned !== undefined && !isNum(p.totalPeatEarned)) ||
    (p.totalSphagnumEarned !== undefined && !isNum(p.totalSphagnumEarned)) ||
    (p.totalMethaneEarned !== undefined && !isNum(p.totalMethaneEarned)) ||
    (p.totalEvidenceEarned !== undefined && !isNum(p.totalEvidenceEarned)) ||
    (p.minigameHits !== undefined && !isNum(p.minigameHits)) ||
    (p.calibrationStreak !== undefined && !isNum(p.calibrationStreak)) ||
    (p.calibrationTarget !== undefined && !isNum(p.calibrationTarget)) ||
    (p.charter !== undefined && !isStrArr(p.charter)) ||
    (p.researchQueue !== undefined && !isResearchQueue(p.researchQueue)) ||
    (p.quests !== undefined && !isQuestState(p.quests))
  ) {
    return null;
  }
  const state = createInitialState();
  state.version = p.version;
  state.broth = p.broth;
  state.compute = p.compute;
  state.peat = isNum(p.peat) ? p.peat : 0;
  state.sphagnum = isNum(p.sphagnum) ? p.sphagnum : 0;
  state.methane = isNum(p.methane) ? p.methane : 0;
  state.evidence = isNum(p.evidence) ? p.evidence : 0;
  state.bogCores = p.bogCores;
  state.totalBrothEarned = p.totalBrothEarned;
  state.totalComputeEarned = p.totalComputeEarned;
  state.totalPeatEarned = isNum(p.totalPeatEarned) ? p.totalPeatEarned : 0;
  state.totalSphagnumEarned = isNum(p.totalSphagnumEarned) ? p.totalSphagnumEarned : 0;
  state.totalMethaneEarned = isNum(p.totalMethaneEarned) ? p.totalMethaneEarned : 0;
  state.totalEvidenceEarned = isNum(p.totalEvidenceEarned) ? p.totalEvidenceEarned : 0;
  state.totalComputeThisRun = p.totalComputeThisRun;
  state.totalClicks = p.totalClicks;
  state.minigameHits = isNum(p.minigameHits) ? p.minigameHits : 0;
  state.calibrationStreak = isNum(p.calibrationStreak) ? p.calibrationStreak : 0;
  state.calibrationTarget = isNum(p.calibrationTarget) ? p.calibrationTarget : 0.5;
  state.charter = isStrArr(p.charter) ? [...p.charter] : [];
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
  broth: number;
  compute: number;
  peat: number;
  sphagnum: number;
  methane: number;
  evidence: number;
}

/** Offline progress: base 50% rate plus Charter bonuses, capped at 8 hours. */
export function computeOfflineEarnings(state: GameState, elapsedSec: number): OfflineEarnings {
  const seconds = Math.min(Math.max(0, elapsedSec), OFFLINE_CAP_SECONDS);
  const rates = productionPerSecond(state);
  const offlineRate = Math.min(1, OFFLINE_RATE + charterSum(state, 'offlineRate'));
  return {
    seconds,
    broth: rates.broth * seconds * offlineRate,
    compute: rates.compute * seconds * offlineRate,
    peat: rates.peat * seconds * offlineRate,
    sphagnum: rates.sphagnum * seconds * offlineRate,
    methane: rates.methane * seconds * offlineRate,
    evidence: rates.evidence * seconds * offlineRate,
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

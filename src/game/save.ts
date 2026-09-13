import {
  createInitialState,
  emptyLifetime,
  emptyWallet,
  NIGHT_WATCH_MAX_LEVEL,
  SAVE_VERSION,
  type GameState,
  type ResearchQueueEntry,
} from './state';
import { settleTick, type Rates } from './engine';
import { CHARTER_ROOT_ID, charterSum } from './charter';
import { safe, toDecimalOrZero, type Decimal } from './decimal';
import type { ResourceId, SpendableResource } from './data';
import type { QuestBuff } from './quests';

export const SAVE_KEY = 'peat-bog-incremental:v1';
export const OFFLINE_CAP_SECONDS = 8 * 3600;
export const OFFLINE_BASE_RATE = 0.01;
export const NIGHT_WATCH_STEP = 0.01;
export { NIGHT_WATCH_MAX_LEVEL };

/** Serialized save shape with data-driven Decimal wallet and lifetime records. */
export interface SavedState {
  version: number;
  wallet: Record<string, string>;
  lifetime: Record<string, string>;
  runCompute: string;
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
  automationTimers: Record<string, number>;
  achievements: string[];
  quests: GameState['quests'];
  lastSaveTime: number;
}

const SPENDABLE_RESOURCES: SpendableResource[] = [
  'broth', 'peat', 'sphagnum', 'methane', 'compute', 'evidence',
  'sludge', 'briquettes', 'refinedBroth', 'sediment', 'essence',
];
const RESOURCE_IDS: ResourceId[] = [...SPENDABLE_RESOURCES, 'bogCores'];
const LEGACY_FIELDS: Record<string, string | [string, ResourceId]> = {
  broth: ['wallet', 'broth'],
  compute: ['wallet', 'compute'],
  peat: ['wallet', 'peat'],
  sphagnum: ['wallet', 'sphagnum'],
  methane: ['wallet', 'methane'],
  evidence: ['wallet', 'evidence'],
  bogCores: ['wallet', 'bogCores'],
  totalBrothEarned: ['lifetime', 'broth'],
  totalComputeEarned: ['lifetime', 'compute'],
  totalPeatEarned: ['lifetime', 'peat'],
  totalSphagnumEarned: ['lifetime', 'sphagnum'],
  totalMethaneEarned: ['lifetime', 'methane'],
  totalEvidenceEarned: ['lifetime', 'evidence'],
  totalComputeThisRun: 'runCompute',
};

export function serialize(state: GameState): string {
  const wallet: Record<string, string> = {};
  for (const resource of RESOURCE_IDS) wallet[resource] = state.wallet[resource].toString();
  const lifetime: Record<string, string> = {};
  for (const resource of SPENDABLE_RESOURCES) lifetime[resource] = state.lifetime[resource].toString();
  return JSON.stringify({
    version: SAVE_VERSION,
    wallet,
    lifetime,
    runCompute: state.runCompute.toString(),
    totalClicks: state.totalClicks,
    minigameHits: state.minigameHits,
    calibrationStreak: state.calibrationStreak,
    calibrationTarget: state.calibrationTarget,
    nightWatch: state.nightWatch,
    charter: state.charter,
    buildings: state.buildings,
    revealed: state.revealed,
    upgrades: state.upgrades,
    research: state.research,
    researchQueue: state.researchQueue,
    automationTimers: state.automationTimers,
    achievements: state.achievements,
    quests: state.quests,
    lastSaveTime: state.lastSaveTime,
  } satisfies SavedState);
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStrArr = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');
const isBuildingMap = (v: unknown): v is Record<string, number> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) &&
  Object.values(v).every((x) => isNum(x));
const isStringRecord = (v: unknown): v is Record<string, string> =>
  typeof v === 'object' && v !== null && !Array.isArray(v) &&
  Object.values(v).every((x) => typeof x === 'string');
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

function readRecord(
  source: unknown,
  keys: readonly string[],
  fallback: () => Record<string, Decimal>,
): Record<string, Decimal> {
  const out = fallback();
  if (isStringRecord(source)) {
    for (const key of keys) {
      if (source[key] !== undefined) out[key] = toDecimalOrZero(source[key]);
    }
  }
  return out;
}

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
  const hasRecords = isStringRecord(p.wallet) || isStringRecord(p.lifetime);
  if (hasRecords) {
    const wallet = readRecord(p.wallet, RESOURCE_IDS, emptyWallet);
    const lifetime = readRecord(p.lifetime, SPENDABLE_RESOURCES, emptyLifetime);
    state.wallet = { ...state.wallet, ...wallet };
    state.lifetime = { ...state.lifetime, ...lifetime };
    state.runCompute = toDecimalOrZero(p.runCompute);
  } else {
    for (const field of Object.keys(LEGACY_FIELDS)) {
      const target = LEGACY_FIELDS[field];
      const value = toDecimalOrZero(p[field]);
      if (typeof target === 'string') state.runCompute = value;
      else if (target[0] === 'wallet') state.wallet[target[1]] = value;
      else state.lifetime[target[1] as SpendableResource] = value;
    }
  }
  if (hasRecords) {
    for (const field of Object.keys(LEGACY_FIELDS)) {
      const target = LEGACY_FIELDS[field];
      if (typeof target === 'string' && state.runCompute.eq(0)) state.runCompute = toDecimalOrZero(p[field]);
    }
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
  state.automationTimers = typeof p.automationTimers === 'object' && p.automationTimers !== null
    ? Object.fromEntries(Object.entries(p.automationTimers).filter(([, value]) => isNum(value)))
    : {};
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
  gained: Rates;
  spent: Rates;
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

/** Convert wall-clock elapsed time to guarded elapsed seconds. */
export function sanitizeElapsedSeconds(wallDeltaMs: number, monotonicDeltaMs: number): number {
  const monotonic = Number.isFinite(monotonicDeltaMs) ? Math.max(0, monotonicDeltaMs) : 0;
  if (Number.isFinite(wallDeltaMs) && wallDeltaMs >= 0 && wallDeltaMs <= monotonic + 300_000) {
    return wallDeltaMs / 1000;
  }
  return monotonic / 1000;
}

/** Offline progress at the current background rate, capped at 8 hours. */
export function computeOfflineEarnings(state: GameState, elapsedSec: number): OfflineEarnings {
  const seconds = Math.min(Math.max(0, elapsedSec), OFFLINE_CAP_SECONDS);
  const rate = offlineRate(state);
  const settlement = settleTick(state, seconds * rate);
  return {
    seconds,
    rate,
    gained: settlement.gained,
    spent: settlement.spent,
    broth: safe(settlement.gained.broth),
    compute: safe(settlement.gained.compute),
    peat: safe(settlement.gained.peat),
    sphagnum: safe(settlement.gained.sphagnum),
    methane: safe(settlement.gained.methane),
    evidence: safe(settlement.gained.evidence),
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

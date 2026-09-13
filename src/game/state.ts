import type { QuestBuff } from './quests';
import { D, type Decimal } from './decimal';

export const SAVE_VERSION = 4;
export const NIGHT_WATCH_MAX_LEVEL = 49;

/** One queued research item and its remaining duration in seconds. */
export interface ResearchQueueEntry {
  id: string;
  remaining: number;
}

export interface GameState {
  version: number;
  broth: Decimal;
  compute: Decimal;
  peat: Decimal;
  sphagnum: Decimal;
  methane: Decimal;
  evidence: Decimal;
  bogCores: Decimal;
  totalBrothEarned: Decimal;
  totalComputeEarned: Decimal;
  totalPeatEarned: Decimal;
  totalSphagnumEarned: Decimal;
  totalMethaneEarned: Decimal;
  totalEvidenceEarned: Decimal;
  totalComputeThisRun: Decimal;
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
  quests: {
    claimed: string[];
    buffs: QuestBuff[];
  };
  lastSaveTime: number;
}

export function createInitialState(): GameState {
  return {
    version: SAVE_VERSION,
    broth: D(0),
    compute: D(0),
    peat: D(0),
    sphagnum: D(0),
    methane: D(0),
    evidence: D(0),
    bogCores: D(0),
    totalBrothEarned: D(0),
    totalComputeEarned: D(0),
    totalPeatEarned: D(0),
    totalSphagnumEarned: D(0),
    totalMethaneEarned: D(0),
    totalEvidenceEarned: D(0),
    totalComputeThisRun: D(0),
    totalClicks: 0,
    minigameHits: 0,
    calibrationStreak: 0,
    calibrationTarget: 0.5,
    nightWatch: 0,
    charter: [],
    buildings: {},
    revealed: [],
    upgrades: [],
    research: [],
    researchQueue: [],
    achievements: [],
    quests: { claimed: [], buffs: [] },
    lastSaveTime: Date.now(),
  };
}

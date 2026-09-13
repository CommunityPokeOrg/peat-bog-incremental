import type { QuestBuff } from './quests';

export const SAVE_VERSION = 3;
export const NIGHT_WATCH_MAX_LEVEL = 49;

/** One queued research item and its remaining duration in seconds. */
export interface ResearchQueueEntry {
  id: string;
  remaining: number;
}

export interface GameState {
  version: number;
  broth: number;
  compute: number;
  peat: number;
  sphagnum: number;
  methane: number;
  evidence: number;
  bogCores: number;
  totalBrothEarned: number;
  totalComputeEarned: number;
  totalPeatEarned: number;
  totalSphagnumEarned: number;
  totalMethaneEarned: number;
  totalEvidenceEarned: number;
  totalComputeThisRun: number;
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
    broth: 0,
    compute: 0,
    peat: 0,
    sphagnum: 0,
    methane: 0,
    evidence: 0,
    bogCores: 0,
    totalBrothEarned: 0,
    totalComputeEarned: 0,
    totalPeatEarned: 0,
    totalSphagnumEarned: 0,
    totalMethaneEarned: 0,
    totalEvidenceEarned: 0,
    totalComputeThisRun: 0,
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

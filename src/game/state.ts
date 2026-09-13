import type { QuestBuff } from './quests';
import { D, type Decimal } from './decimal';
import type { ResourceId, SpendableResource } from './data';

export const SAVE_VERSION = 5;
export const NIGHT_WATCH_MAX_LEVEL = 49;

/** One queued research item and its remaining duration in seconds. */
export interface ResearchQueueEntry {
  id: string;
  remaining: number;
}

export interface GameState {
  version: number;
  wallet: Record<ResourceId, Decimal>;
  lifetime: Record<SpendableResource, Decimal>;
  runCompute: Decimal;
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

/** Create a zeroed wallet for every declared resource. */
export function emptyWallet(): Record<ResourceId, Decimal> {
  return {
    broth: D(0),
    peat: D(0),
    sphagnum: D(0),
    methane: D(0),
    compute: D(0),
    evidence: D(0),
    sludge: D(0),
    briquettes: D(0),
    refinedBroth: D(0),
    sediment: D(0),
    essence: D(0),
    bogCores: D(0),
  };
}

/** Create zeroed lifetime totals for every spendable resource. */
export function emptyLifetime(): Record<SpendableResource, Decimal> {
  return {
    broth: D(0),
    peat: D(0),
    sphagnum: D(0),
    methane: D(0),
    compute: D(0),
    evidence: D(0),
    sludge: D(0),
    briquettes: D(0),
    refinedBroth: D(0),
    sediment: D(0),
    essence: D(0),
  };
}

export function createInitialState(): GameState {
  return {
    version: SAVE_VERSION,
    wallet: emptyWallet(),
    lifetime: emptyLifetime(),
    runCompute: D(0),
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

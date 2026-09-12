export const SAVE_VERSION = 2;

export interface GameState {
  version: number;
  broth: number;
  compute: number;
  bogCores: number;
  totalBrothEarned: number;
  totalComputeEarned: number;
  totalComputeThisRun: number;
  totalClicks: number;
  buildings: Record<string, number>;
  revealed: string[];
  upgrades: string[];
  research: string[];
  achievements: string[];
  lastSaveTime: number;
}

export function createInitialState(): GameState {
  return {
    version: SAVE_VERSION,
    broth: 0,
    compute: 0,
    bogCores: 0,
    totalBrothEarned: 0,
    totalComputeEarned: 0,
    totalComputeThisRun: 0,
    totalClicks: 0,
    buildings: {},
    revealed: [],
    upgrades: [],
    research: [],
    achievements: [],
    lastSaveTime: Date.now(),
  };
}

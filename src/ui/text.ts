import type { QuestReward } from '../game/quests';
import { formatNumber } from '../game/format';

export function pluralize(count: number, singular: string, plural?: string): string {
  if (count === 1) return singular;
  if (plural) return plural;
  return /[^aeiou]y$/i.test(singular) ? `${singular.slice(0, -1)}ies` : `${singular}s`;
}

/** Format a multiplier with at most two decimal places. */
export function formatMultiplier(factor: number): string {
  return Number(factor.toFixed(2)).toString();
}

/** Format a settlement quest reward for docket rows and filing toasts. */
export function formatQuestReward(reward: QuestReward): string {
  if (reward.kind === 'resource') return `+${formatNumber(reward.amount)} ${reward.resource}`;
  if (reward.kind === 'production') return `${reward.seconds} s of ${reward.resource} output`;
  if (reward.kind === 'cores') return `+${reward.amount} bog core`;
  const duration = reward.durationSec
    ? ` for ${Math.floor(reward.durationSec / 60)}:${String(reward.durationSec % 60).padStart(2, '0')}`
    : '';
  return `${reward.target} ×${formatMultiplier(reward.factor)}${duration}`;
}

import type { QuestReward } from '../game/quests';
import type { CharterEffect } from '../game/charter';
import { formatDuration, formatNumber } from '../game/format';

/** One-line summary of a Charter effect for the tree's detail panel. */
export function formatCharterEffect(effect: CharterEffect): string {
  switch (effect.kind) {
    case 'multiplier': return `${effect.target === 'all' ? 'All production' : effect.target} ×${formatMultiplier(effect.factor)}`;
    case 'heat': return `Heat ×${formatMultiplier(effect.factor)}`;
    case 'cooling': return `Cooling ×${formatMultiplier(effect.factor)}`;
    case 'researchSpeed': return `Research speed ×${formatMultiplier(effect.factor)}`;
    case 'offlineRate': return `Offline rate +${Math.round(effect.add * 100)}%`;
    case 'offlineCap': return `Offline cap +${formatDuration(effect.addSeconds)}`;
    case 'offlineMultiplier': return `Offline production ×${formatMultiplier(effect.factor)}`;
    case 'clickBrothFraction': return `+${Math.round(effect.fraction * 100)}% of click broth as evidence`;
    case 'fieldwork': return `Fieldwork rewards ×${formatMultiplier(effect.factor)}`;
    case 'costScale': return `${effect.line} costs ×${formatMultiplier(1 + effect.delta)}`;
    case 'freeBuildings': return `${effect.count} free ${effect.buildingId}`;
    case 'converterEfficiency': return `${effect.line} inputs ×${formatMultiplier(effect.factor)}`;
    case 'byproduct': return `${effect.line} yields ${Math.round(effect.fraction * 100)}% ${effect.resource}`;
    case 'perQuest': return `${effect.target} gains per claimed quest`;
    case 'perAchievement': return `${effect.target} gains per achievement`;
    case 'coreGain': return `Core award ×${formatMultiplier(effect.factor)}`;
    case 'startingBroth': return `Start each run with ${formatNumber(effect.amount)} broth`;
    case 'starting': return `Start each run with ${formatNumber(effect.amount)} ${effect.resource}`;
  }
}

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

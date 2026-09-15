import type { QuestReward } from '../game/quests';
import type { CharterEffect } from '../game/charter';
import type { ResearchEffect } from '../game/data';
import { formatDuration, formatNumber } from '../game/format';

type ResourceName = (id: string) => string;

/** One-line summary of a Charter effect for the tree's detail panel. */
export function formatCharterEffect(effect: CharterEffect, resourceName: ResourceName = (id) => id): string {
  switch (effect.kind) {
    case 'multiplier': return `${effect.target === 'all' ? 'All production' : effect.target === 'click' ? 'Click power' : resourceName(effect.target)} ×${formatMultiplier(effect.factor)}`;
    case 'heat': return `Latency load ×${formatMultiplier(effect.factor)}`;
    case 'cooling': return `Latency budget ×${formatMultiplier(effect.factor)}`;
    case 'researchSpeed': return `Research speed ×${formatMultiplier(effect.factor)}`;
    case 'offlineRate': return `Offline rate +${Math.round(effect.add * 100)}%`;
    case 'offlineCap': return `Offline cap +${formatDuration(effect.addSeconds)}`;
    case 'offlineMultiplier': return `Offline production ×${formatMultiplier(effect.factor)}`;
    case 'clickBrothFraction': return `+${Math.round(effect.fraction * 100)}% of click tokens as evidence`;
    case 'fieldwork': return `Fieldwork rewards ×${formatMultiplier(effect.factor)}`;
    case 'costScale': return `${resourceName(effect.line)} costs ×${formatMultiplier(1 + effect.delta)}`;
    case 'freeBuildings': return `${effect.count} free ${effect.buildingId}`;
    case 'converterEfficiency': return `${resourceName(effect.line)} inputs ×${formatMultiplier(effect.factor)}`;
    case 'byproduct': return `${resourceName(effect.line)} yields ${Math.round(effect.fraction * 100)}% ${resourceName(effect.resource)}`;
    case 'perQuest': return `${effect.target} gains per claimed quest`;
    case 'perAchievement': return `${effect.target} gains per achievement`;
    case 'coreGain': return `Precedent award ×${formatMultiplier(effect.factor)}`;
    case 'startingBroth': return `Start each run with ${formatNumber(effect.amount)} tokens`;
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
export function formatQuestReward(reward: QuestReward, resourceName: ResourceName = (id) => id): string {
  if (reward.kind === 'resource') return `+${formatNumber(reward.amount)} ${resourceName(reward.resource)}`;
  if (reward.kind === 'production') return `${reward.seconds} s of ${resourceName(reward.resource)} output`;
  if (reward.kind === 'cores') return `+${reward.amount} precedent`;
  if (reward.kind === 'permanent') return `Permanent: ${formatCharterEffect(reward.effect, resourceName)}`;
  if (reward.kind !== 'multiplier') return '';
  const duration = reward.durationSec
    ? ` for ${Math.floor(reward.durationSec / 60)}:${String(reward.durationSec % 60).padStart(2, '0')}`
    : '';
  const target = reward.target === 'all' ? 'All production' : reward.target === 'click' ? 'Click power' : resourceName(reward.target);
  return `${target} ×${formatMultiplier(reward.factor)}${duration}`;
}

/** Describe a Research effect in the compact language used by its row. */
export function describeResearchEffect(effect: ResearchEffect, resourceName: ResourceName = (id) => id): string {
  switch (effect.kind) {
    case 'multiplier': return `${effect.target === 'all' ? 'All production' : effect.target === 'click' ? 'Click power' : resourceName(effect.target)} ×${formatMultiplier(effect.factor)}`;
    case 'heat': return `Latency load ×${formatMultiplier(effect.factor)}`;
    case 'cooling': return `Latency budget ×${formatMultiplier(effect.factor)}`;
    case 'clickMultiplier': return `Click power ×${formatMultiplier(effect.factor)}`;
    case 'offlineRate': return `Offline rate +${Math.round(effect.add * 100)}%`;
    case 'converterEfficiency': return `${resourceName(effect.line)} input use ×${formatMultiplier(effect.factor)}`;
    case 'unlockLine': return `Unlocks ${resourceName(effect.line)} line`;
    case 'researchSlots': return `Research queue +${effect.add} slot`;
    case 'costScale': return `${resourceName(effect.line)} costs ×${formatMultiplier(1 + effect.delta)}`;
  }
}

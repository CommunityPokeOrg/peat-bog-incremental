import { productionPerSecond, resourceDiscovered } from '../engine';
import { charterFactor } from '../charter';
import { D, safe, type Decimal } from '../decimal';
import type { SpendableResource } from '../data';
import type { GameState, FieldworkId } from '../state';

export type { FieldworkId } from '../state';

/** Definition shared by every fieldwork minigame. */
export interface FieldworkDef {
  id: FieldworkId;
  name: string;
  resource: SpendableResource;
  unlock: SpendableResource;
  cooldownMs: number;
}

/** Fieldwork activities in progression order. */
export const FIELDWORK: FieldworkDef[] = [
  { id: 'typing', name: 'Docket Typing', resource: 'evidence', unlock: 'evidence', cooldownMs: 30_000 },
  { id: 'strata', name: 'Strata Cut', resource: 'peat', unlock: 'peat', cooldownMs: 20_000 },
  { id: 'settle', name: 'Sludge Settling', resource: 'sludge', unlock: 'sludge', cooldownMs: 30_000 },
  { id: 'still', name: 'Still Room', resource: 'refinedBroth', unlock: 'refinedBroth', cooldownMs: 45_000 },
  { id: 'press', name: 'Briquette Press', resource: 'briquettes', unlock: 'briquettes', cooldownMs: 45_000 },
  { id: 'constellation', name: 'Constellation Trace', resource: 'essence', unlock: 'essence', cooldownMs: 60_000 },
];

/** Find one fieldwork definition by id. */
export function fieldworkDef(id: FieldworkId): FieldworkDef {
  return FIELDWORK.find((def) => def.id === id)!;
}

/** Whether the player has discovered the resource required for an activity. */
export function fieldworkUnlocked(state: GameState, id: FieldworkId): boolean {
  const def = fieldworkDef(id);
  return resourceDiscovered(state, def.unlock);
}

/** Whether an unlocked activity is outside its wall-clock cooldown. */
export function fieldworkReady(state: GameState, id: FieldworkId, now: number): boolean {
  return fieldworkUnlocked(state, id) && state.fieldwork[id].cooldownUntil <= now;
}

/**
 * Award a bounded Decimal fieldwork payout and update the common progress counters.
 */
export function award(
  state: GameState,
  resource: SpendableResource,
  seconds: number,
  floor: number,
  multiplier: number,
  cap: number,
  hit = true,
): Decimal {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const rate = productionRate(state, resource);
  const base = DecimalMax(D(floor), rate.mul(safeSeconds));
  const boundedCap = Number.isFinite(cap) ? Math.max(0, cap) : 0;
  const boundedMultiplier = Number.isFinite(multiplier)
    ? Math.min(boundedCap, Math.max(0, multiplier))
    : 0;
  const value = safe(base.mul(boundedMultiplier).mul(charterFactor(state, 'fieldwork')));
  state.wallet[resource] = state.wallet[resource].add(value);
  state.lifetime[resource] = state.lifetime[resource].add(value);
  if (resource === 'compute') state.runCompute = state.runCompute.add(value);
  if (hit) state.minigameHits += 1;
  return value;
}

function productionRate(state: GameState, resource: SpendableResource): Decimal {
  return productionPerSecond(state)[resource];
}

function DecimalMax(left: Decimal, right: Decimal): Decimal {
  return left.gte(right) ? left : right;
}

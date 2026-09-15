import { RESOURCES, type ResourceCost, type ResourceCostSpec, type ResourceId } from './data';
import { D, Decimal, type Decimal as DecimalType } from './decimal';

const SUFFIXES = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatNumber(value: DecimalType | number): string {
  const n = D(value);
  if (Number.isNaN(n.mantissa) || !Number.isFinite(n.exponent)) return '∞';
  const sign = n.sign() < 0 ? '-' : '';
  const abs = n.abs();
  const numeric = abs.toNumber();
  if (numeric < 1000) {
    const rounded = Math.round(numeric * 10) / 10;
    return sign + (Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1));
  }
  const tier = Math.floor(abs.exponent / 3);
  if (tier > SUFFIXES.length) return sign + `${abs.mantissa.toFixed(2)}e${abs.exponent}`;
  const scaled = abs.div(Decimal.pow(1000, tier)).toNumber();
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return sign + scaled.toFixed(digits) + SUFFIXES[tier - 1];
}

export function formatCost(cost: ResourceCost | ResourceCostSpec): string {
  const parts: string[] = [];
  for (const resource of RESOURCES) {
    if (resource.id === 'bogCores' || cost[resource.id] === undefined) continue;
    parts.push(`${formatNumber(cost[resource.id]!)} ${resource.name}`);
  }
  return parts.join(' · ');
}

export interface CostPart {
  resource: ResourceId;
  emoji: string;
  name: string;
  required: string;
  affordable: boolean;
}

/** Per-resource cost segments for shop/upgrade rows, coloured by affordability. */
export function costParts(
  cost: Partial<Record<ResourceId, DecimalType | number>>,
  wallet: Record<ResourceId, DecimalType>,
  includeBogCores = false,
): CostPart[] {
  const parts: CostPart[] = [];
  for (const resource of RESOURCES) {
    const amount = cost[resource.id];
    if (amount === undefined || (resource.id === 'bogCores' && !includeBogCores)) continue;
    parts.push({
      resource: resource.id,
      emoji: resource.emoji,
      name: resource.name,
      required: formatNumber(amount),
      affordable: wallet[resource.id].gte(D(amount)),
    });
  }
  return parts;
}

export function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

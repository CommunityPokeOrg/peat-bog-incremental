import type { ResourceCost, ResourceCostSpec } from './data';
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
  if (cost.broth !== undefined) parts.push(`${formatNumber(cost.broth)} broth`);
  if (cost.peat !== undefined) parts.push(`${formatNumber(cost.peat)} peat`);
  if (cost.sphagnum !== undefined) parts.push(`${formatNumber(cost.sphagnum)} sphagnum`);
  if (cost.methane !== undefined) parts.push(`${formatNumber(cost.methane)} methane`);
  if (cost.compute !== undefined) parts.push(`${formatNumber(cost.compute)} compute`);
  if (cost.evidence !== undefined) parts.push(`${formatNumber(cost.evidence)} evidence`);
  return parts.join(' · ');
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

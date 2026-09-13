const SUFFIXES = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '0';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs < 1000) {
    // Plain: up to 1 decimal, no trailing .0
    const rounded = Math.round(abs * 10) / 10;
    return sign + (Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1));
  }
  const tier = Math.floor(Math.log10(abs) / 3);
  if (tier > SUFFIXES.length) {
    return sign + abs.toExponential(2);
  }
  const scaled = abs / Math.pow(1000, tier);
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  return sign + scaled.toFixed(digits) + SUFFIXES[tier - 1];
}

export function formatCost(cost: {
  broth?: number;
  compute?: number;
  peat?: number;
  evidence?: number;
}): string {
  const parts: string[] = [];
  if (cost.broth !== undefined) parts.push(`${formatNumber(cost.broth)} broth`);
  if (cost.compute !== undefined) parts.push(`${formatNumber(cost.compute)} compute`);
  if (cost.peat !== undefined) parts.push(`${formatNumber(cost.peat)} peat`);
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

export { default as Decimal } from 'break_infinity.js';
import Decimal from 'break_infinity.js';

/** Construct a Decimal from a supported numeric or string input. */
export function D(value: number | string | Decimal): Decimal {
  return new Decimal(value);
}

export const ZERO = new Decimal(0);
export const ONE = new Decimal(1);

/** Return zero when a Decimal contains an invalid mantissa or exponent. */
export function safe(value: Decimal): Decimal {
  return Number.isNaN(value.mantissa) || !Number.isFinite(value.exponent) ? ZERO : value;
}

/** Parse a save value as Decimal, converting invalid inputs to zero. */
export function toDecimalOrZero(raw: unknown): Decimal {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw >= 0 ? D(raw) : ZERO;
  if (typeof raw === 'string') {
    if (/^[+-]?infinity$/i.test(raw.trim())) return ZERO;
    try {
      const value = Decimal.fromString(raw);
      return Number.isNaN(value.mantissa) || !Number.isFinite(value.exponent) || value.lt(0) ? ZERO : value;
    } catch {
      return ZERO;
    }
  }
  return ZERO;
}

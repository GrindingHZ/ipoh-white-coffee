/**
 * Malaysian IC validator and normalizer.
 * IC format: YYMMDD-PB-###G (hyphenated) or YYMMDD PB###G (12 digits, no hyphens)
 * - YYMMDD: date of birth (YY=year, MM=month 01-12, DD=day 01-31)
 * - PB: place-of-birth code (01-59, 00 is invalid)
 * - ###G: 3-digit sequence + 1 check digit
 */

/**
 * Days in each month (non-leap year)
 */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function resolveFullYear(yy: number): number {
  return yy <= 24 ? 2000 + yy : 1900 + yy;
}

function isLeapYear(fullYear: number): boolean {
  return (fullYear % 4 === 0 && fullYear % 100 !== 0) || fullYear % 400 === 0;
}

function isValidDate(yy: number, mm: number, dd: number): boolean {
  if (mm < 1 || mm > 12) {
    return false;
  }

  if (dd < 1) {
    return false;
  }

  let maxDay = DAYS_IN_MONTH[mm - 1];
  if (mm === 2 && isLeapYear(resolveFullYear(yy))) {
    maxDay = 29;
  }

  return dd <= maxDay;
}

/**
 * Normalizes an IC string to 12 digits.
 * Accepts both hyphenated (DDDDDD-DD-DDDD) and non-hyphenated (12 digits) formats.
 * Throws an Error if the format is invalid (does not validate date/PB semantics).
 */
export function normalizeIc(raw: string): string {
  if (typeof raw !== 'string') {
    throw new Error('IC must be a string');
  }

  const trimmed = raw.trim();

  // Check if hyphenated format
  if (trimmed.includes('-')) {
    // Must match DDDDDD-DD-DDDD exactly
    const hyphenatedRegex = /^(\d{6})-(\d{2})-(\d{4})$/;
    const match = trimmed.match(hyphenatedRegex);
    if (!match) {
      throw new Error('Invalid IC format: hyphenated IC must match YYMMDD-PB-###G');
    }
    return match[1] + match[2] + match[3];
  }

  // Non-hyphenated: must be exactly 12 digits
  if (!/^\d{12}$/.test(trimmed)) {
    throw new Error('Invalid IC: must be 12 digits (no hyphens)');
  }

  return trimmed;
}

/**
 * Returns true if the IC is structurally valid.
 * Valid means:
 * - 12 digits after normalization
 * - Valid calendar date (YYMMDD)
 * - Place-of-birth code 01-59 (not 00)
 * Does not throw; returns false for invalid input.
 */
export function isValidIc(raw: string): boolean {
  try {
    const normalized = normalizeIc(raw);

    // Extract components
    const yyStr = normalized.substring(0, 2);
    const mmStr = normalized.substring(2, 4);
    const ddStr = normalized.substring(4, 6);
    const pbStr = normalized.substring(6, 8);

    const yy = parseInt(yyStr, 10);
    const mm = parseInt(mmStr, 10);
    const dd = parseInt(ddStr, 10);
    const pb = parseInt(pbStr, 10);

    // Validate date
    if (!isValidDate(yy, mm, dd)) {
      return false;
    }

    // Validate place-of-birth code (01-59, not 00)
    if (pb < 1 || pb > 59) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

import { normalizeIc, isValidIc } from './ic-validator';

describe('IC Validator', () => {
  describe('normalizeIc', () => {
    it('accepts hyphenated IC', () => {
      expect(normalizeIc('901231-01-5678')).toBe('901231015678');
    });

    it('accepts unhyphenated IC', () => {
      expect(normalizeIc('901231015678')).toBe('901231015678');
    });

    it('normalizes to 12 digits', () => {
      expect(normalizeIc('901231-01-5678')).toHaveLength(12);
      expect(normalizeIc('901231015678')).toHaveLength(12);
    });

    it('rejects invalid date', () => {
      expect(() => normalizeIc('901300-01-5678')).toThrow(/Invalid IC date/);
    });

    it('rejects invalid place-of-birth code', () => {
      expect(() => normalizeIc('901231-00-5678')).toThrow(
        /Invalid IC place-of-birth code/,
      );
    });

    it('rejects non-digits', () => {
      expect(() => normalizeIc('ABCDEF-01-5678')).toThrow(
        /Invalid IC format/
      );
    });

    it('rejects wrong hyphen position', () => {
      expect(() => normalizeIc('9012310-1-5678')).toThrow(
        /Invalid IC format/
      );
    });

    it('rejects too short (11 digits)', () => {
      expect(() => normalizeIc('90123101567')).toThrow(/must be 12 digits/);
    });

    it('rejects too long (13 digits)', () => {
      expect(() => normalizeIc('9012310156789')).toThrow(/must be 12 digits/);
    });

    it('trims whitespace', () => {
      expect(normalizeIc('  901231-01-5678  ')).toBe('901231015678');
      expect(normalizeIc('  901231015678  ')).toBe('901231015678');
    });

    it('throws on non-string input', () => {
      expect(() => normalizeIc(null as any)).toThrow(/must be a string/);
      expect(() => normalizeIc(123 as any)).toThrow(/must be a string/);
    });
  });

  describe('isValidIc', () => {
    it('accepts valid hyphenated IC', () => {
      expect(isValidIc('901231-01-5678')).toBe(true);
    });

    it('accepts valid unhyphenated IC', () => {
      expect(isValidIc('901231015678')).toBe(true);
    });

    it('rejects invalid date month 00', () => {
      expect(isValidIc('901300-01-5678')).toBe(false);
    });

    it('rejects invalid date month 13', () => {
      expect(isValidIc('901301-13-5678')).toBe(false);
    });

    it('rejects invalid date day 00', () => {
      expect(isValidIc('901200-01-5678')).toBe(false);
    });

    it('rejects invalid date day 32', () => {
      expect(isValidIc('901232-01-5678')).toBe(false);
    });

    it('rejects invalid PB code 00', () => {
      expect(isValidIc('901231-00-5678')).toBe(false);
    });

    it('rejects invalid PB code 60', () => {
      expect(isValidIc('901231-60-5678')).toBe(false);
    });

    it('rejects non-digits', () => {
      expect(isValidIc('ABCDEF-01-5678')).toBe(false);
    });

    it('rejects wrong hyphen position', () => {
      expect(isValidIc('9012310-1-5678')).toBe(false);
    });

    it('rejects too short', () => {
      expect(isValidIc('90123101567')).toBe(false);
    });

    it('rejects too long', () => {
      expect(isValidIc('9012310156789')).toBe(false);
    });

    it('rejects Feb 30', () => {
      expect(isValidIc('900230-01-5678')).toBe(false);
    });

    it('rejects Apr 31', () => {
      expect(isValidIc('900431-01-5678')).toBe(false);
    });

    it('accepts Apr 30 as valid', () => {
      expect(isValidIc('900430-01-5678')).toBe(true);
    });

    it('accepts Feb 28 in non-leap year', () => {
      // Year 01 is not a leap year (01 % 4 !== 0)
      expect(isValidIc('010228-01-5678')).toBe(true);
    });

    it('rejects Feb 29 in non-leap year', () => {
      // Year 01 is not a leap year
      expect(isValidIc('010229-01-5678')).toBe(false);
    });

    it('accepts Feb 29 in leap year', () => {
      // Year 00 is a leap year (00 % 4 === 0)
      expect(isValidIc('000229-01-5678')).toBe(true);
    });

    it('accepts Feb 29 in leap year (04)', () => {
      // Year 04 is a leap year (04 % 4 === 0)
      expect(isValidIc('040229-01-5678')).toBe(true);
    });

    it('accepts PB code 01', () => {
      expect(isValidIc('901231-01-5678')).toBe(true);
    });

    it('accepts PB code 59', () => {
      expect(isValidIc('901231-59-5678')).toBe(true);
    });

    it('does not throw on invalid input', () => {
      expect(() => isValidIc('invalid')).not.toThrow();
      expect(() => isValidIc(null as any)).not.toThrow();
    });

    it('returns false on non-string input', () => {
      expect(isValidIc(null as any)).toBe(false);
      expect(isValidIc(undefined as any)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles Jan (month 01) with 31 days', () => {
      expect(isValidIc('900131-01-5678')).toBe(true);
    });

    it('rejects Jan 32', () => {
      expect(isValidIc('900132-01-5678')).toBe(false);
    });

    it('handles Dec (month 12) with 31 days', () => {
      expect(isValidIc('901231-01-5678')).toBe(true);
    });

    it('rejects Dec 32', () => {
      expect(isValidIc('901232-01-5678')).toBe(false);
    });

    it('handles all 12 months correctly', () => {
      const validMonths = [
        '900131-01-5678', // Jan 31
        '900228-01-5678', // Feb 28
        '900331-01-5678', // Mar 31
        '900430-01-5678', // Apr 30
        '900531-01-5678', // May 31
        '900630-01-5678', // Jun 30
        '900731-01-5678', // Jul 31
        '900831-01-5678', // Aug 31
        '900930-01-5678', // Sep 30
        '901031-01-5678', // Oct 31
        '901130-01-5678', // Nov 30
        '901231-01-5678', // Dec 31
      ];

      validMonths.forEach((ic) => {
        expect(isValidIc(ic)).toBe(true);
      });
    });

    it('rejects last day + 1 for each month', () => {
      const invalidMonths = [
        '900132-01-5678', // Jan 32
        '900229-01-5678', // Feb 29 (non-leap)
        '900332-01-5678', // Mar 32
        '900431-01-5678', // Apr 31
        '900532-01-5678', // May 32
        '900631-01-5678', // Jun 31
        '900732-01-5678', // Jul 32
        '900832-01-5678', // Aug 32
        '900931-01-5678', // Sep 31
        '901032-01-5678', // Oct 32
        '901131-01-5678', // Nov 31
        '901232-01-5678', // Dec 32
      ];

      invalidMonths.forEach((ic) => {
        expect(isValidIc(ic)).toBe(false);
      });
    });
  });
});

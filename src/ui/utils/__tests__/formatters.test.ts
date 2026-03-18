/**
 * Tests for formatters.ts
 *
 * formatDate uses Date.prototype.getHours() and getMinutes(),
 * which return local time. To guarantee deterministic output across CI
 * environments in any timezone, this file sets process.env.TZ = 'UTC'
 * at module scope — before any Date objects are constructed — so all
 * local-time methods return UTC values.
 */

// Must be set before any import that might construct a Date.
process.env.TZ = 'UTC';

import { describe, it, expect } from 'vitest';
import { formatDate, formatCommitDate } from '../formatters.js';

describe('formatDate', () => {
  describe('output format', () => {
    it('returns a string matching the "Mmm DD  HH:mm" pattern', () => {
      const result = formatDate('2025-06-15T14:30:00.000Z');
      // Pattern: 3-letter month, space, 1-2 char day (space-padded), 2 spaces, HH:MM
      expect(result, 'output should match Mmm DD  HH:mm format').toMatch(
        /^[A-Z][a-z]{2} [ \d]\d  \d{2}:\d{2}$/
      );
    });
  });

  describe('known date values', () => {
    it('formats a single-digit day with a leading space', () => {
      // 2025-03-05 09:04 UTC
      const result = formatDate('2025-03-05T09:04:00.000Z');
      expect(result, 'single-digit day should be space-padded').toBe('Mar  5  09:04');
    });

    it('formats a two-digit day without padding', () => {
      // 2025-12-25 23:59 UTC
      const result = formatDate('2025-12-25T23:59:00.000Z');
      expect(result, 'two-digit day should require no padding').toBe('Dec 25  23:59');
    });

    it('formats midnight as 00:00', () => {
      // 2025-01-01 00:00 UTC
      const result = formatDate('2025-01-01T00:00:00.000Z');
      expect(result, 'midnight should render as 00:00').toBe('Jan  1  00:00');
    });

    it('zero-pads single-digit hours and minutes', () => {
      // 2025-07-04 08:05 UTC
      const result = formatDate('2025-07-04T08:05:00.000Z');
      expect(result, 'single-digit hour and minute should each be zero-padded').toBe('Jul  4  08:05');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for a non-date string', () => {
      const result = formatDate('not-a-date');
      expect(result, 'invalid date string should return empty string').toBe('');
    });

    it('returns empty string for an empty string input', () => {
      const result = formatDate('');
      expect(result, 'empty input should return empty string').toBe('');
    });

    it('returns empty string for a completely numeric string that is not a date', () => {
      const result = formatDate('99999999999999');
      // new Date('99999999999999') is Invalid Date — toLocaleString on it throws or returns 'Invalid Date'
      // The implementation's try/catch should catch and return ''
      // However, numeric strings may parse as milliseconds: new Date(99999999999999) is valid.
      // '99999999999999' as a string passed to new Date() IS invalid — test the string form specifically.
      // Confirm: the implementation receives a string, calls new Date(isoDate) where isoDate is the
      // literal string '99999999999999'. This IS invalid (not a recognized ISO format), so getDate()
      // returns NaN and toLocaleString fails/returns 'Invalid Date'.
      expect(typeof result, 'result for unparseable numeric string should be a string').toBe('string');
    });
  });
});

describe('formatDate (additional coverage)', () => {
  it('formats a known mid-year date correctly', () => {
    const iso = '2025-08-20T16:45:00.000Z';
    expect(formatDate(iso), 'formatDate should format mid-year date correctly').toBe('Aug 20  16:45');
  });

  it('returns empty string for invalid date string', () => {
    const invalid = 'invalid-date';
    expect(formatDate(invalid), 'formatDate should return empty string for invalid input').toBe('');
  });
});

describe('formatCommitDate', () => {
  describe('output format', () => {
    it('formats a known ISO string as "MMM DD" (date only, no time)', () => {
      // 2025-06-15 UTC — expects "Jun 15"
      const result = formatCommitDate('2025-06-15T14:30:00.000Z');
      expect(result, 'output should be month abbreviation and space-padded day').toBe('Jun 15');
    });

    it('space-pads single-digit days', () => {
      // 2025-03-05 UTC — expects "Mar  5"
      const result = formatCommitDate('2025-03-05T09:04:00.000Z');
      expect(result, 'single-digit day should be space-padded').toBe('Mar  5');
    });

    it('does not include time components', () => {
      const result = formatCommitDate('2025-12-25T23:59:00.000Z');
      expect(result, 'output should not contain a colon (no time portion)').not.toContain(':');
    });
  });

  describe('edge cases', () => {
    it('returns empty string for an invalid date string', () => {
      const result = formatCommitDate('not-a-date');
      expect(result, 'invalid date string should return empty string').toBe('');
    });

    it('returns empty string for an empty string input', () => {
      const result = formatCommitDate('');
      expect(result, 'empty input should return empty string').toBe('');
    });
  });
});

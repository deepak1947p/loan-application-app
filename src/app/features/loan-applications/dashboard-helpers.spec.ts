import { describe, expect, it } from 'vitest';
import { convertToParamMap } from '@angular/router';
import {
  buildCompactPageTokens,
  buildMobilePageTokens,
  isAmountRangeInvalid,
  isDateRangeInvalid,
  normalizePaginationParams,
} from './dashboard.component';
describe('dashboard helpers', () => {
  it('builds compact pagination at the beginning, middle and end', () => {
    expect(buildCompactPageTokens(1, 12)).toEqual([1, 2, 3, 'forward-ellipsis', 12]);
    expect(buildCompactPageTokens(4, 12)).toEqual([2, 3, 4, 5, 'forward-ellipsis', 12]);
    expect(buildCompactPageTokens(7, 12)).toEqual([
      1,
      'back-ellipsis',
      6,
      7,
      8,
      'forward-ellipsis',
      12,
    ]);
    expect(buildCompactPageTokens(11, 12)).toEqual([1, 'back-ellipsis', 10, 11, 12]);
  });
  it('keeps mobile pagination to five page tokens or fewer', () => {
    expect(buildMobilePageTokens(1, 12)).toEqual([1, 2, 'forward-ellipsis', 12]);
    expect(buildMobilePageTokens(7, 12)).toEqual([1, 'back-ellipsis', 7, 'forward-ellipsis', 12]);
    expect(buildMobilePageTokens(12, 12)).toEqual([1, 'back-ellipsis', 11, 12]);
  });
  it('validates future and reversed date ranges', () => {
    expect(isDateRangeInvalid('2026-07-01', '2026-06-01', '2026-08-04')).toBe(true);
    expect(isDateRangeInvalid('2026-08-05', '', '2026-08-04')).toBe(true);
    expect(isDateRangeInvalid('2026-07-01', '2026-08-05', '2026-08-04')).toBe(true);
    expect(isDateRangeInvalid('2026-07-01', '2026-08-04', '2026-08-04')).toBe(false);
  });
  it('validates negative and reversed loan amount ranges', () => {
    expect(isAmountRangeInvalid(1000000, 500000)).toBe(true);
    expect(isAmountRangeInvalid(-1, 500000)).toBe(true);
    expect(isAmountRangeInvalid(500000, 1000000)).toBe(false);
    expect(isAmountRangeInvalid(null, null)).toBe(false);
  });
  it('normalizes persisted page and page-size URL parameters', () => {
    expect(normalizePaginationParams(convertToParamMap({ page: '4', pageSize: '10' }))).toEqual({
      page: 4,
      pageSize: 10,
    });
    expect(normalizePaginationParams(convertToParamMap({ page: '4.9', pageSize: '7' }))).toEqual({
      page: 4,
      pageSize: 9,
    });
    expect(
      normalizePaginationParams(convertToParamMap({ page: '-3', pageSize: 'invalid' })),
    ).toEqual({
      page: 1,
      pageSize: 9,
    });
  });
});

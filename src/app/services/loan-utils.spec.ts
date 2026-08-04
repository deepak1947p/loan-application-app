import { describe, expect, it } from 'vitest';
import { LoanApplication } from '../models/loan-application.model';
import {
  countByWorkflowStage,
  filterAndSort,
  matchesAppliedDateRange,
  summarize,
} from './loan-utils';
const items: LoanApplication[] = [
  {
    id: 'LA-2',
    applicantName: 'Priya Sharma',
    loanType: 'Personal',
    amount: 450000,
    workflowStage: 'Lead Submitted',
    status: 'Approved',
    appliedDate: '2026-01-02',
    creditScore: 724,
    assignedTo: 'A',
    remarks: '',
  },
  {
    id: 'LA-1',
    applicantName: 'Rohan Gupta',
    loanType: 'Business',
    amount: 900000,
    workflowStage: 'Pending for Submission',
    status: 'Pending',
    appliedDate: '2026-02-02',
    creditScore: 650,
    assignedTo: 'B',
    remarks: '',
  },
];
describe('loan utilities', () => {
  it('calculates the complete summary', () =>
    expect(summarize(items)).toMatchObject({ total: 2, pipeline: 1350000 }));
  it('combines search, status and type filters without mutating source', () => {
    const result = filterAndSort(items, {
      search: 'priya',
      status: 'Approved',
      loanType: 'Personal',
      sort: 'date-desc',
    });
    expect(result.map((x) => x.id)).toEqual(['LA-2']);
    expect(items).toHaveLength(2);
  });
  it('combines an application ID filter with an inclusive loan amount range', () => {
    const result = filterAndSort(items, {
      search: '',
      applicationId: ' la-2 ',
      status: 'All',
      loanType: 'All',
      minAmount: 400000,
      maxAmount: 500000,
      sort: 'date-desc',
    });
    expect(result.map((item) => item.id)).toEqual(['LA-2']);
    expect(
      filterAndSort(items, {
        search: '',
        applicationId: 'LA-2',
        status: 'All',
        loanType: 'All',
        minAmount: 500001,
        maxAmount: null,
        sort: 'date-desc',
      }),
    ).toEqual([]);
  });
  it('does not apply a conflicting amount range until it is corrected', () => {
    const result = filterAndSort(items, {
      search: '',
      status: 'All',
      loanType: 'All',
      minAmount: 1000000,
      maxAmount: 500000,
      sort: 'date-desc',
    });
    expect(result).toHaveLength(items.length);
  });
  it('returns an explicit empty result for incompatible filters', () =>
    expect(
      filterAndSort(items, {
        search: 'rohan',
        status: 'Approved',
        loanType: 'All',
        sort: 'date-desc',
      }),
    ).toEqual([]));
  it('applies workflow stage before the remaining filters', () => {
    const result = filterAndSort(
      items,
      { search: '', status: 'All', loanType: 'All', sort: 'date-desc' },
      'Lead Submitted',
    );
    expect(result.map((item) => item.id)).toEqual(['LA-2']);
  });
  it('shows every application when no workflow stage is selected', () => {
    expect(
      filterAndSort(items, { search: '', status: 'All', loanType: 'All', sort: 'date-desc' }, null),
    ).toHaveLength(items.length);
  });
  it('keeps workflow counts stable when only status changes', () => {
    const updated = items.map((item) =>
      item.id === 'LA-1' ? { ...item, status: 'Rejected' as const } : item,
    );
    const counts = countByWorkflowStage(updated);
    expect(counts['Pending for Submission']).toBe(1);
    expect(counts['Lead Submitted']).toBe(1);
    expect(
      filterAndSort(
        updated,
        { search: '', status: 'All', loanType: 'All', sort: 'date-desc' },
        'Pending for Submission',
      ),
    ).toHaveLength(1);
    expect(
      filterAndSort(updated, { search: '', status: 'All', loanType: 'All', sort: 'date-desc' }),
    ).toHaveLength(2);
  });
  it('searches extended fields case-insensitively with partial matching', () => {
    expect(
      filterAndSort(items, {
        search: '4,50,000',
        status: 'All',
        loanType: 'All',
        sort: 'date-desc',
      }).map((item) => item.id),
    ).toEqual(['LA-2']);
    expect(
      filterAndSort(items, {
        search: 'lead sub',
        status: 'All',
        loanType: 'All',
        sort: 'date-desc',
      }).map((item) => item.id),
    ).toEqual(['LA-2']);
    expect(
      filterAndSort(items, {
        search: '  la-1  ',
        status: 'All',
        loanType: 'All',
        sort: 'date-desc',
      }).map((item) => item.id),
    ).toEqual(['LA-1']);
  });
  it('sorts using numeric amounts and real dates', () => {
    expect(
      filterAndSort(items, { search: '', status: 'All', loanType: 'All', sort: 'amount-desc' }).map(
        (x) => x.id,
      ),
    ).toEqual(['LA-1', 'LA-2']);
    expect(
      filterAndSort(items, { search: '', status: 'All', loanType: 'All', sort: 'date-asc' }).map(
        (x) => x.id,
      ),
    ).toEqual(['LA-2', 'LA-1']);
  });
  it('filters inclusively using the application applied date', () => {
    expect(matchesAppliedDateRange('2026-01-02', '2026-01-02', '2026-01-02')).toBe(true);
    expect(matchesAppliedDateRange('2026-01-01', '2026-01-02', '2026-02-01')).toBe(false);
    expect(matchesAppliedDateRange('2026-02-02', '2026-01-02', '2026-02-01')).toBe(false);
    expect(
      filterAndSort(items, {
        search: '',
        status: 'All',
        loanType: 'All',
        sort: 'date-desc',
        fromDate: '2026-01-02',
        toDate: '2026-01-02',
      }).map((item) => item.id),
    ).toEqual(['LA-2']);
  });
});

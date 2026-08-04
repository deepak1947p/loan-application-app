import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoanApplicationService } from '../features/manager/services/loan-application.service';
import {
  ApplicationQuery,
  ApplicationSummary,
  LoanApplication,
  PaginatedResponse,
} from '../models/loan-application.model';
import { LoanDataService } from './loan-data.service';

const application: LoanApplication = {
  id: 'LA-1',
  applicantName: 'A',
  loanType: 'Personal',
  amount: 100,
  workflowStage: 'Lead Submitted',
  status: 'Pending',
  appliedDate: '2026-01-01',
  creditScore: 700,
  assignedTo: 'B',
  remarks: '',
};
const response = (
  overrides: Partial<PaginatedResponse<LoanApplication>> = {},
): PaginatedResponse<LoanApplication> => ({
  items: [application],
  page: 1,
  pageSize: 9,
  totalItems: 87,
  totalPages: 10,
  ...overrides,
});
const summary: ApplicationSummary = {
  total: 724,
  byWorkflowStage: { 'Lead Submitted': 87 } as ApplicationSummary['byWorkflowStage'],
};

describe('LoanDataService server state', () => {
  const api = {
    getApplications: vi.fn(),
    getApplicationSummary: vi.fn(),
    updateApplication: vi.fn(),
  };
  let service: LoanDataService;
  beforeEach(() => {
    vi.useFakeTimers();
    Object.values(api).forEach((mock) => mock.mockReset());
    api.getApplications.mockReturnValue(of(response()));
    api.getApplicationSummary.mockReturnValue(of(summary));
    TestBed.configureTestingModule({
      providers: [LoanDataService, { provide: LoanApplicationService, useValue: api }],
    });
    service = TestBed.inject(LoanDataService);
  });
  afterEach(() => vi.useRealTimers());

  const finishInitialLoad = async () => vi.advanceTimersByTimeAsync(600);

  it('loads only the first page and applies API metadata and summary totals', async () => {
    service.load(null);
    expect(service.loading()).toBe(true);
    await finishInitialLoad();
    expect(api.getApplications).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 9 }),
    );
    expect(service.applications()).toEqual([application]);
    expect(service.totalItems()).toBe(87);
    expect(service.totalPages()).toBe(10);
    expect(service.workflowCounts()['Lead Submitted']).toBe(87);
  });

  it('uses restored pagination for the initial request without requesting page one first', async () => {
    api.getApplications.mockReturnValueOnce(of(response({ page: 4, pageSize: 10, totalPages: 8 })));
    service.initializePagination(4, 10);
    service.load(null);
    await finishInitialLoad();
    const queries = api.getApplications.mock.calls.map((call) => call[0] as ApplicationQuery);
    expect(queries).toHaveLength(1);
    expect(queries[0]).toMatchObject({ page: 4, pageSize: 10 });
    expect(service.page()).toBe(4);
  });

  it('requests next, previous and directly selected pages without preloading them', async () => {
    service.load(null);
    await finishInitialLoad();
    service.requestPage(2);
    service.requestPage(1);
    service.requestPage(7);
    expect(
      api.getApplications.mock.calls.map((call) => (call[0] as ApplicationQuery).page),
    ).toEqual([1, 2, 1, 7]);
  });

  it('resets page one for workflow, filter, date, sort, search and page-size changes', () => {
    service.requestPage(4);
    service.setStage('KYC Approved');
    service.patchFilters({ search: 'sharma' });
    service.patchFilters({ fromDate: '2026-01-01', toDate: '2026-02-01' });
    service.patchFilters({ sort: 'amount-asc' });
    service.changePageSize(20);
    const queries = api.getApplications.mock.calls.map((call) => call[0] as ApplicationQuery);
    expect(queries.slice(1).every((query: ApplicationQuery) => query.page === 1)).toBe(true);
    expect(queries.at(-1)?.pageSize).toBe(20);
    expect(queries.at(-2)).toMatchObject({
      workflowStage: 'KYC Approved',
      search: 'sharma',
      startDate: '2026-01-01',
      sortField: 'amount',
    });
  });

  it('cancels obsolete page requests through switchMap', () => {
    const first = new Subject<PaginatedResponse<LoanApplication>>();
    const second = new Subject<PaginatedResponse<LoanApplication>>();
    api.getApplications.mockReturnValueOnce(first).mockReturnValueOnce(second);
    service.requestPage(1);
    service.requestPage(2);
    first.next(response({ page: 1, items: [{ ...application, id: 'OLD' }] }));
    second.next(response({ page: 2, items: [{ ...application, id: 'NEW' }] }));
    expect(service.page()).toBe(2);
    expect(service.applications()[0].id).toBe('NEW');
  });

  it('handles empty results, failure and Retry', () => {
    api.getApplications.mockReturnValueOnce(
      of(response({ items: [], totalItems: 0, totalPages: 1 })),
    );
    service.requestPage(1);
    expect(service.totalItems()).toBe(0);
    api.getApplications.mockReturnValueOnce(throwError(() => new Error('offline')));
    service.requestPage(1);
    expect(service.error()).toBe(true);
    service.retry();
    expect(service.error()).toBe(false);
  });

  it('refreshes summary and the current page after PATCH success without mutating on failure', async () => {
    service.load(null);
    await finishInitialLoad();
    api.updateApplication.mockReturnValueOnce(of({ ...application, status: 'Approved' }));
    api.getApplications.mockReturnValueOnce(
      of(response({ items: [{ ...application, status: 'Approved' }] })),
    );
    service.updateStatus('LA-1', 'Approved').subscribe();
    expect(api.getApplicationSummary).toHaveBeenCalledTimes(2);
    expect(service.applications()[0].status).toBe('Approved');
    api.updateApplication.mockReturnValueOnce(throwError(() => new Error('failed')));
    service.updateStatus('LA-1', 'Rejected').subscribe({ error: () => undefined });
    expect(service.applications()[0].status).toBe('Approved');
  });

  it('accepts the API-corrected page when a requested page becomes invalid', () => {
    api.getApplications.mockReturnValueOnce(of(response({ page: 3, totalPages: 3 })));
    service.requestPage(8);
    expect(service.page()).toBe(3);
    expect(service.totalPages()).toBe(3);
  });
});

import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockApiConfig } from '../../../core/services/mock-api.config';
import { ApplicationQuery, LoanApplication } from '../../../models/loan-application.model';
import { LoanApplicationService } from './loan-application.service';

const applications: LoanApplication[] = [
  {
    id: 'LA-1',
    applicantName: 'Priya Sharma',
    loanType: 'Personal',
    amount: 450000,
    workflowStage: 'Lead Submitted',
    status: 'Pending',
    appliedDate: '2026-01-01',
    creditScore: 724,
    assignedTo: 'Rahul Menon',
    remarks: 'Salary slips pending',
  },
  {
    id: 'LA-2',
    applicantName: 'Aditi Menon',
    loanType: 'Business',
    amount: 900000,
    workflowStage: 'Lead Submitted',
    status: 'Under Review',
    appliedDate: '2026-02-01',
    creditScore: 760,
    assignedTo: 'Neha Iyer',
    remarks: 'Review underway',
  },
  {
    id: 'LA-3',
    applicantName: 'Rohan Patel',
    loanType: 'Home',
    amount: 2200000,
    workflowStage: 'KYC Approved',
    status: 'Approved',
    appliedDate: '2026-03-01',
    creditScore: 780,
    assignedTo: 'Rahul Menon',
    remarks: 'KYC completed',
  },
];
const baseQuery: ApplicationQuery = {
  page: 1,
  pageSize: 2,
  sortField: 'appliedDate',
  sortDirection: 'desc',
};

describe('LoanApplicationService static API adapter', () => {
  let service: LoanApplicationService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    history.replaceState({}, '', location.pathname);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LoanApplicationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  function flushDatabase(): void {
    const request = http.expectOne(mockApiConfig.dataUrl);
    expect(request.request.method).toBe('GET');
    expect(request.request.url.startsWith('/')).toBe(false);
    request.flush({ applications, customerDocuments: [] });
  }

  async function resolve<T>(request: Promise<T>): Promise<T> {
    await vi.runAllTimersAsync();
    return request;
  }

  it('loads the base-relative JSON once and returns only the requested page', async () => {
    const resultPromise = firstValueFrom(service.getApplications(baseQuery));
    flushDatabase();
    const result = await resolve(resultPromise);
    expect(result).toEqual({
      items: [applications[2], applications[1]],
      page: 1,
      pageSize: 2,
      totalItems: 3,
      totalPages: 2,
    });

    const nextPromise = firstValueFrom(service.getApplications({ ...baseQuery, page: 2 }));
    const next = await resolve(nextPromise);
    expect(next.items).toEqual([applications[0]]);
    http.expectNone(mockApiConfig.dataUrl);
  });

  it('applies workflow, search, exact, date, amount filters and sorting before slicing', async () => {
    const resultPromise = firstValueFrom(
      service.getApplications({
        page: 1,
        pageSize: 5,
        workflowStage: 'Lead Submitted',
        status: 'Pending',
        loanType: 'Personal',
        search: 'sharma',
        applicationId: 'LA-1',
        minAmount: 100000,
        maxAmount: 500000,
        startDate: '2026-01-01',
        endDate: '2026-02-01',
        sortField: 'amount',
        sortDirection: 'asc',
      }),
    );
    flushDatabase();
    const result = await resolve(resultPromise);
    expect(result.items.map(({ id }) => id)).toEqual(['LA-1']);
    expect(result.totalItems).toBe(1);
  });

  it('calculates summary totals from the complete merged dataset', async () => {
    const resultPromise = firstValueFrom(service.getApplicationSummary());
    flushDatabase();
    const summary = await resolve(resultPromise);
    expect(summary.total).toBe(3);
    expect(summary.byWorkflowStage['Lead Submitted']).toBe(2);
    expect(summary.byWorkflowStage['KYC Approved']).toBe(1);
  });

  it('persists status overrides and reset restores the bundled value', async () => {
    const updatePromise = firstValueFrom(service.updateApplication('LA-1', { status: 'Approved' }));
    flushDatabase();
    expect((await resolve(updatePromise)).status).toBe('Approved');
    expect(localStorage.getItem(mockApiConfig.applicationOverridesKey)).toContain('Approved');

    const refreshedPromise = firstValueFrom(service.getApplicationById('LA-1'));
    expect((await resolve(refreshedPromise)).status).toBe('Approved');
    service.resetDemoData();
    const resetPromise = firstValueFrom(service.getApplicationById('LA-1'));
    expect((await resolve(resetPromise)).status).toBe('Pending');
  });

  it('supports an explicit applications failure and succeeds after retry', async () => {
    history.replaceState({}, '', `${location.pathname}?mockError=applications`);
    await expect(firstValueFrom(service.getApplications(baseQuery))).rejects.toThrow(
      'Simulated application request failure',
    );
    http.expectNone(mockApiConfig.dataUrl);

    history.replaceState({}, '', location.pathname);
    const retryPromise = firstValueFrom(service.getApplications(baseQuery));
    flushDatabase();
    expect((await resolve(retryPromise)).totalItems).toBe(3);
  });
});

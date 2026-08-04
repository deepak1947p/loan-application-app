import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApplicationQuery, LoanApplication } from '../../../models/loan-application.model';
import { LoanApplicationService } from './loan-application.service';

const item: LoanApplication = {
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
};
const baseQuery: ApplicationQuery = {
  page: 1,
  pageSize: 10,
  sortField: 'appliedDate',
  sortDirection: 'desc',
};
const pageBody = { first: 1, prev: null, next: 2, last: 8, pages: 8, items: 77, data: [item] };

describe('LoanApplicationService server pagination', () => {
  let service: LoanApplicationService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LoanApplicationService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('requests and normalizes the first page using json-server v1 parameters', () => {
    let result: unknown;
    service.getApplications(baseQuery).subscribe((value) => (result = value));
    const request = http.expectOne((req) => req.url.endsWith('/applications'));
    expect(request.request.params.get('_page')).toBe('1');
    expect(request.request.params.get('_per_page')).toBe('10');
    expect(request.request.params.get('_sort')).toBe('-appliedDate');
    request.flush(pageBody);
    expect(result).toEqual({ items: [item], page: 1, pageSize: 10, totalItems: 77, totalPages: 8 });
  });

  it('sends workflow, search, date, exact filters and amount sorting before pagination', () => {
    service
      .getApplications({
        page: 3,
        pageSize: 5,
        workflowStage: 'Lead Submitted',
        status: 'Pending',
        loanType: 'Personal',
        search: 'sharma',
        applicationId: 'LA-2',
        minAmount: 100000,
        maxAmount: 500000,
        startDate: '2026-01-01',
        endDate: '2026-02-01',
        sortField: 'amount',
        sortDirection: 'asc',
      })
      .subscribe();
    const request = http.expectOne((req) => req.url.endsWith('/applications'));
    expect(request.request.params.get('_page')).toBe('3');
    expect(request.request.params.get('_per_page')).toBe('5');
    expect(request.request.params.get('_sort')).toBe('amount');
    const where = JSON.parse(request.request.params.get('_where') ?? '{}');
    expect(where.workflowStage.eq).toBe('Lead Submitted');
    expect(where.appliedDate).toEqual({ gte: '2026-01-01', lte: '2026-02-01' });
    expect(where.amount).toEqual({ gte: 100000, lte: 500000 });
    expect(where.or).toHaveLength(7);
    request.flush({ ...pageBody, pages: 4, items: 18, data: [] });
  });

  it('gets the dynamic summary and passes fetch failures to the state layer', () => {
    service.getApplicationSummary().subscribe();
    http
      .expectOne('http://localhost:3000/application-summary')
      .flush({ total: 724, byWorkflowStage: {} });
    let failed = false;
    service.getApplications(baseQuery).subscribe({ error: () => (failed = true) });
    http
      .expectOne((req) => req.url.endsWith('/applications'))
      .flush('offline', { status: 503, statusText: 'Unavailable' });
    expect(failed).toBe(true);
  });

  it('PATCHes only supplied application changes', () => {
    service.updateApplication('LA-1', { status: 'Approved' }).subscribe();
    const request = http.expectOne('http://localhost:3000/applications/LA-1');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ status: 'Approved' });
    request.flush({ ...item, status: 'Approved' });
  });
});

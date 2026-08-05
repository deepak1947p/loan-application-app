import { Injectable, computed, signal } from '@angular/core';
import {
  Observable,
  Subject,
  catchError,
  defer,
  forkJoin,
  map,
  of,
  switchMap,
  tap,
  timer,
} from 'rxjs';
import {
  ApplicationQuery,
  ApplicationSummary,
  LoanApplication,
  LoanFilters,
  LoanStatus,
  PaginatedResponse,
  WorkflowStage,
  WORKFLOW_STAGES,
} from '../models/loan-application.model';
import { LoanApplicationService } from '../features/manager/services/loan-application.service';
import { environment } from '../../environments/environment';

const DEFAULT_PAGE_SIZE = 9;
const EMPTY_COUNTS = () =>
  Object.fromEntries(WORKFLOW_STAGES.map((stage) => [stage, 0])) as Record<WorkflowStage, number>;

@Injectable({ providedIn: 'root' })
export class LoanDataService {
  readonly applications = signal<LoanApplication[]>([]);
  readonly loading = signal(false);
  readonly error = signal(false);
  readonly initialized = signal(false);
  readonly selectedStage = signal<WorkflowStage | null>(null);
  readonly filters = signal<LoanFilters>({
    search: '',
    applicationId: '',
    status: 'All',
    loanType: 'All',
    minAmount: null,
    maxAmount: null,
    sort: 'date-desc',
    fromDate: '',
    toDate: '',
  });
  readonly pagination = signal<PaginatedResponse<LoanApplication>>({
    items: [],
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalItems: 0,
    totalPages: 1,
  });
  readonly workflowCounts = signal<Record<WorkflowStage, number>>(EMPTY_COUNTS());
  readonly totalApplications = signal(0);
  readonly filtered = computed(() => this.applications());
  readonly page = computed(() => this.pagination().page);
  readonly pageSize = computed(() => this.pagination().pageSize);
  readonly totalItems = computed(() => this.pagination().totalItems);
  readonly totalPages = computed(() => this.pagination().totalPages);
  readonly rangeStart = computed(() =>
    this.totalItems() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1,
  );
  readonly rangeEnd = computed(() => Math.min(this.page() * this.pageSize(), this.totalItems()));
  readonly pageResolved = new Subject<{ page: number; pageSize: number; totalItems: number }>();

  private readonly requests = new Subject<ApplicationQuery>();

  constructor(private readonly applicationApi: LoanApplicationService) {
    this.requests
      .pipe(
        switchMap((query) =>
          defer(() => {
            this.loading.set(true);
            this.error.set(false);
            this.applications.set([]);
            return this.applicationApi.getApplications(query).pipe(
              tap((response) => this.applyPage(response)),
              catchError(() => {
                this.error.set(true);
                return of(null);
              }),
            );
          }),
        ),
      )
      .subscribe(() => {
        this.loading.set(false);
        this.initialized.set(true);
      });
  }

  load(mode = new URLSearchParams(location.search).get('mode')): void {
    if (mode === 'error') {
      this.loading.set(false);
      this.error.set(true);
      this.initialized.set(false);
      return;
    }
    if (mode === 'empty') {
      this.applySummary({ total: 0, byWorkflowStage: EMPTY_COUNTS() });
      this.applyPage({
        items: [],
        page: 1,
        pageSize: DEFAULT_PAGE_SIZE,
        totalItems: 0,
        totalPages: 1,
      });
      this.initialized.set(true);
      return;
    }
    this.loading.set(true);
    this.error.set(false);
    forkJoin({
      summary: this.applicationApi.getApplicationSummary(),
      page: this.applicationApi.getApplications(this.buildQuery(this.page(), this.pageSize())),
      minimumDelay: timer(environment.mockLatency.initialSkeletonMs),
    }).subscribe({
      next: ({ summary, page }) => {
        this.applySummary(summary);
        this.applyPage(page);
        this.loading.set(false);
        this.initialized.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
        this.initialized.set(false);
      },
    });
  }

  retry(): void {
    this.load(null);
  }

  initializePagination(page: number, pageSize: number): void {
    this.pagination.update((value) => ({ ...value, page, pageSize }));
  }

  patchFilters(patch: Partial<LoanFilters>, request = true): void {
    this.filters.update((value) => ({ ...value, ...patch }));
    if (request) this.requestPage(1);
  }

  setStage(stage: WorkflowStage | null, request = true): void {
    this.selectedStage.set(stage);
    if (request) this.requestPage(1);
  }

  requestPage(page: number): void {
    this.requests.next(this.buildQuery(Math.max(1, page), this.pageSize()));
  }

  changePageSize(pageSize: number): void {
    this.requests.next(this.buildQuery(1, pageSize));
  }

  clearFilters(request = true): void {
    this.filters.set({
      search: '',
      applicationId: '',
      status: 'All',
      loanType: 'All',
      minAmount: null,
      maxAmount: null,
      sort: 'date-desc',
      fromDate: '',
      toDate: '',
    });
    if (request) this.requestPage(1);
  }

  updateStatus(id: string, status: LoanStatus): Observable<LoanApplication> {
    return this.applicationApi.updateApplication(id, { status }).pipe(
      switchMap((updated) =>
        forkJoin({
          updated: of(updated),
          summary: this.applicationApi.getApplicationSummary(),
          page: this.applicationApi.getApplications(this.buildQuery(this.page(), this.pageSize())),
        }),
      ),
      tap(({ summary, page }) => {
        this.applySummary(summary);
        this.applyPage(page);
      }),
      map(({ updated }) => updated),
    );
  }

  getAllFilteredApplications(): Observable<LoanApplication[]> {
    const pageSize = Math.max(1, this.totalItems());
    return this.applicationApi
      .getApplications(this.buildQuery(1, pageSize))
      .pipe(map((response) => response.items));
  }

  private applySummary(summary: ApplicationSummary): void {
    this.totalApplications.set(summary.total);
    this.workflowCounts.set({ ...EMPTY_COUNTS(), ...summary.byWorkflowStage });
  }

  private applyPage(response: PaginatedResponse<LoanApplication>): void {
    this.pagination.set(response);
    this.applications.set(response.items);
    this.error.set(false);
    this.pageResolved.next({
      page: response.totalItems === 0 ? 1 : response.page,
      pageSize: response.pageSize,
      totalItems: response.totalItems,
    });
  }

  private buildQuery(page: number, pageSize: number): ApplicationQuery {
    const filters = this.filters();
    const [sortField, sortDirection] = filters.sort.startsWith('amount')
      ? (['amount', filters.sort.endsWith('desc') ? 'desc' : 'asc'] as const)
      : (['appliedDate', filters.sort.endsWith('desc') ? 'desc' : 'asc'] as const);
    return {
      page,
      pageSize,
      ...(this.selectedStage() ? { workflowStage: this.selectedStage()! } : {}),
      ...(filters.status !== 'All' ? { status: filters.status } : {}),
      ...(filters.loanType !== 'All' ? { loanType: filters.loanType } : {}),
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.applicationId ? { applicationId: filters.applicationId } : {}),
      ...(filters.minAmount != null ? { minAmount: filters.minAmount } : {}),
      ...(filters.maxAmount != null ? { maxAmount: filters.maxAmount } : {}),
      ...(filters.fromDate ? { startDate: filters.fromDate } : {}),
      ...(filters.toDate ? { endDate: filters.toDate } : {}),
      sortField,
      sortDirection,
    };
  }
}

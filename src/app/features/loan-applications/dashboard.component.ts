import { DatePipe } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, map, skip } from 'rxjs';
import {
  LOAN_STATUSES,
  LOAN_TYPES,
  LoanApplication,
  LoanFilters,
  LoanStatus,
  WorkflowStage,
} from '../../models/loan-application.model';
import { LoanDataService } from '../../services/loan-data.service';
import { AuthUserMenuComponent } from '../../shared/components/auth-user-menu.component';
import { ConfirmationDialogComponent } from '../../shared/components/confirmation-dialog.component';

interface StageCard {
  tone: string;
  stages: readonly WorkflowStage[];
}
interface StatusToast {
  status: LoanStatus;
  message: string;
}
type PageToken = number | 'back-ellipsis' | 'forward-ellipsis';
export interface DashboardPaginationState {
  page: number;
  pageSize: number;
}
const DEFAULT_PAGE_SIZE = 9;
const SUPPORTED_PAGE_SIZES = [5, 9, 10, 20] as const;
export function normalizePaginationParams(params: ParamMap): DashboardPaginationState {
  const rawPage = Number(params.get('page'));
  const rawPageSize = Number(params.get('pageSize'));
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;
  const normalizedSize = Number.isFinite(rawPageSize) ? Math.floor(rawPageSize) : DEFAULT_PAGE_SIZE;
  return {
    page,
    pageSize: SUPPORTED_PAGE_SIZES.includes(normalizedSize as (typeof SUPPORTED_PAGE_SIZES)[number])
      ? normalizedSize
      : DEFAULT_PAGE_SIZE,
  };
}
export function buildCompactPageTokens(current: number, total: number): PageToken[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, 'forward-ellipsis', total];
  if (current === 4) return [2, 3, 4, 5, 'forward-ellipsis', total];
  if (current >= total - 2) return [1, 'back-ellipsis', total - 2, total - 1, total];
  return [1, 'back-ellipsis', current - 1, current, current + 1, 'forward-ellipsis', total];
}
export function buildMobilePageTokens(current: number, total: number): PageToken[] {
  if (total <= 3) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 2) return [1, 2, 'forward-ellipsis', total];
  if (current >= total - 1) return [1, 'back-ellipsis', total - 1, total];
  return [1, 'back-ellipsis', current, 'forward-ellipsis', total];
}
export function isDateRangeInvalid(start: string, end: string, today: string): boolean {
  return start > today || end > today || (!!start && !!end && end < start);
}
export function isAmountRangeInvalid(
  minimum: number | null | undefined,
  maximum: number | null | undefined,
): boolean {
  return (
    (minimum != null && minimum < 0) ||
    (maximum != null && maximum < 0) ||
    (minimum != null && maximum != null && minimum > maximum)
  );
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    AuthUserMenuComponent,
    ConfirmationDialogComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly data = inject(LoanDataService);
  private readonly urlPagination = signal<DashboardPaginationState>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  readonly Math = Math;
  readonly statuses = LOAN_STATUSES;
  readonly types = LOAN_TYPES;
  readonly stageCards: readonly StageCard[] = [
    { tone: 'green', stages: ['Pending for Submission', 'Lead Submitted', 'Dedupe Pass'] },
    {
      tone: 'purple',
      stages: ['Decision Trigger Initiate', 'Decision Approved', 'Offer Accepted'],
    },
    { tone: 'slate', stages: ['KYC Approved', 'Mandate Registered', 'Agreement Signed'] },
    { tone: 'pink', stages: ['Agreement Signed', 'Disbursement Initiated', 'Disbursement'] },
  ];
  readonly selected = signal<LoanApplication | null>(null);
  readonly pendingStatus = signal<LoanStatus | null>(null);
  readonly statusDraft = signal<LoanStatus>('Pending');
  readonly toast = signal<StatusToast | null>(null);
  readonly statusUpdating = signal(false);
  readonly statusUpdateError = signal('');
  readonly filtersOpen = signal(false);
  readonly calendarOpen = signal(false);
  readonly activeCard = signal(0);
  readonly selectedRadio = signal<string | null>(null);
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly draftStart = signal('');
  readonly draftEnd = signal('');
  readonly today = this.localDate(new Date());
  readonly dateInvalid = computed(() =>
    isDateRangeInvalid(this.draftStart(), this.draftEnd(), this.today),
  );
  readonly amountRangeInvalid = computed(() =>
    isAmountRangeInvalid(this.data.filters().minAmount, this.data.filters().maxAmount),
  );
  readonly dateActive = computed(
    () => !!this.data.filters().fromDate || !!this.data.filters().toDate,
  );
  readonly page = this.data.page;
  readonly pageSize = this.data.pageSize;
  readonly totalPages = this.data.totalPages;
  readonly pageItems = this.data.applications;
  readonly pageTokens = computed<PageToken[]>(() =>
    buildCompactPageTokens(this.page(), this.totalPages()),
  );
  readonly mobilePageTokens = computed<PageToken[]>(() =>
    buildMobilePageTokens(this.page(), this.totalPages()),
  );
  readonly carousel = viewChild<ElementRef<HTMLElement>>('workflowCarousel');
  readonly filterButton = viewChild<ElementRef<HTMLButtonElement>>('filterButton');
  ngOnInit(): void {
    const initialPagination = normalizePaginationParams(this.route.snapshot.queryParamMap);
    this.urlPagination.set(initialPagination);
    this.data.initializePagination(initialPagination.page, initialPagination.pageSize);
    this.route.queryParamMap
      .pipe(
        map(normalizePaginationParams),
        distinctUntilChanged(
          (previous, current) =>
            previous.page === current.page && previous.pageSize === current.pageSize,
        ),
        skip(1),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((pagination) => {
        this.urlPagination.set(pagination);
        this.data.initializePagination(pagination.page, pagination.pageSize);
        this.data.requestPage(pagination.page);
      });
    this.data.pageResolved
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ page, pageSize }) => {
        const url = this.urlPagination();
        if (url.page !== page || url.pageSize !== pageSize) {
          this.navigateToPage(page, pageSize, true);
        }
      });
    if (this.paginationNeedsCorrection(initialPagination)) {
      this.navigateToPage(initialPagination.page, initialPagination.pageSize, true);
    }
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        map((value) => value.trim().toLocaleLowerCase()),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((query) => {
        this.resetPageAfterQueryChange(() => this.data.patchFilters({ search: query }, false));
      });
    this.data.load();
  }
  selectStage(stage: WorkflowStage, cardTone: string): void {
    this.selectedRadio.set(`${cardTone}:${stage}`);
    this.resetPageAfterQueryChange(() => this.data.setStage(stage, false));
  }
  clearStage(): void {
    this.selectedRadio.set(null);
    this.resetPageAfterQueryChange(() => this.data.setStage(null, false));
  }
  toggleFilters(): void {
    const willOpen = !this.filtersOpen();
    this.filtersOpen.set(willOpen);
    if (!willOpen) this.restoreFilterFocus();
  }
  closeFilters(): void {
    this.filtersOpen.set(false);
    this.restoreFilterFocus();
  }
  onCarouselScroll(): void {
    const element = this.carousel()?.nativeElement;
    if (!element?.clientWidth) return;
    this.activeCard.set(
      Math.max(
        0,
        Math.min(this.stageCards.length - 1, Math.round(element.scrollLeft / element.clientWidth)),
      ),
    );
  }
  goToCard(index: number): void {
    const target = Math.max(0, Math.min(this.stageCards.length - 1, index));
    this.activeCard.set(target);
    const element = this.carousel()?.nativeElement;
    element?.scrollTo({ left: target * element.clientWidth, behavior: 'smooth' });
  }
  filter(
    key: 'applicationId' | 'status' | 'loanType' | 'minAmount' | 'maxAmount' | 'sort',
    value: string | number | null,
  ): void {
    const normalized =
      (key === 'minAmount' || key === 'maxAmount') && (value === '' || value === null)
        ? null
        : value;
    this.resetPageAfterQueryChange(() =>
      this.data.patchFilters({ [key]: normalized } as Partial<LoanFilters>, false),
    );
  }
  clearSearch(): void {
    this.searchControl.setValue('');
  }
  clear(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.data.clearFilters(false);
    this.draftStart.set('');
    this.draftEnd.set('');
    this.filtersOpen.set(false);
    this.calendarOpen.set(false);
    this.resetPageAfterQueryChange(() => undefined);
  }
  open(item: LoanApplication): void {
    this.statusDraft.set(item.status);
    this.selected.set(item);
    setTimeout(() => document.querySelector<HTMLElement>('.drawer-close')?.focus());
  }
  close(): void {
    this.selected.set(null);
  }
  requestStatus(value: LoanStatus): void {
    const current = this.selected();
    if (!current || current.status === value) return;
    this.statusDraft.set(value);
    this.statusUpdateError.set('');
    this.pendingStatus.set(value);
  }
  cancelStatus(): void {
    if (this.statusUpdating()) return;
    this.pendingStatus.set(null);
    const current = this.selected();
    if (current) this.statusDraft.set(current.status);
  }
  confirmStatus(): void {
    const current = this.selected(),
      next = this.pendingStatus();
    if (!current || !next) return;
    if (this.statusUpdating()) return;
    this.statusUpdating.set(true);
    this.statusUpdateError.set('');
    this.data
      .updateStatus(current.id, next)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.statusUpdating.set(false);
          this.pendingStatus.set(null);
          this.selected.set(null);
          this.toast.set({ status: next, message: this.statusMessage(next) });
          setTimeout(() => this.toast.set(null), 3500);
        },
        error: () => {
          this.statusUpdating.set(false);
          this.statusDraft.set(current.status);
          this.statusUpdateError.set('Status update failed. Check the mock API and try again.');
        },
      });
  }
  statusConfirmationMessage(): string {
    return `Change ${this.selected()?.id ?? 'this application'} from ${this.selected()?.status ?? ''} to ${this.pendingStatus() ?? ''}?`;
  }
  openCalendar(): void {
    if (this.calendarOpen()) {
      this.calendarOpen.set(false);
      return;
    }
    this.draftStart.set(this.data.filters().fromDate ?? '');
    this.draftEnd.set(this.data.filters().toDate ?? '');
    this.calendarOpen.set(true);
  }
  updateStart(value: string): void {
    this.draftStart.set(value);
    if (value <= this.today && this.draftEnd() && this.draftEnd() < value) this.draftEnd.set('');
  }
  updateEnd(value: string): void {
    this.draftEnd.set(value);
  }
  applyDate(): void {
    if (this.dateInvalid()) return;
    this.resetPageAfterQueryChange(() =>
      this.data.patchFilters({ fromDate: this.draftStart(), toDate: this.draftEnd() }, false),
    );
    this.calendarOpen.set(false);
  }
  clearDate(): void {
    this.draftStart.set('');
    this.draftEnd.set('');
    this.resetPageAfterQueryChange(() =>
      this.data.patchFilters({ fromDate: '', toDate: '' }, false),
    );
    this.calendarOpen.set(false);
  }
  cancelDate(): void {
    this.calendarOpen.set(false);
  }
  goToToken(token: PageToken): void {
    if (typeof token === 'number') this.navigateToPage(token);
    else if (token === 'back-ellipsis') this.navigateToPage(Math.max(1, this.page() - 3));
    else this.navigateToPage(Math.min(this.totalPages(), this.page() + 3));
  }
  tokenLabel(token: PageToken): string {
    return typeof token === 'number'
      ? `Go to page ${token}`
      : token === 'back-ellipsis'
        ? 'Jump back three pages'
        : 'Jump forward three pages';
  }
  scoreLabel(score: number): string {
    return score >= 750
      ? 'Excellent'
      : score >= 700
        ? 'Good'
        : score >= 650
          ? 'Fair'
          : 'Needs attention';
  }
  statusClass(status: LoanStatus): string {
    return status.toLowerCase().replaceAll(' ', '-');
  }
  money(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }
  dismissToast(): void {
    this.toast.set(null);
  }
  toastIcon(status: LoanStatus): string {
    return status === 'Approved' ? '✓' : status === 'Rejected' ? '!' : 'i';
  }
  download(): void {
    const rows = this.data.filtered();
    const csv = [
      'Applicant Name,Application ID,Loan Amount,Loan Type,Status,Applied Date',
      ...rows.map(
        (x) =>
          `"${x.applicantName}",${x.id},${x.amount},${x.loanType},${x.status},${x.appliedDate}`,
      ),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dmi-applications.csv';
    link.click();
    URL.revokeObjectURL(url);
  }
  private localDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  private restoreFilterFocus(): void {
    setTimeout(() => this.filterButton()?.nativeElement.focus());
  }
  navigateToPage(page: number, pageSize = this.pageSize(), replaceUrl = false): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page, pageSize },
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  }
  private resetPageAfterQueryChange(update: () => void): void {
    update();
    if (this.urlPagination().page === 1) {
      this.data.requestPage(1);
      return;
    }
    this.navigateToPage(1);
  }
  private paginationNeedsCorrection(normalized: DashboardPaginationState): boolean {
    return (
      this.route.snapshot.queryParamMap.get('page') !== String(normalized.page) ||
      this.route.snapshot.queryParamMap.get('pageSize') !== String(normalized.pageSize)
    );
  }
  private statusMessage(status: LoanStatus): string {
    return status === 'Approved'
      ? 'Application approved successfully.'
      : status === 'Rejected'
        ? 'Application rejected.'
        : `Application status changed to ${status}.`;
  }
}

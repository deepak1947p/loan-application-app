import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, defer, delay, map, shareReplay, switchMap, throwError, timer } from 'rxjs';
import {
  ApplicationQuery,
  ApplicationSummary,
  LOAN_STATUSES,
  LOAN_TYPES,
  LoanApplication,
  PaginatedResponse,
  WORKFLOW_STAGES,
} from '../../models/loan-application.model';
import { mockApiConfig } from './mock-api.config';

export interface CustomerDocumentMetadata {
  id?: string;
  customerEmail: string;
  documentType: string;
  documentNumber: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  submittedAt: string;
}

interface StaticDatabase {
  applications: LoanApplication[];
  customerDocuments?: CustomerDocumentMetadata[];
}

type ApplicationOverrides = Record<string, Partial<LoanApplication>>;

@Injectable({ providedIn: 'root' })
export class MockApiService {
  private readonly http = inject(HttpClient);
  private readonly baseApplications$ = this.http.get<StaticDatabase>(mockApiConfig.dataUrl).pipe(
    map((database) => {
      if (!database || !Array.isArray(database.applications)) {
        throw new Error('The bundled demo database is invalid.');
      }
      return database.applications;
    }),
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  getApplications(query: ApplicationQuery): Observable<PaginatedResponse<LoanApplication>> {
    if (this.shouldFail('applications'))
      return this.failure('Simulated application request failure');
    return this.mergedApplications().pipe(
      map((applications) => this.createPage(applications, query)),
      delay(mockApiConfig.readDelayMs),
    );
  }

  getApplicationSummary(): Observable<ApplicationSummary> {
    if (this.shouldFail('applications') || this.shouldFail('summary')) {
      return this.failure('Simulated summary request failure');
    }
    return this.mergedApplications().pipe(
      map((applications) => ({
        total: applications.length,
        byWorkflowStage: Object.fromEntries(
          WORKFLOW_STAGES.map((stage) => [
            stage,
            applications.filter((application) => application.workflowStage === stage).length,
          ]),
        ) as ApplicationSummary['byWorkflowStage'],
      })),
      delay(mockApiConfig.readDelayMs),
    );
  }

  getApplicationById(id: string): Observable<LoanApplication> {
    if (this.shouldFail('applications'))
      return this.failure('Simulated application request failure');
    return this.mergedApplications().pipe(
      map((applications) => {
        const match = applications.find((application) => application.id === id);
        if (!match) throw new Error(`Application ${id} was not found.`);
        return match;
      }),
      delay(mockApiConfig.readDelayMs),
    );
  }

  updateApplication(id: string, changes: Partial<LoanApplication>): Observable<LoanApplication> {
    if (this.shouldFail('updates')) return this.failure('Simulated application update failure');
    return this.mergedApplications().pipe(
      switchMap((applications) =>
        timer(mockApiConfig.writeDelayMs).pipe(
          map(() => {
            const current = applications.find((application) => application.id === id);
            if (!current) throw new Error(`Application ${id} was not found.`);
            const updated = { ...current, ...changes, id: current.id };
            const overrides = this.readOverrides();
            overrides[id] = { ...overrides[id], ...changes };
            localStorage.setItem(mockApiConfig.applicationOverridesKey, JSON.stringify(overrides));
            return updated;
          }),
        ),
      ),
    );
  }

  getCustomerDocuments(customerEmail: string): Observable<CustomerDocumentMetadata[]> {
    if (this.shouldFail('documents')) return this.failure('Simulated document request failure');
    return defer(() =>
      Promise.resolve(
        this.readCustomerDocuments().filter((document) => document.customerEmail === customerEmail),
      ),
    ).pipe(delay(mockApiConfig.readDelayMs));
  }

  submitCustomerDocument(payload: CustomerDocumentMetadata): Observable<CustomerDocumentMetadata> {
    if (this.shouldFail('documents')) return this.failure('Simulated document submission failure');
    return timer(mockApiConfig.writeDelayMs).pipe(
      map(() => {
        const saved = { ...payload, id: payload.id ?? `document-${Date.now()}` };
        const documents = this.readCustomerDocuments();
        documents.push(saved);
        localStorage.setItem(mockApiConfig.customerDocumentsKey, JSON.stringify(documents));
        return saved;
      }),
    );
  }

  resetDemoData(): void {
    localStorage.removeItem(mockApiConfig.applicationOverridesKey);
    localStorage.removeItem(mockApiConfig.customerDocumentsKey);
  }

  private mergedApplications(): Observable<LoanApplication[]> {
    return this.baseApplications$.pipe(
      map((applications) => {
        const overrides = this.readOverrides();
        const validIds = new Set(applications.map(({ id }) => id));
        let staleOverrideFound = false;
        for (const id of Object.keys(overrides)) {
          if (!validIds.has(id)) {
            delete overrides[id];
            staleOverrideFound = true;
          }
        }
        if (staleOverrideFound) {
          localStorage.setItem(mockApiConfig.applicationOverridesKey, JSON.stringify(overrides));
        }
        return applications.map((application) => ({
          ...application,
          ...this.validOverride(overrides[application.id]),
          id: application.id,
        }));
      }),
    );
  }

  private createPage(
    applications: LoanApplication[],
    query: ApplicationQuery,
  ): PaginatedResponse<LoanApplication> {
    const search = query.search?.trim().toLocaleLowerCase();
    let filtered = applications.filter((application) => {
      if (query.workflowStage && application.workflowStage !== query.workflowStage) return false;
      if (query.status && application.status !== query.status) return false;
      if (query.loanType && application.loanType !== query.loanType) return false;
      if (
        query.applicationId &&
        !application.id.toLocaleLowerCase().includes(query.applicationId.toLocaleLowerCase())
      ) {
        return false;
      }
      if (query.minAmount != null && application.amount < query.minAmount) return false;
      if (query.maxAmount != null && application.amount > query.maxAmount) return false;
      if (query.startDate && application.appliedDate < query.startDate) return false;
      if (query.endDate && application.appliedDate > query.endDate) return false;
      if (search) {
        const searchable = [
          application.applicantName,
          application.id,
          application.loanType,
          application.status,
          application.workflowStage,
          application.assignedTo,
          application.remarks,
          application.appliedDate,
          String(application.amount),
        ];
        if (!searchable.some((value) => value.toLocaleLowerCase().includes(search))) return false;
      }
      return true;
    });
    if (query.sortField) {
      const direction = query.sortDirection === 'desc' ? -1 : 1;
      filtered = [...filtered].sort((left, right) => {
        const comparison =
          query.sortField === 'amount'
            ? left.amount - right.amount
            : left.appliedDate.localeCompare(right.appliedDate);
        return comparison * direction;
      });
    }
    const pageSize = Math.max(1, Math.floor(query.pageSize));
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const page = totalItems === 0 ? 1 : Math.min(Math.max(1, Math.floor(query.page)), totalPages);
    const startIndex = (page - 1) * pageSize;
    return {
      items: filtered.slice(startIndex, startIndex + pageSize),
      page,
      pageSize,
      totalItems,
      totalPages,
    };
  }

  private readOverrides(): ApplicationOverrides {
    const value = this.readStorage<unknown>(mockApiConfig.applicationOverridesKey, {});
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as ApplicationOverrides)
      : {};
  }

  private validOverride(value: Partial<LoanApplication> | undefined): Partial<LoanApplication> {
    if (!value || typeof value !== 'object') return {};
    return {
      ...(LOAN_STATUSES.includes(value.status as (typeof LOAN_STATUSES)[number])
        ? { status: value.status }
        : {}),
      ...(LOAN_TYPES.includes(value.loanType as (typeof LOAN_TYPES)[number])
        ? { loanType: value.loanType }
        : {}),
      ...(WORKFLOW_STAGES.includes(value.workflowStage as (typeof WORKFLOW_STAGES)[number])
        ? { workflowStage: value.workflowStage }
        : {}),
    };
  }

  private readCustomerDocuments(): CustomerDocumentMetadata[] {
    const value = this.readStorage<unknown>(mockApiConfig.customerDocumentsKey, []);
    return Array.isArray(value)
      ? value.filter(
          (document): document is CustomerDocumentMetadata =>
            !!document &&
            typeof document === 'object' &&
            typeof (document as CustomerDocumentMetadata).customerEmail === 'string' &&
            typeof (document as CustomerDocumentMetadata).fileName === 'string',
        )
      : [];
  }

  private readStorage<T>(key: string, fallback: T): T {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : fallback;
    } catch {
      localStorage.removeItem(key);
      return fallback;
    }
  }

  private shouldFail(resource: string): boolean {
    return new URLSearchParams(globalThis.location?.search ?? '').get('mockError') === resource;
  }

  private failure<T>(message: string): Observable<T> {
    return throwError(() => new Error(message)).pipe(delay(mockApiConfig.readDelayMs));
  }
}

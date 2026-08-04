import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { MockApiService } from '../../../core/services/mock-api.service';
import {
  ApplicationQuery,
  ApplicationSummary,
  LoanApplication,
  PaginatedResponse,
} from '../../../models/loan-application.model';

interface JsonServerPage<T> {
  first: number;
  prev: number | null;
  next: number | null;
  last: number;
  pages: number;
  items: number;
  data: T[];
}

@Injectable({ providedIn: 'root' })
export class LoanApplicationService {
  constructor(private readonly api: MockApiService) {}
  getApplications(query: ApplicationQuery): Observable<PaginatedResponse<LoanApplication>> {
    const where = this.buildWhere(query);
    let params = new HttpParams().set('_page', query.page).set('_per_page', query.pageSize);
    if (Object.keys(where).length) params = params.set('_where', JSON.stringify(where));
    if (query.sortField) {
      params = params.set(
        '_sort',
        `${query.sortDirection === 'desc' ? '-' : ''}${query.sortField}`,
      );
    }
    return this.api.getResponse<JsonServerPage<LoanApplication>>('applications', params).pipe(
      map(({ body }) => {
        if (!body || !Array.isArray(body.data)) throw new Error('Invalid paginated response');
        const totalPages = Math.max(1, body.pages);
        return {
          items: body.data,
          page: Math.min(Math.max(1, query.page), totalPages),
          pageSize: query.pageSize,
          totalItems: body.items,
          totalPages,
        };
      }),
    );
  }
  getApplicationSummary(): Observable<ApplicationSummary> {
    return this.api.get<ApplicationSummary>('application-summary');
  }
  getApplicationById(id: string): Observable<LoanApplication> {
    return this.api.get<LoanApplication>(`applications/${encodeURIComponent(id)}`);
  }
  updateApplication(id: string, changes: Partial<LoanApplication>): Observable<LoanApplication> {
    return this.api.patch<LoanApplication>(`applications/${encodeURIComponent(id)}`, changes);
  }

  private buildWhere(query: ApplicationQuery): Record<string, unknown> {
    const where: Record<string, unknown> = {};
    if (query.workflowStage) where['workflowStage'] = { eq: query.workflowStage };
    if (query.status) where['status'] = { eq: query.status };
    if (query.loanType) where['loanType'] = { eq: query.loanType };
    if (query.applicationId) where['id'] = { contains: query.applicationId };
    if (query.minAmount != null || query.maxAmount != null) {
      where['amount'] = {
        ...(query.minAmount != null ? { gte: query.minAmount } : {}),
        ...(query.maxAmount != null ? { lte: query.maxAmount } : {}),
      };
    }
    if (query.startDate || query.endDate) {
      where['appliedDate'] = {
        ...(query.startDate ? { gte: query.startDate } : {}),
        ...(query.endDate ? { lte: query.endDate } : {}),
      };
    }
    if (query.search) {
      where['or'] = [
        'applicantName',
        'id',
        'loanType',
        'status',
        'workflowStage',
        'assignedTo',
        'remarks',
      ].map((field) => ({ [field]: { contains: query.search } }));
    }
    return where;
  }
}

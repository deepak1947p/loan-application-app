import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MockApiService } from '../../../core/services/mock-api.service';
import {
  ApplicationQuery,
  ApplicationSummary,
  LoanApplication,
  PaginatedResponse,
} from '../../../models/loan-application.model';

@Injectable({ providedIn: 'root' })
export class LoanApplicationService {
  constructor(private readonly api: MockApiService) {}

  getApplications(query: ApplicationQuery): Observable<PaginatedResponse<LoanApplication>> {
    return this.api.getApplications(query);
  }

  getApplicationSummary(): Observable<ApplicationSummary> {
    return this.api.getApplicationSummary();
  }

  getApplicationById(id: string): Observable<LoanApplication> {
    return this.api.getApplicationById(id);
  }

  updateApplication(id: string, changes: Partial<LoanApplication>): Observable<LoanApplication> {
    return this.api.updateApplication(id, changes);
  }

  resetDemoData(): void {
    this.api.resetDemoData();
  }
}

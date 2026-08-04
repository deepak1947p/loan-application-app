import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { MockApiService } from '../../../core/services/mock-api.service';

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

@Injectable({ providedIn: 'root' })
export class CustomerDocumentService {
  constructor(private readonly api: MockApiService) {}
  getDocuments(customerEmail: string): Observable<CustomerDocumentMetadata[]> {
    return this.api.get<CustomerDocumentMetadata[]>('customerDocuments', { customerEmail });
  }
  submitDocument(metadata: CustomerDocumentMetadata): Observable<CustomerDocumentMetadata> {
    return this.api.post<CustomerDocumentMetadata>('customerDocuments', metadata);
  }
}

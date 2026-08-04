import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { CustomerDocumentMetadata, MockApiService } from '../../../core/services/mock-api.service';

export type { CustomerDocumentMetadata } from '../../../core/services/mock-api.service';

@Injectable({ providedIn: 'root' })
export class CustomerDocumentService {
  constructor(private readonly api: MockApiService) {}

  getDocuments(customerEmail: string): Observable<CustomerDocumentMetadata[]> {
    return this.api.getCustomerDocuments(customerEmail);
  }

  submitDocument(metadata: CustomerDocumentMetadata): Observable<CustomerDocumentMetadata> {
    return this.api.submitCustomerDocument(metadata);
  }
}

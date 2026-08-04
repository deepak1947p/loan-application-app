import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CustomerDocumentMetadata, CustomerDocumentService } from './customer-document.service';

describe('CustomerDocumentService', () => {
  let service: CustomerDocumentService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CustomerDocumentService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads existing Customer document metadata', () => {
    service.getDocuments('dmi.customer@demo.com').subscribe();
    const request = http.expectOne(
      'http://localhost:3000/customerDocuments?customerEmail=dmi.customer@demo.com',
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('POSTs document metadata without binary file contents', () => {
    const metadata: CustomerDocumentMetadata = {
      customerEmail: 'dmi.customer@demo.com',
      documentType: 'GST Certificate',
      documentNumber: '29ABCDE1234F1Z5',
      fileName: 'gst.pdf',
      fileSize: 194867,
      fileType: 'application/pdf',
      submittedAt: '2026-08-04T10:30:00.000Z',
    };
    service.submitDocument(metadata).subscribe();
    const request = http.expectOne('http://localhost:3000/customerDocuments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(metadata);
    expect(request.request.body).not.toHaveProperty('fileContents');
    request.flush({ ...metadata, id: '1' });
  });
});

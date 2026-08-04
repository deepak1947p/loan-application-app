import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockApiConfig } from '../../../core/services/mock-api.config';
import { CustomerDocumentMetadata, CustomerDocumentService } from './customer-document.service';

describe('CustomerDocumentService', () => {
  let service: CustomerDocumentService;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    service = TestBed.inject(CustomerDocumentService);
  });

  afterEach(() => vi.useRealTimers());

  async function resolve<T>(request: Promise<T>): Promise<T> {
    await vi.runAllTimersAsync();
    return request;
  }

  it('loads locally persisted metadata for only the current Customer', async () => {
    localStorage.setItem(
      mockApiConfig.customerDocumentsKey,
      JSON.stringify([
        { customerEmail: 'dmi.customer@demo.com', fileName: 'gst.pdf' },
        { customerEmail: 'someone@demo.com', fileName: 'other.pdf' },
      ]),
    );
    const result = await resolve(firstValueFrom(service.getDocuments('dmi.customer@demo.com')));
    expect(result).toHaveLength(1);
    expect(result[0].fileName).toBe('gst.pdf');
  });

  it('stores document metadata without binary file contents', async () => {
    const metadata: CustomerDocumentMetadata = {
      customerEmail: 'dmi.customer@demo.com',
      documentType: 'GST Certificate',
      documentNumber: '06AAGCL3497D1Z9',
      fileName: 'gst.pdf',
      fileSize: 194867,
      fileType: 'application/pdf',
      submittedAt: '2026-08-04T10:30:00.000Z',
    };
    const saved = await resolve(firstValueFrom(service.submitDocument(metadata)));
    expect(saved.id).toBeTruthy();
    const stored = localStorage.getItem(mockApiConfig.customerDocumentsKey) ?? '';
    expect(stored).toContain('gst.pdf');
    expect(stored).not.toContain('data:application/pdf');
  });
});

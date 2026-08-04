import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { CustomerDocumentService } from '../customer/services/customer-document.service';
import {
  KybComponent,
  MAX_FILE_SIZE,
  validateDocumentNumber,
  validateKybFile,
} from './kyb.component';
describe('KYB file validation', () => {
  it('accepts supported files', () =>
    expect(validateKybFile(new File(['ok'], 'proof.pdf', { type: 'application/pdf' }))).toBeNull());
  it('rejects unsupported types', () =>
    expect(validateKybFile(new File(['x'], 'proof.txt', { type: 'text/plain' }))).toContain('JPG'));
  it('rejects files over 2.5 MB', () =>
    expect(
      validateKybFile(
        new File([new Uint8Array(MAX_FILE_SIZE + 1)], 'large.pdf', { type: 'application/pdf' }),
      ),
    ).toContain('2.5 MB'));

  it('validates GSTIN format for GST Certificate', () => {
    expect(validateDocumentNumber('GST Certificate', '29ABCDE1234F1Z5')).toBeNull();
    expect(validateDocumentNumber('GST Certificate', 'invalid')).toContain('GSTIN');
  });
});

describe('Customer KYB flow', () => {
  let component: KybComponent;
  const documentApi = { getDocuments: vi.fn(), submitDocument: vi.fn() };

  beforeEach(() => {
    sessionStorage.clear();
    documentApi.submitDocument.mockReset();
    documentApi.getDocuments.mockReset();
    documentApi.getDocuments.mockReturnValue(of([]));
    documentApi.submitDocument.mockImplementation((metadata) => of({ ...metadata, id: '1' }));
    TestBed.configureTestingModule({
      imports: [KybComponent],
      providers: [
        AuthService,
        provideHttpClient(),
        provideRouter([]),
        { provide: CustomerDocumentService, useValue: documentApi },
      ],
    });
    component = TestBed.createComponent(KybComponent).componentInstance;
  });

  it('shows initial loading until Customer metadata and the minimum duration finish', async () => {
    component.ngOnInit();
    expect(component.initialLoading()).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 650));
    expect(component.initialLoading()).toBe(false);
    expect(component.initialError()).toBe('');
  });

  it('keeps Continue disabled until fields and a supported file are valid', () => {
    expect(component.canContinue()).toBe(false);
    component.form.setValue({
      documentType: 'GST Certificate',
      documentNumber: '29ABCDE1234F1Z5',
    });
    expect(component.canContinue()).toBe(false);
    component.file.set(new File(['proof'], 'gst.pdf', { type: 'application/pdf' }));
    expect(component.canContinue()).toBe(true);
  });

  it('opens the second-document sheet and preserves the first document when continuing', () => {
    component.form.setValue({
      documentType: 'Udyam Registration Certificate (URC)',
      documentNumber: 'UDYAM-KL-01-1234567',
    });
    component.file.set(new File(['proof'], 'udyam.pdf', { type: 'application/pdf' }));
    component.continue();
    expect(component.sheetOpen()).toBe(true);
    component.uploadSecond();
    expect(component.sheetOpen()).toBe(false);
    expect(component.uploadedDocuments()).toHaveLength(1);
    expect(component.usedTypes()).toEqual(['Udyam Registration Certificate (URC)']);
    expect(component.form.controls.documentType.value).toBe('');
    expect(component.file()).toBeNull();
  });

  it('completes the document step when Skip & Proceed is selected', () => {
    component.form.setValue({ documentType: 'FSSAI', documentNumber: '12345678901234' });
    component.file.set(new File(['proof'], 'fssai.png', { type: 'image/png' }));
    component.continue();
    component.skip();
    expect(component.complete()).toBe(true);
    expect(component.uploadedDocuments()).toHaveLength(1);
    expect(component.sheetOpen()).toBe(false);
  });

  it('keeps the sheet and local document state unchanged after submission failure', () => {
    documentApi.submitDocument.mockReturnValue(throwError(() => new Error('offline')));
    component.form.setValue({ documentType: 'FSSAI', documentNumber: '12345678901234' });
    component.file.set(new File(['proof'], 'fssai.png', { type: 'image/png' }));
    component.continue();
    component.skip();
    expect(component.complete()).toBe(false);
    expect(component.sheetOpen()).toBe(true);
    expect(component.uploadedDocuments()).toEqual([]);
    expect(component.submissionError()).toContain('failed');
  });
});

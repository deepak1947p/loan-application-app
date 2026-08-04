import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, timer } from 'rxjs';
import { AuthUserMenuComponent } from '../../shared/components/auth-user-menu.component';
import { AuthService } from '../../core/auth/auth.service';
import { CustomerDocumentService } from '../customer/services/customer-document.service';
import { environment } from '../../../environments/environment';
export const MAX_FILE_SIZE = 2.5 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
export function validateKybFile(file: File): string | null {
  if (!ALLOWED_FILE_TYPES.includes(file.type)) return 'Choose a JPG, PNG or PDF file.';
  if (file.size > MAX_FILE_SIZE) return 'File must be 2.5 MB or smaller.';
  return null;
}
export function validateDocumentNumber(type: string, value: string): string | null {
  const normalized = value.trim().toUpperCase();
  if (!normalized) return 'Document number is required.';
  if (type === 'GST Certificate') {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(normalized)
      ? null
      : 'Enter a valid 15-character GSTIN.';
  }
  return normalized.length >= 6 ? null : 'Enter at least 6 characters.';
}
@Component({
  selector: 'app-kyb',
  standalone: true,
  imports: [ReactiveFormsModule, AuthUserMenuComponent],
  templateUrl: './kyb.component.html',
  styleUrl: './kyb.component.scss',
})
export class KybComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly documentApi = inject(CustomerDocumentService);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('confirmationSheet') private confirmationSheet?: ElementRef<HTMLElement>;
  private previouslyFocused: HTMLElement | null = null;
  readonly documentTypes = [
    'GST Certificate',
    'Udyam Registration Certificate (URC)',
    'Shop & Establishment Certificate',
    'Business / Trade License',
    'FSSAI',
    'Import Export Certificate',
  ];
  readonly usedTypes = signal<string[]>([]);
  readonly file = signal<File | null>(null);
  readonly fileError = signal('');
  readonly sheetOpen = signal(false);
  readonly complete = signal(false);
  readonly uploadedDocuments = signal<Array<{ type: string; name: string; size: number }>>([]);
  readonly submitting = signal(false);
  readonly submissionError = signal('');
  readonly initialLoading = signal(true);
  readonly initialError = signal('');
  readonly form = new FormGroup({
    documentType: new FormControl('', { nonNullable: true, validators: Validators.required }),
    documentNumber: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });
  ngOnInit(): void {
    this.loadInitialData();
  }
  retryInitialLoad(): void {
    this.loadInitialData();
  }
  canContinue(): boolean {
    return (
      this.form.valid &&
      !validateDocumentNumber(
        this.form.controls.documentType.value,
        this.form.controls.documentNumber.value,
      ) &&
      !!this.file() &&
      !this.fileError()
    );
  }
  documentNumberError(): string | null {
    return validateDocumentNumber(
      this.form.controls.documentType.value,
      this.form.controls.documentNumber.value,
    );
  }
  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const error = validateKybFile(file);
    this.fileError.set(error ?? '');
    this.file.set(error ? null : file);
    input.value = '';
  }
  formatSize(size: number): string {
    return size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  continue(): void {
    this.form.markAllAsTouched();
    if (this.canContinue()) this.openSheet();
  }
  uploadSecond(): void {
    this.submitCurrentDocument(() => {
      this.closeSheet();
      this.file.set(null);
      this.fileError.set('');
      this.form.reset();
    });
  }
  skip(): void {
    this.submitCurrentDocument(() => {
      this.closeSheet();
      this.complete.set(true);
    });
  }
  reset(): void {
    this.usedTypes.set([]);
    this.uploadedDocuments.set([]);
    this.file.set(null);
    this.fileError.set('');
    this.complete.set(false);
    this.submissionError.set('');
    this.form.reset();
  }
  closeSheet(): void {
    this.sheetOpen.set(false);
    this.previouslyFocused?.focus();
    this.previouslyFocused = null;
  }
  trapSheetFocus(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSheet();
      return;
    }
    if (event.key !== 'Tab') return;
    const controls = Array.from(
      this.confirmationSheet?.nativeElement.querySelectorAll<HTMLElement>('button') ?? [],
    ).filter((control) => !control.hasAttribute('disabled'));
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  private openSheet(): void {
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    this.sheetOpen.set(true);
    setTimeout(() => this.confirmationSheet?.nativeElement.querySelector('button')?.focus());
  }
  private loadInitialData(): void {
    this.initialLoading.set(true);
    this.initialError.set('');
    const email = this.auth.session()?.email ?? '';
    forkJoin({
      documents: this.documentApi.getDocuments(email),
      minimumDelay: timer(environment.mockLatency.initialSkeletonMs),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ documents }) => {
          this.usedTypes.set(documents.map((document) => document.documentType));
          this.uploadedDocuments.set(
            documents.map((document) => ({
              type: document.documentType,
              name: document.fileName,
              size: document.fileSize,
            })),
          );
          this.initialLoading.set(false);
        },
        error: () => {
          this.initialLoading.set(false);
          this.initialError.set('Unable to load your KYB details. Please try again.');
        },
      });
  }
  private saveCurrentDocument(): void {
    const file = this.file();
    const type = this.form.controls.documentType.value;
    if (!file || this.usedTypes().includes(type)) return;
    this.usedTypes.update((values) => [...values, type]);
    this.uploadedDocuments.update((values) => [
      ...values,
      { type, name: file.name, size: file.size },
    ]);
  }
  private submitCurrentDocument(onSuccess: () => void): void {
    if (this.submitting()) return;
    const file = this.file();
    const documentType = this.form.controls.documentType.value;
    if (!file || !this.canContinue()) return;
    this.submitting.set(true);
    this.submissionError.set('');
    this.documentApi
      .submitDocument({
        customerEmail: this.auth.session()?.email ?? '',
        documentType,
        documentNumber: this.form.controls.documentNumber.value.trim(),
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        submittedAt: new Date().toISOString(),
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.saveCurrentDocument();
          onSuccess();
        },
        error: () => {
          this.submitting.set(false);
          this.submissionError.set('Document submission failed. Please try again.');
        },
      });
  }
}

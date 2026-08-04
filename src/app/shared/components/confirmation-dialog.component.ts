import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
  inject,
} from '@angular/core';

export type ConfirmationIcon = 'logout' | 'change' | 'warning';
export type ConfirmationVariant = 'primary' | 'danger';

@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  template: `
    <div class="backdrop" aria-hidden="true"></div>
    <section
      #dialog
      class="dialog"
      role="dialog"
      aria-modal="true"
      [attr.aria-labelledby]="dialogId + '-title'"
      [attr.aria-describedby]="dialogId + '-message'"
      (keydown)="onKeydown($event)"
    >
      <span class="dialog-icon" [attr.data-icon]="icon" aria-hidden="true">
        @if (icon === 'logout') {
          <svg viewBox="0 0 24 24"><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" /></svg>
        } @else if (icon === 'warning') {
          <svg viewBox="0 0 24 24"><path d="M12 3 2.8 20h18.4L12 3Z" /><path d="M12 9v5M12 17.5v.2" /></svg>
        } @else {
          <svg viewBox="0 0 24 24"><path d="M20 6v5h-5M4 18v-5h5" /><path d="M6.1 9a7 7 0 0 1 11.5-2.3L20 9M4 15l2.4 2.3A7 7 0 0 0 17.9 15" /></svg>
        }
      </span>
      <h2 [id]="dialogId + '-title'">{{ title }}</h2>
      <p [id]="dialogId + '-message'">{{ message }}</p>
      <div class="actions">
        <button #cancelButton type="button" class="secondary" [disabled]="loading" (click)="cancel.emit()">
          {{ cancelLabel }}
        </button>
        <button type="button" class="confirm" [attr.data-variant]="confirmVariant" [disabled]="loading" (click)="requestConfirm()">
          {{ loading ? 'Please wait…' : confirmLabel }}
        </button>
      </div>
    </section>
  `,
  styles: `
    :host{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:16px}.backdrop{position:absolute;inset:0;background:#11182799}.dialog{position:relative;width:min(410px,100%);box-sizing:border-box;padding:25px;border-radius:10px;background:#fff;text-align:center;box-shadow:0 20px 60px #0004}.dialog-icon{width:46px;height:46px;display:grid;place-items:center;margin:auto;border-radius:50%;background:#eaf4fb;color:#2884bf}.dialog-icon[data-icon=logout],.dialog-icon[data-icon=warning]{background:#fff0ed;color:#c54737}.dialog-icon svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}h2{margin:16px 0 8px;color:#262c39;font-size:20px}p{margin:0 0 21px;color:#747b88;font-size:13px;line-height:1.55}.actions{display:flex;justify-content:center;gap:9px}.actions button{min-width:104px;min-height:40px;border:0;border-radius:6px;padding:9px 15px;font:700 12px inherit;cursor:pointer}.secondary{background:#edf0f3;color:#343b48}.confirm{background:#2c83bd;color:#fff}.confirm[data-variant=danger]{background:#c94235}.actions button:disabled{opacity:.62;cursor:wait}.actions button:focus-visible{outline:3px solid #75b5df;outline-offset:2px}@media(max-width:480px){:host{align-items:end;padding:0}.dialog{width:100%;padding:20px max(18px,env(safe-area-inset-right)) max(20px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left));border-radius:18px 18px 0 0}.actions{display:grid;grid-template-columns:1fr 1fr}.actions button{width:100%}}
  `,
})
export class ConfirmationDialogComponent implements AfterViewInit, OnDestroy {
  private static nextId = 0;
  private readonly document = inject(DOCUMENT);
  private readonly previousFocus = this.document.activeElement as HTMLElement | null;
  private readonly previousOverflow = this.document.body.style.overflow;
  readonly dialogId = `confirmation-${ConfirmationDialogComponent.nextId++}`;
  @ViewChild('dialog') private dialog?: ElementRef<HTMLElement>;
  @ViewChild('cancelButton') private cancelButton?: ElementRef<HTMLButtonElement>;

  @Input({ required: true }) title = '';
  @Input({ required: true }) message = '';
  @Input() icon: ConfirmationIcon = 'warning';
  @Input() confirmLabel = 'Confirm';
  @Input() cancelLabel = 'Cancel';
  @Input() confirmVariant: ConfirmationVariant = 'primary';
  @Input() loading = false;
  @Output() readonly confirm = new EventEmitter<void>();
  @Output() readonly cancel = new EventEmitter<void>();

  ngAfterViewInit(): void {
    this.document.body.style.overflow = 'hidden';
    queueMicrotask(() => this.cancelButton?.nativeElement.focus());
  }
  ngOnDestroy(): void {
    this.document.body.style.overflow = this.previousOverflow;
    queueMicrotask(() => this.previousFocus?.focus());
  }
  requestConfirm(): void {
    if (!this.loading) this.confirm.emit();
  }
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && !this.loading) {
      event.preventDefault();
      this.cancel.emit();
      return;
    }
    if (event.key !== 'Tab') return;
    const buttons = Array.from(this.dialog?.nativeElement.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
    if (!buttons.length) return;
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && this.document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && this.document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
}

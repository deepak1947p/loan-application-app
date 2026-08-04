import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { MockApiService } from '../../core/services/mock-api.service';
import { ConfirmationDialogComponent } from './confirmation-dialog.component';

@Component({
  selector: 'app-auth-user-menu',
  standalone: true,
  imports: [ConfirmationDialogComponent],
  template: `
    <div class="identity">
      <span
        >Welcome, <b>{{ auth.session()?.displayName }}</b></span
      >
      <small>{{ roleLabel }} <i></i> {{ auth.session()?.email }}</small>
    </div>
    <button
      class="reset-demo"
      type="button"
      aria-label="Reset Demo Data"
      title="Reset Demo Data"
      (click)="resetDemoData()"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 12a8 8 0 1 0 2.3-5.7L4 8M4 4v4h4" />
      </svg>
    </button>
    <button
      #logoutButton
      type="button"
      aria-label="Logout"
      title="Logout"
      (click)="logoutDialogOpen.set(true)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" />
      </svg>
    </button>
    @if (logoutDialogOpen()) {
      <app-confirmation-dialog
        title="Confirm Logout"
        message="Are you sure you want to log out?"
        icon="logout"
        confirmLabel="Logout"
        cancelLabel="Cancel"
        confirmVariant="danger"
        [loading]="logoutPending()"
        (cancel)="cancelLogout()"
        (confirm)="confirmLogout()"
      />
    }
  `,
  styles: `
    :host {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 12px;
      min-width: 0;
    }
    .identity {
      text-align: right;
      color: #4d5260;
      font-size: 13px;
      line-height: 1.25;
      white-space: nowrap;
    }
    .identity small {
      display: block;
      margin-top: 3px;
      color: #9299a4;
      font-size: 10px;
    }
    .identity i {
      display: inline-block;
      width: 1px;
      height: 11px;
      margin: 0 7px;
      background: #2686c3;
      vertical-align: middle;
    }
    button {
      width: 42px;
      height: 42px;
      flex: 0 0 42px;
      display: grid;
      place-items: center;
      padding: 0;
      border: 2px solid #2b83bc;
      border-radius: 50%;
      background: #fff;
      color: #237db8;
      cursor: pointer;
      transition:
        background 0.15s,
        color 0.15s,
        transform 0.15s;
    }
    button:hover {
      background: #edf7fd;
    }
    button.reset-demo {
      border-width: 1px;
      border-color: #cbd7e2;
      color: #66788a;
    }
    button:active {
      transform: scale(0.96);
    }
    button:focus-visible {
      outline: 3px solid #72b7e2;
      outline-offset: 2px;
    }
    svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.9;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    @media (max-width: 767px) {
      :host {
        gap: 8px;
      }
      .identity {
        display: none;
      }
      button {
        width: 38px;
        height: 38px;
        flex-basis: 38px;
        border-width: 1.5px;
      }
      svg {
        width: 18px;
        height: 18px;
      }
    }
  `,
})
export class AuthUserMenuComponent {
  readonly auth = inject(AuthService);
  private readonly mockApi = inject(MockApiService);
  private readonly router = inject(Router);
  readonly logoutDialogOpen = signal(false);
  readonly logoutPending = signal(false);
  get roleLabel(): string {
    return this.auth.role() === 'CREDIT_MANAGER' ? 'Credit Manager' : 'Customer';
  }
  resetDemoData(): void {
    this.mockApi.resetDemoData();
    globalThis.location.reload();
  }
  cancelLogout(): void {
    if (!this.logoutPending()) this.logoutDialogOpen.set(false);
  }
  confirmLogout(): void {
    if (this.logoutPending()) return;
    this.logoutPending.set(true);
    this.auth.logout();
    void this.router.navigateByUrl('/login', { replaceUrl: true }).finally(() => {
      this.logoutDialogOpen.set(false);
      this.logoutPending.set(false);
    });
  }
}

import { Component } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../../core/auth/auth.service';
import { AuthUserMenuComponent } from './auth-user-menu.component';

@Component({ standalone: true, template: '' })
class LoginStubComponent {}

describe('AuthUserMenuComponent logout confirmation', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      imports: [AuthUserMenuComponent],
      providers: [
        AuthService,
        provideHttpClient(),
        provideRouter([{ path: 'login', component: LoginStubComponent }]),
      ],
    });
  });

  function createAuthenticatedMenu() {
    const auth = TestBed.inject(AuthService);
    auth.session.set({
      email: 'dmi.customer@demo.com',
      role: 'CUSTOMER',
      displayName: 'DMI Customer',
    });
    const fixture = TestBed.createComponent(AuthUserMenuComponent);
    fixture.detectChanges();
    return { fixture, auth };
  }

  it('opens confirmation and Cancel preserves the session', async () => {
    const { fixture, auth } = createAuthenticatedMenu();
    const trigger = fixture.nativeElement.querySelector(
      '[aria-label="Logout"]',
    ) as HTMLButtonElement;
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    await Promise.resolve();
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
    const buttons = [
      ...fixture.nativeElement.querySelectorAll('.actions button'),
    ] as HTMLButtonElement[];
    expect(buttons[0].textContent?.trim()).toBe('Cancel');
    expect(document.activeElement).toBe(buttons[0]);
    buttons[0].click();
    fixture.detectChanges();
    await Promise.resolve();
    expect(auth.authenticated()).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('logs out only after the danger confirmation is confirmed', async () => {
    const { fixture, auth } = createAuthenticatedMenu();
    const trigger = fixture.nativeElement.querySelector(
      '[aria-label="Logout"]',
    ) as HTMLButtonElement;
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    const confirm = fixture.nativeElement.querySelector('.confirm') as HTMLButtonElement;
    expect(confirm.textContent?.trim()).toBe('Logout');
    expect(confirm.dataset['variant']).toBe('danger');
    confirm.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(auth.authenticated()).toBe(false);
    expect(sessionStorage.getItem('dmi-demo-auth-session')).toBeNull();
  });
});

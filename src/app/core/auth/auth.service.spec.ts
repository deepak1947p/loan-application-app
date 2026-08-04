import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [AuthService] });
  });

  afterEach(() => vi.useRealTimers());

  async function login(email: string, password: string): Promise<boolean> {
    const result = firstValueFrom(TestBed.inject(AuthService).login(email, password));
    await vi.runAllTimersAsync();
    return result;
  }

  it('authenticates the Credit Manager and stores only the minimal session', async () => {
    const auth = TestBed.inject(AuthService);
    expect(await login('  dmi.credit.manager@demo.com ', 'Credit@2026')).toBe(true);
    expect(auth.session()).toEqual({
      email: 'dmi.credit.manager@demo.com',
      role: 'CREDIT_MANAGER',
      displayName: 'Credit Manager',
    });
    expect(sessionStorage.getItem('dmi-demo-auth-session')).not.toContain('Credit@2026');
    expect(auth.landingPath()).toBe('/manager/dashboard');
  });

  it('authenticates the Customer and selects the customer landing route', async () => {
    const auth = TestBed.inject(AuthService);
    expect(await login('dmi.customer@demo.com', 'Customer@2026')).toBe(true);
    expect(auth.role()).toBe('CUSTOMER');
    expect(auth.landingPath()).toBe('/customer/kyb');
  });

  it('rejects invalid credentials and keeps password comparison case-sensitive', async () => {
    const auth = TestBed.inject(AuthService);
    expect(await login('dmi.customer@demo.com', 'customer@2026')).toBe(false);
    expect(await login('unknown@demo.com', 'Customer@2026')).toBe(false);
    expect(auth.authenticated()).toBe(false);
    expect(sessionStorage.length).toBe(0);
  });

  it('does not make an HTTP request or persist a submitted password', async () => {
    expect(await login('dmi.customer@demo.com', 'Customer@2026')).toBe(true);
    expect(JSON.stringify(sessionStorage)).not.toContain('Customer@2026');
  });

  it('restores a valid session and removes it on logout', () => {
    sessionStorage.setItem(
      'dmi-demo-auth-session',
      JSON.stringify({
        email: 'dmi.customer@demo.com',
        role: 'CUSTOMER',
        displayName: 'DMI Customer',
      }),
    );
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [AuthService] });
    const restored = TestBed.inject(AuthService);
    expect(restored.authenticated()).toBe(true);
    expect(restored.role()).toBe('CUSTOMER');
    restored.logout();
    expect(restored.session()).toBeNull();
    expect(sessionStorage.getItem('dmi-demo-auth-session')).toBeNull();
  });
});

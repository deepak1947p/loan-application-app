import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [AuthService, provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('authenticates the Credit Manager and stores only the minimal session', async () => {
    const auth = TestBed.inject(AuthService);
    const result = firstValueFrom(auth.login('  dmi.credit.manager@demo.com ', 'Credit@2026'));
    http.expectOne('http://localhost:3000/users?email=dmi.credit.manager@demo.com').flush([{
      id: 'credit-manager-demo', email: 'dmi.credit.manager@demo.com', password: 'Credit@2026', role: 'CREDIT_MANAGER', displayName: 'Credit Manager',
    }]);
    expect(await result).toBe(true);
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
    const result = firstValueFrom(auth.login('dmi.customer@demo.com', 'Customer@2026'));
    http.expectOne('http://localhost:3000/users?email=dmi.customer@demo.com').flush([{
      id: 'customer-demo', email: 'dmi.customer@demo.com', password: 'Customer@2026', role: 'CUSTOMER', displayName: 'DMI Customer',
    }]);
    expect(await result).toBe(true);
    expect(auth.role()).toBe('CUSTOMER');
    expect(auth.landingPath()).toBe('/customer/kyb');
  });

  it('rejects invalid credentials and keeps password comparison case-sensitive', async () => {
    const auth = TestBed.inject(AuthService);
    const wrongCase = firstValueFrom(auth.login('dmi.customer@demo.com', 'customer@2026'));
    http.expectOne('http://localhost:3000/users?email=dmi.customer@demo.com').flush([{
      id: 'customer-demo', email: 'dmi.customer@demo.com', password: 'Customer@2026', role: 'CUSTOMER', displayName: 'DMI Customer',
    }]);
    expect(await wrongCase).toBe(false);
    const unknown = firstValueFrom(auth.login('unknown@demo.com', 'Customer@2026'));
    http.expectOne('http://localhost:3000/users?email=unknown@demo.com').flush([]);
    expect(await unknown).toBe(false);
    expect(auth.authenticated()).toBe(false);
    expect(sessionStorage.length).toBe(0);
  });

  it('distinguishes an unavailable API from invalid credentials', async () => {
    const auth = TestBed.inject(AuthService);
    const result = firstValueFrom(auth.login('dmi.customer@demo.com', 'Customer@2026'));
    http
      .expectOne('http://localhost:3000/users?email=dmi.customer@demo.com')
      .error(new ProgressEvent('network error'));
    expect(await result).toBe(false);
    expect(auth.loginApiUnavailable()).toBe(true);
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
    TestBed.configureTestingModule({ providers: [AuthService, provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    const restored = TestBed.inject(AuthService);
    expect(restored.authenticated()).toBe(true);
    expect(restored.role()).toBe('CUSTOMER');
    restored.logout();
    expect(restored.session()).toBeNull();
    expect(sessionStorage.getItem('dmi-demo-auth-session')).toBeNull();
  });
});

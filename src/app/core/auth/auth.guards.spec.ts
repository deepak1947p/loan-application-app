import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { beforeEach, describe, expect, it } from 'vitest';
import { authGuard, guestGuard, roleGuard } from './auth.guards';
import { AuthService } from './auth.service';

const route = {} as ActivatedRouteSnapshot;
const state = {} as RouterStateSnapshot;

describe('authentication guards', () => {
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({ providers: [AuthService, provideHttpClient(), provideRouter([])] });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
  });

  function pathFrom(result: unknown): string {
    return typeof result === 'boolean' ? String(result) : router.serializeUrl(result as never);
  }

  it('redirects unauthenticated protected navigation to login', () => {
    const result = TestBed.runInInjectionContext(() => authGuard(route, state));
    expect(pathFrom(result)).toBe('/login');
  });

  it('blocks a Customer from the manager dashboard', () => {
    auth.session.set({ email: 'dmi.customer@demo.com', role: 'CUSTOMER', displayName: 'DMI Customer' });
    const result = TestBed.runInInjectionContext(() => roleGuard('CREDIT_MANAGER')(route, state));
    expect(pathFrom(result)).toBe('/unauthorized');
  });

  it('blocks a Credit Manager from Customer KYB', () => {
    auth.session.set({ email: 'dmi.credit.manager@demo.com', role: 'CREDIT_MANAGER', displayName: 'Credit Manager' });
    const result = TestBed.runInInjectionContext(() => roleGuard('CUSTOMER')(route, state));
    expect(pathFrom(result)).toBe('/unauthorized');
  });

  it('redirects authenticated users away from login to their role home', () => {
    auth.session.set({ email: 'dmi.customer@demo.com', role: 'CUSTOMER', displayName: 'DMI Customer' });
    const result = TestBed.runInInjectionContext(() => guestGuard(route, state));
    expect(pathFrom(result)).toBe('/customer/kyb');
  });
});

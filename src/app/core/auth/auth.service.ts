import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, delay, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSession, UserRole } from './auth.models';

const SESSION_KEY = 'dmi-demo-auth-session';
const DEMO_USERS = [
  {
    email: 'dmi.credit.manager@demo.com',
    password: 'Credit@2026',
    role: 'CREDIT_MANAGER',
    displayName: 'Credit Manager',
  },
  {
    email: 'dmi.customer@demo.com',
    password: 'Customer@2026',
    role: 'CUSTOMER',
    displayName: 'DMI Customer',
  },
] as const;

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly session = signal<AuthSession | null>(this.restoreSession());
  readonly authenticated = computed(() => this.session() !== null);
  readonly role = computed(() => this.session()?.role ?? null);
  readonly loginApiUnavailable = signal(false);

  login(username: string, password: string): Observable<boolean> {
    this.loginApiUnavailable.set(false);
    const email = username.trim().toLocaleLowerCase();
    return of(DEMO_USERS.find((user) => user.email === email && user.password === password)).pipe(
      delay(environment.mockLatency.loginMs),
      map((match) => {
        if (!match) return false;
        const session: AuthSession = {
          email: match.email,
          role: match.role,
          displayName: match.displayName,
        };
        this.session.set(session);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return true;
      }),
      catchError(() => {
        this.loginApiUnavailable.set(true);
        return of(false);
      }),
    );
  }

  logout(): void {
    this.session.set(null);
    sessionStorage.removeItem(SESSION_KEY);
  }

  hasRole(role: UserRole): boolean {
    return this.role() === role;
  }

  landingPath(): string {
    return this.role() === 'CREDIT_MANAGER'
      ? '/manager/dashboard'
      : this.role() === 'CUSTOMER'
        ? '/customer/kyb'
        : '/login';
  }

  private restoreSession(): AuthSession | null {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      const value = JSON.parse(raw) as Partial<AuthSession>;
      if (
        typeof value.email !== 'string' ||
        typeof value.displayName !== 'string' ||
        (value.role !== 'CREDIT_MANAGER' && value.role !== 'CUSTOMER')
      ) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return { email: value.email, displayName: value.displayName, role: value.role };
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
  }
}

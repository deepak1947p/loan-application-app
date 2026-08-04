import { Injectable, computed, signal } from '@angular/core';
import { Observable, catchError, delay, map, of, tap } from 'rxjs';
import { AuthSession, UserRole } from './auth.models';
import { MockApiService } from '../services/mock-api.service';
import { environment } from '../../../environments/environment';

const SESSION_KEY = 'dmi-demo-auth-session';
interface DemoUser extends AuthSession {
  id: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private readonly api: MockApiService) {}
  readonly session = signal<AuthSession | null>(this.restoreSession());
  readonly authenticated = computed(() => this.session() !== null);
  readonly role = computed(() => this.session()?.role ?? null);
  readonly loginApiUnavailable = signal(false);

  login(username: string, password: string): Observable<boolean> {
    this.loginApiUnavailable.set(false);
    const email = username.trim().toLowerCase();
    return this.api.get<DemoUser[]>('users', { email }).pipe(
      map((users) => users.find((user) => user.email === email && user.password === password)),
      map((match): AuthSession | null =>
        match ? { email: match.email, role: match.role, displayName: match.displayName } : null,
      ),
      delay(environment.mockLatency.loginMs),
      tap((session) => {
        if (!session) return;
        this.session.set(session);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      }),
      map((session) => session !== null),
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

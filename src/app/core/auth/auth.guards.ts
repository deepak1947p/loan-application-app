import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from './auth.models';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.authenticated() || inject(Router).createUrlTree(['/login']);
};

export function roleGuard(role: UserRole): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    if (!auth.authenticated()) return inject(Router).createUrlTree(['/login']);
    return auth.hasRole(role) || inject(Router).createUrlTree(['/unauthorized']);
  };
}

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return !auth.authenticated() || inject(Router).createUrlTree([auth.landingPath()]);
};

export const landingGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return inject(Router).createUrlTree([auth.landingPath()]);
};

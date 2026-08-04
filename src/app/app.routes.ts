import { Routes } from '@angular/router';
import { authGuard, guestGuard, landingGuard, roleGuard } from './core/auth/auth.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'manager/dashboard',
    canActivate: [authGuard, roleGuard('CREDIT_MANAGER')],
    loadComponent: () =>
      import('./features/loan-applications/dashboard.component').then((m) => m.DashboardComponent),
  },
  {
    path: 'customer/kyb',
    canActivate: [authGuard, roleGuard('CUSTOMER')],
    loadComponent: () => import('./features/kyb/kyb.component').then((m) => m.KybComponent),
  },
  {
    path: 'unauthorized',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/unauthorized.component').then((m) => m.UnauthorizedComponent),
  },
  { path: 'dashboard', redirectTo: 'manager/dashboard', pathMatch: 'full' },
  { path: 'kyb', redirectTo: 'customer/kyb', pathMatch: 'full' },
  {
    path: '',
    pathMatch: 'full',
    canActivate: [landingGuard],
    loadComponent: () =>
      import('./features/auth/unauthorized.component').then((m) => m.UnauthorizedComponent),
  },
  {
    path: '**',
    canActivate: [landingGuard],
    loadComponent: () =>
      import('./features/auth/unauthorized.component').then((m) => m.UnauthorizedComponent),
  },
];

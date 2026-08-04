import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(false);
  readonly loginError = signal('');
  readonly showPassword = signal(false);
  readonly selectedDemoRole = signal<'manager' | 'customer' | null>(null);
  readonly form = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', { nonNullable: true, validators: Validators.required }),
  });

  submit(): void {
    this.loginError.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    const { username, password } = this.form.getRawValue();
    this.auth
      .login(username, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((success) => {
        this.loading.set(false);
        this.form.controls.password.setValue('');
        if (!success) {
          this.loginError.set(
            this.auth.loginApiUnavailable()
              ? 'Unable to connect to the login service. Please make sure the mock API is running.'
              : 'Invalid username or password',
          );
          return;
        }
        void this.router.navigateByUrl(this.auth.landingPath(), { replaceUrl: true });
      });
  }

  useDemo(role: 'manager' | 'customer'): void {
    this.loginError.set('');
    this.selectedDemoRole.set(role);
    this.form.setValue(
      role === 'manager'
        ? { username: 'dmi.credit.manager@demo.com', password: 'Credit@2026' }
        : { username: 'dmi.customer@demo.com', password: 'Customer@2026' },
    );
  }
}

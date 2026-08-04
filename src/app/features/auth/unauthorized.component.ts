import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  template: `<main>
    <img src="/assets/Logo-final-RGB.svg" alt="DMI Finance" /><span>403</span>
    <h1>Access restricted</h1>
    <p>Your account does not have permission to view this page.</p>
    <button (click)="home()">Return to my workspace</button>
  </main>`,
  styles: [
    `
      :host {
        display: grid;
        min-height: 100%;
        place-items: center;
        background: #f4f7fb;
      }
      main {
        text-align: center;
        padding: 30px;
      }
      img {
        width: 110px;
      }
      span {
        display: block;
        margin-top: 35px;
        color: #2d84bd;
        font-size: 13px;
        font-weight: 700;
      }
      h1 {
        font-size: 28px;
        color: #202b3b;
      }
      p {
        color: #747f90;
      }
      button {
        min-height: 42px;
        border: 0;
        border-radius: 7px;
        padding: 0 18px;
        background: #2b75e8;
        color: #fff;
        font-weight: 700;
      }
    `,
  ],
})
export class UnauthorizedComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  home(): void {
    void this.router.navigateByUrl(this.auth.landingPath(), { replaceUrl: true });
  }
}

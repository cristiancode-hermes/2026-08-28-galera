import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-minimal">
      <button class="theme-toggle auth-theme" type="button" (click)="theme.toggle()" [attr.aria-label]="theme.isDark() ? 'Activar tema claro' : 'Activar tema oscuro'">
        @if (theme.isDark()) {
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>
        } @else {
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M21 14.5A8.5 8.5 0 1 1 9.5 3 7 7 0 0 0 21 14.5z"/></svg>
        }
      </button>
      <p class="brand-word">Galera</p>
      <h1>La prensa se sella</h1>
      <form (ngSubmit)="submit()">
        <label for="identifier">Usuario o email</label>
        <input id="identifier" name="identifier" type="text" autocomplete="off"
          [ngModel]="identifier()" (ngModelChange)="identifier.set($event)" />
        <label for="password">Contraseña</label>
        <input id="password" name="password" type="password" autocomplete="new-password"
          [ngModel]="password()" (ngModelChange)="password.set($event)" />
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        <button class="btn btn-primary" type="submit" [disabled]="auth.loading()">
          {{ auth.loading() ? 'Entrando…' : 'Entrar' }}
        </button>
      </form>
      <p class="auth-alt">¿No tienes cuenta? <a routerLink="/registro">Registrarse</a></p>
      <div class="auth-demo">
        <p>Usuario de prueba</p>
        <code>ines@galera.test</code> · <code>galera123</code>
        <p>staff: <code>staff@galera.test</code></p>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  readonly auth = inject(AuthService);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly identifier = signal('');
  readonly password = signal('');
  readonly error = signal('');

  submit() {
    this.error.set('');
    if (!this.identifier() || !this.password()) {
      this.error.set('Escribe usuario y contraseña');
      return;
    }
    this.auth.login({ identifier: this.identifier(), password: this.password() }).subscribe({
      next: () => {
        const ret = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
        void this.router.navigateByUrl(ret);
      },
      error: () => this.error.set('Usuario o contraseña no valen.'),
    });
  }
}

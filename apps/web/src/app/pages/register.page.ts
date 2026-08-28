import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-minimal">
      <p class="brand-word">Galera</p>
      <h1>Abrir caja</h1>
      <form (ngSubmit)="submit()">
        <label for="username">Usuario</label>
        <input id="username" name="username" type="text" autocomplete="off"
          [ngModel]="username()" (ngModelChange)="username.set($event)" />
        <label for="email">Email</label>
        <input id="email" name="email" type="email" autocomplete="off"
          [ngModel]="email()" (ngModelChange)="email.set($event)" />
        <label for="password">Contraseña</label>
        <input id="password" name="password" type="password" autocomplete="new-password"
          [ngModel]="password()" (ngModelChange)="password.set($event)" />
        <label for="confirm">Confirmar</label>
        <input id="confirm" name="confirm" type="password" autocomplete="new-password"
          [ngModel]="confirm()" (ngModelChange)="confirm.set($event)" />
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        <button class="btn btn-primary" type="submit" [disabled]="auth.loading()">
          {{ auth.loading() ? 'Creando…' : 'Crear cuenta' }}
        </button>
      </form>
      <p class="auth-alt">¿Ya tienes caja? <a routerLink="/login">Entrar</a></p>
    </div>
  `,
})
export class RegisterPageComponent {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly username = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly confirm = signal('');
  readonly error = signal('');

  submit() {
    this.error.set('');
    if (this.password().length < 8) {
      this.error.set('La contraseña necesita 8 caracteres.');
      return;
    }
    if (this.password() !== this.confirm()) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    this.auth
      .register({ username: this.username(), email: this.email(), password: this.password() })
      .subscribe({
        next: () => void this.router.navigateByUrl('/'),
        error: (err) => this.error.set(err?.error?.message || 'No se pudo registrar.'),
      });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { MeStats } from '../shared/models';

@Component({
  selector: 'app-account',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <h1>Cuenta</h1>
      @if (auth.user(); as u) {
        <p>{{ u.username }} · {{ u.email }}</p>
      }
      @if (stats(); as s) {
        <p><strong>{{ s.points }}</strong> pts · {{ s.stamps }} sellos</p>
        <p class="muted">Los puntos son 10 por cada sello real.</p>
      }
      <a class="btn btn-secondary" routerLink="/mi-pase">Mis pases</a>
    </div>
  `,
})
export class AccountPageComponent implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  readonly stats = signal<MeStats | null>(null);

  ngOnInit() {
    this.api.stats().subscribe({ next: (s) => this.stats.set(s) });
  }
}

import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Press, StudioToday } from '../shared/models';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      @if (error()) {
        <section class="state-screen">
          <h1>No pudimos cargar el taller</h1>
          <p class="lede">{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (loading()) {
        <div class="skeleton" style="height:120px;margin-bottom:16px"></div>
        <div class="skeleton" style="height:160px"></div>
        <div class="skeleton" style="height:160px;margin-top:12px"></div>
      } @else if (!presses().length) {
        <section class="state-screen">
          <h1>El taller aún no tiene prensas</h1>
          <p class="lede">Vuelve cuando abramos la caja de tipos.</p>
          <a class="btn btn-primary" routerLink="/bono">Comprar bono</a>
        </section>
      } @else {
        <section class="hero-copy">
          <h1>El taller abre la caja.</h1>
          <p class="lede">Un bono de siete días. Un sello cada jornada. Sin franjas de cuarto de hora.</p>
          @if (today(); as t) {
            <p class="today-line">
              Hoy: {{ t.open ? 'abierto' : 'cerrado' }}
              @if (t.open) { · {{ t.occupied }}/{{ t.capacity }} en sala }
            </p>
          }
          <a class="btn btn-primary" routerLink="/bono">Comprar bono</a>
        </section>
        <div class="press-rows">
          @for (pr of presses(); track pr.id) {
            <a class="press-row" [routerLink]="['/prensas', pr.id]">
              <img [src]="pr.photoUrl" [alt]="pr.name" width="280" height="180" />
              <div>
                <h2>{{ pr.name }}</h2>
                <p class="muted">{{ pr.format }} · {{ pr.status === 'ready' ? 'lista' : 'en mantenimiento' }}</p>
                <span class="btn btn-secondary">Ver prensa</span>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class HomePageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly presses = signal<Press[]>([]);
  readonly today = signal<StudioToday | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.presses().subscribe({
      next: (rows) => {
        this.presses.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No pudimos cargar las prensas.');
        this.loading.set(false);
      },
    });
    this.api.today().subscribe({
      next: (t) => this.today.set(t),
      error: () => this.today.set(null),
    });
  }
}

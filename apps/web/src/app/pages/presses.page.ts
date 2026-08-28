import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Press } from '../shared/models';

@Component({
  selector: 'app-presses',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      @if (error()) {
        <section class="state-screen">
          <h1>No pudimos cargar las prensas</h1>
          <p class="lede">{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (loading()) {
        <div class="skeleton" style="height:160px"></div>
      } @else if (!presses().length) {
        <section class="state-screen">
          <h1>El taller aún no tiene prensas</h1>
          <p class="lede">La caja está vacía.</p>
          <a class="btn btn-primary" routerLink="/">Volver al taller</a>
        </section>
      } @else {
        <h1>Prensas</h1>
        <p class="lede">Cuatro máquinas. Ninguna se reserva por franja: se usa con el bono de la semana.</p>
        <div class="press-rows">
          @for (pr of presses(); track pr.id) {
            <a class="press-row" [routerLink]="['/prensas', pr.id]">
              <img [src]="pr.photoUrl" [alt]="pr.name" width="280" height="180" />
              <div>
                <h2>{{ pr.name }}</h2>
                <p class="muted">{{ pr.format }} · {{ pr.status === 'ready' ? 'lista' : 'en mantenimiento' }}</p>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class PressesPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly presses = signal<Press[]>([]);
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
  }
}

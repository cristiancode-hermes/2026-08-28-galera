import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { MeStats, StudioToday, humanizeApiError } from '../shared/models';

@Component({
  selector: 'app-stamp',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      @if (error()) {
        <section class="state-screen">
          <h1>No pudimos cargar el sello</h1>
          <p class="lede">{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else {
        <h1>Sellar el día</h1>
        @if (today(); as t) {
          <p class="lede">Hoy {{ t.date }} · {{ t.open ? 'abierto' : 'cerrado' }} · {{ t.occupied }}/{{ t.capacity }}</p>
        }
        @if (stats()?.activePass; as p) {
          <p>Pase {{ p.code }} · {{ p.stampCount }}/7</p>
        } @else {
          <p class="lede">No hay bono que cubra hoy. <a routerLink="/bono">Comprar bono</a></p>
        }
        <div id="stamp-action">
          @if (ctaError()) {
            <p class="hold-error" role="alert">{{ ctaError() }}</p>
          }
          <button class="btn btn-primary" type="button" (click)="stamp()">Sellar hoy</button>
        </div>
      }
    </div>
  `,
})
export class StampPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly today = signal<StudioToday | null>(null);
  readonly stats = signal<MeStats | null>(null);
  readonly error = signal('');
  readonly ctaError = signal('');

  ngOnInit() {
    this.load();
  }

  load() {
    this.error.set('');
    this.api.today().subscribe({
      next: (t) => this.today.set(t),
      error: () => this.error.set('El aforo de hoy no responde.'),
    });
    this.api.stats().subscribe({ next: (s) => this.stats.set(s) });
  }

  stamp() {
    this.ctaError.set('');
    const passId = this.stats()?.activePass?.id;
    this.api.stamp(passId).subscribe({
      next: () => this.load(),
      error: (err) => {
        this.ctaError.set(humanizeApiError(err, 'No se pudo sellar.'));
        document.getElementById('stamp-action')?.scrollIntoView({ block: 'center' });
      },
    });
  }
}

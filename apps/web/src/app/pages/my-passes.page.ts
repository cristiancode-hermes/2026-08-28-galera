import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Pass, euros } from '../shared/models';

@Component({
  selector: 'app-my-passes',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      @if (error()) {
        <section class="state-screen">
          <h1>No pudimos cargar tus pases</h1>
          <p class="lede">{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (loading()) {
        <div class="skeleton" style="height:120px"></div>
      } @else if (!passes().length) {
        <section class="state-screen">
          <h1>Todavía no tienes bono</h1>
          <p class="lede">Compra una semana en el taller.</p>
          <a class="btn btn-primary" routerLink="/bono">Comprar bono</a>
        </section>
      } @else {
        <h1>Mis pases</h1>
        <div class="list">
          @for (pass of passes(); track pass.id) {
            <a class="card" [routerLink]="['/mi-pase', pass.id]">
              <div class="card-body">
                <p class="code">{{ pass.code }}</p>
                <p>{{ pass.status }} · {{ pass.startsOn }} → {{ pass.endsOn }}</p>
                <p>{{ euros(pass.totalCents) }} · {{ pass.stampCount }} sellos · {{ pass.points }} pts</p>
              </div>
            </a>
          }
        </div>
      }
    </div>
  `,
})
export class MyPassesPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly passes = signal<Pass[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  euros = euros;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.passes().subscribe({
      next: (rows) => {
        this.passes.set(rows);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Prueba de nuevo en un momento.');
        this.loading.set(false);
      },
    });
  }
}

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Addon, euros } from '../shared/models';

const BASE = 4200;

@Component({
  selector: 'app-pass-builder',
  imports: [],
  template: `
    <div class="wrap checkout">
      <div>
        <h1>Bono de siete días</h1>
        <p class="lede">El pase cubre una semana natural. Los extras se suman ahora; el total se ve antes de pagar.</p>
        @if (error()) {
          <section class="state-screen">
            <h2>No pudimos cargar los extras</h2>
            <p class="lede">{{ error() }}</p>
            <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
          </section>
        } @else {
          <div class="picker">
            @for (a of addons(); track a.id) {
              <label>
                <input type="checkbox" [checked]="selected().has(a.id)" (change)="toggle(a.id)" />
                <span>{{ a.name }} · {{ euros(a.priceCents) }}</span>
              </label>
            }
          </div>
        }
      </div>
      <aside class="summary">
        <h2>Resumen</h2>
        <ul>
          @for (line of lines(); track line.label) {
            <li><span>{{ line.label }}</span><span>{{ euros(line.amountCents) }}</span></li>
          }
          <li><strong>Total</strong><strong>{{ euros(total()) }}</strong></li>
        </ul>
        <button class="btn btn-primary" type="button" (click)="goPay()">Pagar</button>
      </aside>
    </div>
  `,
})
export class PassBuilderPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly addons = signal<Addon[]>([]);
  readonly selected = signal<Set<string>>(new Set());
  readonly error = signal('');
  readonly euros = euros;
  readonly lines = computed(() => {
    const extras = this.addons().filter((a) => this.selected().has(a.id));
    return [
      { label: 'Bono 7 días', amountCents: BASE },
      ...extras.map((a) => ({ label: a.name, amountCents: a.priceCents })),
    ];
  });
  readonly total = computed(() => this.lines().reduce((s, l) => s + l.amountCents, 0));

  ngOnInit() {
    this.load();
  }

  load() {
    this.error.set('');
    this.api.addons().subscribe({
      next: (rows) => this.addons.set(rows),
      error: () => this.error.set('Los extras no responden.'),
    });
  }

  toggle(id: string) {
    const next = new Set(this.selected());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selected.set(next);
  }

  goPay() {
    const ids = [...this.selected()];
    sessionStorage.setItem('galera.addonIds', JSON.stringify(ids));
    if (!this.auth.getToken()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }
    void this.router.navigateByUrl('/checkout');
  }
}

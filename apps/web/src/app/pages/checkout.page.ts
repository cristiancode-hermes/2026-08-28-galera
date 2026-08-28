import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Addon, euros, humanizeApiError } from '../shared/models';

const BASE = 4200;

@Component({
  selector: 'app-checkout',
  imports: [],
  template: `
    <div class="wrap checkout">
      <div>
        <h1>Pagar el bono</h1>
        <p class="lede">Pago simulado. El pase queda confirmado al instante: no hay retención de 15 minutos.</p>
      </div>
      <aside class="summary">
        <h2>Resumen</h2>
        <ul>
          @for (line of lines(); track line.label) {
            <li><span>{{ line.label }}</span><span>{{ euros(line.amountCents) }}</span></li>
          }
          <li><strong>Total</strong><strong>{{ euros(total()) }}</strong></li>
        </ul>
        <div id="pass-action">
          @if (ctaError()) {
            <p class="hold-error" role="alert">{{ ctaError() }}</p>
          }
          <button class="btn btn-primary" type="button" [disabled]="paying()" (click)="pay()">
            {{ paying() ? 'Pagando…' : 'Pagar ahora' }}
          </button>
        </div>
      </aside>
    </div>
  `,
})
export class CheckoutPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly addons = signal<Addon[]>([]);
  readonly selected = signal<string[]>([]);
  readonly paying = signal(false);
  readonly ctaError = signal('');
  readonly euros = euros;
  readonly lines = computed(() => {
    const extras = this.addons().filter((a) => this.selected().includes(a.id));
    return [
      { label: 'Bono 7 días', amountCents: BASE },
      ...extras.map((a) => ({ label: a.name, amountCents: a.priceCents })),
    ];
  });
  readonly total = computed(() => this.lines().reduce((s, l) => s + l.amountCents, 0));

  ngOnInit() {
    try {
      const raw = sessionStorage.getItem('galera.addonIds');
      this.selected.set(raw ? JSON.parse(raw) : []);
    } catch {
      this.selected.set([]);
    }
    this.api.addons().subscribe({ next: (rows) => this.addons.set(rows) });
  }

  pay() {
    this.ctaError.set('');
    this.paying.set(true);
    this.api.createPass(this.selected()).subscribe({
      next: (pass) => {
        this.paying.set(false);
        void this.router.navigate(['/confirmacion', pass.code]);
      },
      error: (err) => {
        this.paying.set(false);
        this.ctaError.set(humanizeApiError(err, 'No se pudo pagar el bono.'));
        document.getElementById('pass-action')?.scrollIntoView({ block: 'center' });
      },
    });
  }
}

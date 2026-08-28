import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Pass, euros, humanizeApiError } from '../shared/models';

@Component({
  selector: 'app-pass-detail',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      @if (error()) {
        <section class="state-screen">
          <h1>No encontramos ese pase</h1>
          <p class="lede">{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/mi-pase">Volver a mis pases</a>
        </section>
      } @else if (!pass()) {
        <div class="skeleton" style="height:200px"></div>
      } @else {
        <h1>{{ pass()!.code }}</h1>
        <p class="lede">{{ pass()!.startsOn }} → {{ pass()!.endsOn }} · {{ pass()!.status }}</p>
        <ul class="summary" style="max-width:360px">
          @for (line of pass()!.lines; track line.id) {
            <li><span>{{ line.label }}</span><span>{{ euros(line.amountCents) }}</span></li>
          }
          <li><strong>Total</strong><strong>{{ euros(pass()!.totalCents) }}</strong></li>
        </ul>
        <p>{{ pass()!.stampCount }} sellos · {{ pass()!.points }} pts</p>
        <div class="stamp-week">
          @for (d of week(); track d) {
            <span class="stamp-cell" [class.stamped]="stamped(d)">{{ d.slice(8) }}</span>
          }
        </div>
        @if (qr()) {
          <div class="qr" [innerHTML]="qr()"></div>
        }
        <div id="pass-action">
          @if (ctaError()) {
            <p class="hold-error">{{ ctaError() }}</p>
          }
          @if (pass()!.status === 'confirmed') {
            <button class="btn btn-ghost" type="button" (click)="cancel()">Cancelar bono</button>
          }
        </div>
      }
    </div>
  `,
})
export class PassDetailPageComponent implements OnInit {
  @Input() id = '';
  private readonly api = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly pass = signal<Pass | null>(null);
  readonly qr = signal<SafeHtml | null>(null);
  readonly error = signal('');
  readonly ctaError = signal('');
  euros = euros;

  ngOnInit() {
    this.load();
  }

  week(): string[] {
    const p = this.pass();
    if (!p) return [];
    const days: string[] = [];
    const start = new Date(p.startsOn + 'T00:00:00Z');
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }

  stamped(d: string): boolean {
    return (this.pass()?.stamps || []).some((s) => s.checkInDate === d);
  }

  load() {
    this.api.pass(this.id).subscribe({
      next: (b) => {
        this.pass.set(b);
        if (b.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(b.qrSvg));
      },
      error: () => this.error.set('Ese pase no es tuyo o no existe.'),
    });
  }

  cancel() {
    this.ctaError.set('');
    this.api.cancel(this.id).subscribe({
      next: (b) => this.pass.set(b),
      error: (err) => {
        this.ctaError.set(humanizeApiError(err));
        document.getElementById('pass-action')?.scrollIntoView({ block: 'center' });
      },
    });
  }
}

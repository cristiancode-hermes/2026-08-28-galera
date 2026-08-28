import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Pass, euros } from '../shared/models';

@Component({
  selector: 'app-confirm',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      @if (error()) {
        <section class="state-screen">
          <h1>No encontramos esa confirmación</h1>
          <p class="lede">{{ error() }}</p>
          <a class="btn btn-primary" routerLink="/mi-pase">Mis pases</a>
        </section>
      } @else if (!pass()) {
        <p class="muted">Cargando pase…</p>
      } @else {
        <h1>Pase listo</h1>
        <p class="lede">{{ pass()!.startsOn }} → {{ pass()!.endsOn }} · {{ euros(pass()!.totalCents) }}</p>
        <p class="code">{{ pass()!.code }}</p>
        @if (qr()) {
          <div class="qr" [innerHTML]="qr()"></div>
        }
        <p><a [href]="pass()!.qrUrl" target="_blank" rel="noopener">Abrir pase público</a></p>
        <a class="btn btn-secondary" [routerLink]="['/mi-pase', pass()!.id]">Ver detalle</a>
      }
    </div>
  `,
})
export class ConfirmPageComponent implements OnInit {
  @Input() code = '';
  private readonly api = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly pass = signal<Pass | null>(null);
  readonly qr = signal<SafeHtml | null>(null);
  readonly error = signal('');
  euros = euros;

  ngOnInit() {
    this.api.passByCode(this.code).subscribe({
      next: (b) => {
        this.pass.set(b);
        if (b.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(b.qrSvg));
      },
      error: () => this.error.set('El pase no está disponible.'),
    });
  }
}

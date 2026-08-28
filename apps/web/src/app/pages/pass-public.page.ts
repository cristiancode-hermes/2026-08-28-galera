import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { Pass } from '../shared/models';

@Component({
  selector: 'app-pass-public',
  imports: [RouterLink],
  template: `
    <div class="wrap" style="padding:32px 0">
      @if (notFound()) {
        <section class="state-screen">
          <h1>Ese pase no está en la galera</h1>
          <p class="lede">El código no corresponde a un bono.</p>
          <a class="btn btn-primary" routerLink="/">Ir al taller</a>
        </section>
      } @else if (!pass()) {
        <p class="muted">Cargando…</p>
      } @else {
        <p class="brand-word">Galera</p>
        <h1>{{ pass()!.code }}</h1>
        <p>{{ pass()!.status }} · {{ pass()!.startsOn }} → {{ pass()!.endsOn }}</p>
        <p>Sellos {{ pass()!.stampCount }}/7</p>
        @if (qr()) {
          <div class="qr" [innerHTML]="qr()"></div>
        }
      }
    </div>
  `,
})
export class PassPublicPageComponent implements OnInit {
  @Input() code = '';
  private readonly api = inject(ApiService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly pass = signal<Pass | null>(null);
  readonly qr = signal<SafeHtml | null>(null);
  readonly notFound = signal(false);

  ngOnInit() {
    this.api.passByCode(this.code).subscribe({
      next: (b) => {
        this.pass.set(b);
        if (b.qrSvg) this.qr.set(this.sanitizer.bypassSecurityTrustHtml(b.qrSvg));
      },
      error: () => this.notFound.set(true),
    });
  }
}

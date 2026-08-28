import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Press, humanizeApiError } from '../shared/models';

@Component({
  selector: 'app-press-detail',
  imports: [RouterLink, FormsModule],
  template: `
    <div class="wrap">
      @if (notFound()) {
        <section class="state-screen">
          <h1>Esa prensa no está en la galera</h1>
          <p class="lede">Puede que se haya desmontado.</p>
          <a class="btn btn-primary" routerLink="/prensas">Volver al catálogo</a>
        </section>
      } @else if (error()) {
        <section class="state-screen">
          <h1>No pudimos abrir la ficha</h1>
          <p class="lede">{{ error() }}</p>
          <button class="btn btn-primary" type="button" (click)="load()">Reintentar</button>
        </section>
      } @else if (!press()) {
        <div class="skeleton" style="height:280px"></div>
      } @else {
        <article class="press-row">
          <img [src]="press()!.photoUrl" [alt]="press()!.name" width="360" height="240" />
          <div>
            <h1>{{ press()!.name }}</h1>
            <p class="lede">{{ press()!.format }} · {{ press()!.status === 'ready' ? 'lista' : 'en mantenimiento' }}</p>
            <p>Tintas: {{ press()!.typeNotes.inks.join(', ') }}</p>
            <p>Papeles: {{ press()!.typeNotes.papers.join(', ') }}</p>
            <a class="btn btn-primary" routerLink="/bono">Comprar bono</a>
          </div>
        </article>
        <h2>Reseñas</h2>
        @for (r of press()!.reviews || []; track r.id) {
          <p><strong>{{ r.rating }}/5</strong> — {{ r.body }}</p>
        }
        @if (auth.isAuthenticated()) {
          <form class="form-stack" (ngSubmit)="sendReview()">
            <label for="rating">Nota</label>
            <input id="rating" name="rating" type="number" min="1" max="5"
              [ngModel]="rating()" (ngModelChange)="rating.set(+$event)" />
            <label for="body">Texto</label>
            <input id="body" name="body" type="text" autocomplete="off"
              [ngModel]="body()" (ngModelChange)="body.set($event)" />
            @if (ctaError()) {
              <p class="hold-error" id="review-action">{{ ctaError() }}</p>
            }
            <button class="btn btn-secondary" type="submit">Publicar reseña</button>
          </form>
        }
      }
    </div>
  `,
})
export class PressDetailPageComponent implements OnInit {
  @Input() id = '';
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly press = signal<Press | null>(null);
  readonly error = signal('');
  readonly notFound = signal(false);
  readonly rating = signal(5);
  readonly body = signal('');
  readonly ctaError = signal('');

  ngOnInit() {
    this.load();
  }

  load() {
    this.error.set('');
    this.notFound.set(false);
    this.api.press(this.id).subscribe({
      next: (p) => this.press.set(p),
      error: (err) => {
        if (err?.status === 404) this.notFound.set(true);
        else this.error.set('Inténtalo de nuevo.');
      },
    });
  }

  sendReview() {
    this.ctaError.set('');
    this.api.review({ pressId: this.id, rating: this.rating(), body: this.body() }).subscribe({
      next: () => this.load(),
      error: (err) => this.ctaError.set(humanizeApiError(err, 'No se pudo publicar.')),
    });
  }
}

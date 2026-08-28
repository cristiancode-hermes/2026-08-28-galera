import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../core/api.service';
import { CheckIn, StudioToday, humanizeApiError } from '../shared/models';

@Component({
  selector: 'app-staff',
  imports: [FormsModule],
  template: `
    <div class="wrap">
      <h1>Umbral</h1>
      @if (today(); as t) {
        <p class="lede">{{ t.date }} · {{ t.open ? 'abierto' : 'cerrado' }} · {{ t.occupied }}/{{ t.capacity }}</p>
        <button class="btn btn-secondary" type="button" (click)="toggleOpen()">
          {{ t.open ? 'Cerrar taller' : 'Abrir taller' }}
        </button>
      }
      <form class="form-stack" (ngSubmit)="scan()">
        <label for="code">Código o URL</label>
        <input id="code" name="code" type="text" autocomplete="off"
          [ngModel]="code()" (ngModelChange)="code.set($event)" />
        <div id="stamp-action">
          @if (ctaError()) {
            <p class="hold-error">{{ ctaError() }}</p>
          }
          <button class="btn btn-primary" type="submit">Sellar</button>
        </div>
      </form>
      <h2>Sellos de hoy</h2>
      <ul>
        @for (c of list(); track c.id) {
          <li>{{ c.checkInDate }} · {{ c.source }} · {{ c.passId.slice(0, 8) }}</li>
        }
      </ul>
    </div>
  `,
})
export class StaffPageComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly today = signal<StudioToday | null>(null);
  readonly list = signal<CheckIn[]>([]);
  readonly code = signal('');
  readonly ctaError = signal('');

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.staffToday().subscribe({
      next: (r) => {
        this.today.set(r.studioDay);
        this.list.set(r.checkIns);
      },
    });
  }

  toggleOpen() {
    const t = this.today();
    if (!t) return;
    this.api.patchDay(t.id, { open: !t.open }).subscribe({ next: () => this.load() });
  }

  scan() {
    this.ctaError.set('');
    this.api.staffCheckIn(this.code()).subscribe({
      next: () => {
        this.code.set('');
        this.load();
      },
      error: (err) => {
        this.ctaError.set(humanizeApiError(err));
        document.getElementById('stamp-action')?.scrollIntoView({ block: 'center' });
      },
    });
  }
}

import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="wrap">
      <section class="state-screen">
        <h1>Esa página no está en la galera</h1>
        <p class="lede">El tipo no encaja en la caja.</p>
        <a class="btn btn-primary" routerLink="/">Volver al taller</a>
      </section>
    </div>
  `,
})
export class NotFoundPageComponent {}

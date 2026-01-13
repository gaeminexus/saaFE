import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-tsr-placeholder',
  standalone: true,
  imports: [MatCardModule],
  template: `
    <mat-card>
      <h2>{{ title }}</h2>
      <p>Pantalla en construcción para Tesorería.</p>
    </mat-card>
  `,
})
export class TsrPlaceholderComponent {
  title = 'Tesorería';
  constructor(route: ActivatedRoute) {
    const dataTitle = route.snapshot.data?.['title'];
    if (dataTitle) {
      this.title = dataTitle;
    }
  }
}

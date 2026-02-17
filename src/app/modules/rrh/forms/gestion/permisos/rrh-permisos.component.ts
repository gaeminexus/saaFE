import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

@Component({
  selector: 'app-rrh-permisos',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './rrh-permisos.component.html',
  styleUrls: ['./rrh-permisos.component.scss'],
})
export class RrhPermisosComponent {
  titulo = signal<string>('Gestion · Permisos');
}

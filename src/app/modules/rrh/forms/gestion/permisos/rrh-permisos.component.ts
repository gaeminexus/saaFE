import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
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
  titulo = signal<string>('Gestión de Personal · Permisos/Licencias');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Ana Pérez - Médico', estado: 'Aprobado' },
    { nombre: 'Luis Gómez - Personal', estado: 'Pendiente' },
    { nombre: 'María Torres - Estudio', estado: 'Rechazado' },
  ]);
  hasData = computed(() => this.data().length > 0);
}

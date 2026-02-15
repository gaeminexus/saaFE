import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

@Component({
  selector: 'app-rrh-reporte-vacaciones',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './rrh-reporte-vacaciones.component.html',
  styleUrls: ['./rrh-reporte-vacaciones.component.scss'],
})
export class RrhReporteVacacionesComponent {
  titulo = signal<string>('Reportes · Historial de Vacaciones');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Ana Pérez · 2025-11 · 5 días', estado: 'Aprobado' },
    { nombre: 'Luis Gómez · 2025-12 · 2 días', estado: 'Aprobado' },
  ]);
  hasData = computed(() => this.data().length > 0);
}

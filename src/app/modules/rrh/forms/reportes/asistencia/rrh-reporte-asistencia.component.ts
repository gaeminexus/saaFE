import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

@Component({
  selector: 'app-rrh-reporte-asistencia',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './rrh-reporte-asistencia.component.html',
  styleUrls: ['./rrh-reporte-asistencia.component.scss'],
})
export class RrhReporteAsistenciaComponent {
  titulo = signal<string>('Reportes · Asistencia');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Ana Pérez · 2026-01-10 · 08:02/16:00', estado: 'Presente' },
    { nombre: 'Luis Gómez · 2026-01-10 · 08:00/16:05', estado: 'Presente' },
  ]);
  hasData = computed(() => this.data().length > 0);
}

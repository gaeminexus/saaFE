import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-rrh-reporte-vacaciones',
  standalone: true,
  imports: [MatTableModule, MatCardModule],
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

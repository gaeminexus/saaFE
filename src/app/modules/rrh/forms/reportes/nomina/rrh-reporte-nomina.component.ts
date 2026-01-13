import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-rrh-reporte-nomina',
  standalone: true,
  imports: [MatTableModule, MatCardModule],
  templateUrl: './rrh-reporte-nomina.component.html',
  styleUrls: ['./rrh-reporte-nomina.component.scss'],
})
export class RrhReporteNominaComponent {
  titulo = signal<string>('Reportes · Nómina Consolidada');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Período 2025-12 · Total $52,000', estado: 'Generado' },
    { nombre: 'Período 2026-01 · Total $53,200', estado: 'Pendiente' },
  ]);
  hasData = computed(() => this.data().length > 0);
}

import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-rrh-aportes',
  standalone: true,
  imports: [MatTableModule, MatCardModule],
  templateUrl: './rrh-aportes.component.html',
  styleUrls: ['./rrh-aportes.component.scss'],
})
export class RrhAportesComponent {
  titulo = signal<string>('Procesos · Aportes/Retenciones');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'IESS · 2025-12', estado: 'Reportado' },
    { nombre: 'Retenciones · 2026-01', estado: 'Pendiente' },
  ]);
  hasData = computed(() => this.data().length > 0);
}

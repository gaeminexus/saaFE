import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-rrh-liquidaciones',
  standalone: true,
  imports: [MatTableModule, MatCardModule],
  templateUrl: './rrh-liquidaciones.component.html',
  styleUrls: ['./rrh-liquidaciones.component.scss'],
})
export class RrhLiquidacionesComponent {
  titulo = signal<string>('Procesos · Liquidaciones');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Ana Pérez · 2025-12-20', estado: 'Pagado' },
    { nombre: 'Luis Gómez · 2026-01-10', estado: 'En trámite' },
  ]);
  hasData = computed(() => this.data().length > 0);
}

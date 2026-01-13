import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-rrh-nomina',
  standalone: true,
  imports: [MatTableModule, MatCardModule],
  templateUrl: './rrh-nomina.component.html',
  styleUrls: ['./rrh-nomina.component.scss'],
})
export class RrhNominaComponent {
  titulo = signal<string>('Procesos · Nómina');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Período 2025-12', estado: 'Calculado' },
    { nombre: 'Período 2026-01', estado: 'En proceso' },
  ]);
  hasData = computed(() => this.data().length > 0);
}

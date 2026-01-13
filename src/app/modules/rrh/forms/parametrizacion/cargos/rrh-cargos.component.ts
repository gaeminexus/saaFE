import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-rrh-cargos',
  standalone: true,
  imports: [MatTableModule, MatCardModule],
  templateUrl: './rrh-cargos.component.html',
  styleUrls: ['./rrh-cargos.component.scss'],
})
export class RrhCargosComponent {
  titulo = signal<string>('Parametrización · Cargos/Puestos');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Analista', estado: 'Activo' },
    { nombre: 'Desarrollador', estado: 'Activo' },
    { nombre: 'Contador', estado: 'Activo' },
    { nombre: 'Auxiliar', estado: 'Inactivo' },
  ]);
  hasData = computed(() => this.data().length > 0);
}

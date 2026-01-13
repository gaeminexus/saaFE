import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-rrh-tipos-contrato',
  standalone: true,
  imports: [MatTableModule, MatCardModule],
  templateUrl: './rrh-tipos-contrato.component.html',
  styleUrls: ['./rrh-tipos-contrato.component.scss'],
})
export class RrhTiposContratoComponent {
  titulo = signal<string>('Parametrización · Tipos de Contrato');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Indefinido', estado: 'Activo' },
    { nombre: 'Temporal', estado: 'Activo' },
    { nombre: 'Prácticas', estado: 'Inactivo' },
  ]);
  hasData = computed(() => this.data().length > 0);
}

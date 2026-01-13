import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-rrh-departamentos',
  standalone: true,
  imports: [MatTableModule, MatCardModule],
  templateUrl: './rrh-departamentos.component.html',
  styleUrls: ['./rrh-departamentos.component.scss'],
})
export class RrhDepartamentosComponent {
  titulo = signal<string>('Parametrización · Departamentos');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Administración', estado: 'Activo' },
    { nombre: 'Recursos Humanos', estado: 'Activo' },
    { nombre: 'Contabilidad', estado: 'Activo' },
    { nombre: 'Sistemas', estado: 'Inactivo' },
  ]);
  hasData = computed(() => this.data().length > 0);
}

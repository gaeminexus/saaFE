import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-rrh-empleados',
  standalone: true,
  imports: [MatTableModule, MatCardModule],
  templateUrl: './rrh-empleados.component.html',
  styleUrls: ['./rrh-empleados.component.scss'],
})
export class RrhEmpleadosComponent {
  titulo = signal<string>('Gestión de Personal · Empleados');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Ana Pérez', estado: 'Activo' },
    { nombre: 'Luis Gómez', estado: 'Activo' },
    { nombre: 'María Torres', estado: 'Inactivo' },
    { nombre: 'Jorge Ruiz', estado: 'Activo' },
  ]);
  hasData = computed(() => this.data().length > 0);
}

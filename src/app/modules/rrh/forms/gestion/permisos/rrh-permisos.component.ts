import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-rrh-permisos',
  standalone: true,
  imports: [MatTableModule, MatCardModule],
  templateUrl: './rrh-permisos.component.html',
  styleUrls: ['./rrh-permisos.component.scss'],
})
export class RrhPermisosComponent {
  titulo = signal<string>('Gestión de Personal · Permisos/Licencias');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Ana Pérez - Médico', estado: 'Aprobado' },
    { nombre: 'Luis Gómez - Personal', estado: 'Pendiente' },
    { nombre: 'María Torres - Estudio', estado: 'Rechazado' },
  ]);
  hasData = computed(() => this.data().length > 0);
}

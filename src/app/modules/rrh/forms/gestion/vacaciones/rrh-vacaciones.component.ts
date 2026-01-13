import { Component, computed, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-rrh-vacaciones',
  standalone: true,
  imports: [MatTableModule, MatCardModule],
  templateUrl: './rrh-vacaciones.component.html',
  styleUrls: ['./rrh-vacaciones.component.scss'],
})
export class RrhVacacionesComponent {
  titulo = signal<string>('Gestión de Personal · Vacaciones');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Ana Pérez - 5 días', estado: 'Aprobado' },
    { nombre: 'Luis Gómez - 2 días', estado: 'Pendiente' },
    { nombre: 'María Torres - 3 días', estado: 'Rechazado' },
  ]);
  hasData = computed(() => this.data().length > 0);
}

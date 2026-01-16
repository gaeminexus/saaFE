import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-rrh-turnos',
  standalone: true,
  imports: [MatTableModule, MatCardModule, MatButtonModule],
  templateUrl: './rrh-turnos.component.html',
  styleUrls: ['./rrh-turnos.component.scss'],
})
export class RrhTurnosComponent {
  titulo = signal<string>('Parametrización · Turnos y Horarios');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Matutino 08:00-16:00', estado: 'Activo' },
    { nombre: 'Vespertino 12:00-20:00', estado: 'Activo' },
    { nombre: 'Nocturno 20:00-04:00', estado: 'Inactivo' },
  ]);
  hasData = computed(() => this.data().length > 0);

  onNuevo(): void {}
  onGuardar(): void {}
  onCancelar(): void {}
  onVolver(): void {
    history.back();
  }
}

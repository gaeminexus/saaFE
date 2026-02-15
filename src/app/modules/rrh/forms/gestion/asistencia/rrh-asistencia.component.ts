import { CommonModule } from '@angular/common';
import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

@Component({
  selector: 'app-rrh-asistencia',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './rrh-asistencia.component.html',
  styleUrls: ['./rrh-asistencia.component.scss'],
})
export class RrhAsistenciaComponent {
  titulo = signal<string>('Gestión de Personal · Asistencia');
  columns = signal<string[]>(['nombre', 'estado']);
  data = signal<any[]>([
    { nombre: 'Ana Pérez - 08:02/16:00', estado: 'Presente' },
    { nombre: 'Luis Gómez - 08:00/16:05', estado: 'Presente' },
    { nombre: 'María Torres', estado: 'Ausente' },
  ]);
  hasData = computed(() => this.data().length > 0);
}

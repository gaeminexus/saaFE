import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'cnt-reporte-listado-asientos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
  ],
  templateUrl: './reporte-listado-asientos.component.html',
  styleUrls: ['./reporte-listado-asientos.component.scss'],
})
export class ReporteListadoAsientosComponent {
  // Filtros
  fechaIngresoDesde = signal<string>('');
  fechaIngresoHasta = signal<string>('');
  fechaAsientoDesde = signal<string>('');
  fechaAsientoHasta = signal<string>('');
  numeroAsiento = signal<string>('');
  estado = signal<string>('');
  tipoAsiento = signal<string>('');
  usuario = signal<string>('');

  estados = ['Todos', 'Contabilizado', 'Pendiente', 'Anulado'];
  tipos = ['Seleccione', 'General', 'Sistema'];
  usuarios = ['Seleccione', 'admin', 'operador'];

  buscar(): void {
    // Placeholder de búsqueda; conectar a servicio posteriormente
    alert('Listado de Asientos - búsqueda ejecutada (demo).');
  }
}

import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

interface Cobro {
  id: number;
  fecha: Date;
  cliente: string;
  monto: number;
  estado: 'PENDIENTE' | 'CERRADO' | 'ANULADO';
}

@Component({
  selector: 'app-consultas-cobros',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    MatCardModule,
  ],
  templateUrl: './consultas-cobros.component.html',
  styleUrls: ['./consultas-cobros.component.scss'],
})
export class ConsultasCobrosComponent {
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Filtros
  fechaInicio = signal<Date | null>(null);
  fechaFin = signal<Date | null>(null);
  clienteNombre = signal<string>('');
  estado = signal<'PENDIENTE' | 'CERRADO' | 'ANULADO' | ''>('');

  // Datos mock
  cobros = signal<Cobro[]>([
    { id: 1, fecha: new Date(), cliente: 'Juan Pérez', monto: 120.5, estado: 'CERRADO' },
    { id: 2, fecha: new Date(), cliente: 'María López', monto: 300, estado: 'PENDIENTE' },
    { id: 3, fecha: new Date(), cliente: 'Comercial XYZ', monto: 980.75, estado: 'ANULADO' },
  ]);

  filtered = computed(() => {
    const start = this.fechaInicio();
    const end = this.fechaFin();
    const name = (this.clienteNombre() || '').toLowerCase();
    const estado = this.estado();

    return this.cobros().filter((c) => {
      const inRange = (!start || c.fecha >= start) && (!end || c.fecha <= end);
      const byName = !name || c.cliente.toLowerCase().includes(name);
      const byEstado = !estado || c.estado === estado;
      return inRange && byName && byEstado;
    });
  });

  limpiarFiltros(): void {
    this.fechaInicio.set(null);
    this.fechaFin.set(null);
    this.clienteNombre.set('');
    this.estado.set('');
  }

  trackById(index: number, item: Cobro): number {
    return item.id;
  }
}

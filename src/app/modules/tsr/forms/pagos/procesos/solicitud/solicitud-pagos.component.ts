import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

interface SolicitudPagoRow {
  numero: string;
  proveedor: string;
  documento: string;
  fecha: string; // ISO
  valor: number;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'GENERADO';
}

@Component({
  selector: 'app-solicitud-pagos',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatCheckboxModule,
  ],
  templateUrl: './solicitud-pagos.component.html',
  styleUrls: ['./solicitud-pagos.component.scss'],
})
export class SolicitudPagosComponent {
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Filtros
  fechaInicio = signal<Date | null>(null);
  fechaFin = signal<Date | null>(null);
  proveedor = signal<string>('');
  estado = signal<'PENDIENTE' | 'APROBADO' | 'RECHAZADO' | 'GENERADO' | ''>('');

  rows = signal<SolicitudPagoRow[]>([
    {
      numero: 'SP-001',
      proveedor: 'Proveedor A',
      documento: 'FAC-100',
      fecha: new Date().toISOString().slice(0, 10),
      valor: 500,
      estado: 'PENDIENTE',
    },
    {
      numero: 'SP-002',
      proveedor: 'Proveedor B',
      documento: 'FAC-101',
      fecha: new Date().toISOString().slice(0, 10),
      valor: 1200,
      estado: 'APROBADO',
    },
  ]);

  filtered = computed(() => {
    const fi = this.fechaInicio();
    const ff = this.fechaFin();
    const prov = this.proveedor().toLowerCase();
    const es = this.estado();
    return this.rows().filter((r) => {
      const inRange =
        (!fi || r.fecha >= fi.toISOString().slice(0, 10)) &&
        (!ff || r.fecha <= ff.toISOString().slice(0, 10));
      const matchProv = !prov || r.proveedor.toLowerCase().includes(prov);
      const matchEst = !es || r.estado === es;
      return inRange && matchProv && matchEst;
    });
  });

  selected = signal<Set<number>>(new Set());
  selectedCount = computed(() => this.selected().size);
  selectedTotal = computed(() =>
    Array.from(this.selected()).reduce((s, i) => s + (this.filtered()[i]?.valor || 0), 0)
  );

  toggleOne(index: number, checked: boolean): void {
    this.selected.update((s) => {
      const copy = new Set(s);
      if (checked) copy.add(index);
      else copy.delete(index);
      return copy;
    });
  }

  aprobarSeleccionados(): void {
    if (this.selected().size === 0) {
      this.errorMsg.set('Seleccione al menos una solicitud.');
      return;
    }
    this.loading.set(true);
    const payload = Array.from(this.selected()).map((i) => this.filtered()[i]);
    console.log('Aprobar solicitudes:', payload);
    setTimeout(() => {
      this.loading.set(false);
      this.selected.set(new Set());
    }, 700);
  }

  limpiar(): void {
    this.fechaInicio.set(null);
    this.fechaFin.set(null);
    this.proveedor.set('');
    this.estado.set('');
    this.errorMsg.set('');
    this.selected.set(new Set());
  }
}

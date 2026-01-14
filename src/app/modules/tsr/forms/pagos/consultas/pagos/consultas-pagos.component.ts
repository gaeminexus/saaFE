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

interface PagoRow {
  numero: string;
  beneficiario: string;
  formaPago: 'EFECTIVO' | 'CHEQUE' | 'TRANSFERENCIA';
  banco?: string;
  cuenta?: string;
  fecha: string; // ISO
  valor: number;
  estado: 'REGISTRADO' | 'ANULADO' | 'APLICADO';
}

@Component({
  selector: 'app-consultas-pagos',
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
  ],
  templateUrl: './consultas-pagos.component.html',
  styleUrls: ['./consultas-pagos.component.scss'],
})
export class ConsultasPagosComponent {
  // Filtros
  fechaInicio = signal<Date | null>(null);
  fechaFin = signal<Date | null>(null);
  beneficiario = signal<string>('');
  formaPago = signal<'EFECTIVO' | 'CHEQUE' | 'TRANSFERENCIA' | ''>('');
  banco = signal<string>('');
  cuenta = signal<string>('');
  estado = signal<'REGISTRADO' | 'ANULADO' | 'APLICADO' | ''>('');

  // Mock data
  rows = signal<PagoRow[]>([
    {
      numero: 'PG-001',
      beneficiario: 'Proveedor A',
      formaPago: 'CHEQUE',
      banco: 'Banco Uno',
      cuenta: '100-001',
      fecha: new Date().toISOString().slice(0, 10),
      valor: 500.25,
      estado: 'REGISTRADO',
    },
    {
      numero: 'PG-002',
      beneficiario: 'Proveedor B',
      formaPago: 'TRANSFERENCIA',
      banco: 'Banco Dos',
      cuenta: '200-002',
      fecha: new Date().toISOString().slice(0, 10),
      valor: 900,
      estado: 'APLICADO',
    },
    {
      numero: 'PG-003',
      beneficiario: 'Proveedor C',
      formaPago: 'EFECTIVO',
      fecha: new Date().toISOString().slice(0, 10),
      valor: 120,
      estado: 'ANULADO',
    },
  ]);

  filtered = computed(() => {
    const fi = this.fechaInicio();
    const ff = this.fechaFin();
    const ben = this.beneficiario().toLowerCase();
    const fp = this.formaPago();
    const b = this.banco().toLowerCase();
    const c = this.cuenta().toLowerCase();
    const es = this.estado();
    return this.rows().filter((r) => {
      const inRange =
        (!fi || r.fecha >= fi.toISOString().slice(0, 10)) &&
        (!ff || r.fecha <= ff.toISOString().slice(0, 10));
      const matchBen = !ben || r.beneficiario.toLowerCase().includes(ben);
      const matchFP = !fp || r.formaPago === fp;
      const matchBanco = !b || (r.banco || '').toLowerCase().includes(b);
      const matchCta = !c || (r.cuenta || '').toLowerCase().includes(c);
      const matchEst = !es || r.estado === es;
      return inRange && matchBen && matchFP && matchBanco && matchCta && matchEst;
    });
  });

  total = computed(() => this.filtered().reduce((s, r) => s + r.valor, 0));

  limpiar(): void {
    this.fechaInicio.set(null);
    this.fechaFin.set(null);
    this.beneficiario.set('');
    this.formaPago.set('');
    this.banco.set('');
    this.cuenta.set('');
    this.estado.set('');
  }
}

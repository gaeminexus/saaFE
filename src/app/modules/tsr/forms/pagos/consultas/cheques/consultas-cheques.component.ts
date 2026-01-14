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

interface ChequeRow {
  numero: string;
  beneficiario: string;
  banco: string;
  cuenta: string;
  valor: number;
  fecha: string; // ISO
  estado: 'PENDIENTE' | 'IMPRESO' | 'ENTREGADO' | 'ANULADO';
}

@Component({
  selector: 'app-consultas-cheques',
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
  templateUrl: './consultas-cheques.component.html',
  styleUrls: ['./consultas-cheques.component.scss'],
})
export class ConsultasChequesComponent {
  // Filtros
  fechaInicio = signal<Date | null>(null);
  fechaFin = signal<Date | null>(null);
  beneficiario = signal<string>('');
  banco = signal<string>('');
  cuenta = signal<string>('');
  estado = signal<'PENDIENTE' | 'IMPRESO' | 'ENTREGADO' | 'ANULADO' | ''>('');

  rows = signal<ChequeRow[]>([
    {
      numero: '000120',
      beneficiario: 'Proveedor A',
      banco: 'Banco Uno',
      cuenta: '100-001',
      valor: 320.5,
      fecha: new Date().toISOString().slice(0, 10),
      estado: 'PENDIENTE',
    },
    {
      numero: '000121',
      beneficiario: 'Proveedor B',
      banco: 'Banco Dos',
      cuenta: '200-002',
      valor: 880,
      fecha: new Date().toISOString().slice(0, 10),
      estado: 'IMPRESO',
    },
    {
      numero: '000122',
      beneficiario: 'Proveedor C',
      banco: 'Banco Uno',
      cuenta: '100-001',
      valor: 1500,
      fecha: new Date().toISOString().slice(0, 10),
      estado: 'ENTREGADO',
    },
  ]);

  filtered = computed(() => {
    const fi = this.fechaInicio();
    const ff = this.fechaFin();
    const ben = this.beneficiario().toLowerCase();
    const b = this.banco().toLowerCase();
    const c = this.cuenta().toLowerCase();
    const es = this.estado();
    return this.rows().filter((r) => {
      const inRange =
        (!fi || r.fecha >= fi.toISOString().slice(0, 10)) &&
        (!ff || r.fecha <= ff.toISOString().slice(0, 10));
      const matchBen = !ben || r.beneficiario.toLowerCase().includes(ben);
      const matchBanco = !b || r.banco.toLowerCase().includes(b);
      const matchCta = !c || r.cuenta.toLowerCase().includes(c);
      const matchEst = !es || r.estado === es;
      return inRange && matchBen && matchBanco && matchCta && matchEst;
    });
  });

  total = computed(() => this.filtered().reduce((s, r) => s + r.valor, 0));

  limpiar(): void {
    this.fechaInicio.set(null);
    this.fechaFin.set(null);
    this.beneficiario.set('');
    this.banco.set('');
    this.cuenta.set('');
    this.estado.set('');
  }
}

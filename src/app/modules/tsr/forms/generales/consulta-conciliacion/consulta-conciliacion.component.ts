import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

interface RegistroConciliacion {
  id: number;
  fecha: Date;
  banco: string;
  cuenta: string;
  referencia: string;
  descripcion: string;
  monto: number;
  estado: 'CONCILIADO' | 'PENDIENTE';
}

@Component({
  selector: 'app-consulta-conciliacion',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
  ],
  templateUrl: './consulta-conciliacion.component.html',
  styleUrls: ['./consulta-conciliacion.component.scss'],
})
export class ConsultaConciliacionComponent {
  banco = signal<string>('');
  cuenta = signal<string>('');
  fechaDesde = signal<Date | null>(null);
  fechaHasta = signal<Date | null>(null);
  referencia = signal<string>('');
  estado = signal<'CONCILIADO' | 'PENDIENTE' | ''>('');

  displayedColumns = ['fecha', 'banco', 'cuenta', 'referencia', 'descripcion', 'monto', 'estado'];

  items = signal<RegistroConciliacion[]>([
    {
      id: 1,
      fecha: new Date(),
      banco: 'Banco A',
      cuenta: '001-123',
      referencia: 'MOV-001',
      descripcion: 'Cheque debitado',
      monto: -120.0,
      estado: 'CONCILIADO',
    },
    {
      id: 2,
      fecha: new Date(),
      banco: 'Banco A',
      cuenta: '001-123',
      referencia: 'MOV-002',
      descripcion: 'Depósito acreditado',
      monto: 300.0,
      estado: 'CONCILIADO',
    },
    {
      id: 3,
      fecha: new Date(),
      banco: 'Banco B',
      cuenta: '002-456',
      referencia: 'MOV-003',
      descripcion: 'Tarifa bancaria',
      monto: -8.5,
      estado: 'PENDIENTE',
    },
  ]);

  totalRegistros = computed(() => this.items().length);
  totalMonto = computed(() => this.items().reduce((acc, it) => acc + (it.monto || 0), 0));

  buscar(): void {
    const banco = this.banco().toLowerCase();
    const cuenta = this.cuenta().toLowerCase();
    const ref = this.referencia().toLowerCase();
    const d = this.fechaDesde();
    const h = this.fechaHasta();
    const estado = this.estado();

    const base: RegistroConciliacion[] = [
      {
        id: 4,
        fecha: new Date(),
        banco: 'Banco C',
        cuenta: '003-789',
        referencia: 'MOV-004',
        descripcion: 'Transferencia recibida',
        monto: 150.0,
        estado: 'CONCILIADO',
      },
      {
        id: 5,
        fecha: new Date(),
        banco: 'Banco C',
        cuenta: '003-789',
        referencia: 'MOV-005',
        descripcion: 'Transferencia enviada',
        monto: -80.0,
        estado: 'PENDIENTE',
      },
    ];

    const filtered = base.filter((it) => {
      const okBanco = !banco || it.banco.toLowerCase().includes(banco);
      const okCuenta = !cuenta || it.cuenta.toLowerCase().includes(cuenta);
      const okRef = !ref || it.referencia.toLowerCase().includes(ref);
      const okFechaDesde = !d || it.fecha >= d;
      const okFechaHasta = !h || it.fecha <= h;
      const okEstado = !estado || it.estado === estado;
      return okBanco && okCuenta && okRef && okFechaDesde && okFechaHasta && okEstado;
    });

    this.items.set(filtered);
  }
}

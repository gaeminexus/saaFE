import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

interface ItemConciliacion {
  id: number;
  fecha: Date;
  banco: string;
  cuenta: string;
  referencia: string;
  descripcion: string;
  monto: number;
  conciliado: boolean;
}

@Component({
  selector: 'app-conciliacion',
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
    MatCheckboxModule,
  ],
  templateUrl: './conciliacion.component.html',
  styleUrls: ['./conciliacion.component.scss'],
})
export class ConciliacionComponent {
  banco = signal<string>('');
  cuenta = signal<string>('');
  fechaDesde = signal<Date | null>(null);
  fechaHasta = signal<Date | null>(null);
  referencia = signal<string>('');
  montoMin = signal<number | null>(null);
  montoMax = signal<number | null>(null);

  displayedColumns = [
    'sel',
    'fecha',
    'banco',
    'cuenta',
    'referencia',
    'descripcion',
    'monto',
    'estado',
  ];

  items = signal<ItemConciliacion[]>([
    {
      id: 1,
      fecha: new Date(),
      banco: 'Banco A',
      cuenta: '001-123',
      referencia: 'MOV-001',
      descripcion: 'Cheque debitado',
      monto: -120.0,
      conciliado: false,
    },
    {
      id: 2,
      fecha: new Date(),
      banco: 'Banco A',
      cuenta: '001-123',
      referencia: 'MOV-002',
      descripcion: 'Depósito acreditado',
      monto: 300.0,
      conciliado: true,
    },
    {
      id: 3,
      fecha: new Date(),
      banco: 'Banco B',
      cuenta: '002-456',
      referencia: 'MOV-003',
      descripcion: 'Tarifa bancaria',
      monto: -8.5,
      conciliado: false,
    },
  ]);

  totalRegistros = computed(() => this.items().length);
  totalMonto = computed(() => this.items().reduce((acc, it) => acc + (it.monto || 0), 0));
  totalPendiente = computed(() =>
    this.items()
      .filter((i) => !i.conciliado)
      .reduce((acc, it) => acc + (it.monto || 0), 0)
  );

  buscar(): void {
    const banco = this.banco().toLowerCase();
    const cuenta = this.cuenta().toLowerCase();
    const ref = this.referencia().toLowerCase();
    const d = this.fechaDesde();
    const h = this.fechaHasta();
    const min = this.montoMin();
    const max = this.montoMax();

    const base: ItemConciliacion[] = [
      {
        id: 4,
        fecha: new Date(),
        banco: 'Banco C',
        cuenta: '003-789',
        referencia: 'MOV-004',
        descripcion: 'Transferencia recibida',
        monto: 150.0,
        conciliado: false,
      },
      {
        id: 5,
        fecha: new Date(),
        banco: 'Banco C',
        cuenta: '003-789',
        referencia: 'MOV-005',
        descripcion: 'Transferencia enviada',
        monto: -80.0,
        conciliado: true,
      },
    ];

    const filtered = base.filter((it) => {
      const okBanco = !banco || it.banco.toLowerCase().includes(banco);
      const okCuenta = !cuenta || it.cuenta.toLowerCase().includes(cuenta);
      const okRef = !ref || it.referencia.toLowerCase().includes(ref);
      const okFechaDesde = !d || it.fecha >= d;
      const okFechaHasta = !h || it.fecha <= h;
      const okMin = min == null || it.monto >= min;
      const okMax = max == null || it.monto <= max;
      return okBanco && okCuenta && okRef && okFechaDesde && okFechaHasta && okMin && okMax;
    });

    this.items.set(filtered);
  }

  toggleConciliado(item: ItemConciliacion): void {
    this.items.update((arr) =>
      arr.map((i) => (i.id === item.id ? { ...i, conciliado: !i.conciliado } : i))
    );
  }

  conciliarPendientes(): void {
    this.items.update((arr) => arr.map((i) => (i.conciliado ? i : { ...i, conciliado: true })));
  }
}

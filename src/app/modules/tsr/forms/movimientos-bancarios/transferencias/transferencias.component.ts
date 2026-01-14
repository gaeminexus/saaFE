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

interface Transferencia {
  id: number;
  fecha: Date;
  tipo: 'TRANSFERENCIA';
  bancoOrigen: string;
  cuentaOrigen: string;
  bancoDestino: string;
  cuentaDestino: string;
  referencia: string;
  descripcion: string;
  monto: number;
  estado: 'REGISTRADO' | 'APLICADO' | 'ANULADO';
}

@Component({
  selector: 'app-mov-transferencias',
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
  templateUrl: './transferencias.component.html',
  styleUrls: ['./transferencias.component.scss'],
})
export class TransferenciasComponent {
  bancoOrigen = signal<string>('');
  cuentaOrigen = signal<string>('');
  bancoDestino = signal<string>('');
  cuentaDestino = signal<string>('');
  fechaDesde = signal<Date | null>(null);
  fechaHasta = signal<Date | null>(null);
  referencia = signal<string>('');
  montoMin = signal<number | null>(null);
  montoMax = signal<number | null>(null);

  displayedColumns = ['fecha', 'origen', 'destino', 'referencia', 'descripcion', 'monto', 'estado'];

  items = signal<Transferencia[]>([
    {
      id: 1,
      fecha: new Date(),
      tipo: 'TRANSFERENCIA',
      bancoOrigen: 'Banco A',
      cuentaOrigen: '001-123',
      bancoDestino: 'Banco B',
      cuentaDestino: '002-456',
      referencia: 'TR-001',
      descripcion: 'Transf. entre cuentas',
      monto: 250.0,
      estado: 'REGISTRADO',
    },
  ]);

  totalRegistros = computed(() => this.items().length);
  totalMonto = computed(() => this.items().reduce((acc, it) => acc + (it.monto || 0), 0));

  buscar(): void {
    const bo = this.bancoOrigen().toLowerCase();
    const co = this.cuentaOrigen().toLowerCase();
    const bd = this.bancoDestino().toLowerCase();
    const cd = this.cuentaDestino().toLowerCase();
    const ref = this.referencia().toLowerCase();
    const d = this.fechaDesde();
    const h = this.fechaHasta();
    const min = this.montoMin();
    const max = this.montoMax();

    const base: Transferencia[] = [
      {
        id: 2,
        fecha: new Date(),
        tipo: 'TRANSFERENCIA',
        bancoOrigen: 'Banco C',
        cuentaOrigen: '003-789',
        bancoDestino: 'Banco A',
        cuentaDestino: '001-123',
        referencia: 'TR-002',
        descripcion: 'Transf. ajuste',
        monto: 120.0,
        estado: 'APLICADO',
      },
    ];

    const filtered = base.filter((it) => {
      const okBo = !bo || it.bancoOrigen.toLowerCase().includes(bo);
      const okCo = !co || it.cuentaOrigen.toLowerCase().includes(co);
      const okBd = !bd || it.bancoDestino.toLowerCase().includes(bd);
      const okCd = !cd || it.cuentaDestino.toLowerCase().includes(cd);
      const okRef = !ref || it.referencia.toLowerCase().includes(ref);
      const okFechaDesde = !d || it.fecha >= d;
      const okFechaHasta = !h || it.fecha <= h;
      const okMin = min == null || it.monto >= min;
      const okMax = max == null || it.monto <= max;
      return (
        okBo && okCo && okBd && okCd && okRef && okFechaDesde && okFechaHasta && okMin && okMax
      );
    });

    this.items.set(filtered);
  }

  registrarTransferencia(): void {
    const nuevo: Transferencia = {
      id: Date.now(),
      fecha: new Date(),
      tipo: 'TRANSFERENCIA',
      bancoOrigen: this.bancoOrigen() || 'Banco A',
      cuentaOrigen: this.cuentaOrigen() || '001-123',
      bancoDestino: this.bancoDestino() || 'Banco B',
      cuentaDestino: this.cuentaDestino() || '002-456',
      referencia: this.referencia() || `TR-${Math.floor(Math.random() * 1000)}`,
      descripcion: 'Transferencia registrada manualmente',
      monto: this.montoMin() || 100,
      estado: 'REGISTRADO',
    };
    this.items.update((arr) => [nuevo, ...arr]);
  }
}

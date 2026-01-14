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

interface Movimiento {
  id: number;
  fecha: Date;
  tipo: 'DEBITO';
  banco: string;
  cuenta: string;
  referencia: string;
  descripcion: string;
  monto: number;
  estado: 'REGISTRADO' | 'APLICADO' | 'ANULADO';
}

@Component({
  selector: 'app-mov-debitos',
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
  templateUrl: './debitos.component.html',
  styleUrls: ['./debitos.component.scss'],
})
export class DebitosComponent {
  // Filtros
  banco = signal<string>('');
  cuenta = signal<string>('');
  fechaDesde = signal<Date | null>(null);
  fechaHasta = signal<Date | null>(null);
  referencia = signal<string>('');
  montoMin = signal<number | null>(null);
  montoMax = signal<number | null>(null);

  displayedColumns = ['fecha', 'banco', 'cuenta', 'referencia', 'descripcion', 'monto', 'estado'];

  items = signal<Movimiento[]>([
    {
      id: 1,
      fecha: new Date(),
      tipo: 'DEBITO',
      banco: 'Banco A',
      cuenta: '001-123',
      referencia: 'REF-001',
      descripcion: 'Débito comisión',
      monto: 12.5,
      estado: 'REGISTRADO',
    },
    {
      id: 2,
      fecha: new Date(),
      tipo: 'DEBITO',
      banco: 'Banco B',
      cuenta: '002-456',
      referencia: 'REF-002',
      descripcion: 'Débito servicio',
      monto: 30.0,
      estado: 'APLICADO',
    },
  ]);

  totalRegistros = computed(() => this.items().length);
  totalMonto = computed(() => this.items().reduce((acc, it) => acc + (it.monto || 0), 0));

  buscar(): void {
    // Cascarón: aplicar filtros sobre datos mock
    const banco = this.banco().toLowerCase();
    const cuenta = this.cuenta().toLowerCase();
    const ref = this.referencia().toLowerCase();
    const d = this.fechaDesde();
    const h = this.fechaHasta();
    const min = this.montoMin();
    const max = this.montoMax();

    const base: Movimiento[] = [
      {
        id: 3,
        fecha: new Date(),
        tipo: 'DEBITO',
        banco: 'Banco C',
        cuenta: '003-789',
        referencia: 'REF-003',
        descripcion: 'Débito mantenimiento',
        monto: 8.75,
        estado: 'REGISTRADO',
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

  registrarDebito(): void {
    const nuevo: Movimiento = {
      id: Date.now(),
      fecha: new Date(),
      tipo: 'DEBITO',
      banco: this.banco() || 'Banco A',
      cuenta: this.cuenta() || '001-123',
      referencia: this.referencia() || `REF-${Math.floor(Math.random() * 1000)}`,
      descripcion: 'Débito registrado manualmente',
      monto: this.montoMin() || 10,
      estado: 'REGISTRADO',
    };
    this.items.update((arr) => [nuevo, ...arr]);
  }
}

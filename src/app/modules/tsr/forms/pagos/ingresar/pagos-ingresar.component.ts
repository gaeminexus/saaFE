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

interface DetallePago {
  documento: string;
  descripcion: string;
  fechaEmision: string; // ISO
  valorDocumento: number;
  aPagar: number;
}

@Component({
  selector: 'app-pagos-ingresar',
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
  templateUrl: './pagos-ingresar.component.html',
  styleUrls: ['./pagos-ingresar.component.scss'],
})
export class PagosIngresarComponent {
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Cabecera
  fecha = signal<Date | null>(new Date());
  beneficiario = signal<string>('');
  formaPago = signal<'EFECTIVO' | 'CHEQUE' | 'TRANSFERENCIA' | ''>('');
  bancoCodigo = signal<number | null>(null);
  cuentaNumero = signal<string>('');
  observacion = signal<string>('');

  // Mock combos
  formasPago = ['EFECTIVO', 'CHEQUE', 'TRANSFERENCIA'] as const;
  bancos = [
    { codigo: 1, nombre: 'Banco Uno' },
    { codigo: 2, nombre: 'Banco Dos' },
  ];
  cuentas = [
    { numero: '100-001', bancoCodigo: 1 },
    { numero: '200-002', bancoCodigo: 2 },
  ];

  // Detalles
  detalles = signal<DetallePago[]>([]);
  totalAPagar = computed(() => this.detalles().reduce((s, d) => s + (d.aPagar || 0), 0));

  updateDetalle(index: number, patch: Partial<DetallePago>): void {
    this.detalles.update((arr) => {
      const copy = [...arr];
      copy[index] = { ...copy[index], ...patch } as DetallePago;
      return copy;
    });
  }

  agregarDetalle(): void {
    this.detalles.update((arr) => [
      ...arr,
      {
        documento: '',
        descripcion: '',
        fechaEmision: new Date().toISOString().slice(0, 10),
        valorDocumento: 0,
        aPagar: 0,
      },
    ]);
  }

  removerDetalle(index: number): void {
    this.detalles.update((arr) => arr.filter((_, i) => i !== index));
  }

  limpiar(): void {
    this.beneficiario.set('');
    this.formaPago.set('');
    this.bancoCodigo.set(null);
    this.cuentaNumero.set('');
    this.observacion.set('');
    this.detalles.set([]);
    this.errorMsg.set('');
  }

  guardar(): void {
    this.errorMsg.set('');
    if (!this.fecha() || !this.beneficiario() || !this.formaPago()) {
      this.errorMsg.set('Complete fecha, beneficiario y forma de pago.');
      return;
    }
    if (this.formaPago() !== 'EFECTIVO' && (!this.bancoCodigo() || !this.cuentaNumero())) {
      this.errorMsg.set('Seleccione banco y cuenta para cheques/transferencias.');
      return;
    }
    if (this.detalles().length === 0 || this.totalAPagar() <= 0) {
      this.errorMsg.set('Agregue al menos un detalle con valor a pagar.');
      return;
    }
    this.loading.set(true);
    // Placeholder de persistencia
    const payload = {
      fecha: this.fecha()?.toISOString(),
      beneficiario: this.beneficiario(),
      formaPago: this.formaPago(),
      bancoCodigo: this.bancoCodigo(),
      cuentaNumero: this.cuentaNumero(),
      observacion: this.observacion(),
      detalles: this.detalles(),
      total: this.totalAPagar(),
    };
    console.log('Guardar Pago:', payload);
    setTimeout(() => {
      this.loading.set(false);
      this.limpiar();
    }, 600);
  }
}

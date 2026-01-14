import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { DetalleDeposito } from '../../../../tsr/model/detalle-deposito';

@Component({
  selector: 'app-procesos-depositos',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
  ],
  templateUrl: './procesos-depositos.component.html',
  styleUrls: ['./procesos-depositos.component.scss'],
})
export class ProcesosDepositosComponent {
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  fechaInicio = signal<Date | null>(null);
  fechaFin = signal<Date | null>(null);
  bancoCodigo = signal<number | null>(null);

  detalles = signal<DetalleDeposito[]>([
    {
      codigo: 1,
      deposito: {} as any,
      banco: {} as any,
      cuentaBancaria: {} as any,
      valor: 1000,
      valorEfectivo: 600,
      valorCheque: 400,
      estado: 0,
      fechaEnvio: new Date().toISOString(),
      fechaRatificacion: '',
      numeroDeposito: 'DEP-0001',
      asiento: {} as any,
      usuario: {} as any,
      nombreUsuario: 'operador',
    },
  ]);

  totals = computed(() =>
    this.detalles().reduce(
      (acc, d) => ({
        efectivo: acc.efectivo + (d.valorEfectivo || 0),
        cheque: acc.cheque + (d.valorCheque || 0),
        total: acc.total + (d.valor || 0),
      }),
      { efectivo: 0, cheque: 0, total: 0 }
    )
  );

  limpiar(): void {
    this.fechaInicio.set(null);
    this.fechaFin.set(null);
    this.bancoCodigo.set(null);
    this.errorMsg.set('');
  }

  generarDeposito(): void {
    this.errorMsg.set('');
    const start = this.fechaInicio();
    const end = this.fechaFin();
    if (!start || !end) {
      this.errorMsg.set('Seleccione un rango de fechas válido.');
      return;
    }
    this.loading.set(true);
    console.log('Generando Depósito con detalles:', this.detalles());
    setTimeout(() => {
      this.loading.set(false);
    }, 700);
  }
}

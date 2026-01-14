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
import { DetalleCierre } from '../../../../tsr/model/detalle-cierre';

@Component({
  selector: 'app-procesos-cierres',
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
  templateUrl: './procesos-cierres.component.html',
  styleUrls: ['./procesos-cierres.component.scss'],
})
export class ProcesosCierresComponent {
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  fecha = signal<Date | null>(new Date());
  cajaCodigo = signal<number | null>(null);

  detalles = signal<DetalleCierre[]>([
    {
      codigo: 1,
      cierreCaja: {} as any,
      cobro: {} as any,
      nombreCliente: 'Juan Pérez',
      fechaCobro: new Date().toISOString(),
      valorEfectivo: 50,
      valorCheque: 20,
      valorTarjeta: 30,
      valorTransferencia: 0,
      valorRetencion: 5,
      valorTotal: 105,
    },
  ]);

  totals = computed(() => {
    const acc = { efectivo: 0, cheque: 0, tarjeta: 0, transferencia: 0, retencion: 0, total: 0 };
    this.detalles().forEach((d) => {
      acc.efectivo += d.valorEfectivo || 0;
      acc.cheque += d.valorCheque || 0;
      acc.tarjeta += d.valorTarjeta || 0;
      acc.transferencia += d.valorTransferencia || 0;
      acc.retencion += d.valorRetencion || 0;
      acc.total += d.valorTotal || 0;
    });
    return acc;
  });

  limpiar(): void {
    this.fecha.set(new Date());
    this.cajaCodigo.set(null);
    this.errorMsg.set('');
  }

  generarCierre(): void {
    if (!this.fecha()) {
      this.errorMsg.set('Seleccione una fecha válida.');
      return;
    }
    this.loading.set(true);
    console.log('Generando CierreCaja con detalles:', this.detalles());
    setTimeout(() => {
      this.loading.set(false);
    }, 600);
  }
}

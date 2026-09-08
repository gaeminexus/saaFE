import { CommonModule } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CuentaBancaria } from '../../../../tsr/model/cuenta-bancaria';
import { InlineAutocompleteComponent } from '../../comunes/inline-autocomplete/inline-autocomplete.component';

export interface PagarPlanillaDialogData {
  tipoLabel: string;
  numeroComprobante: string;
  valorIess: number;
  cuentas: CuentaBancaria[];
}

export interface PagarPlanillaDialogResult {
  idCuentaBancaria: number;
  fechaPago: string;
}

/**
 * Registra que el IESS **ya debitó** la cuenta — no ordena ningún pago.
 *
 * El texto de confirmación es a propósito literal sobre esto: con débito automático el hecho ya
 * ocurrió antes de que alguien abra esta pantalla, así que "pagar" aquí es dejar constancia con la
 * cuenta y la fecha real del débito, para que tesorería pueda conciliarlo contra el extracto
 * bancario — no es un botón que dispare una transferencia.
 */
@Component({
  selector: 'app-pagar-planilla-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    InlineAutocompleteComponent,
  ],
  templateUrl: './pagar-planilla-dialog.component.html',
  styleUrls: ['./pagar-planilla-dialog.component.scss'],
})
export class PagarPlanillaDialogComponent {
  idCuentaBancaria: number | null = null;
  fechaPago: Date | null = new Date();

  readonly aviso = signal<string | null>(null);

  constructor(
    public dialogRef: MatDialogRef<PagarPlanillaDialogComponent, PagarPlanillaDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public data: PagarPlanillaDialogData,
  ) {}

  etiquetaCuenta(cuenta: CuentaBancaria): string {
    return `${cuenta.banco?.nombre ?? 'Banco'} — ${cuenta.numeroCuenta}`;
  }

  readonly valorCuenta = (c: CuentaBancaria): number => c.codigo;
  readonly buscarPorCuenta = (c: CuentaBancaria): string[] => [c.banco?.nombre ?? '', c.numeroCuenta ?? ''];

  private fechaISO(fecha: Date | null): string {
    if (!fecha) return '';
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  get formValido(): boolean {
    return this.idCuentaBancaria !== null && !!this.fechaPago;
  }

  confirmar(): void {
    if (!this.formValido || this.idCuentaBancaria === null) {
      this.aviso.set('Indique la cuenta desde la que el IESS debitó y la fecha real del débito.');
      return;
    }
    this.dialogRef.close({
      idCuentaBancaria: this.idCuentaBancaria,
      fechaPago: this.fechaISO(this.fechaPago),
    });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}

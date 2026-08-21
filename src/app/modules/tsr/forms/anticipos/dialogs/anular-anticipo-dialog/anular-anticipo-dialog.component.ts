import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { VerificacionAnulacionAnticipo } from '../../../../service/anticipo.service';

export interface AnularAnticipoDialogData {
  /** 'cliente' o 'proveedor': solo cambia el texto que ve el usuario. */
  tipo: 'cliente' | 'proveedor';
  /** Fila del listado de anticipos que se quiere anular. */
  anticipo: any;
  /** Respuesta de /verificarAnulacion: dice si el anticipo ya fue cruzado. */
  verificacion: VerificacionAnulacionAnticipo;
}

export interface AnularAnticipoDialogResult {
  motivo: string;
  confirmarReversionCruces: boolean;
}

/**
 * Confirmación de anulación de un anticipo.
 *
 * Cuando el anticipo NO fue cruzado con ninguna factura solo pide el motivo:
 * al aceptar se anula el anticipo, su asiento contable y se descuenta el
 * saldo de anticipos del titular.
 *
 * Cuando SÍ fue cruzado, lista las facturas afectadas y exige un check
 * explícito: al aceptar se eliminan esos abonos y las facturas vuelven a
 * quedar pendientes.
 */
@Component({
  selector: 'app-anular-anticipo-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatDialogModule],
  templateUrl: './anular-anticipo-dialog.component.html',
  styleUrl: './anular-anticipo-dialog.component.scss',
})
export class AnularAnticipoDialogComponent {
  motivo = '';
  aceptaReversionCruces = false;

  constructor(
    private ref: MatDialogRef<AnularAnticipoDialogComponent, AnularAnticipoDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public data: AnularAnticipoDialogData,
  ) {}

  get esProveedor(): boolean {
    return this.data.tipo === 'proveedor';
  }

  get cruces(): any[] {
    return this.data.verificacion?.cruces ?? [];
  }

  get fueCruzado(): boolean {
    return this.cruces.length > 0;
  }

  get totalCruzado(): number {
    return this.cruces.reduce((suma, c) => suma + Number(c?.montoAplicado ?? 0), 0);
  }

  get puedeAceptar(): boolean {
    if (!this.motivo.trim()) return false;
    // Sin cruces basta el motivo; con cruces hay que aceptar explícitamente
    // que se eliminen los abonos a las facturas.
    return !this.fueCruzado || this.aceptaReversionCruces;
  }

  aceptar(): void {
    if (!this.puedeAceptar) return;
    this.ref.close({
      motivo: this.motivo.trim(),
      confirmarReversionCruces: this.fueCruzado && this.aceptaReversionCruces,
    });
  }

  cancelar(): void {
    this.ref.close(null);
  }
}

import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { MovimientoRelacionado } from '../../../../../../shared/model/pagos-cobros/movimiento-relacionado';

export interface AnularDocumentoCompraDialogData {
  tipoLabel: string;
  numero: string;
  /**
   * `null` = no aplica consulta de movimientos (liquidación de compra en cxp: no tiene nada
   * que cascadear). `[]` = sí se consultó y no hay movimientos. Ambos casos van directo al
   * formulario simple; solo un array no vacío pide la confirmación de cascada.
   */
  movimientos: MovimientoRelacionado[] | null;
}

export interface AnularDocumentoCompraDialogResult {
  motivo: string;
  anularEnCascada: boolean;
}

/**
 * Confirmación de anulación de un documento de compra (factura/NC/ND). Decisión del usuario
 * (2026-08-28, ítem 13): no se permite anular un documento con pagos/anticipos/retenciones
 * cruzados salvo que se acepte explícitamente anularlos todos en cascada; si no se acepta, hay
 * que anular esos movimientos uno por uno primero — este diálogo no lo hace por su cuenta.
 */
@Component({
  selector: 'app-anular-documento-compra-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatDialogModule],
  templateUrl: './anular-documento-compra-dialog.component.html',
  styleUrl: './anular-documento-compra-dialog.component.scss',
})
export class AnularDocumentoCompraDialogComponent {
  motivo = '';
  aceptaCascada = false;

  constructor(
    private ref: MatDialogRef<AnularDocumentoCompraDialogComponent, AnularDocumentoCompraDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public data: AnularDocumentoCompraDialogData,
  ) {}

  get movimientos(): MovimientoRelacionado[] {
    return this.data.movimientos ?? [];
  }

  get hayMovimientos(): boolean {
    return this.movimientos.length > 0;
  }

  get totalMovimientos(): number {
    return this.movimientos.reduce((suma, m) => suma + Number(m?.montoAplicado ?? 0), 0);
  }

  /**
   * La forma de `MovimientoRelacionado` varía por tipo de documento (ver el javadoc del
   * modelo): factura/liquidación traen `tipoDocPago(Texto)`; nota de crédito/débito y
   * retención traen `idFactura`/`idFacturaCompra` en su lugar. La retención es la única
   * asimetría real: vive del lado venta pero afecta facturas de COMPRA.
   */
  etiquetaMovimiento(m: MovimientoRelacionado): string {
    if (m.tipoDocPagoTexto) return m.tipoDocPagoTexto;
    if (m.tipoDocPago != null) return `Tipo ${m.tipoDocPago}`;
    if (m.idFacturaCompra != null) return `Aplicado a factura de compra #${m.idFacturaCompra}`;
    if (m.idFactura != null) return `Aplicado a factura #${m.idFactura}`;
    return 'Movimiento';
  }

  get puedeAceptar(): boolean {
    if (!this.motivo.trim()) return false;
    return !this.hayMovimientos || this.aceptaCascada;
  }

  aceptar(): void {
    if (!this.puedeAceptar) return;
    this.ref.close({
      motivo: this.motivo.trim(),
      anularEnCascada: this.hayMovimientos && this.aceptaCascada,
    });
  }

  cancelar(): void {
    this.ref.close(null);
  }
}

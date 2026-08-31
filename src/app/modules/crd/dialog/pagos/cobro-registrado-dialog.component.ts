import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { TipoOperacionCobro, nombreTipoOperacionCobro } from '../../model/cobros/catalogos-cobro';

/** Un renglón del detalle multilínea (`PAGO_MULTIPLE`/`COBRO_MIXTO`): o es un préstamo, o es un aporte. */
export interface CobroRegistradoDetalleLinea {
  tipo: 'prestamo' | 'aporte';
  etiqueta: string;
  valor: number;
}

export interface CobroRegistradoData {
  tipoOperacion: TipoOperacionCobro;
  idCobro: number;
  valor: number;
  /** Si es `false`, el cobro no generó asiento transitorio: es un FYI, no un error. */
  contabilidadActiva: boolean;
  tituloPrestamo?: string;
  participante?: string;
  fecha?: string;
  referencia?: string;
  /**
   * Solo `PAGO_MULTIPLE`/`COBRO_MIXTO`: el detalle línea por línea. Sin esto no queda nada que
   * resumir en el momento (no se aplicó nada), así que es la única forma en que el operador ve el
   * desglose de su propia operación hasta que contabilidad la apruebe.
   */
  detalles?: CobroRegistradoDetalleLinea[];
}

/**
 * Confirmación tras registrar un cobro en `CRD.CBCR` (docs/crd/PLAN-CUTOVER-COBROS-POR-CONTABILIDAD.md).
 *
 * ⚠️ A propósito NO es `ReciboOperacionDialogComponent`: ese diálogo es el comprobante de un pago YA
 * APLICADO (cuotas afectadas, saldo bajado). Acá el cobro quedó REGISTRADO — el préstamo no se tocó
 * todavía, va a la bandeja de contabilidad — así que ni el título, ni el ícono, ni el texto pueden
 * sugerir que el pago se aplicó. Reutilizable para los cinco tipos migrados: `PAGO_CUOTA`,
 * `ABONO_CAPITAL` y `PRECANCELACION` (una línea, sin `detalles`) y `PAGO_MULTIPLE`/`COBRO_MIXTO`
 * (con `detalles`, para mostrar el desglose completo — es lo único que el operador ve de su
 * operación hasta que se apruebe, porque no se aplicó nada).
 */
@Component({
  selector: 'app-cobro-registrado-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialFormModule],
  templateUrl: './cobro-registrado-dialog.component.html',
  styleUrl: './cobro-registrado-dialog.component.scss',
})
export class CobroRegistradoDialogComponent {
  readonly nombreTipoOperacionCobro = nombreTipoOperacionCobro;

  constructor(
    private dialogRef: MatDialogRef<CobroRegistradoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CobroRegistradoData
  ) {}

  get lineasPrestamo(): CobroRegistradoDetalleLinea[] {
    return (this.data.detalles ?? []).filter((d) => d.tipo === 'prestamo');
  }

  get lineasAporte(): CobroRegistradoDetalleLinea[] {
    return (this.data.detalles ?? []).filter((d) => d.tipo === 'aporte');
  }

  get totalAportesDetalle(): number {
    return +this.lineasAporte.reduce((s, d) => s + d.valor, 0).toFixed(2);
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}

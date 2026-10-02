import { CommonModule } from '@angular/common';
import { Component, Inject, computed, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { formatearMoneda } from '../../../../../shared/utils/moneda.util';
import { CandidatoListadoSeguro, ClaseDocumentoSeguro } from '../../../model/poliza-seguro/poliza-seguro.model';

export interface RegistrarNotaSeguroDialogData {
  clase: ClaseDocumentoSeguro.NOTA_DEBITO | ClaseDocumentoSeguro.NOTA_CREDITO;
  /** Las filas del reporte de novedades de origen: inclusiones si es ND, exclusiones si es NC. */
  candidatos: CandidatoListadoSeguro[];
}

export interface RegistrarNotaSeguroDialogResultado {
  prestamos: number[];
  aseguradora: string;
  ruc: string;
  numeroPoliza: string;
  numeroDocumento: string;
  claveAcceso: string;
  fechaEmision: Date;
  valorTotal: number;
}

/**
 * Registra una ND (inclusión) o NC (exclusión) contra la factura madre (§7 del contrato). El
 * usuario elige, de las filas que ya trajo el reporte de novedades, cuáles van en esta nota —
 * `idFactura`, `clase` y `usuario` los agrega el llamador antes de mandar al servicio.
 */
@Component({
  selector: 'app-registrar-nota-seguro-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialFormModule],
  templateUrl: './registrar-nota-seguro-dialog.component.html',
  styleUrl: './registrar-nota-seguro-dialog.component.scss',
})
export class RegistrarNotaSeguroDialogComponent {
  formatMoneda = formatearMoneda;

  seleccionados = signal<Set<number>>(new Set());

  aseguradora = '';
  ruc = '';
  numeroPoliza = '';
  numeroDocumento = '';
  claveAcceso = '';
  fechaEmision: Date = new Date();
  valorTotal: number | null = null;

  esDebito = computed(() => this.data.clase === ClaseDocumentoSeguro.NOTA_DEBITO);

  constructor(
    private dialogRef: MatDialogRef<RegistrarNotaSeguroDialogComponent, RegistrarNotaSeguroDialogResultado | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: RegistrarNotaSeguroDialogData
  ) {}

  estaSeleccionado(idPrestamo: number): boolean {
    return this.seleccionados().has(idPrestamo);
  }

  alternarSeleccion(idPrestamo: number): void {
    const set = new Set(this.seleccionados());
    if (set.has(idPrestamo)) set.delete(idPrestamo);
    else set.add(idPrestamo);
    this.seleccionados.set(set);
  }

  puedeConfirmar(): boolean {
    return (
      this.seleccionados().size > 0 &&
      !!this.aseguradora.trim() &&
      !!this.ruc.trim() &&
      !!this.numeroPoliza.trim() &&
      !!this.numeroDocumento.trim() &&
      !!this.claveAcceso.trim() &&
      !!this.fechaEmision &&
      (this.valorTotal ?? 0) > 0
    );
  }

  confirmar(): void {
    if (!this.puedeConfirmar()) return;
    this.dialogRef.close({
      prestamos: Array.from(this.seleccionados()),
      aseguradora: this.aseguradora.trim(),
      ruc: this.ruc.trim(),
      numeroPoliza: this.numeroPoliza.trim(),
      numeroDocumento: this.numeroDocumento.trim(),
      claveAcceso: this.claveAcceso.trim(),
      fechaEmision: this.fechaEmision,
      valorTotal: this.valorTotal as number,
    });
  }

  cancelar(): void {
    this.dialogRef.close(undefined);
  }
}

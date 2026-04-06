import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { NovedadParticipeCarga } from '../../model/novedad-participe-carga';
import { Prestamo } from '../../model/prestamo';
import { DetallePrestamo } from '../../model/detalle-prestamo';
import { AfectacionValoresParticipeCarga } from '../../model/afectacion-valores-participe-carga';

interface PrestamoAfectable {
  prestamo: Prestamo;
  cuotas: DetallePrestamo[];
}

interface DialogData {
  novedad: NovedadParticipeCarga;
  getPrestamosAfectables: () => PrestamoAfectable[];
  getAfectacionesRegistradas: () => AfectacionValoresParticipeCarga[];
  getValoresAfectarEditados: () => Record<number, number>;
  onValorAfectarChange: (detalle: DetallePrestamo, valor: string | number) => void;
  onValorAfectarFocus: (detalle: DetallePrestamo) => void;
  onValorAfectarBlur: (detalle: DetallePrestamo) => void;
  onAutocompletarValorCuota: (detalle: DetallePrestamo) => void;
  getValorAfectarEditado: (detalleCodigo: number | undefined) => string;
  getValorCuotaOriginal: (detalle: DetallePrestamo | null | undefined) => number;
  getEstadoCuotaTexto: (detalle: DetallePrestamo | null | undefined) => string;
  getMontoDisponibleAfectacion: () => number;
  getTotalValorAfectarActual: () => number;
  getSaldoPendienteAfectacion: () => number;
  isLoadingAfectacionFinanciera: () => boolean;
  isSavingAfectacionFinanciera: () => boolean;
  formatearFecha: (fecha: Date | string | null) => string;
  onGuardarAfectaciones: () => void;
}

@Component({
  selector: 'app-afectacion-financiera-cuotas-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './afectacion-financiera-cuotas-dialog.component.html',
  styleUrl: './afectacion-financiera-cuotas-dialog.component.scss'
})
export class AfectacionFinancieraCuotasDialogComponent {
  prestamosExpandidos = new Set<number>();

  constructor(
    public dialogRef: MatDialogRef<AfectacionFinancieraCuotasDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  togglePrestamo(prestamoCodigo: number | undefined): void {
    if (!prestamoCodigo) {
      return;
    }

    if (this.prestamosExpandidos.has(prestamoCodigo)) {
      this.prestamosExpandidos.delete(prestamoCodigo);
    } else {
      this.prestamosExpandidos.add(prestamoCodigo);
    }
  }

  isPrestamoExpandido(prestamoCodigo: number | undefined): boolean {
    if (!prestamoCodigo) {
      return false;
    }

    return this.prestamosExpandidos.has(prestamoCodigo);
  }

  /**
   * Retorna el nombre del tipo de préstamo (producto)
   */
  getTipoPrestamoNombre(prestamo: Prestamo | null | undefined): string {
    if (!prestamo) {
      return '-';
    }

    // Intentar obtener el nombre del producto
    return prestamo.producto?.nombre || 'N/A';
  }

  /**
   * Cierra el dialog
   */
  cerrar(): void {
    this.dialogRef.close(false);
  }

  /**
   * Guarda y cierra
   */
  guardarYCerrar(): void {
    this.data.onGuardarAfectaciones();
  }
}

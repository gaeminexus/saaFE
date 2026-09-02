import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { NovedadParticipeCarga } from '../../model/novedad-participe-carga';
import { Prestamo } from '../../model/prestamo';
import { DetallePrestamo } from '../../model/detalle-prestamo';
import { AfectacionValoresParticipeCarga, OpcionAporteExcedente } from '../../model/afectacion-valores-participe-carga';

interface PrestamoAfectable {
  prestamo: Prestamo;
  cuotas: DetallePrestamo[];
}

/**
 * Préstamo cuyas cuotas o pagos no se pudieron cargar (ver el mismo tipo en
 * `detalle-consulta-carga.component.ts`, de donde sale el dato). Informativo: no bloquea nada,
 * solo evita que un fallo de consulta se vea igual que "no tiene cuotas pendientes".
 */
interface PrestamoErrorCarga {
  prestamo: Prestamo;
  motivo: string;
}

interface DialogData {
  novedad: NovedadParticipeCarga;
  getPrestamosAfectables: () => PrestamoAfectable[];
  getErroresCargaPrestamos: () => PrestamoErrorCarga[];
  getAfectacionesRegistradas: () => AfectacionValoresParticipeCarga[];
  getValoresAfectarEditados: () => Record<number, number>;
  onValorAfectarChange: (detalle: DetallePrestamo, valor: string | number) => void;
  onValorAfectarFocus: (detalle: DetallePrestamo) => void;
  onValorAfectarBlur: (detalle: DetallePrestamo) => void;
  onAutocompletarValorCuota: (detalle: DetallePrestamo) => void;
  getValorAfectarEditado: (detalleCodigo: number | undefined) => string;
  getValorCuotaOriginal: (detalle: DetallePrestamo | null | undefined) => number;
  /** Saldo pendiente REAL de la cuota (reconstruido desde CRD.PGPR) — no confundir con su valor total. */
  getSaldoPendienteCuota: (detalle: DetallePrestamo | null | undefined) => number;
  getEstadoCuotaTexto: (detalle: DetallePrestamo | null | undefined) => string;
  getMontoDisponibleAfectacion: () => number;
  /** "Excedente a repartir" cuando la novedad tiene excedente real, "Valor recibido Petro" si no. */
  getEtiquetaMontoDisponibleAfectacion: () => string;
  getTotalValorAfectarActual: () => number;
  getSaldoPendienteAfectacion: () => number;
  isLoadingAfectacionFinanciera: () => boolean;
  isSavingAfectacionFinanciera: () => boolean;
  formatearFecha: (fecha: Date | string | null) => string;
  onGuardarAfectaciones: () => void;

  /**
   * Excedente aplicado a un aporte de jubilación/cesantía (docs/crd/API-EXCEDENTE-PETRO-A-APORTES.md).
   * `getOpcionesAporte()` vacío + `getMensajeOpcionesAporteVacio()` con texto = el partícipe no
   * tiene ningún tipo vigente en el mes de la carga: no es un error, no se ofrece la opción.
   */
  getOpcionesAporte: () => OpcionAporteExcedente[];
  getMensajeOpcionesAporteVacio: () => string | null;
  isLoadingOpcionesAporte: () => boolean;
  getValorAporteEditado: (idTipoAporte: number) => string;
  onValorAporteChange: (idTipoAporte: number, valor: string | number) => void;
  onValorAporteFocus: (idTipoAporte: number) => void;
  onValorAporteBlur: (idTipoAporte: number) => void;
  getTotalValorAportarActual: () => number;

  /**
   * Reparto automático por préstamo: check "aplicar todo el sobrante" y el valor de cabecera son
   * la misma operación con distinta fuente de monto — ver `aplicarRepartoAutomaticoPrestamo` en el
   * componente padre.
   */
  isAplicarTodoElSobranteActivo: (item: PrestamoAfectable) => boolean;
  onToggleAplicarTodoElSobrante: (item: PrestamoAfectable, marcado: boolean) => void;
  getValorRepartoPrestamoTexto: (item: PrestamoAfectable) => string;
  onValorRepartoPrestamoInput: (item: PrestamoAfectable, valor: string) => void;
  onValorRepartoPrestamoBlur: (item: PrestamoAfectable) => void;
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

  /**
   * `trackBy` de la tabla de cuotas por `codigo` (pedido del usuario 2026-09-01: "que el foco no
   * salte"). Sin esto, cada recarga de `prestamosAfectables` (p. ej. justo después de "Guardar")
   * trae objetos `DetallePrestamo` con identidad nueva aunque representen la misma cuota, y el
   * `mat-table` por defecto compara por identidad: destruye y recrea TODAS las filas, incluido el
   * `<input>` que el operador tenía enfocado en ese momento — foco perdido a mitad de tipeo. Con
   * `trackBy` por `codigo`, CDK reconoce que es la misma fila y reutiliza el DOM.
   */
  trackByCuota(_index: number, cuota: DetallePrestamo): number {
    return cuota.codigo;
  }

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

import { CommonModule } from '@angular/common';
import { Component, HostListener, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { JasperReportesService } from '../../../../shared/services/jasper-reportes.service';
import {
  CLASE_ESTADO_CUOTA,
  NOMBRE_ESTADO_CUOTA,
  NOMBRE_ESTADO_PRESTAMO,
  NOMBRE_TIPO_OPERACION,
} from '../../model/pagos/catalogos-pago';
import {
  CuotaAfectada,
  ResultadoAbonoCapital,
  ResultadoPagoCuota,
  ResultadoPrecancelacion,
  ResultadoRegistroAporte,
} from '../../model/pagos/operaciones-pago';
import { MovimientoAporte } from '../../model/pagos/respuesta-pago';
import { ComprobanteImpresionService } from './comprobante-impresion.service';

export interface ReciboOperacionData {
  tipo: 'PAGO_MANUAL' | 'PAGO_APORTES' | 'ABONO_CAPITAL' | 'PRECANCELACION' | 'ANULACION' | 'REGISTRO_APORTE';
  /** Encabezado del comprobante, p. ej. "Préstamo #8523 · Crédito Ordinario". */
  tituloPrestamo: string;
  participante?: string;
  /** El `mensaje` que devolvió el backend. */
  mensaje?: string;
  fecha?: string;
  pago?: ResultadoPagoCuota;
  abono?: ResultadoAbonoCapital;
  precancelacion?: ResultadoPrecancelacion;
  movimientosAporte?: MovimientoAporte[];
  /** Aportes que el socio entregó y quedaron registrados a su favor (POST /aprt/registrarAporte). */
  aportesRegistrados?: ResultadoRegistroAporte[];
  /** idTipoAporte → nombre, para rotular los movimientos de aporte. */
  nombresTipoAporte?: Record<number, string>;
  /** Texto libre extra (motivo de anulación, observación...). */
  detalleExtra?: { label: string; valor: string }[];
}

/**
 * Comprobante de una operación de pago ya aplicada: muestra el desglose que devolvió el backend
 * (§4 de la guía) y permite imprimirlo.
 *
 * Los seis campos `aplicado*` de cada cuota suman exactamente `totalAplicado`, y se listan en el
 * orden de prelación con que el backend imputa el dinero: desgravamen → mora → interés vencido →
 * interés → capital → seguro de incendio.
 */
@Component({
  selector: 'app-recibo-operacion-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialFormModule],
  templateUrl: './recibo-operacion-dialog.component.html',
  styleUrl: './recibo-operacion-dialog.component.scss',
})
export class ReciboOperacionDialogComponent {
  readonly NOMBRE_TIPO_OPERACION = NOMBRE_TIPO_OPERACION;

  constructor(
    private dialogRef: MatDialogRef<ReciboOperacionDialogComponent>,
    private impresion: ComprobanteImpresionService,
    private jasperReportes: JasperReportesService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: ReciboOperacionData
  ) {}

  @HostListener('document:keydown.control.p', ['$event'])
  atajoImprimir(evento: Event): void {
    evento.preventDefault();
    this.imprimir();
  }

  get titulo(): string {
    if (this.data.tipo === 'ANULACION') return 'Operación anulada';
    if (this.data.tipo === 'REGISTRO_APORTE') {
      return this.aportesRegistrados.length > 1 ? 'Aportes registrados' : 'Aporte registrado';
    }
    return `${NOMBRE_TIPO_OPERACION[this.data.tipo] ?? 'Operación'} aplicado`;
  }

  get aportesRegistrados(): ResultadoRegistroAporte[] {
    return this.data.aportesRegistrados ?? [];
  }

  get totalAportesRegistrados(): number {
    return +this.aportesRegistrados.reduce((s, a) => s + (a.valor ?? 0), 0).toFixed(2);
  }

  get idEvento(): number | null {
    return (
      this.data.pago?.idEvento ??
      this.data.abono?.idEvento ??
      this.data.precancelacion?.idEvento ??
      null
    );
  }

  get cuotas(): CuotaAfectada[] {
    return this.data.pago?.cuotasAfectadas ?? [];
  }

  get movimientos(): MovimientoAporte[] {
    return this.data.movimientosAporte ?? this.data.precancelacion?.movimientosAporte ?? [];
  }

  get totalAportes(): number {
    return this.movimientos.reduce((s, m) => s + Math.abs(m.valor ?? 0), 0);
  }

  /** Totales por columna del desglose, para el pie de la tabla. */
  get totales(): Record<string, number> {
    const claves = [
      'aplicadoDesgravamen',
      'aplicadoMora',
      'aplicadoInteresVencido',
      'aplicadoInteres',
      'aplicadoCapital',
      'aplicadoSeguro',
      'totalAplicado',
    ] as const;
    const acumulado: Record<string, number> = {};
    for (const clave of claves) {
      acumulado[clave] = this.cuotas.reduce((s, c) => s + (c[clave] ?? 0), 0);
    }
    return acumulado;
  }

  nombreEstadoCuota(estado: number): string {
    return NOMBRE_ESTADO_CUOTA[estado] ?? `Estado ${estado}`;
  }

  claseEstadoCuota(estado: number): string {
    return CLASE_ESTADO_CUOTA[estado] ?? 'est-pendiente';
  }

  nombreEstadoPrestamo(estado: number | undefined): string {
    if (estado == null) return '—';
    return NOMBRE_ESTADO_PRESTAMO[estado] ?? `Estado ${estado}`;
  }

  nombreTipoAporte(idTipoAporte: number): string {
    return this.data.nombresTipoAporte?.[idTipoAporte] ?? `Tipo ${idTipoAporte}`;
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  /**
   * Imprime el comprobante.
   *
   * Para un recibo de cobro (pago de cuotas) el documento oficial lo genera el backend con el
   * reporte Jasper `RPRT_CMPB_PGCT` —el mismo que se reimprime desde el ojo del detalle en
   * `participe-dash`—, un PDF por cada cuota afectada, con el logo del fondo. Para las operaciones
   * que no impactan cuotas (registro de aporte, anulación) se mantiene el documento HTML compartido
   * con `PrestamoPagosDialogComponent` vía `ComprobanteImpresionService`.
   */
  imprimir(): void {
    if (this.cuotas.length > 0) {
      this.imprimirComprobanteJasper();
      return;
    }
    this.imprimirDocumentoHtml();
  }

  /** Genera el comprobante Jasper `RPRT_CMPB_PGCT` (un PDF por cuota afectada por el cobro). */
  private imprimirComprobanteJasper(): void {
    const usuario = localStorage.getItem('username') || localStorage.getItem('userName') || '';

    this.snackBar.open('Generando comprobante...', '', { duration: 2000 });

    for (const cuota of this.cuotas) {
      const parametros = {
        P_DTPR_CODIGO: cuota.idCuota,
        P_IMAGEN: null,
        P_USUARIO: usuario,
      };

      this.jasperReportes.generar('crd', 'RPRT_CMPB_PGCT', parametros, 'PDF').subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `comprobante-cuota-${cuota.numeroCuota}.pdf`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        },
        error: () => {
          this.snackBar.open(
            `❌ No se pudo generar el comprobante de la cuota #${cuota.numeroCuota}`,
            'Cerrar',
            { duration: 5000 }
          );
        },
      });
    }
  }

  /**
   * Documento HTML de respaldo para operaciones sin cuota afectada. Lo arma
   * `ComprobanteImpresionService`, compartido con `PrestamoPagosDialogComponent`.
   */
  private imprimirDocumentoHtml(): void {
    const datos: { label: string; valor: string }[] = [];
    if (this.data.participante) datos.push({ label: 'Partícipe', valor: this.data.participante });
    if (this.idEvento != null) datos.push({ label: 'N° de operación', valor: String(this.idEvento) });
    if (this.data.fecha) datos.push({ label: 'Fecha', valor: this.data.fecha });
    for (const d of this.data.detalleExtra ?? []) datos.push(d);

    this.impresion.imprimir({
      titulo: this.titulo,
      subtitulo: this.data.tituloPrestamo,
      datos,
      mensaje: this.data.mensaje,
      filas: this.cuotas.map((c) => ({
        concepto: String(c.numeroCuota),
        estado: `${this.nombreEstadoCuota(c.estadoAnterior)} → ${this.nombreEstadoCuota(c.estadoNuevo)}`,
        desgravamen: c.aplicadoDesgravamen,
        mora: c.aplicadoMora,
        interesVencido: c.aplicadoInteresVencido,
        interes: c.aplicadoInteres,
        capital: c.aplicadoCapital,
        seguro: c.aplicadoSeguro,
        total: c.totalAplicado,
      })),
      aportes: this.movimientos.map((m) => ({
        nombre: this.nombreTipoAporte(m.idTipoAporte),
        valor: Math.abs(m.valor),
      })),
    });
  }
}

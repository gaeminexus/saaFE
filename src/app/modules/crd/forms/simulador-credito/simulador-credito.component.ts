import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { guardarArchivo, mensajeReporteFallido } from '../../../../shared/services/descarga-reporte';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../shared/services/funciones-datos.service';
import { NOMBRE_TIPO_AMORTIZACION } from '../../model/pagos/catalogos-pago';
import { mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { SolicitudReporteSimulacion } from '../../model/simuladores/reporte-simulacion';
import {
  ParametrosAmortizacion,
  ResultadoSimulacionCreditoNuevo,
} from '../../model/simuladores/simulador-credito-nuevo';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';

/**
 * Simulador de crédito nuevo (§7 de `docs/crd/PLAN-SIMULADORES-PRESTAMOS.md`, fase 4).
 *
 * Solo datos financieros → tabla de amortización proyectada. **No escribe nada**: no guarda un
 * `Prestamo`, no genera `CRD.DTPR`. Es una herramienta de consulta y negociación con el socio, así
 * que el aviso de que es referencial y sin valor contractual va siempre visible en pantalla, no
 * solo en el PDF (§4.6 y §8 del plan).
 *
 * ⚠️ El backend de este contrato todavía no existe al momento de escribir esta pantalla: se
 * construyó contra el contrato documentado en la §7 del plan, sin poder probarla contra el
 * servidor real.
 */
@Component({
  selector: 'app-simulador-credito',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './simulador-credito.component.html',
  styleUrl: './simulador-credito.component.scss',
})
export class SimuladorCreditoComponent {
  private servicio = inject(OperacionesPagoPrestamoService);
  private funcionesDatos = inject(FuncionesDatosService);

  /** Tipo de amortización: literal del backend, sin catálogo (§2.2 del plan). */
  readonly opcionesAmortizacion = Object.entries(NOMBRE_TIPO_AMORTIZACION).map(([valor, texto]) => ({
    valor: Number(valor),
    texto,
  }));

  readonly columnasTabla = ['numeroCuota', 'fechaVencimiento', 'capital', 'interes', 'cuota', 'totalCuota', 'saldoCapital'];

  // ---- formulario: los 6 primeros son obligatorios, los 2 últimos no (§7 del plan) ----
  monto: number | null = null;
  tasaAnual: number | null = null;
  plazo: number | null = null;
  tipoAmortizacion = 1;
  fechaInicio: Date | null = new Date();
  tieneCuotaCero = false;
  desgravamenPorCuota: number | null = null;
  seguroIncendioPorCuota: number | null = null;

  simulando = signal(false);
  resultado = signal<ResultadoSimulacionCreditoNuevo | null>(null);
  errorMensaje = signal<string | null>(null);
  errorCodigo = signal<string | null>(null);

  /**
   * Bandera única para habilitar "Exportar PDF" (fase 6 del plan).
   *
   * Habilitada el 2026-08-25, cuando se cumplieron sus dos precondiciones: el WAR con
   * `POST /prst/simulacion/reporte` (fase 3) desplegado, y los 3 `.jasper` compilados y
   * commiteados (fase 3b). Antes de eso el endpoint devolvía 500 — ver §9 de
   * docs/crd/PLAN-SIMULADORES-PRESTAMOS.md.
   */
  readonly exportarPdfHabilitado = true;
  exportandoPdf = signal(false);
  errorPdf = signal<string | null>(null);

  /** Los últimos dos campos son opcionales: sin ellos el simulador mostraría una cuota menor
   * que la que el socio va a pagar de verdad, pero no impiden simular (§4.6 del plan). */
  get puedeSimular(): boolean {
    return (
      this.monto != null && this.monto > 0 &&
      this.tasaAnual != null && this.tasaAnual >= 0 &&
      this.plazo != null && this.plazo > 0 &&
      !!this.fechaInicio &&
      !this.simulando()
    );
  }

  simular(): void {
    if (!this.puedeSimular) return;
    this.errorMensaje.set(null);
    this.errorCodigo.set(null);
    this.simulando.set(true);
    this.resultado.set(null);

    const parametros: ParametrosAmortizacion = {
      monto: this.monto ?? 0,
      tasaAnual: this.tasaAnual ?? 0,
      plazo: this.plazo ?? 0,
      tipoAmortizacion: this.tipoAmortizacion,
      fechaInicio: this.fechaInicioParaBackend(),
      tieneCuotaCero: this.tieneCuotaCero,
      desgravamenPorCuota: this.desgravamenPorCuota ?? 0,
      seguroIncendioPorCuota: this.seguroIncendioPorCuota ?? 0,
    };

    this.servicio.simularCreditoNuevo(parametros).subscribe((resp) => {
      this.simulando.set(false);
      if (resp.exito && resp.resultado) {
        this.resultado.set(resp.resultado);
      } else {
        this.resultado.set(null);
        this.errorCodigo.set(String(resp.error ?? ''));
        this.errorMensaje.set(mensajeDeRespuesta(resp));
      }
    });
  }

  /**
   * PDF de la simulación actual contra `POST /prst/simulacion/reporte` (§7 del plan). El backend
   * recalcula desde estos mismos parámetros — no se le manda la tabla que se ve en pantalla.
   */
  exportarPdf(): void {
    if (!this.exportarPdfHabilitado || !this.resultado() || this.exportandoPdf()) return;
    this.errorPdf.set(null);
    this.exportandoPdf.set(true);

    const solicitud: SolicitudReporteSimulacion = {
      tipo: 'CREDITO_NUEVO',
      creditoNuevo: {
        monto: this.monto ?? 0,
        tasaAnual: this.tasaAnual ?? 0,
        plazo: this.plazo ?? 0,
        tipoAmortizacion: this.tipoAmortizacion,
        fechaInicio: this.fechaInicioParaBackend(),
        tieneCuotaCero: this.tieneCuotaCero,
        desgravamenPorCuota: this.desgravamenPorCuota ?? 0,
        seguroIncendioPorCuota: this.seguroIncendioPorCuota ?? 0,
      },
    };

    this.servicio.reporteSimulacion(solicitud).subscribe({
      next: (blob) => {
        this.exportandoPdf.set(false);
        guardarArchivo(blob, 'simulacion-credito-nuevo.pdf');
      },
      error: (err) => {
        this.exportandoPdf.set(false);
        mensajeReporteFallido(err).then((mensaje) => this.errorPdf.set(mensaje));
      },
    });
  }

  nuevaSimulacion(): void {
    this.monto = null;
    this.tasaAnual = null;
    this.plazo = null;
    this.tipoAmortizacion = 1;
    this.fechaInicio = new Date();
    this.tieneCuotaCero = false;
    this.desgravamenPorCuota = null;
    this.seguroIncendioPorCuota = null;
    this.resultado.set(null);
    this.errorMensaje.set(null);
    this.errorCodigo.set(null);
  }

  // ================= presentación =================

  /**
   * `fechaVencimiento` llega como arreglo `[y,m,d,h,mi]` (Jackson descarta el offset en vez de
   * convertirlo): se normaliza SIEMPRE con `FuncionesDatosService`, nunca con el pipe `date` a
   * secas, que interpretaría el arreglo como fecha inválida.
   */
  formatFecha(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, 2) || '—';
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * `ParametrosAmortizacion.fechaInicio` es `LocalDateTime` en el backend, no `LocalDate`
   * (ver el comentario del modelo): viaja como `"yyyy-MM-ddT00:00:00"`, nunca `"yyyy-MM-dd"` a
   * secas ni un `Date` de JavaScript. `OperacionesPagoPrestamoService.formatearFecha()` da
   * `LocalDate` (`yyyy-MM-dd`) y no sirve acá — ese formato es el que causó el
   * `InvalidFormatException` en WildFly.
   */
  private fechaInicioParaBackend(): string | null {
    return this.funcionesDatos.formatearFechaParaBackend(this.fechaInicio, TipoFormatoFechaBackend.FECHA_HORA_ISO);
  }
}

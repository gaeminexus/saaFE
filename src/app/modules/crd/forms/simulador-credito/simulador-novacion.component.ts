import { CommonModule } from '@angular/common';
import { Component, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { guardarArchivo, mensajeReporteFallido } from '../../../../shared/services/descarga-reporte';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { formatearMoneda } from '../../../../shared/utils/moneda.util';
import { ResultadoSimulacionNovacion, cuotaTotalPrimera } from '../../model/evaluacion-otorgamiento';
import { mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { SolicitudReporteSimulacion } from '../../model/simuladores/reporte-simulacion';
import { PrestamoSustituible } from '../../model/prestamo-sustituible';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';
import { PrestamoService } from '../../service/prestamo.service';
import { EvaluacionOtorgamientoPanelComponent } from '../evaluacion-otorgamiento-panel/evaluacion-otorgamiento-panel.component';
import { ParticipeElegido, ParticipeSelectorComponent } from '../participe-selector/participe-selector.component';

/**
 * Simulador de novación (DISENO-SOLICITUD-V1 §B6): el partícipe elige uno de sus quirografarios o
 * emergentes sustituibles, escribe monto y plazo, y ve cuota actual contra nueva, el valor de
 * sustitución (VS) con su desglose, el VALOR LÍQUIDO A RECIBIR, la tabla y el semáforo de capacidad y
 * cupo. No escribe nada. Los 422 del backend se muestran con su texto.
 */
@Component({
  selector: 'app-simulador-novacion',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialFormModule,
    ParticipeSelectorComponent,
    EvaluacionOtorgamientoPanelComponent,
  ],
  templateUrl: './simulador-novacion.component.html',
  styleUrl: './simulador-credito.component.scss',
})
export class SimuladorNovacionComponent {
  private prestamoService = inject(PrestamoService);
  private operaciones = inject(OperacionesPagoPrestamoService);
  private funcionesDatos = inject(FuncionesDatosService);

  @ViewChild(ParticipeSelectorComponent) selector?: ParticipeSelectorComponent;

  readonly columnasTabla = ['numeroCuota', 'fechaVencimiento', 'capital', 'interes', 'desgravamen', 'seguroIncendio', 'totalCuota', 'saldoCapital'];

  participe: ParticipeElegido | null = null;
  prestamos = signal<PrestamoSustituible[]>([]);
  cargandoPrestamos = signal(false);
  errorPrestamos = signal<string | null>(null);

  idOriginal: number | null = null;
  monto: number | null = null;
  plazo: number | null = null;

  simulando = signal(false);
  resultado = signal<ResultadoSimulacionNovacion | null>(null);
  errorMensaje = signal<string | null>(null);
  exportandoPdf = signal(false);
  errorPdf = signal<string | null>(null);

  get original(): PrestamoSustituible | null {
    return this.prestamos().find((p) => p.idPrestamo === this.idOriginal) ?? null;
  }

  get montoInvalido(): boolean {
    const o = this.original;
    return !!o && this.monto != null && this.monto > 0 && this.monto <= o.valorSustitucion;
  }

  get puedeSimular(): boolean {
    return (
      !!this.original?.puede &&
      this.monto != null && this.monto > 0 && !this.montoInvalido &&
      this.plazo != null && this.plazo > 0 &&
      !this.simulando()
    );
  }

  get cuotaNueva(): number {
    return cuotaTotalPrimera(this.resultado()?.simulacion);
  }

  alElegirParticipe(p: ParticipeElegido | null): void {
    this.participe = p;
    this.idOriginal = null;
    this.prestamos.set([]);
    this.errorPrestamos.set(null);
    this.limpiarResultado();
    if (!p) return;

    this.cargandoPrestamos.set(true);
    this.prestamoService
      .sustituibles(p.codigoEntidad, 'NOVACION')
      .pipe(finalize(() => this.cargandoPrestamos.set(false)))
      .subscribe({
        next: (lista) => {
          // Solo quirografarios y emergentes (codigoPetro PQ/PE); el backend valida igual.
          this.prestamos.set((lista || []).filter((s) => this.esQuirografarioOEmergente(s)));
          if (!this.prestamos().length) {
            this.errorPrestamos.set('El partícipe no tiene quirografarios ni emergentes para novar.');
          }
        },
        error: (err) =>
          this.errorPrestamos.set(
            err?.mensaje || (typeof err === 'string' ? err : null) || 'No se pudieron cargar los préstamos del partícipe'
          ),
      });
  }

  alElegirOriginal(): void {
    this.limpiarResultado();
  }

  simular(): void {
    if (!this.puedeSimular || this.idOriginal == null) return;
    this.limpiarResultado();
    this.simulando.set(true);
    this.operaciones
      .simularNovacion({ idPrestamoOriginal: this.idOriginal, monto: this.monto ?? 0, plazo: this.plazo ?? 0 })
      .pipe(finalize(() => this.simulando.set(false)))
      .subscribe((resp) => {
        if (resp.exito && resp.resultado) {
          this.resultado.set(resp.resultado);
        } else {
          this.errorMensaje.set(mensajeDeRespuesta(resp));
        }
      });
  }

  /** PDF de la novación simulada: el backend recalcula con los mismos datos que `simularNovacion`. */
  exportarPdf(): void {
    const r = this.resultado();
    if (!r || this.idOriginal == null || this.exportandoPdf()) return;
    this.errorPdf.set(null);
    this.exportandoPdf.set(true);

    const solicitud: SolicitudReporteSimulacion = {
      tipo: 'NOVACION',
      novacion: { idPrestamoOriginal: this.idOriginal, monto: this.monto ?? 0, plazo: this.plazo ?? 0 },
      nombreSocio: this.participe?.nombre ?? null,
      identificacionSocio: this.participe?.numeroIdentificacion ?? null,
    };

    this.operaciones.reporteSimulacion(solicitud).subscribe({
      next: (blob) => {
        this.exportandoPdf.set(false);
        guardarArchivo(blob, `simulacion-novacion-${r.original?.idAsoprep ?? this.idOriginal}.pdf`);
      },
      error: (err) => {
        this.exportandoPdf.set(false);
        mensajeReporteFallido(err).then((mensaje) => this.errorPdf.set(mensaje));
      },
    });
  }

  nuevaSimulacion(): void {
    this.selector?.limpiar();
    this.participe = null;
    this.prestamos.set([]);
    this.errorPrestamos.set(null);
    this.idOriginal = null;
    this.monto = null;
    this.plazo = null;
    this.limpiarResultado();
  }

  formatFecha(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, 2) || '—';
  }

  formatMoneda(n: number | null | undefined): string {
    return formatearMoneda(n);
  }

  private limpiarResultado(): void {
    this.resultado.set(null);
    this.errorMensaje.set(null);
    this.errorPdf.set(null);
  }

  /** Solo quirografarios (PQ) y emergentes (PE), por el código Petro del producto. */
  private esQuirografarioOEmergente(s: PrestamoSustituible): boolean {
    return s.codigoPetro === 'PQ' || s.codigoPetro === 'PE';
  }
}

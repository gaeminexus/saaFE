import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { ESTADO_PAGO_PROGRAMADO_LABELS, EstadoPagoProgramado } from '../../../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { etiquetaOrigenPagoExterno } from '../../../../cxp/model/origen-pago-externo';
import {
  ConfirmarManualResponse,
  PagoProgramado,
  RespuestaBancoResponse,
} from '../../../../cxp/model/pago-programado';
import { PagoProgramadoService } from '../../../../cxp/service/pago-programado.service';

/**
 * T3 del circuito de pagos por transferencia
 * (docs/pagos/PLAN-REORGANIZACION-CIRCUITO-PAGOS.md §3.2): junta las
 * antiguas pestañas "3. Cargar Respuesta del Banco" y "4. Confirmación
 * Manual" de PagosTransferenciaComponent (cxp) — son dos caminos para el
 * mismo hecho, que el banco pagó o no pagó.
 *
 * La confirmación manual va PRIMERO y más grande a propósito: el lector del
 * archivo de respuesta sigue siendo provisional (espera un Excel de 4
 * columnas armado a mano, no el formato nativo del banco) y la confirmación
 * manual es el camino principal, no un parche temporal — confirmado con el
 * usuario el 2026-08-28.
 */
@Component({
  selector: 'app-confirmacion-pagos',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './confirmacion.component.html',
  styleUrl: './confirmacion.component.scss',
})
export class ConfirmacionComponent implements OnInit {
  private pagoS = inject(PagoProgramadoService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  // ─── Confirmación manual (camino principal) ────────────
  pagosPorConfirmar = signal<PagoProgramado[]>([]);
  confSeleccionados = new Set<number>();
  confReferencia = '';
  confFecha: Date | null = new Date();
  confObservacion = '';
  cargandoPorConfirmar = signal(false);
  confirmandoManual = signal(false);
  confError = signal('');
  confResultado = signal<ConfirmarManualResponse | null>(null);
  readonly columnasConfirmacion = ['check', 'proveedor', 'factura', 'valor', 'fechaProgramada', 'estado'];

  // ─── Cargar respuesta del banco (provisional) ──────────
  respIdLote: number | null = null;
  archivoRespuesta: File | null = null;
  subiendoRespuesta = signal(false);
  respError = signal('');
  respResultado = signal<RespuestaBancoResponse | null>(null);

  ngOnInit(): void {
    const idLote = this.route.snapshot.queryParamMap.get('idLote');
    if (idLote) this.respIdLote = +idLote;
    this.cargarPagosPorConfirmar();
  }

  // ═══ CONFIRMACIÓN MANUAL ═════════════════════════════════

  /**
   * Pagos que siguen esperando al banco: Registrado (aún sin archivo) o
   * En archivo (ya enviado). Los débitos automáticos no entran porque nacen
   * confirmados y ya tienen su contabilidad.
   */
  cargarPagosPorConfirmar(): void {
    this.cargandoPorConfirmar.set(true);
    this.confError.set('');
    this.confSeleccionados.clear();

    this.pagoS.listar(this.idEmpresaSesion()).subscribe({
      next: (data) => {
        this.pagosPorConfirmar.set(
          (data ?? []).filter(
            (p) => !this.esDebitoAutomatico(p)
              && (p.estado === EstadoPagoProgramado.REGISTRADO
                || p.estado === EstadoPagoProgramado.EN_ARCHIVO)
          )
        );
        this.cargandoPorConfirmar.set(false);
      },
      error: (err: Error) => {
        this.pagosPorConfirmar.set([]);
        this.cargandoPorConfirmar.set(false);
        this.confError.set(err.message);
      },
    });
  }

  estaSeleccionadoConf(pago: PagoProgramado): boolean {
    return this.confSeleccionados.has(pago.id);
  }

  alternarSeleccionConf(pago: PagoProgramado): void {
    if (this.confSeleccionados.has(pago.id)) {
      this.confSeleccionados.delete(pago.id);
    } else {
      this.confSeleccionados.add(pago.id);
    }
  }

  get todosSeleccionadosConf(): boolean {
    const filas = this.pagosPorConfirmar();
    return filas.length > 0 && filas.every((p) => this.confSeleccionados.has(p.id));
  }

  alternarTodosConf(): void {
    if (this.todosSeleccionadosConf) {
      this.confSeleccionados.clear();
    } else {
      this.pagosPorConfirmar().forEach((p) => this.confSeleccionados.add(p.id));
    }
  }

  get totalSeleccionadoConf(): number {
    return this.pagosPorConfirmar()
      .filter((p) => this.confSeleccionados.has(p.id))
      .reduce((suma, p) => suma + (Number(p.valor) || 0), 0);
  }

  get puedeConfirmarManual(): boolean {
    return this.confSeleccionados.size > 0 && !!this.confFecha && !this.confirmandoManual();
  }

  /**
   * Confirmar genera contabilidad irreversible salvo reversión expresa, así que
   * se pide una confirmación explícita antes de lanzarla.
   */
  confirmarPagosManualmente(): void {
    if (!this.puedeConfirmarManual) return;

    const cantidad = this.confSeleccionados.size;
    const total = this.totalSeleccionadoConf.toFixed(2);
    const data: MotivoDialogData = {
      titulo: `Confirmar ${cantidad} pago(s) manualmente`,
      advertencia:
        `Se dará por pagado un total de $${total} como si el banco lo hubiera confirmado: `
        + 'se abona la factura y se generan el asiento contable y el movimiento bancario. '
        + 'Hágalo solo con los pagos que ya verificó en el estado de cuenta. Para deshacerlo '
        + 'habrá que revertir cada pago desde Consulta y gestión.',
      textoConfirmar: 'Sí, confirmar y contabilizar',
      requiereDobleConfirmacion: true,
      textoDobleConfirmacion: 'Verifiqué en el estado de cuenta que estos pagos se ejecutaron.',
    };

    this.dialog.open(MotivoDialogComponent, { width: '540px', data }).afterClosed().subscribe((motivo) => {
      if (!motivo) return;
      this.ejecutarConfirmacionManual(motivo);
    });
  }

  /** El motivo del diálogo se guarda como parte de la observación del pago. */
  private ejecutarConfirmacionManual(motivo: string): void {
    this.confirmandoManual.set(true);
    this.confError.set('');
    this.confResultado.set(null);

    const nota = [this.confObservacion.trim(), motivo].filter((t) => !!t).join(' | ');

    this.pagoS.confirmarManual({
      idsPagos: Array.from(this.confSeleccionados),
      referencia: this.confReferencia.trim() || undefined,
      fechaPago: this.fechaISO(this.confFecha),
      observacion: `Confirmación manual: ${nota}`,
      idUsuario: this.idUsuarioSesion(),
    }).subscribe({
      next: (resp) => {
        this.confirmandoManual.set(false);
        this.confResultado.set(resp);
        this.confReferencia = '';
        this.confObservacion = '';
        this.cargarPagosPorConfirmar();
        this.snackBar.open(resp.mensaje ?? 'Pagos confirmados.', 'Cerrar', { duration: 6000 });
      },
      error: (err: Error) => {
        this.confirmandoManual.set(false);
        this.confError.set(err.message);
      },
    });
  }

  // ═══ CARGAR RESPUESTA DEL BANCO (provisional) ═══════════

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoRespuesta = input.files?.length ? input.files[0] : null;
    this.respResultado.set(null);
    this.respError.set('');
  }

  get puedeSubirRespuesta(): boolean {
    return !!this.respIdLote && !!this.archivoRespuesta && !this.subiendoRespuesta();
  }

  /** El endpoint recibe el archivo como binario crudo, no como multipart. */
  async subirRespuesta(): Promise<void> {
    if (!this.puedeSubirRespuesta || !this.archivoRespuesta || !this.respIdLote) return;

    this.subiendoRespuesta.set(true);
    this.respError.set('');
    this.respResultado.set(null);

    try {
      const buffer = await this.archivoRespuesta.arrayBuffer();
      this.pagoS.cargarRespuesta(this.respIdLote, this.idUsuarioSesion(), buffer).subscribe({
        next: (resp) => {
          this.subiendoRespuesta.set(false);
          this.respResultado.set(resp);
          this.cargarPagosPorConfirmar();
          this.snackBar.open(resp.mensaje ?? 'Respuesta procesada.', 'Cerrar', { duration: 5000 });
        },
        error: (err: Error) => {
          this.subiendoRespuesta.set(false);
          this.respError.set(err.message);
        },
      });
    } catch {
      this.subiendoRespuesta.set(false);
      this.respError.set('No se pudo leer el archivo seleccionado.');
    }
  }

  // ═══ HELPERS ════════════════════════════════════════════

  formatearFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  conceptoPago(pago: PagoProgramado): string {
    if (pago.origenExterno) {
      const etiqueta = etiquetaOrigenPagoExterno(pago.origenExterno);
      return pago.idOrigen != null ? `${etiqueta} #${pago.idOrigen}` : etiqueta;
    }
    return pago.facturaCompra?.numero || pago.egreso?.descripcion || '—';
  }

  nombreBeneficiario(pago: PagoProgramado): string {
    return pago.titular?.nombre || pago.beneficiarioNombre || '—';
  }

  etiquetaEstado(estado: number): { texto: string; clase: string } {
    return ESTADO_PAGO_PROGRAMADO_LABELS[estado] ?? { texto: `Estado ${estado}`, clase: 'badge-neutro' };
  }

  /** El banco lo debitó por convenio: nació confirmado y sin lote. */
  private esDebitoAutomatico(pago: PagoProgramado): boolean {
    return Number(pago.debitoAutomatico) === 1;
  }

  private fechaISO(fecha: Date | null): string | undefined {
    if (!fecha) return undefined;
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return undefined;
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  private idEmpresaSesion(): number {
    return +(sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa') || '0');
  }

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }
}

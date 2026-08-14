import { CommonModule } from '@angular/common';
import { Component, Inject, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MotivoDialogComponent } from '../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import {
  ICONO_TIPO_OPERACION,
  NOMBRE_ESTADO_PRESTAMO,
  NOMBRE_TIPO_OPERACION,
} from '../../model/pagos/catalogos-pago';
import { EventoPrestamo, HistDetallePrestamo } from '../../model/pagos/operaciones-pago';
import { mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { EventoPrestamoService } from '../../service/evento-prestamo.service';
import { HistDetallePrestamoService } from '../../service/hist-detalle-prestamo.service';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';
import { ContextoPrestamo, SalidaDialogoPago } from './contexto-prestamo';

/**
 * Historial de operaciones de pago del préstamo y anulación de la más reciente (§10-§11 y flujo E
 * de la guía).
 *
 * La anulación es LIFO: el backend rechaza anular un evento si hay operaciones posteriores
 * vigentes, así que el botón solo aparece en el primer evento vigente de la lista (la lista viene
 * del más reciente al más antiguo).
 */
@Component({
  selector: 'app-historial-operaciones-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialFormModule],
  templateUrl: './historial-operaciones-dialog.component.html',
  styleUrl: './historial-operaciones-dialog.component.scss',
})
export class HistorialOperacionesDialogComponent {
  private eventoService = inject(EventoPrestamoService);
  private histService = inject(HistDetallePrestamoService);
  private operaciones = inject(OperacionesPagoPrestamoService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly NOMBRE_TIPO_OPERACION = NOMBRE_TIPO_OPERACION;

  cargando = signal(false);
  anulando = signal<number | null>(null);
  eventos = signal<EventoPrestamo[]>([]);
  errorCarga = signal<string | null>(null);
  avisoAnulacion = signal<string | null>(null);

  /** idEvento → cuotas historizadas por ese abono; se cargan por demanda al expandir la fila. */
  historicoPorEvento = signal<Record<number, HistDetallePrestamo[]>>({});
  eventoExpandido = signal<number | null>(null);
  cargandoHistorico = signal(false);

  /** Hubo al menos una anulación en esta sesión del diálogo: la pantalla debe recargar. */
  private huboCambios = false;
  private ultimaAnulacion: SalidaDialogoPago | null = null;

  /**
   * Regla LIFO: solo el evento vigente más reciente es anulable. Los eventos vienen ordenados del
   * más nuevo al más antiguo, así que es el primero con `estado === 1`.
   */
  codigoAnulable = computed(() => this.eventos().find((e) => Number(e.estado) === 1)?.codigo ?? null);

  totalVigentes = computed(() => this.eventos().filter((e) => Number(e.estado) === 1).length);

  constructor(
    private dialogRef: MatDialogRef<HistorialOperacionesDialogComponent, SalidaDialogoPago | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: ContextoPrestamo
  ) {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.eventoService.porPrestamo(this.data.idPrestamo).subscribe({
      next: (eventos) => {
        this.cargando.set(false);
        this.eventos.set(eventos ?? []);
      },
      error: () => {
        this.cargando.set(false);
        this.eventos.set([]);
        this.errorCarga.set('No se pudo cargar el historial de operaciones de este préstamo.');
      },
    });
  }

  // ================= anulación =================

  anular(evento: EventoPrestamo): void {
    const nombre = NOMBRE_TIPO_OPERACION[evento.tipoOperacion] ?? evento.tipoOperacion;

    this.dialog
      .open(MotivoDialogComponent, {
        data: {
          titulo: `Anular ${nombre.toLowerCase()} #${evento.codigo}`,
          advertencia: this.advertenciaPorTipo(evento.tipoOperacion, evento.valor),
          textoConfirmar: 'Anular operación',
          requiereDobleConfirmacion: true,
          textoDobleConfirmacion: 'Entiendo que esta acción revierte los pagos y movimientos ya registrados.',
        },
        width: '520px',
        maxWidth: '95vw',
      })
      .afterClosed()
      .subscribe((motivo: string | null | undefined) => {
        if (!motivo) return;
        this.ejecutarAnulacion(evento, motivo);
      });
  }

  private ejecutarAnulacion(evento: EventoPrestamo, motivo: string): void {
    this.anulando.set(evento.codigo);
    this.avisoAnulacion.set(null);

    this.operaciones
      .anularOperacion({ idEvento: evento.codigo, usuario: usuarioSesion(), motivo })
      .subscribe((resp) => {
        this.anulando.set(null);

        if (resp.exito && resp.resultado) {
          this.huboCambios = true;
          // Anular un ABONO_CAPITAL vuelve a cambiar los códigos de cuota (se re-insertan desde
          // el histórico), así que la tabla de amortización de la pantalla queda inválida.
          this.ultimaAnulacion = { accion: 'anulado', recargarTabla: true, anulacion: resp.resultado };
          this.snackBar.open(resp.mensaje ?? 'Operación anulada correctamente.', 'Cerrar', { duration: 5000 });
          this.cargar();
          return;
        }

        this.avisoAnulacion.set(mensajeDeRespuesta(resp));
        // El historial que ve el usuario ya no refleja la realidad del servidor.
        if (resp.error === 'EVENTO_YA_ANULADO' || resp.error === 'EVENTO_POSTERIOR_VIGENTE') {
          this.cargar();
        }
      });
  }

  private advertenciaPorTipo(tipo: string, valor: number): string {
    const monto = this.formatMoneda(valor);
    switch (tipo) {
      case 'PAGO_MANUAL':
        return `Se anularán los pagos por ${monto} y las cuotas volverán al estado que tenían (pendiente, en mora o parcial).`;
      case 'PAGO_APORTES':
        return `Se anularán los pagos por ${monto} y el saldo de aportes del partícipe volverá a subir con un contra-movimiento.`;
      case 'ABONO_CAPITAL':
        return `Se borrará la tabla recalculada, se restaurarán las cuotas originales desde el histórico y se devolverán el plazo y el valor de cuota anteriores. Los códigos de las cuotas cambiarán.`;
      case 'PRECANCELACION':
        return `Se anularán los pagos por ${monto}, las cuotas canceladas anticipadamente volverán a pendiente/en mora y el préstamo se reabrirá como vigente.`;
      default:
        return `Se revertirá la operación por ${monto}.`;
    }
  }

  // ================= histórico de cuotas de un abono =================

  toggleHistorico(evento: EventoPrestamo): void {
    if (this.eventoExpandido() === evento.codigo) {
      this.eventoExpandido.set(null);
      return;
    }
    this.eventoExpandido.set(evento.codigo);

    if (this.historicoPorEvento()[evento.codigo]) return;

    this.cargandoHistorico.set(true);
    this.histService.porEvento(evento.codigo).subscribe({
      next: (cuotas) => {
        this.cargandoHistorico.set(false);
        this.historicoPorEvento.update((mapa) => ({ ...mapa, [evento.codigo]: cuotas ?? [] }));
      },
      error: () => {
        this.cargandoHistorico.set(false);
        this.historicoPorEvento.update((mapa) => ({ ...mapa, [evento.codigo]: [] }));
      },
    });
  }

  historicoDe(codigo: number): HistDetallePrestamo[] {
    return this.historicoPorEvento()[codigo] ?? [];
  }

  // ================= presentación =================

  nombreTipo(tipo: string): string {
    return NOMBRE_TIPO_OPERACION[tipo] ?? tipo;
  }

  iconoTipo(tipo: string): string {
    return ICONO_TIPO_OPERACION[tipo] ?? 'receipt_long';
  }

  nombreEstadoPrestamo(estado: number | null | undefined): string {
    if (estado == null) return '—';
    return NOMBRE_ESTADO_PRESTAMO[estado] ?? `Estado ${estado}`;
  }

  /**
   * Las fechas llegan como LocalDateTime de Java en cualquiera de sus tres formas (arreglo,
   * string o Date), por eso pasan siempre por el normalizador compartido.
   */
  fechaLegible(fecha: unknown): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d || isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  esAbonoCapital(evento: EventoPrestamo): boolean {
    return evento.tipoOperacion === 'ABONO_CAPITAL';
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  cerrar(): void {
    this.dialogRef.close(this.huboCambios && this.ultimaAnulacion ? this.ultimaAnulacion : undefined);
  }
}

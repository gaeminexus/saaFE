import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { InlineAutocompleteComponent } from '../../comunes/inline-autocomplete/inline-autocomplete.component';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { empresaSesionCodigo } from '../../../../../shared/services/empresa-sesion';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import {
  DetalleOrdenBeneficioSocial,
  ESTADO_LIQUIDACION_BENEFICIO_SOCIAL_LABELS,
  EstadoOrdenBeneficioSocial,
  FiltrosListarOrdenesBeneficioSocial,
  OrdenBeneficioSocialListado,
  TIPO_BENEFICIO_SOCIAL_LABELS,
  TipoBeneficioSocial,
} from '../../../model/orden-beneficio-social';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { OrdenBeneficioSocialService } from '../../../service/orden-beneficio-social.service';
import { LiquidacionBeneficioSocialService } from '../../../service/liquidacion-beneficio-social.service';
import { aniosDisponibles } from '../../parametrizacion/utiles-parametrizacion';
import { aValorDeInput } from '../../asistencia/utiles-asistencia';
import { opcionesAviso } from '../../comunes/avisos';

type EstadoVisualOrden =
  | 'generada'
  | 'esperando-tesoreria'
  | 'pagada-sin-contabilizar'
  | 'pagada'
  | 'anulada';

const ESTADO_VISUAL_LABELS: Record<EstadoVisualOrden, string> = {
  generada: 'Generada',
  'esperando-tesoreria': 'Enviada a tesorería',
  'pagada-sin-contabilizar': 'Pagado por tesorería · pendiente de contabilizar',
  pagada: 'Pagada',
  anulada: 'Anulada',
};

/**
 * Pago de beneficios sociales (décimos acumulados y fondos de reserva): agrupa las liquidaciones
 * sueltas (`RHH.LQBS`) en una orden (`RHH.ODBS`), la envía a tesorería y, una vez que tesorería
 * confirma el pago, la contabiliza dando de baja la provisión. Contrato:
 * `docs/rrh/API-PAGO-BENEFICIOS-SOCIALES.md`.
 *
 * **La trampa central (contrato §3.2):** confirmar el pago en tesorería NO contabiliza — hasta
 * que no se llame `confirmarPago`, la provisión sigue viva. Por eso el estado `2
 * ENVIADA_A_TESORERIA` se pinta de dos formas distintas según `estadoPagoTexto`: neutro mientras
 * tesorería no pagó, y **ámbar, nunca verde**, cuando ya pagó pero falta contabilizar. Solo
 * `3 PAGADA` es verde.
 */
@Component({
  selector: 'app-pago-beneficios-sociales',
  standalone: true,
  imports: [CommonModule, MaterialFormModule, InlineAutocompleteComponent],
  templateUrl: './pago-beneficios-sociales.component.html',
  styleUrls: ['./pago-beneficios-sociales.component.scss'],
})
export class PagoBeneficiosSocialesComponent implements OnInit {
  private ordenService = inject(OrdenBeneficioSocialService);
  private liquidacionService = inject(LiquidacionBeneficioSocialService);
  private detalleRubroService = inject(DetalleRubroService);
  private funcionesDatosS = inject(FuncionesDatosService);
  private appState = inject(AppStateService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly TipoBeneficioSocial = TipoBeneficioSocial;
  readonly tiposBeneficio = Object.entries(TIPO_BENEFICIO_SOCIAL_LABELS).map(([codigo, texto]) => ({
    codigo: Number(codigo),
    texto,
  }));

  anios = aniosDisponibles();
  anio = signal<number>(new Date().getFullYear());
  tipoBeneficio = signal<number | null>(null);
  region = signal<number | null>(null);
  regiones = signal<DetalleRubro[]>([]);

  ordenes = signal<OrdenBeneficioSocialListado[]>([]);
  filaAbierta = signal<OrdenBeneficioSocialListado | null>(null);
  ordenAbierta = signal<DetalleOrdenBeneficioSocial | null>(null);
  fechaPago = signal<string>(aValorDeInput(new Date()));

  cargando = signal<boolean>(false);
  cargandoDetalle = signal<boolean>(false);
  calculando = signal<boolean>(false);
  generando = signal<boolean>(false);
  /** `idOrden` de la fila con una acción en curso — deshabilita solo sus botones, no toda la tabla. */
  procesando = signal<number | null>(null);

  /**
   * Se puso en `true` tras un "Calcular liquidaciones" exitoso para la combinación actual
   * (año/tipo/región) y se resetea apenas cambia cualquiera de esos tres — es una guarda de
   * sesión, liviana a propósito: no hay endpoint para preguntarle al backend "¿hay liquidaciones
   * sueltas pendientes de agrupar?", así que no se pretende más certeza de la que se tiene. Sólo
   * evita el caso más común (apretar "Generar orden" sin haber calculado nunca en esta sesión);
   * no reemplaza la respuesta real del backend, que sigue siendo la fuente de verdad.
   */
  hayCalculoReciente = signal<boolean>(false);

  readonly etiquetaAnio = (a: number): string => String(a ?? '');
  readonly etiquetaRegion = (r: DetalleRubro): string => r.descripcion;
  readonly valorRegion = (r: DetalleRubro): number => r.codigoAlterno;

  columnasOrden = ['numero', 'region', 'emision', 'empleados', 'total', 'estado', 'acciones'];
  columnasDetalle = ['empleado', 'periodo', 'baseCalculo', 'dias', 'valor', 'situacion'];

  /** Paso 1: calcular. Sólo pide región cuando hace falta — igual que "Generar orden". */
  puedeCalcular = computed(() => {
    if (this.calculando()) return false;
    const tipo = this.tipoBeneficio();
    if (tipo === null) return false;
    if (tipo === TipoBeneficioSocial.DECIMO_CUARTO && this.region() === null) return false;
    return true;
  });

  /** Paso 2: agrupar en una orden. Exige haber calculado antes en esta sesión (ver `hayCalculoReciente`). */
  puedeGenerar = computed(() => {
    if (this.generando()) return false;
    if (!this.hayCalculoReciente()) return false;
    const tipo = this.tipoBeneficio();
    if (tipo === null) return false;
    if (tipo === TipoBeneficioSocial.DECIMO_CUARTO && this.region() === null) return false;
    return true;
  });

  /** Orden ya viva (no anulada) para el año/tipo/región actuales — para avisar antes de que el usuario intente generar otra. */
  ordenViva = computed(() => {
    const tipo = this.tipoBeneficio();
    if (tipo === null) return null;
    const region = tipo === TipoBeneficioSocial.DECIMO_CUARTO ? this.region() : null;
    return (
      this.ordenes().find((o) => {
        if (Number(o.estado) === EstadoOrdenBeneficioSocial.ANULADA) return false;
        if (region !== null && o.region !== region) return false;
        return true;
      }) ?? null
    );
  });

  ngOnInit(): void {
    this.regiones.set(this.detalleRubroService.getDetallesByParent(RubrosRrh.REGION_DECIMO_CUARTO));
  }

  onAnioChange(anio: number): void {
    this.anio.set(anio);
    this.hayCalculoReciente.set(false);
    this.recargar();
  }

  onTipoBeneficioChange(tipo: number | null): void {
    this.tipoBeneficio.set(tipo);
    if (tipo !== TipoBeneficioSocial.DECIMO_CUARTO) this.region.set(null);
    this.hayCalculoReciente.set(false);
    this.recargar();
  }

  onRegionChange(region: number | null): void {
    this.region.set(region);
    this.hayCalculoReciente.set(false);
  }

  // ─── Carga ─────────────────────────────────────────────────────────────────

  private idEmpresaActual(): number | null {
    return empresaSesionCodigo() ?? this.appState.getEmpresa()?.codigo ?? null;
  }

  private filtrosActuales(): FiltrosListarOrdenesBeneficioSocial | null {
    const idEmpresa = this.idEmpresaActual();
    const tipo = this.tipoBeneficio();
    if (!idEmpresa || tipo === null) return null;
    return { idEmpresa, anio: this.anio(), tipoBeneficio: tipo };
  }

  private recargar(reabrirIdOrden?: number): void {
    const filtros = this.filtrosActuales();
    if (!filtros) {
      this.ordenes.set([]);
      this.cerrarDetalle();
      return;
    }

    this.cargando.set(true);
    this.ordenService.listar(filtros).subscribe({
      next: (data) => {
        this.cargando.set(false);
        this.ordenes.set(data ?? []);

        if (reabrirIdOrden != null) {
          const fila = this.ordenes().find((o) => o.idOrden === reabrirIdOrden);
          if (fila) this.verDetalle(fila);
          else this.cerrarDetalle();
        }
      },
      error: (err) => {
        this.cargando.set(false);
        this.ordenes.set([]);
        this.avisar(mensajeDeError(err, 'No se pudieron cargar las órdenes.'), true);
      },
    });
  }

  // ─── Procesos ──────────────────────────────────────────────────────────────

  /**
   * Paso 1: calcula/actualiza las liquidaciones sueltas (RHH.LQBS) del año/tipo/región elegidos.
   * Antes de esto, "Generar orden" siempre respondía "no hay liquidaciones pendientes" — no
   * calculaba nada, sólo agrupaba lo que ya existiera (2026-09-08, defecto reportado: el usuario
   * no podía pagar los décimos cuartos porque este paso nunca se llamaba desde la pantalla).
   * Idempotente en el backend (`BeneficioSocialServiceImpl`): recalcular no duplica ni pisa lo ya
   * pagado, así que no hace falta pedir confirmación para repetirlo.
   */
  calcular(): void {
    if (!this.puedeCalcular()) return;

    const idEmpresa = this.idEmpresaActual();
    if (!idEmpresa) {
      this.avisar('No se pudo determinar la empresa de la sesión.', true);
      return;
    }

    const tipo = this.tipoBeneficio()!;
    const datos = {
      idEmpresa,
      anio: this.anio(),
      region: tipo === TipoBeneficioSocial.DECIMO_CUARTO ? this.region()! : undefined,
      usuarioRegistro: usuarioSesion(),
    };

    this.calculando.set(true);
    const llamada =
      tipo === TipoBeneficioSocial.DECIMO_TERCERO
        ? this.liquidacionService.generarDecimoTercero(datos)
        : tipo === TipoBeneficioSocial.DECIMO_CUARTO
          ? this.liquidacionService.generarDecimoCuarto(datos)
          : this.liquidacionService.generarFondosReserva(datos);

    llamada.subscribe({
      next: (generados) => {
        this.calculando.set(false);
        this.hayCalculoReciente.set(true);
        this.avisar(`Se calcularon ${generados} liquidación(es).`);
        this.recargar();
      },
      error: (err) => {
        this.calculando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudieron calcular las liquidaciones.'), true);
      },
    });
  }

  generar(): void {
    if (!this.puedeGenerar()) return;

    const idEmpresa = this.idEmpresaActual();
    if (!idEmpresa) {
      this.avisar('No se pudo determinar la empresa de la sesión.', true);
      return;
    }

    const tipo = this.tipoBeneficio()!;

    this.generando.set(true);
    this.ordenService
      .generar({
        idEmpresa,
        tipoBeneficio: tipo,
        anio: this.anio(),
        region: tipo === TipoBeneficioSocial.DECIMO_CUARTO ? this.region() : null,
        usuario: usuarioSesion(),
      })
      .subscribe({
        next: (res) => {
          this.generando.set(false);

          if (res.exito) {
            this.avisar(res.mensaje || `Orden ${res.numero} generada.`);
            this.recargar();
            return;
          }

          // exito: false con HTTP 200 — estilo de la casa (contrato §3.1). No es un error del
          // transporte: puede ser "no hay liquidaciones pendientes" o "ya existe una orden viva".
          this.avisar(res.mensaje, false);
          if (res.idOrdenExistente != null) this.recargar(res.idOrdenExistente);
        },
        error: (err) => {
          this.generando.set(false);
          this.avisar(mensajeDeError(err, 'No se pudo generar la orden.'), true);
        },
      });
  }

  puedeEnviarATesoreria(row: OrdenBeneficioSocialListado): boolean {
    return Number(row.estado) === EstadoOrdenBeneficioSocial.GENERADA;
  }

  enviarATesoreria(row: OrdenBeneficioSocialListado): void {
    if (!this.puedeEnviarATesoreria(row) || this.procesando() !== null) return;

    const data: ConfirmDialogData = {
      title: 'Enviar a tesorería',
      message: `Se registrará el pago de la orden ${row.numero} en la bandeja de tesorería. Tesorería asigna cuenta y forma de pago; esto no contabiliza todavía.`,
      type: 'warning',
      confirmText: 'Sí, enviar',
      details: [
        { label: 'Empleados', value: String(row.numeroEmpleados) },
        { label: 'Total', value: this.formatoMoneda(row.total) },
      ],
    };

    this.dialog
      .open(ConfirmDialogComponent, { width: '480px', data })
      .afterClosed()
      .subscribe((confirmado: boolean) => {
        if (!confirmado) return;

        const idUsuario = this.appState.getIdUsuario();
        if (!idUsuario) {
          this.avisar('No se pudo determinar el usuario de la sesión.', true);
          return;
        }

        this.procesando.set(row.idOrden);
        this.ordenService
          .enviarATesoreria(row.idOrden, {
            idUsuario,
            observacion: `${row.tipoBeneficioTexto} acumulado ${row.anio}`,
          })
          .subscribe({
            next: (res) => {
              this.procesando.set(null);
              if (res.exito === false) {
                this.avisar(res.mensaje, true);
                return;
              }
              this.avisar(res.mensaje || 'Orden enviada a tesorería.');
              this.recargar(row.idOrden);
            },
            error: (err) => {
              this.procesando.set(null);
              this.avisar(mensajeDeError(err, 'No se pudo enviar la orden a tesorería.'), true);
            },
          });
      });
  }

  puedeConfirmarPago(row: OrdenBeneficioSocialListado): boolean {
    return (
      Number(row.estado) === EstadoOrdenBeneficioSocial.ENVIADA_A_TESORERIA &&
      row.estadoPagoTexto === 'CONFIRMADO'
    );
  }

  confirmarPago(row: OrdenBeneficioSocialListado): void {
    if (!this.puedeConfirmarPago(row) || this.procesando() !== null) return;
    if (!this.fechaPago()) {
      this.avisar('Indique la fecha con la que se contabiliza el pago.', true);
      return;
    }

    this.procesando.set(row.idOrden);
    this.ordenService
      .confirmarPago(row.idOrden, { fechaPago: this.fechaPago(), usuario: usuarioSesion() })
      .subscribe({
        next: (res) => {
          this.procesando.set(null);
          if (res.exito === false) {
            this.avisar(res.mensaje, true);
            return;
          }
          this.avisar(res.mensaje || `Pago confirmado. Asiento ${res.numeroAsiento}.`);
          this.recargar();
        },
        error: (err) => {
          this.procesando.set(null);
          this.avisar(mensajeDeError(err, 'No se pudo confirmar el pago.'), true);
        },
      });
  }

  puedeAnular(row: OrdenBeneficioSocialListado): boolean {
    const estado = Number(row.estado);
    return (
      estado === EstadoOrdenBeneficioSocial.GENERADA ||
      estado === EstadoOrdenBeneficioSocial.ENVIADA_A_TESORERIA
    );
  }

  anular(row: OrdenBeneficioSocialListado): void {
    if (!this.puedeAnular(row) || this.procesando() !== null) return;

    const data: MotivoDialogData = {
      titulo: `Anular orden ${row.numero}`,
      advertencia: `Se anulará la orden de ${row.tipoBeneficioTexto} ${row.anio} por ${this.formatoMoneda(row.total)}. Las liquidaciones vuelven a quedar sueltas para agruparse en otra orden.`,
      textoConfirmar: 'Sí, anular',
    };

    this.dialog
      .open(MotivoDialogComponent, { width: '480px', data })
      .afterClosed()
      .subscribe((motivo: string | null) => {
        if (!motivo) return;

        this.procesando.set(row.idOrden);
        this.ordenService.anular(row.idOrden, { motivo, usuario: usuarioSesion() }).subscribe({
          next: () => {
            this.procesando.set(null);
            this.avisar('Orden anulada.');
            this.recargar();
          },
          error: (err) => {
            this.procesando.set(null);
            this.avisar(mensajeDeError(err, 'No se pudo anular la orden.'), true);
          },
        });
      });
  }

  // ─── Detalle ───────────────────────────────────────────────────────────────

  verDetalle(row: OrdenBeneficioSocialListado): void {
    this.filaAbierta.set(row);
    this.cargandoDetalle.set(true);
    this.ordenService.detalle(row.idOrden).subscribe({
      next: (detalle) => {
        this.cargandoDetalle.set(false);
        this.ordenAbierta.set(detalle);
      },
      error: (err) => {
        this.cargandoDetalle.set(false);
        this.filaAbierta.set(null);
        this.avisar(mensajeDeError(err, 'No se pudo cargar el detalle de la orden.'), true);
      },
    });
  }

  cerrarDetalle(): void {
    this.filaAbierta.set(null);
    this.ordenAbierta.set(null);
  }

  // ─── Presentación ──────────────────────────────────────────────────────────

  /**
   * Los tres estados visuales de la trampa 2 (contrato §3.2). `estadoPagoTexto` solo lo trae la
   * fila de `/odbs/listar` (§1.3bis) — `GET /odbs/detalle/{id}` (§1.3) no lo repite — así que se
   * lee siempre de la fila (`filaAbierta`/`OrdenBeneficioSocialListado`), nunca del detalle.
   */
  estadoVisual(estado: number, estadoPagoTexto: string | null | undefined): EstadoVisualOrden {
    const e = Number(estado);
    if (e === EstadoOrdenBeneficioSocial.ANULADA) return 'anulada';
    if (e === EstadoOrdenBeneficioSocial.PAGADA) return 'pagada';
    if (e === EstadoOrdenBeneficioSocial.GENERADA) return 'generada';
    return estadoPagoTexto === 'CONFIRMADO' ? 'pagada-sin-contabilizar' : 'esperando-tesoreria';
  }

  estadoVisualLabel(estado: number, estadoPagoTexto: string | null | undefined): string {
    return ESTADO_VISUAL_LABELS[this.estadoVisual(estado, estadoPagoTexto)];
  }

  estadoLiquidacionLabel(estado: number): string {
    return ESTADO_LIQUIDACION_BENEFICIO_SOCIAL_LABELS[Number(estado)] || `Estado ${estado}`;
  }

  regionLabel(codigoAlterno: number | null): string {
    if (codigoAlterno === null) return '—';
    return this.regiones().find((r) => r.codigoAlterno === codigoAlterno)?.descripcion ?? `Región ${codigoAlterno}`;
  }

  fechaDisplay(fecha: unknown): string {
    return this.funcionesDatosS.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA) || '—';
  }

  formatoMoneda(valor: number | null | undefined): string {
    return (Number(valor) || 0).toFixed(2);
  }

  empleadoLabel(nombreEmpleado: string, identificacion: string): string {
    return `${identificacion} - ${nombreEmpleado}`.trim();
  }

  periodoLiquidacion(fechaInicio: unknown, fechaFin: unknown): string {
    return `${this.fechaDisplay(fechaInicio)} — ${this.fechaDisplay(fechaFin)}`;
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', opcionesAviso(esError, mensaje));
  }
}

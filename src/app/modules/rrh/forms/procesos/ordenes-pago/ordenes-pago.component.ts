import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { guardarArchivo } from '../../../../../shared/services/descarga-reporte';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { CuentaBancaria } from '../../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../../tsr/service/cuenta-bancaria.service';
import { ESTADOS_GENERA_ORDEN_PAGO, estadoEn } from '../../../model/estados-nomina';
import {
  DetalleOrdenPagoNomina,
  ESTADO_DETALLE_ORDEN_PAGO_LABELS,
  EstadoDetalleOrdenPago,
  EstadoOrdenPagoNomina,
  OrdenPagoNomina,
} from '../../../model/orden-pago-nomina';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { DetalleOrdenPagoNominaService } from '../../../service/detalle-orden-pago.service';
import { OrdenPagoNominaService } from '../../../service/orden-pago-nomina.service';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import {
  aniosDisponibles,
  criteriosPorEmpresa,
  filtrarPorAnio,
} from '../../parametrizacion/utiles-parametrizacion';
import { aValorDeInput } from '../../asistencia/utiles-asistencia';
import { opcionesAviso } from '../../comunes/avisos';
import { InlineAutocompleteComponent } from '../../comunes/inline-autocomplete/inline-autocomplete.component';

/**
 * Órdenes de pago de la nómina (RHH.RDPG) y su detalle por colaborador (RHH.DRPG).
 *
 * El ciclo es: generar sobre un período → descargar el archivo bancario → subirlo a la banca
 * electrónica → confirmar la acreditación con la fecha real en que el banco pagó.
 *
 * **Los datos bancarios del detalle son un snapshot**, no los del empleado hoy: se copiaron al
 * generar la orden y quedan como constancia de a qué cuenta se ordenó pagar. La pantalla lo dice
 * explícitamente para que nadie los confunda con la ficha vigente.
 */
@Component({
  selector: 'app-ordenes-pago',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTableModule,
    MatTooltipModule,
    InlineAutocompleteComponent,
  ],
  templateUrl: './ordenes-pago.component.html',
  styleUrls: ['./ordenes-pago.component.scss'],
})
export class OrdenesPagoComponent implements OnInit {
  private appState = inject(AppStateService);

  columnasOrden = ['numero', 'emision', 'cuenta', 'empleados', 'total', 'estado', 'acciones'];
  columnasDetalle = ['beneficiario', 'identificacion', 'banco', 'cuenta', 'valor', 'situacion'];

  anios = aniosDisponibles();
  anio = signal<number>(new Date().getFullYear());
  periodos = signal<PeriodoNomina[]>([]);
  periodoSeleccionado = signal<number | null>(null);
  cuentas = signal<CuentaBancaria[]>([]);
  cuentaSeleccionada = signal<number | null>(null);

  ordenes = signal<any[]>([]);
  ordenAbierta = signal<OrdenPagoNomina | null>(null);
  detalle = signal<any[]>([]);
  fechaAcreditacion = signal<string>(aValorDeInput(new Date()));

  cargando = signal<boolean>(false);
  ocupado = signal<boolean>(false);

  periodoActual = computed(
    () => this.periodos().find((p) => p.codigo === this.periodoSeleccionado()) ?? null,
  );

  /**
   * Verificado contra `GeneracionOrdenPagoService`: admite APROBADO, CONTABILIZADO y PAGADO.
   * La lista vive en `estados-nomina.ts`; no se deduce del mensaje de error.
   */
  puedeGenerar = computed(
    () =>
      estadoEn(this.periodoActual(), ESTADOS_GENERA_ORDEN_PAGO) &&
      this.cuentaSeleccionada() !== null,
  );

  /**
   * Cuando el botón está gris por el ESTADO del período (no por falta de cuenta), antes no decía
   * nada — el usuario se quedaba mirando un botón deshabilitado sin explicación (2026-09-08,
   * reporte de usuario: cerró el período antes de generar la orden). `null` mientras
   * `periodoActual()` no cargó todavía, para no parpadear una pista falsa.
   */
  pistaEstadoNoHabilita = computed(() => {
    const periodo = this.periodoActual();
    if (!periodo) return null;
    if (estadoEn(periodo, ESTADOS_GENERA_ORDEN_PAGO)) return null;

    const actual = this.estadoPeriodoLabel(periodo);
    const permitidos = this.textoEstadosPermitidos();
    return `El período está ${actual}. La orden de pago se genera con el período ${permitidos}.`;
  });

  totalDetalle = computed(() =>
    this.detalle().reduce((suma, fila) => suma + Number(fila.valor ?? 0), 0),
  );

  rechazados = computed(() => this.detalle().filter((f) => f.rechazado === 'S').length);

  /** `idDetalle` de la fila con un reenvío en curso — deshabilita solo su botón, no toda la tabla. */
  reenviando = signal<number | null>(null);
  sincronizando = signal<boolean>(false);

  constructor(
    private ordenService: OrdenPagoNominaService,
    private detalleService: DetalleOrdenPagoNominaService,
    private periodoService: PeriodoNominaService,
    private cuentaService: CuentaBancariaService,
    private detalleRubroService: DetalleRubroService,
    private exportService: ExportService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarPeriodos();
    this.cargarCuentas();
  }

  onAnioChange(anio: number): void {
    this.anio.set(anio);
    this.periodoSeleccionado.set(null);
    this.ordenes.set([]);
    this.cerrarDetalle();
    this.cargarPeriodos();
  }

  private cargarPeriodos(): void {
    this.periodoService.selectByCriteria(criteriosPorEmpresa('mes')).subscribe({
      next: (data) => this.periodos.set(filtrarPorAnio(data, this.anio())),
      error: () => {
        this.periodos.set([]);
        this.avisar('No se pudieron cargar los períodos de nómina', true);
      },
    });
  }

  /** La cuenta de la que sale el dinero: es de tesorería, no del módulo. */
  private cargarCuentas(): void {
    this.cuentaService.getAll().subscribe({
      next: (data) => this.cuentas.set((data ?? []).filter((c) => Number(c.estado) === 1)),
      error: () => {
        this.cuentas.set([]);
        this.avisar('No se pudieron cargar las cuentas bancarias de la empresa', true);
      },
    });
  }

  onPeriodoChange(codigo: number | null): void {
    this.periodoSeleccionado.set(codigo);
    this.cerrarDetalle();

    if (codigo === null) {
      this.ordenes.set([]);
      return;
    }

    this.cargando.set(true);
    this.ordenService.selectByCriteria(this.criteriosDelPeriodo(codigo)).subscribe({
      next: (data) => {
        this.cargando.set(false);
        this.ordenes.set(this.formatearOrdenes(data ?? []));
      },
      error: () => {
        this.cargando.set(false);
        this.ordenes.set([]);
        this.avisar('No se pudieron cargar las órdenes de pago', true);
      },
    });
  }

  // ─── Procesos ──────────────────────────────────────────────────────────────

  generar(): void {
    if (!this.puedeGenerar() || this.ocupado()) return;

    const idUsuario = this.appState.getIdUsuario();
    if (!idUsuario) {
      this.avisar('No se pudo determinar el usuario de la sesión.', true);
      return;
    }

    this.ocupado.set(true);
    this.ordenService
      .generar(this.periodoSeleccionado()!, this.cuentaSeleccionada()!, idUsuario)
      .subscribe({
        next: (orden) => {
          this.ocupado.set(false);
          this.avisar(`Orden ${orden?.numero ?? ''} generada.`);
          this.onPeriodoChange(this.periodoSeleccionado());
        },
        error: (err) => {
          this.ocupado.set(false);
          // Un empleado sin cuenta activa detiene la orden y el backend devuelve su nombre
          this.avisar(this.mensajeDeError(err, 'No se pudo generar la orden de pago.'), true);
        },
      });
  }

  descargarArchivo(orden: any): void {
    this.ocupado.set(true);
    this.ordenService.archivoBancario(orden.codigo).subscribe({
      next: (blob) => {
        this.ocupado.set(false);
        guardarArchivo(blob, `orden-pago-${orden.numero || orden.codigo}.txt`);
      },
      error: async (err) => {
        this.ocupado.set(false);
        this.avisar(await this.mensajeDeBlob(err), true);
      },
    });
  }

  confirmar(orden: any): void {
    if (!this.fechaAcreditacion()) {
      this.avisar('Indique la fecha en que el banco acreditó el pago.', true);
      return;
    }

    const idUsuario = this.appState.getIdUsuario();
    if (!idUsuario) {
      this.avisar('No se pudo determinar el usuario de la sesión.', true);
      return;
    }

    this.ocupado.set(true);
    this.ordenService.confirmar(orden.codigo, this.fechaAcreditacion(), idUsuario).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.avisar('Acreditación confirmada.');
        this.onPeriodoChange(this.periodoSeleccionado());
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(this.mensajeDeError(err, 'No se pudo confirmar la acreditación.'), true);
      },
    });
  }

  /**
   * «Actualizar pagos» — consulta en Tesorería el último pago de cada DRPG PENDIENTE (contrato
   * §3.3). Sólo aplica a las órdenes nuevas (un pago por empleado); no se ofrece todavía desde la
   * plantilla porque el contrato no da una forma de distinguir una orden nueva de una vieja antes
   * de abrir su detalle (ver reporte BLOQUEADO al árbitro) — queda lista para conectar.
   */
  actualizarPagos(orden: OrdenPagoNomina): void {
    if (this.sincronizando()) return;

    this.sincronizando.set(true);
    this.ordenService.sincronizarPagos(orden.codigo).subscribe({
      next: () => {
        this.sincronizando.set(false);
        this.avisar('Pagos actualizados.');
        this.onPeriodoChange(this.periodoSeleccionado());
        if (this.ordenAbierta()?.codigo === orden.codigo) this.verDetalle(orden);
      },
      error: (err) => {
        this.sincronizando.set(false);
        this.avisar(this.mensajeDeError(err, 'No se pudieron actualizar los pagos.'), true);
      },
    });
  }

  // ─── Detalle ───────────────────────────────────────────────────────────────

  verDetalle(orden: OrdenPagoNomina): void {
    this.ordenAbierta.set(orden);
    this.detalleService.selectByCriteria(this.criteriosDeLaOrden(orden.codigo)).subscribe({
      next: (data) => this.detalle.set(this.formatearDetalle(data ?? [])),
      error: () => {
        this.detalle.set([]);
        this.avisar('No se pudo cargar el detalle de la orden', true);
      },
    });
  }

  cerrarDetalle(): void {
    this.ordenAbierta.set(null);
    this.detalle.set([]);
  }

  puedeReenviar(fila: DetalleOrdenPagoNomina): boolean {
    return Number(fila.estado) === EstadoDetalleOrdenPago.RECHAZADO;
  }

  /**
   * «Reenviar» (contrato §3.4): sólo sobre un DRPG RECHAZADO. Relee la cuenta activa actual del
   * empleado — por eso la confirmación recuerda corregirla primero en la ficha, no en esta
   * pantalla, que sólo muestra el snapshot del pago anterior.
   */
  reenviar(fila: DetalleOrdenPagoNomina): void {
    if (!this.puedeReenviar(fila) || this.reenviando() !== null) return;

    const data: ConfirmDialogData = {
      title: 'Reenviar pago',
      message:
        `Se registrará un pago nuevo para ${fila.nombreBeneficiario} por ${Number(fila.valor ?? 0).toFixed(2)}, ` +
        'leyendo la cuenta bancaria activa del colaborador en este momento.\n\n' +
        'Corrija primero la cuenta bancaria del colaborador en su ficha si el rechazo fue por un dato bancario incorrecto.',
      type: 'warning',
      confirmText: 'Sí, reenviar',
      details: fila.motivoRechazo ? [{ label: 'Motivo del rechazo', value: fila.motivoRechazo }] : [],
    };

    this.dialog
      .open(ConfirmDialogComponent, { width: '520px', data })
      .afterClosed()
      .subscribe((confirmado: boolean) => {
        if (!confirmado) return;

        const idUsuario = this.appState.getIdUsuario();
        if (!idUsuario) {
          this.avisar('No se pudo determinar el usuario de la sesión.', true);
          return;
        }

        this.reenviando.set(fila.codigo);
        this.detalleService.reenviar(fila.codigo, idUsuario).subscribe({
          next: () => {
            this.reenviando.set(null);
            this.avisar('Pago reenviado.');
            const orden = this.ordenAbierta();
            if (orden) this.verDetalle(orden);
          },
          error: (err) => {
            this.reenviando.set(null);
            this.avisar(this.mensajeDeError(err, 'No se pudo reenviar el pago.'), true);
          },
        });
      });
  }

  private criteriosDelPeriodo(idPeriodo: number): DatosBusqueda[] {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'periodoNomina',
      'codigo',
      idPeriodo.toString(),
      TipoComandosBusqueda.IGUAL,
    );

    const orden = new DatosBusqueda();
    orden.orderBy('numero');

    return [db, orden];
  }

  private criteriosDeLaOrden(idOrden: number): DatosBusqueda[] {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'ordenPagoNomina',
      'codigo',
      idOrden.toString(),
      TipoComandosBusqueda.IGUAL,
    );

    const orden = new DatosBusqueda();
    orden.orderBy('codigo');

    return [db, orden];
  }

  private formatearOrdenes(registros: OrdenPagoNomina[]): any[] {
    return registros.map((row) => ({
      ...row,
      estadoLabel: this.estadoOrdenLabel(row.estado),
      tonoEstado: this.tonoEstadoOrden(row.estado),
      cuentaLabel: this.etiquetaCuenta(row.cuentaBancaria),
      acreditada: !!row.fechaAcreditacion,
    }));
  }

  /**
   * `pagoPorEmpleado` ausente se trata como `false` (contrato §4): así un backend viejo, que
   * todavía no manda el campo, deja la pantalla exactamente como está hoy. Nunca `!orden.x`
   * negado a mano — `=== true` explícito, mismo criterio que `tieneCuentaDestino` en cxp.
   */
  esOrdenNueva(orden: OrdenPagoNomina | null): boolean {
    return orden?.pagoPorEmpleado === true;
  }

  /**
   * «Pagada parcialmente» en vez del nombre de la constante (contrato §5) para
   * `RECHAZADA_PARCIAL`; Generada y Confirmada siguen con el texto del rubro 208, sin cambios.
   */
  private estadoOrdenLabel(estado: number): string {
    if (Number(estado) === EstadoOrdenPagoNomina.RECHAZADA_PARCIAL) return 'Pagada parcialmente';
    return (
      this.detalleRubroService.getDescripcionByParentAndAlterno(RubrosRrh.ESTADO_ORDEN_PAGO, estado) || '—'
    );
  }

  private tonoEstadoOrden(estado: number): 'ok' | 'aviso' | 'neutro' {
    const e = Number(estado);
    if (e === EstadoOrdenPagoNomina.CONFIRMADA) return 'ok';
    if (e === EstadoOrdenPagoNomina.RECHAZADA_PARCIAL) return 'aviso';
    return 'neutro';
  }

  private formatearDetalle(registros: DetalleOrdenPagoNomina[]): any[] {
    return registros.map((row) => ({
      ...row,
      tipoCuentaLabel:
        this.detalleRubroService.getDescripcionByParentAndAlterno(
          RubrosRrh.TIPO_CUENTA_BANCARIA,
          row.tipoCuenta,
        ) || '—',
      estadoPagoLabel: ESTADO_DETALLE_ORDEN_PAGO_LABELS[Number(row.estado)] || `Estado ${row.estado}`,
      tonoEstadoPago: this.tonoEstadoPago(row.estado),
    }));
  }

  private tonoEstadoPago(estado: number): 'ok' | 'error' | 'neutro' {
    const e = Number(estado);
    if (e === EstadoDetalleOrdenPago.PAGADO) return 'ok';
    if (e === EstadoDetalleOrdenPago.RECHAZADO) return 'error';
    return 'neutro';
  }

  /** Reusa el mismo catálogo que `PeriodosNominaComponent.estadoLabel` (rubro 182) — no duplica el switch de textos. */
  estadoPeriodoLabel(periodo: PeriodoNomina | null): string {
    if (!periodo) return '—';
    return (
      this.detalleRubroService.getDescripcionByParentAndAlterno(
        RubrosRrh.ESTADO_PERIODO_NOMINA,
        periodo.estado,
      ) || '—'
    );
  }

  /** "APROBADO, CONTABILIZADO o PAGADO" — arma la lista desde el catálogo, no un literal aparte que se desincronice de `ESTADOS_GENERA_ORDEN_PAGO`. */
  private textoEstadosPermitidos(): string {
    const nombres = ESTADOS_GENERA_ORDEN_PAGO.map(
      (estado) =>
        this.detalleRubroService.getDescripcionByParentAndAlterno(
          RubrosRrh.ESTADO_PERIODO_NOMINA,
          estado,
        ) || '',
    ).filter((nombre) => !!nombre);

    if (nombres.length === 0) return '';
    if (nombres.length === 1) return nombres[0];
    return `${nombres.slice(0, -1).join(', ')} o ${nombres[nombres.length - 1]}`;
  }

  etiquetaCuenta(cuenta: any): string {
    if (!cuenta) return '—';
    const banco = cuenta.banco?.nombre ?? '';
    return `${banco} ${cuenta.numeroCuenta ?? ''}`.trim() || '—';
  }

  etiquetaPeriodo(periodo: PeriodoNomina): string {
    return `${periodo.mes}/${periodo.anio}`;
  }

  readonly etiquetaAnio = (a: number): string => String(a ?? '');
  readonly valorPeriodo = (p: PeriodoNomina): number => p.codigo;
  readonly buscarPorPeriodo = (p: PeriodoNomina): string[] => [String(p.mes), String(p.anio)];
  readonly valorCuenta = (c: CuentaBancaria): number => c.codigo;
  readonly buscarPorCuenta = (c: CuentaBancaria): string[] => [c.banco?.nombre ?? '', c.numeroCuenta ?? ''];

  exportarCsv(): void {
    this.exportService.exportToCSV(
      this.detalle(),
      `orden-pago-${this.ordenAbierta()?.numero ?? ''}`,
      ['Beneficiario', 'Identificación', 'Banco', 'Cuenta', 'Tipo', 'Valor'],
      ['nombreBeneficiario', 'identificacion', 'banco', 'numeroCuenta', 'tipoCuentaLabel', 'valor'],
    );
  }

  private mensajeDeError(error: any, generico: string): string {
    if (typeof error === 'string' && error.trim()) return error;
    return error?.mensaje || error?.message || generico;
  }

  /** El archivo bancario se pide como `blob`, así que su error también llega como `blob`. */
  private async mensajeDeBlob(error: any): Promise<string> {
    const cuerpo = error?.error;
    if (cuerpo instanceof Blob) {
      try {
        const texto = (await cuerpo.text()).trim();
        if (texto) {
          try {
            const obj = JSON.parse(texto);
            return obj?.mensaje || obj?.message || texto;
          } catch {
            return texto;
          }
        }
      } catch {
        /* se cae al genérico */
      }
    }
    return this.mensajeDeError(cuerpo ?? error, 'No se pudo descargar el archivo bancario.');
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(esError, mensaje),
    });
  }
}

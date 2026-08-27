import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubro } from '../../../../shared/model/detalle-rubro';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { CuentaBancaria } from '../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../tsr/service/cuenta-bancaria.service';

import { CuentaBancariaParticipe } from '../../model/cuenta-bancaria-participe';
import {
  CLASE_ESTADO_DEVOLUCION,
  ICONO_ESTADO_DEVOLUCION,
  TOLERANCIA_DEVOLUCION,
  nombreEstadoDevolucion,
  puedeAnularse,
} from '../../model/devolucion/catalogos-devolucion';
import {
  DetalleSolicitudDevolucion,
  DeudaVigenteParticipe,
  DevolucionListado,
  SolicitudDevolucion,
} from '../../model/devolucion/devolucion-aporte';
import { mensajeDeRespuestaDevolucion } from '../../model/devolucion/respuesta-devolucion';
import { Entidad } from '../../model/entidad';
import { SaldoAporte } from '../../model/pagos/operaciones-pago';
import { mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { CuentaBancariaParticipeService } from '../../service/cuenta-bancaria-participe.service';
import { DevolucionAporteService } from '../../service/devolucion-aporte.service';
import { EntidadService } from '../../service/entidad.service';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';
import {
  ConfirmarDevolucionDialogComponent,
  LineaConfirmacionDevolucion,
} from './confirmar-devolucion-dialog.component';

/** Saldo disponible de un tipo de aporte y cuánto se decide devolver de él. */
interface SaldoDevolucion {
  idTipoAporte: number;
  nombre: string;
  saldo: number;
  texto: string;
}

/** Rubro del catálogo de tipos de cuenta bancaria (el mismo que usa Pagos por Transferencia). */
const RUBRO_TIPO_CUENTA_BANCARIA = 23;

/**
 * Devolución de aportes a un partícipe.
 *
 * Registra la salida de dinero de los aportes: el backend genera las filas NEGATIVAS en CRD.APRT
 * y dispara una orden de pago en Cuentas por Pagar, donde el dinero se paga y se contabiliza.
 * Cuando el pago queda confirmado, CRD marca la devolución como PAGADA — pero eso lo descubre
 * consultando, no porque CXP avise: por eso una devolución puede quedar en EN PAGO un rato.
 *
 * Dos reglas que no se negocian:
 *
 * - **El saldo nunca se calcula acá.** Sale de `GET /aprt/saldosPorEntidad/{id}`, que lo agrega
 *   en la base de datos, y tras registrar se vuelve a pedir al backend en vez de restarlo en
 *   memoria. Bajar CRD.APRT son ~980.000 filas y tumba el servidor.
 * - **La fecha viaja como string `yyyy-MM-dd`.** Es un `LocalDate` y el backend serializa con
 *   Jackson, que descarta el offset de zona en vez de convertirlo: un `Date` crudo se grabaría
 *   con la hora —y a veces el día— equivocados, sin ningún error.
 */
@Component({
  selector: 'app-devolucion-aportes',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './devolucion-aportes.component.html',
  styleUrl: './devolucion-aportes.component.scss',
})
export class DevolucionAportesComponent {
  private entidadService = inject(EntidadService);
  private operaciones = inject(OperacionesPagoPrestamoService);
  private devolucionService = inject(DevolucionAporteService);
  private cuentaParticipeService = inject(CuentaBancariaParticipeService);
  private cuentaBancariaService = inject(CuentaBancariaService);
  private detalleRubroService = inject(DetalleRubroService);
  private funcionesDatos = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  /** Tope del datepicker: el backend rechaza una fecha futura (`FECHA_INVALIDA`). */
  readonly hoy = new Date();

  // ---- búsqueda de partícipe (mismo bloque que Cruce de Valores) ----
  criterioIdentificacion = '';
  criterioRolPetro = '';
  criterioNombre = '';
  buscando = signal(false);
  resultados = signal<Entidad[]>([]);
  mostrandoResultados = signal(false);
  entidadSeleccionada = signal<Entidad | null>(null);

  // ---- saldos por tipo de aporte ----
  cargandoSaldos = signal(false);
  saldos: SaldoDevolucion[] = [];
  // Las filas de `saldos` se mutan directamente (el input del monto escribe sobre `texto`), así
  // que este contador es el que fuerza a los computed() a recalcular.
  private saldosVersion = signal(0);

  // ---- destino y origen del dinero ----
  cargandoCuentasParticipe = signal(false);
  cuentasParticipe = signal<CuentaBancariaParticipe[]>([]);
  // Signals, no propiedades planas: `puedeRegistrar()` las lee dentro de un `computed()` y
  // solo una escritura por signal.set() lo invalida. Con una propiedad plana mutada por
  // [(ngModel)] el computed queda con el valor cacheado de la última vez que SÍ cambió algún
  // signal (p. ej. al escribir el monto) y el botón "Registrar" se queda deshabilitado para
  // siempre aunque el usuario ya haya elegido cuenta destino y origen — el defecto real detrás
  // del pedido 5.
  cuentaParticipeSeleccionada = signal<CuentaBancariaParticipe | null>(null);
  filtroCuentaParticipe = '';

  cuentasPropias = signal<CuentaBancaria[]>([]);
  cuentaOrigenSeleccionada = signal<CuentaBancaria | null>(null);
  filtroCuentaOrigen = '';

  private tiposCuentaBancaria = signal<DetalleRubro[]>([]);

  /**
   * Deuda vigente del partícipe. Solo se usa para avisar en el diálogo de confirmación: no
   * bloquea nada, no entra en `puedeRegistrar()` y no viaja en la solicitud.
   */
  deudaVigente = signal<DeudaVigenteParticipe | null>(null);

  /**
   * `true` cuando `GET /dvap/deudaVigente` falló o respondió `exito: false`: hay que
   * distinguirlo de "no tiene deuda" (§6.5 del plan, ratificado por el árbitro). Tampoco
   * bloquea nada: es una tercera línea informativa en el diálogo de confirmación.
   */
  deudaConsultaFallida = signal(false);

  fecha = signal<Date>(new Date());
  motivo = '';
  debitoAutomatico = false;
  referencia = '';

  registrando = signal(false);

  // ---- historial ----
  cargandoHistorial = signal(false);
  historial = signal<DevolucionListado[]>([]);
  anulandoId = signal<number | null>(null);

  constructor() {
    this.cargarCuentasPropias();
    this.cargarTiposCuentaBancaria();
  }

  // ================= totales =================

  saldoDisponibleTotal = computed(() => {
    this.saldosVersion();
    return +this.saldos.reduce((s, f) => s + Math.max(f.saldo, 0), 0).toFixed(2);
  });

  totalADevolver = computed(() => {
    this.saldosVersion();
    return +this.saldos.reduce((s, f) => s + this.parseMoneda(f.texto), 0).toFixed(2);
  });

  hayExcesoEnAlgunTipo = computed(() => {
    this.saldosVersion();
    return this.saldos.some((f) => this.parseMoneda(f.texto) > f.saldo + TOLERANCIA_DEVOLUCION);
  });

  /**
   * Sin una cuenta bancaria activa del partícipe no se deja registrar, ni siquiera en débito
   * automático: es la regla de la §7 del plan, y el dinero tiene que tener a dónde ir.
   */
  participeSinCuentaActiva = computed(
    () =>
      !!this.entidadSeleccionada() &&
      !this.cargandoCuentasParticipe() &&
      this.cuentasParticipe().length === 0
  );

  puedeRegistrar = computed(
    () =>
      !!this.entidadSeleccionada() &&
      this.totalADevolver() > 0.004 &&
      !this.hayExcesoEnAlgunTipo() &&
      !this.participeSinCuentaActiva() &&
      !!this.cuentaParticipeSeleccionada() &&
      !!this.cuentaOrigenSeleccionada() &&
      !this.registrando()
  );

  /**
   * Por qué "Registrar" está deshabilitado, para mostrar junto al botón (pedido 5): un botón
   * muerto sin explicación es el mismo defecto que uno que no reacciona. Los dos casos con
   * tarjeta propia (sin cuenta activa, monto por encima del saldo) no se repiten acá.
   */
  motivoNoPuedeRegistrar = computed<string | null>(() => {
    if (this.registrando() || !this.entidadSeleccionada()) return null;
    if (this.participeSinCuentaActiva() || this.hayExcesoEnAlgunTipo()) return null;

    const faltantes: string[] = [];
    if (this.totalADevolver() <= 0.004) faltantes.push('ingrese el monto a devolver');
    if (!this.cuentaParticipeSeleccionada()) faltantes.push('elija la cuenta del partícipe (destino)');
    if (!this.cuentaOrigenSeleccionada()) faltantes.push('elija la cuenta bancaria propia (origen)');

    return faltantes.length ? 'Para registrar la devolución, ' + faltantes.join(' y ') + '.' : null;
  });

  // ================= búsqueda =================

  buscar(): void {
    const criterios: DatosBusqueda[] = [];

    if (this.criterioIdentificacion.trim()) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'numeroIdentificacion', this.criterioIdentificacion.trim(), TipoComandosBusqueda.IGUAL);
      criterios.push(c);
    } else if (this.criterioRolPetro.trim()) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'rolPetroComercial', this.criterioRolPetro.trim(), TipoComandosBusqueda.IGUAL);
      criterios.push(c);
    } else if (this.criterioNombre.trim()) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'razonSocial', this.criterioNombre.trim(), TipoComandosBusqueda.LIKE);
      criterios.push(c);
    } else {
      this.snackBar.open('Ingrese al menos un criterio de búsqueda.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.buscando.set(true);
    this.entidadService.selectByCriteria(criterios).subscribe({
      next: (entidades) => {
        this.buscando.set(false);
        this.resultados.set(entidades ?? []);
        this.mostrandoResultados.set(true);
        this.entidadSeleccionada.set(null);
        if (!entidades || entidades.length === 0) {
          this.snackBar.open('No se encontraron coincidencias.', 'Cerrar', { duration: 3000 });
        }
      },
      error: () => {
        this.buscando.set(false);
        this.snackBar.open('Ocurrió un error al buscar. Intente nuevamente.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  seleccionarEntidad(entidad: Entidad): void {
    this.entidadSeleccionada.set(entidad);
    this.mostrandoResultados.set(false);
    this.cargarDatosParticipe(entidad);
  }

  volverABuscar(): void {
    this.mostrandoResultados.set(true);
    this.entidadSeleccionada.set(null);
  }

  private cargarDatosParticipe(entidad: Entidad): void {
    this.saldos = [];
    this.saldosVersion.update((v) => v + 1);
    this.cuentasParticipe.set([]);
    this.cuentaParticipeSeleccionada.set(null);
    this.cuentaOrigenSeleccionada.set(null);
    this.filtroCuentaParticipe = '';
    this.deudaVigente.set(null);
    this.deudaConsultaFallida.set(false);
    this.historial.set([]);
    this.motivo = '';
    this.referencia = '';
    this.debitoAutomatico = false;
    this.fecha.set(new Date());

    this.cargarSaldos(entidad.codigo);
    this.cargarDeudaVigente(entidad.codigo);
    this.cargarCuentasParticipe(entidad.codigo);
    this.cargarHistorial(entidad.codigo);
  }

  // ================= carga de datos =================

  /**
   * Saldo neto por tipo de aporte, agregado por la base de datos. Nunca se baja CRD.APRT ni se
   * recalcula acá: este endpoint es la única fuente del saldo.
   */
  private cargarSaldos(codigoEntidad: number): void {
    this.cargandoSaldos.set(true);
    this.operaciones.saldosPorEntidad(codigoEntidad).subscribe((resp) => {
      this.cargandoSaldos.set(false);
      if (!resp.exito) {
        this.saldos = [];
        this.saldosVersion.update((v) => v + 1);
        this.snackBar.open(`No se pudieron cargar los saldos de aportes: ${mensajeDeRespuesta(resp)}`, 'Cerrar', { duration: 5000 });
        return;
      }
      // Un saldo 0 o negativo indica inconsistencia de datos: no hay nada que devolver de ahí.
      this.saldos = (resp.resultado ?? [])
        .filter((a) => (a.saldo ?? 0) > 0.004)
        .map((a: SaldoAporte) => ({
          idTipoAporte: a.idTipoAporte,
          nombre: a.nombre,
          saldo: +(a.saldo ?? 0).toFixed(2),
          texto: '',
        }));
      this.saldosVersion.update((v) => v + 1);
    });
  }

  /**
   * Préstamos sin cancelar del partícipe. Va en paralelo con los saldos: son dos consultas
   * independientes y ninguna espera a la otra.
   *
   * Es solo para avisar en el diálogo de confirmación: el registro NUNCA se bloquea porque este
   * dato no cargó, y el backend tampoco lo valida. Pero "no se pudo consultar" y "no tiene
   * deuda" no pueden verse iguales (§6.5 del plan, ratificado por el árbitro): si la respuesta
   * viene con `exito: false` o el HTTP falla, se marca `deudaConsultaFallida` para que el
   * diálogo de confirmación muestre la línea gris en vez de quedarse mudo.
   */
  private cargarDeudaVigente(codigoEntidad: number): void {
    this.deudaConsultaFallida.set(false);
    this.devolucionService.deudaVigente(codigoEntidad).subscribe({
      next: (resp) => {
        if (resp.exito) {
          this.deudaVigente.set(resp.resultado ?? null);
        } else {
          this.deudaVigente.set(null);
          this.deudaConsultaFallida.set(true);
        }
      },
      error: () => {
        this.deudaVigente.set(null);
        this.deudaConsultaFallida.set(true);
      },
    });
  }

  /** Cuentas del partícipe (CRD.CNBP) activas: son el destino de la transferencia. */
  private cargarCuentasParticipe(codigoEntidad: number): void {
    const criterioEntidad = new DatosBusqueda();
    criterioEntidad.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'entidad', 'codigo', String(codigoEntidad), TipoComandosBusqueda.IGUAL);

    const criterioEstado = new DatosBusqueda();
    criterioEstado.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'estado', '1', TipoComandosBusqueda.IGUAL);

    this.cargandoCuentasParticipe.set(true);
    this.cuentaParticipeService.selectByCriteria([criterioEntidad, criterioEstado]).subscribe({
      next: (cuentas) => {
        this.cargandoCuentasParticipe.set(false);
        // El estado se vuelve a filtrar acá: si el criterio no llegara a aplicarse del lado del
        // servidor, una cuenta inactiva no puede terminar ofrecida como destino del dinero.
        const activas = (cuentas ?? []).filter((c) => Number(c.estado) === 1);
        this.cuentasParticipe.set(activas);
        this.cuentaParticipeSeleccionada.set(activas.length === 1 ? activas[0] : null);
      },
      error: () => {
        this.cargandoCuentasParticipe.set(false);
        this.cuentasParticipe.set([]);
        this.snackBar.open('No se pudieron consultar las cuentas bancarias del partícipe.', 'Cerrar', { duration: 5000 });
      },
    });
  }

  /**
   * Cuentas propias del fondo, filtradas por la empresa de la sesión del lado del cliente, que es
   * como lo resuelve hoy `pagos-transferencia.component.ts`.
   *
   * Se descartan además las cuentas dadas de baja. El estado nulo cuenta como activa: hay cuentas
   * antiguas sin `CNBCESTD` y esconderlas dejaría al usuario sin ninguna cuenta de origen.
   */
  private cargarCuentasPropias(): void {
    const idEmpresa = this.idEmpresaSesion();
    this.cuentaBancariaService.getAll().subscribe({
      next: (data) => {
        let lista = Array.isArray(data) ? data : [];
        if (idEmpresa) {
          lista = lista.filter(
            (c: any) => c.banco?.empresa?.codigo === idEmpresa || c.empresa?.codigo === idEmpresa
          );
        }
        this.cuentasPropias.set(lista.filter((c) => c.estado == null || Number(c.estado) !== 0));
      },
      error: () => this.cuentasPropias.set([]),
    });
  }

  /** Tipos de cuenta bancaria (rubro 23). Los códigos los define el catálogo, no son fijos. */
  private cargarTiposCuentaBancaria(): void {
    const enMemoria = this.detalleRubroService.getDetallesByParent(RUBRO_TIPO_CUENTA_BANCARIA);
    if (enMemoria.length > 0) {
      this.tiposCuentaBancaria.set(enMemoria);
      return;
    }
    // La caché se llena en el login; si se entra sin pasar por ahí, se pide el catálogo completo.
    this.detalleRubroService.getAll().subscribe({
      next: (todos) =>
        this.tiposCuentaBancaria.set(
          (todos ?? []).filter((d) => d.rubro?.codigoAlterno === RUBRO_TIPO_CUENTA_BANCARIA)
        ),
      error: () => this.tiposCuentaBancaria.set([]),
    });
  }

  /**
   * Historial del partícipe. El backend reconcilia contra el estado real de la orden de pago
   * antes de responder, así que basta con volver a pedirlo para ver una devolución ya pagada.
   */
  private cargarHistorial(codigoEntidad: number): void {
    this.cargandoHistorial.set(true);
    this.devolucionService.porEntidad(codigoEntidad).subscribe((resp) => {
      this.cargandoHistorial.set(false);
      if (!resp.exito) {
        this.historial.set([]);
        this.snackBar.open(`No se pudo cargar el historial de devoluciones: ${mensajeDeRespuestaDevolucion(resp)}`, 'Cerrar', { duration: 5000 });
        return;
      }
      this.historial.set(resp.resultado ?? []);
    });
  }

  refrescarHistorial(): void {
    const entidad = this.entidadSeleccionada();
    if (entidad) this.cargarHistorial(entidad.codigo);
  }

  // ================= montos por tipo de aporte =================

  onMontoCambio(): void {
    this.saldosVersion.update((v) => v + 1);
  }

  onMontoBlur(fila: SaldoDevolucion): void {
    let v = Math.max(this.parseMoneda(fila.texto), 0);
    if (v > fila.saldo + TOLERANCIA_DEVOLUCION) {
      this.snackBar.open(
        `No se puede devolver más que el saldo disponible de ${fila.nombre} (${this.formatMoneda(fila.saldo)}).`,
        'Cerrar',
        { duration: 3500 }
      );
      v = fila.saldo;
    }
    v = +v.toFixed(2);
    fila.texto = v > 0.004 ? this.formatMoneda(v) : '';
    this.saldosVersion.update((n) => n + 1);
  }

  devolverTodoDeUnTipo(fila: SaldoDevolucion): void {
    fila.texto = fila.saldo > 0.004 ? this.formatMoneda(fila.saldo) : '';
    this.saldosVersion.update((v) => v + 1);
  }

  devolverTodoElSaldo(): void {
    for (const f of this.saldos) f.texto = f.saldo > 0.004 ? this.formatMoneda(f.saldo) : '';
    this.saldosVersion.update((v) => v + 1);
  }

  limpiarMontos(): void {
    for (const f of this.saldos) f.texto = '';
    this.saldosVersion.update((v) => v + 1);
  }

  montoDe(fila: SaldoDevolucion): number {
    this.saldosVersion();
    return this.parseMoneda(fila.texto);
  }

  // ================= combos =================

  /** Buscador interno del combo: banco, tipo o número de cuenta — nunca un solo campo. */
  get cuentasParticipeFiltradas(): CuentaBancariaParticipe[] {
    const q = this.filtroCuentaParticipe.trim().toLowerCase();
    const lista = this.cuentasParticipe();
    if (!q) return lista;
    return lista.filter((c) => this.textoBusquedaCuentaParticipe(c).includes(q));
  }

  get cuentasPropiasFiltradas(): CuentaBancaria[] {
    const q = this.filtroCuentaOrigen.trim().toLowerCase();
    const lista = this.cuentasPropias();
    if (!q) return lista;
    return lista.filter((c) => this.textoBusquedaCuentaPropia(c).includes(q));
  }

  /** Se busca por banco Y por número completo, aunque en pantalla el número vaya enmascarado. */
  private textoBusquedaCuentaParticipe(cuenta: CuentaBancariaParticipe): string {
    const banco = cuenta.bancoExterno?.nombre ?? '';
    const tipo = this.nombreTipoCuentaBancaria(cuenta.tipoCuenta);
    return `${banco} ${tipo} ${cuenta.numeroCuenta ?? ''}`.toLowerCase();
  }

  private textoBusquedaCuentaPropia(cuenta: CuentaBancaria): string {
    return `${cuenta.banco?.nombre ?? ''} ${cuenta.numeroCuenta ?? ''} ${cuenta.titular ?? ''}`.toLowerCase();
  }

  /** Etiqueta del combo de destino: banco · tipo · número ENMASCARADO. */
  etiquetaCuentaParticipe(cuenta: CuentaBancariaParticipe | null): string {
    if (!cuenta) return '';
    const banco = cuenta.bancoExterno?.nombre ?? 'Banco';
    const tipo = this.nombreTipoCuentaBancaria(cuenta.tipoCuenta);
    const numero = this.enmascararCuenta(cuenta.numeroCuenta);
    return tipo ? `${banco} · ${tipo} · ${numero}` : `${banco} · ${numero}`;
  }

  etiquetaCuentaPropia(cuenta: CuentaBancaria | null): string {
    if (!cuenta) return '';
    return `${cuenta.banco?.nombre ?? 'Banco'} — ${cuenta.numeroCuenta}`;
  }

  private nombreTipoCuentaBancaria(tipo: number | null | undefined): string {
    if (tipo == null) return '';
    const detalle = this.tiposCuentaBancaria().find((d) => Number(d.codigoAlterno) === Number(tipo));
    return detalle?.descripcion?.trim() ?? '';
  }

  /** Solo se muestran los últimos 4 dígitos: el resto va enmascarado. */
  enmascararCuenta(numero: string | null | undefined): string {
    const limpio = String(numero ?? '').trim();
    if (!limpio) return '—';
    if (limpio.length <= 4) return limpio;
    return '••••' + limpio.slice(-4);
  }

  // ================= registrar =================

  registrar(): void {
    if (!this.puedeRegistrar()) return;

    const entidad = this.entidadSeleccionada();
    const cuentaDestino = this.cuentaParticipeSeleccionada();
    const cuentaOrigen = this.cuentaOrigenSeleccionada();
    if (!entidad || !cuentaDestino || !cuentaOrigen) return;

    const idEmpresa = this.idEmpresaSesion();
    const idUsuario = this.idUsuarioSesion();
    if (!idEmpresa || !idUsuario) {
      this.snackBar.open(
        'No se pudo determinar la empresa o el usuario de la sesión. Vuelva a iniciar sesión antes de registrar la devolución.',
        'Cerrar',
        { duration: 6000 }
      );
      return;
    }

    const fechaTexto = this.devolucionService.formatearFecha(this.fecha());
    if (!fechaTexto) {
      this.snackBar.open('Seleccione una fecha válida para la devolución.', 'Cerrar', { duration: 4000 });
      return;
    }

    const lineas: LineaConfirmacionDevolucion[] = this.saldos
      .filter((f) => this.parseMoneda(f.texto) > 0.004)
      .map((f) => ({
        nombreTipoAporte: f.nombre,
        valor: +this.parseMoneda(f.texto).toFixed(2),
        saldoActual: f.saldo,
      }));

    // Es dinero saliendo: el desglose y el total se confirman antes de tocar el backend.
    this.dialog
      .open(ConfirmarDevolucionDialogComponent, {
        data: {
          participe: entidad.razonSocial,
          identificacion: entidad.numeroIdentificacion,
          cuentaDestino: this.etiquetaCuentaParticipe(cuentaDestino),
          cuentaOrigen: this.etiquetaCuentaPropia(cuentaOrigen),
          fecha: this.formatFecha(this.fecha()),
          motivo: this.motivo.trim(),
          debitoAutomatico: this.debitoAutomatico,
          referencia: this.referencia.trim(),
          lineas,
          total: this.totalADevolver(),
          // Aviso, no condición: el diálogo lo muestra y el botón de confirmar sigue habilitado.
          deuda: this.deudaVigente(),
          deudaConsultaFallida: this.deudaConsultaFallida(),
        },
        width: '760px',
        maxWidth: '96vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((confirmado?: boolean) => {
        if (confirmado) {
          this.enviarDevolucion(entidad, cuentaDestino, cuentaOrigen, fechaTexto, idEmpresa, idUsuario);
        }
      });
  }

  private enviarDevolucion(
    entidad: Entidad,
    cuentaDestino: CuentaBancariaParticipe,
    cuentaOrigen: CuentaBancaria,
    fechaTexto: string,
    idEmpresa: number,
    idUsuario: number
  ): void {
    const detalle: DetalleSolicitudDevolucion[] = this.saldos
      .filter((f) => this.parseMoneda(f.texto) > 0.004)
      .map((f) => ({ idTipoAporte: f.idTipoAporte, valor: +this.parseMoneda(f.texto).toFixed(2) }));

    if (!detalle.length) return;

    const solicitud: SolicitudDevolucion = {
      idEntidad: entidad.codigo,
      idCuentaBancariaParticipe: cuentaDestino.codigo,
      idCuentaBancariaOrigen: cuentaOrigen.codigo,
      idEmpresa,
      idUsuario,
      usuario: usuarioSesion(),
      // Ya es `yyyy-MM-dd`: nunca un Date ni nada terminado en Z.
      fecha: fechaTexto,
      motivo: this.motivo.trim() || null,
      debitoAutomatico: this.debitoAutomatico,
      referencia: this.referencia.trim() || null,
      detalle,
    };

    this.registrando.set(true);
    this.devolucionService.registrar(solicitud).subscribe((resp) => {
      this.registrando.set(false);

      if (resp.exito) {
        this.snackBar.open(resp.mensaje ?? 'Devolución registrada.', 'Cerrar', { duration: 7000 });
        this.limpiarMontos();
        this.motivo = '';
        this.referencia = '';
        this.debitoAutomatico = false;
        // El saldo lo recalcula la base de datos: se vuelve a pedir, no se resta en memoria.
        this.cargarSaldos(entidad.codigo);
        this.cargarHistorial(entidad.codigo);
        return;
      }

      this.snackBar.open(mensajeDeRespuestaDevolucion(resp), 'Cerrar', { duration: 8000 });

      // La transacción no dejó nada escrito, pero varios códigos significan que lo que la
      // pantalla tiene en memoria quedó viejo: se refresca lo que corresponde a cada uno.
      switch (resp.error) {
        case 'SALDO_INSUFICIENTE':
        case 'TIPO_APORTE_NO_VIGENTE':
          this.cargarSaldos(entidad.codigo);
          break;
        case 'SIN_CUENTA_BANCARIA':
        case 'CUENTA_NO_ENCONTRADA':
          this.cargarCuentasParticipe(entidad.codigo);
          break;
      }
    });
  }

  // ================= anular =================

  puedeAnular(devolucion: DevolucionListado): boolean {
    return puedeAnularse(devolucion.estado);
  }

  anular(devolucion: DevolucionListado): void {
    const entidad = this.entidadSeleccionada();
    if (!entidad || !this.puedeAnular(devolucion)) return;

    const idUsuario = this.idUsuarioSesion();
    if (!idUsuario) {
      this.snackBar.open('No se pudo determinar el usuario de la sesión. Vuelva a iniciar sesión.', 'Cerrar', { duration: 6000 });
      return;
    }

    const datos: MotivoDialogData = {
      titulo: `Anular devolución #${devolucion.idDevolucion}`,
      advertencia:
        `Se revierten los aportes negativos por ${this.formatMoneda(devolucion.valorTotal)} y se anula la orden ` +
        'de pago en Cuentas por Pagar. Solo es posible mientras el pago no esté confirmado.',
      textoConfirmar: 'Anular devolución',
    };

    this.dialog
      .open(MotivoDialogComponent, { data: datos, width: '520px', maxWidth: '96vw', autoFocus: false })
      .afterClosed()
      .subscribe((motivo?: string | null) => {
        if (!motivo) return;
        this.anulandoId.set(devolucion.idDevolucion);
        this.devolucionService
          .anular(devolucion.idDevolucion, { motivo, usuario: usuarioSesion(), idUsuario })
          .subscribe((resp) => {
            this.anulandoId.set(null);
            this.snackBar.open(
              resp.exito ? (resp.mensaje ?? 'Devolución anulada.') : mensajeDeRespuestaDevolucion(resp),
              'Cerrar',
              { duration: 7000 }
            );
            // Tanto si se anuló como si el estado real ya era otro (el pago se confirmó mientras
            // tanto), lo que hay en pantalla quedó viejo: se vuelve a pedir todo al backend.
            this.cargarSaldos(entidad.codigo);
            this.cargarHistorial(entidad.codigo);
          });
      });
  }

  // ================= presentación del historial =================

  nombreEstado(estado: number | null | undefined): string {
    return nombreEstadoDevolucion(estado);
  }

  claseEstado(estado: number | null | undefined): string {
    if (estado == null) return 'est-registrada';
    return CLASE_ESTADO_DEVOLUCION[Number(estado)] ?? 'est-registrada';
  }

  iconoEstado(estado: number | null | undefined): string {
    if (estado == null) return 'help';
    return ICONO_ESTADO_DEVOLUCION[Number(estado)] ?? 'help';
  }

  // ================= utilidades =================

  /**
   * Fechas que llegan del backend. Se normalizan con `FuncionesDatosService` en vez de parsearlas
   * a mano: un `yyyy-MM-dd` pasado a `new Date()` se interpreta como UTC y en Ecuador se muestra
   * un día antes.
   */
  formatFecha(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, 2) || '—';
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  parseMoneda(texto: string | null | undefined): number {
    if (!texto) return 0;
    const n = parseFloat(String(texto).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  private idEmpresaSesion(): number {
    return +(sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa') || '0');
  }

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }
}

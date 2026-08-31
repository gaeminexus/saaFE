import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';

import { CuentaBancaria } from '../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../tsr/service/cuenta-bancaria.service';

import { AbonoCapitalDialogComponent } from '../../dialog/pagos/abono-capital-dialog.component';
import { CobroRegistradoDetalleLinea, CobroRegistradoDialogComponent } from '../../dialog/pagos/cobro-registrado-dialog.component';
import { ContextoPrestamo, SalidaDialogoPago, contextoDesdePrestamo } from '../../dialog/pagos/contexto-prestamo';
import { HistorialOperacionesDialogComponent } from '../../dialog/pagos/historial-operaciones-dialog.component';
import { PagoPrestamoDialogComponent } from '../../dialog/pagos/pago-prestamo-dialog.component';
import { PrecancelacionDialogComponent } from '../../dialog/pagos/precancelacion-dialog.component';
import { ReciboOperacionDialogComponent } from '../../dialog/pagos/recibo-operacion-dialog.component';
import { MetodoCobro } from '../../dialog/pagos/respaldo-cobro.component';
import { DetalleCobroCredito } from '../../model/cobros/cobro-credito';
import { TipoOperacionCobro } from '../../model/cobros/catalogos-cobro';
import { DetallePrestamo } from '../../model/detalle-prestamo';
import { Entidad } from '../../model/entidad';
import { HistoricoDesgloseAporteParticipe } from '../../model/historico-desglose-aporte-participe';
import {
  CLASES_ESTADO_CUOTA,
  NOMBRES_ESTADO_CUOTA,
  obtenerCodigoEstadoCuota,
} from '../../model/estado-cuota-prestamo';
import { NOMBRE_ESTADO_PRESTAMO, admiteOperaciones } from '../../model/pagos/catalogos-pago';
import {
  ResultadoPagoCuota,
  ResultadoRegistroAporte,
  SaldoAporte,
} from '../../model/pagos/operaciones-pago';
import { MovimientoAporte, mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { Prestamo } from '../../model/prestamo';
import { PagoPrestamoService } from '../../service/pago-prestamo.service';
import { CobroCreditoService } from '../../service/cobro-credito.service';
import { DetallePrestamoService } from '../../service/detalle-prestamo.service';
import { EntidadService } from '../../service/entidad.service';
import { ComprobanteCobroService } from '../../service/comprobante-cobro.service';
import { HistoricoDesgloseAporteParticipeService } from '../../service/historico-desglose-aporte-participe.service';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';
import { PrestamoService } from '../../service/prestamo.service';
import { ComponentesPagados, SaldoPrestamoService } from '../../service/saldo-prestamo.service';

type CuentaKey = 'prestamo' | 'cesantia' | 'jubilacion';
type MetodoPago = 'debito' | 'transferencia' | 'deposito';

interface AsignacionCuota {
  cuota: DetallePrestamo;
  /** Cuánto de lo asignado caería sobre esta cuota (0 en las ya liquidadas). */
  aplicado: number;
  /** Saldo real pendiente de la cuota hoy. */
  pendiente: number;
  /** Estado real de la cuota en la base (DTPRESTD). */
  estadoCuota: number | null;
  /** La cuota ya está liquidada: PAGADA (4) o CANCELADA_ANTICIPADA (7). */
  liquidada: boolean;
  /** Es la primera cuota no liquidada: la que el backend cobra a continuación. */
  esProxima: boolean;
  /** Efecto previsto del monto asignado sobre las cuotas que siguen pendientes. */
  resultado: 'cubierta' | 'parcial' | 'pendiente';
}

/** Último instante del último día del mes de `fecha` (23:59:59.999). */
function finDeMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** Primer instante del primer día del mes de `fecha` (00:00:00.000). */
function inicioDeMes(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1, 0, 0, 0, 0);
}

@Component({
  selector: 'app-cobros-personales',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './cobros-personales.component.html',
  styleUrl: './cobros-personales.component.scss',
})
export class CobrosPersonalesComponent implements OnDestroy {
  private topObserver?: IntersectionObserver;
  private confirmObserver?: IntersectionObserver;
  private topEnVista = true;
  private confirmEnVista = false;
  mostrarIndicadorFlotante = signal(false);

  constructor() {
    // El indicador flotante solo tiene sentido una vez que la sección del participante
    // (con el campo de monto total y la confirmación) está renderizada en el DOM.
    effect(() => {
      if (this.entidadSeleccionada()) {
        setTimeout(() => this.configurarObservadoresScroll(), 0);
      } else {
        this.desconectarObservadoresScroll();
        this.mostrarIndicadorFlotante.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.desconectarObservadoresScroll();
  }

  private configurarObservadoresScroll(): void {
    this.desconectarObservadoresScroll();
    const indicadorSuperior = document.getElementById('cp-indicador-superior');
    const botonConfirmar = document.getElementById('cp-boton-confirmar');
    if (!indicadorSuperior || !botonConfirmar) return;

    this.topObserver = new IntersectionObserver(([entry]) => {
      this.topEnVista = entry.isIntersecting;
      this.mostrarIndicadorFlotante.set(!this.topEnVista && !this.confirmEnVista);
    });
    this.topObserver.observe(indicadorSuperior);

    this.confirmObserver = new IntersectionObserver(([entry]) => {
      this.confirmEnVista = entry.isIntersecting;
      this.mostrarIndicadorFlotante.set(!this.topEnVista && !this.confirmEnVista);
    });
    this.confirmObserver.observe(botonConfirmar);
  }

  private desconectarObservadoresScroll(): void {
    this.topObserver?.disconnect();
    this.confirmObserver?.disconnect();
  }

  private entidadService = inject(EntidadService);
  private prestamoService = inject(PrestamoService);
  private detallePrestamoService = inject(DetallePrestamoService);
  private pagoPrestamoService = inject(PagoPrestamoService);
  private historicoService = inject(HistoricoDesgloseAporteParticipeService);
  private cuentaBancariaService = inject(CuentaBancariaService);
  private operaciones = inject(OperacionesPagoPrestamoService);
  private cobroCreditoService = inject(CobroCreditoService);
  private saldoPrestamo = inject(SaldoPrestamoService);
  private funcionesDatos = inject(FuncionesDatosService);
  private comprobantes = inject(ComprobanteCobroService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // ---- búsqueda ----
  criterioIdentificacion = '';
  criterioRolPetro = '';
  criterioIdPrestamoAsoprep = '';
  criterioNombre = '';
  buscando = signal(false);
  resultados = signal<Entidad[]>([]);
  mostrandoResultados = signal(false);
  entidadSeleccionada = signal<Entidad | null>(null);

  // ---- datos del participante seleccionado ----
  cargandoPrestamos = signal(false);
  cargandoDatos = computed(() => this.cargandoPrestamos() || this.cargandoSaldos() || this.cargandoPagos());
  /** Todos los préstamos del partícipe que admiten operaciones de pago (idEstado no terminal). */
  prestamosOperables = signal<Prestamo[]>([]);
  prestamoVigente = signal<Prestamo | null>(null);
  /**
   * Tabla de amortización COMPLETA por préstamo (todas las cuotas, pagadas incluidas), indexada por
   * `Prestamo.codigo`. Se necesita entera —y no solo las cuotas con saldo— por dos motivos: para
   * mostrar el estado real de cada cuota y para recalcular los saldos vigentes del crédito, que en
   * PRST están desactualizados (ver `saldoCapitalPrestamo`).
   */
  cuotasPorPrestamo = signal<Record<number, DetallePrestamo[]>>({});
  historico = signal<HistoricoDesgloseAporteParticipe | null>(null);
  cuentasBancarias = signal<CuentaBancaria[]>([]);

  /**
   * Lo realmente cobrado a cada cuota, acumulado desde CRD.PGPR y indexado por `DetallePrestamo.codigo`
   * (los códigos de cuota son únicos, así que un solo mapa sirve para todos los créditos del socio).
   *
   * Es la fuente de verdad de los pagos, igual que en `MotorPagoPrestamoServiceImpl.calcularSaldosRealesCuota()`.
   * Las columnas «pagado» de DTPR NO sirven para esto: en los créditos migrados de Petrocomercial
   * vienen precargadas con el propio valor programado de la cuota (DTPRCPPG = DTPRCPTL, etc.) y
   * DTPRSLDO en 0, incluso en cuotas que vencen dentro de varios años y no ha pagado nadie. Leerlas
   * como si fueran pagos hacía que la pantalla diera por cubiertas cuotas que el socio debe.
   */
  private pagosPorCuota = signal<Record<number, ComponentesPagados>>({});
  /**
   * Códigos de préstamo cuyos pagos ya llegaron. Hace falta distinguir «este crédito no tiene pagos»
   * de «los pagos todavía no llegaron»: la primera situación significa que se debe la cuota completa,
   * y afirmarlo mientras la consulta está en vuelo mostraría una deuda inventada.
   */
  private prestamosConPagos = signal<number[]>([]);
  cargandoPagos = signal(false);

  /** Cuotas del préstamo seleccionado, en orden de número de cuota. */
  cuotasPrestamo = computed<DetallePrestamo[]>(() => {
    const codigo = this.prestamoVigente()?.codigo;
    return codigo == null ? [] : (this.cuotasPorPrestamo()[codigo] ?? []);
  });

  /** Las que el backend todavía puede cobrar: estado distinto de PAGADA (4) y CANCELADA_ANTICIPADA (7). */
  cuotasPendientes = computed(() => this.cuotasPrestamo().filter((c) => !this.esCuotaLiquidada(c)));

  /** La cuota que se cobra a continuación: la primera no liquidada, igual que el motor de pagos. */
  proximaCuota = computed<DetallePrestamo | null>(() => this.cuotasPendientes()[0] ?? null);

  cuotasLiquidadas = computed(() => this.cuotasPrestamo().length - this.cuotasPendientes().length);

  // ---- puesta al día: cuánto debe entregar para estar al corriente hasta el mes en curso ----

  /** Hasta acá llega lo exigible: el último día del mes en curso, incluida la cuota de este mes. */
  readonly finMesVigente: Date = finDeMes(new Date());
  /**
   * Corte de la mora: el primer día del mes en curso. La cuota de este mes se pide para ponerse al
   * día pero NO cuenta como vencida, aunque su fecha de vencimiento ya haya pasado dentro del mes:
   * el socio tiene el mes corriente para pagarla. Solo lo de meses anteriores es mora.
   */
  readonly inicioMesVigente: Date = inicioDeMes(new Date());

  /**
   * ¿Ya llegaron la tabla de amortización y los pagos del crédito seleccionado? Sin ambas cosas no se
   * puede afirmar ni «al día» ni «en mora»: sin cuotas no hay nada que sumar, y sin los pagos el
   * pendiente de cada cuota sería su valor completo.
   */
  hayTablaAmortizacion = computed(
    () => this.cuotasPrestamo().length > 0 && this.pagosCargadosDe(this.prestamoVigente())
  );

  /**
   * Cuotas que el socio ya debería tener cubiertas: las pendientes que vencen hasta el último día
   * del mes en curso. La del mes vigente entra aunque su fecha de vencimiento todavía no haya
   * llegado —es la cuota que le toca pagar este mes—; de ahí para adelante quedan fuera.
   */
  cuotasHastaMesVigente = computed<DetallePrestamo[]>(() =>
    this.cuotasPendientes().filter((c) => {
      const vence = this.fechaVencimientoDe(c);
      return vence != null && vence.getTime() <= this.finMesVigente.getTime();
    })
  );

  /**
   * Lo que hay que entregar para ponerse al día: la suma del pendiente real de todas las cuotas
   * exigibles hasta el mes en curso (mora e interés vencido incluidos, ver `saldoPendienteDe`).
   */
  valorPonerseAlDia = computed(() =>
    +this.cuotasHastaMesVigente()
      .reduce((s, c) => s + this.saldoPendienteDe(c), 0)
      .toFixed(2)
  );

  /** De esas, las de meses anteriores al actual: la parte que está efectivamente en mora. */
  cuotasVencidas = computed<DetallePrestamo[]>(() =>
    this.cuotasHastaMesVigente().filter((c) => {
      const vence = this.fechaVencimientoDe(c);
      return vence != null && vence.getTime() < this.inicioMesVigente.getTime();
    })
  );

  valorVencido = computed(() =>
    +this.cuotasVencidas()
      .reduce((s, c) => s + this.saldoPendienteDe(c), 0)
      .toFixed(2)
  );

  /** Hay mora en cuanto una cuota ya vencida conserve saldo. */
  enMora = computed(() => this.valorVencido() > 0.004);

  /** Vencimiento de la cuota vencida más antigua: desde cuándo arrastra la mora. */
  moraDesde = computed<Date | null>(() => {
    const primera = this.cuotasVencidas()[0];
    return primera ? this.fechaVencimientoDe(primera) : null;
  });

  /** Nada exigible con saldo hasta el mes en curso. */
  alDiaHastaMesVigente = computed(() => this.hayTablaAmortizacion() && this.valorPonerseAlDia() < 0.005);

  /** Saldos reales por tipo de aporte, agregados por la base de datos. */
  saldosAporte = signal<SaldoAporte[]>([]);
  cargandoSaldos = signal(false);

  saldoCesantia = computed(() => this.saldoPorNombre('cesant'));
  saldoJubilacion = computed(() => this.saldoPorNombre('jubila'));
  valorMensualCesantia = computed(() => this.historico()?.aporteCesantia ?? 0);
  valorMensualJubilacion = computed(() => this.historico()?.aporteJubilacion ?? 0);

  /**
   * Saldo total y saldo de capital VIGENTES del préstamo seleccionado.
   *
   * No se leen de PRST (`saldoTotal` / `saldoCapital`): esas dos columnas solo las reescribe el
   * proceso de carga del archivo de Petrocomercial, así que entre cargas quedan congeladas —de ahí
   * que la pantalla mostrara cifras de hace meses. Los pagos manuales sí actualizan la cuota
   * (DTPRSLDO, DTPRCPPG, DTPRESTD), así que el valor de hoy se reconstruye desde la tabla de
   * amortización con el mismo criterio del backend: sumar sobre las cuotas no liquidadas.
   */
  saldoTotalPrestamo = computed(() => this.saldoTotalDe(this.prestamoVigente()));
  saldoCapitalPrestamo = computed(() => this.saldoCapitalDe(this.prestamoVigente()));

  /**
   * Saldo de capital tal como lo muestra la tabla de amortización: el `DTPRSLCP` de la mínima
   * cuota no pagada ni cancelada anticipada (`proximaCuota()`), sin sumar nada más.
   *
   * Es un número distinto a propósito de `saldoCapitalPrestamo()` (pedido 6, decidido por el
   * usuario): `saldoCapitalPrestamo()` es lo que falta pagar para cancelar el crédito HOY,
   * cuota en curso incluida — el capital pendiente sumado de TODAS las cuotas no liquidadas.
   * `DTPRSLCP` es, en cambio, el saldo que queda DESPUÉS de cubrir la cuota en curso: el número
   * que trae el cronograma impreso y el que el usuario tiene en la cabeza al mirar la tabla.
   * `null` cuando no hay ninguna cuota pendiente (crédito liquidado) — no hay "saldo en tabla"
   * que mostrar.
   */
  saldoTablaAmortizacion = computed<number | null>(() => this.proximaCuota()?.saldoCapital ?? null);

  /**
   * Valor de la cuota que se cobra a continuación, tomado del campo `total` de la cuota. Solo si no
   * hay tabla de amortización se cae a `Prestamo.valorCuota`, que no incluye desgravamen ni seguro.
   */
  valorCuotaPrestamo = computed(() => {
    const proxima = this.proximaCuota() ?? this.cuotasPrestamo()[0] ?? null;
    return proxima ? this.valorCuotaDe(proxima) : (this.prestamoVigente()?.valorCuota ?? 0);
  });

  /**
   * Cuánto hay que entregar para cubrir las próximas 1, 2, 3… cuotas, sumando el pendiente real de
   * cada una. Sirve para que los atajos de los diálogos («2 cuotas») den el monto exacto en vez de
   * multiplicar un valor de cuota fijo: la primera puede venir parcialmente pagada y las vencidas
   * arrastran mora.
   */
  pendientesAcumulados = computed<number[]>(() => {
    const acumulados: number[] = [];
    let suma = 0;
    for (const cuota of this.cuotasPendientes().slice(0, 12)) {
      suma = +(suma + this.saldoPendienteDe(cuota)).toFixed(2);
      acumulados.push(suma);
    }
    return acumulados;
  });

  estadoPrestamoTexto = computed(() => {
    const idEstado = this.prestamoVigente()?.idEstado;
    if (idEstado == null) return '—';
    return this.nombreEstadoPrestamo(Number(idEstado));
  });

  /** Nombre de un estado de préstamo por su código, para pantallas que no tienen un `Prestamo` a mano. */
  nombreEstadoPrestamo(idEstado: number): string {
    return NOMBRE_ESTADO_PRESTAMO[idEstado] ?? `Estado ${idEstado}`;
  }

  // ---- monto del pago y asignación por cuenta ----
  montoTotalTexto = signal('$0.00');
  montoTotal = computed(() => this.parseMoneda(this.montoTotalTexto()));

  cuentaChecked: Record<CuentaKey, boolean> = { prestamo: false, cesantia: false, jubilacion: false };
  cuentaMontoTexto: Record<CuentaKey, string> = { prestamo: '', cesantia: '', jubilacion: '' };
  cuentaMontoVersion = signal(0); // se incrementa para forzar recomputo de los `computed` de abajo

  detallePrestamoAbierto = signal(false);

  /** Asignado en TODA la operación: todos los préstamos incluidos (uno o varios) + aportes del socio. */
  asignado = computed(() => +(this.montoTotalPrestamosIncluidos() + this.montoAportesSocio()).toFixed(2));
  restante = computed(() => +(this.montoTotal() - this.asignado()).toFixed(2));
  completamenteAsignado = computed(() => Math.abs(this.restante()) < 0.005);

  montoPrestamo = computed(() => {
    this.cuentaMontoVersion();
    return this.cuentaChecked.prestamo ? this.parseMoneda(this.cuentaMontoTexto.prestamo) : 0;
  });

  /**
   * Total asignado a cesantía/jubilación: un aporte del socio a sus propias cuentas, que se registra
   * con `POST /aprt/registrarAporte` (una llamada por tipo). No es un pago de préstamo.
   */
  montoAportesSocio = computed(() => {
    this.cuentaMontoVersion();
    return +(['cesantia', 'jubilacion'] as CuentaKey[])
      .filter((k) => this.cuentaChecked[k])
      .reduce((s, k) => s + this.parseMoneda(this.cuentaMontoTexto[k]), 0)
      .toFixed(2);
  });

  /**
   * Detalle de cuotas del crédito. Se calcula aunque la fila del préstamo no esté marcada: el
   * detalle también sirve para consultar el estado de las cuotas sin estar cobrando nada.
   */
  asignacionesPrestamo = computed<AsignacionCuota[]>(() => {
    this.cuentaMontoVersion();
    const monto = this.cuentaChecked.prestamo ? this.parseMoneda(this.cuentaMontoTexto.prestamo) : 0;
    return this.calcularAsignacionPrestamo(monto);
  });

  /**
   * Las cuotas ya liquidadas se ocultan por defecto: hay créditos de más de 100 cuotas y el usuario
   * trabaja siempre sobre las últimas, así que arrancar con todas obliga a bajar media pantalla
   * antes de llegar a la que interesa. El resumen de arriba sigue diciendo cuántas hay.
   */
  ocultarCuotasPagadas = signal(true);

  /** Lo que se pinta en la tabla de detalle; el reparto se calcula igual sobre todas las cuotas. */
  asignacionesVisibles = computed<AsignacionCuota[]>(() =>
    this.ocultarCuotasPagadas()
      ? this.asignacionesPrestamo().filter((a) => !a.liquidada)
      : this.asignacionesPrestamo()
  );

  coberturaCesantia = computed(() => {
    this.cuentaMontoVersion();
    if (!this.cuentaChecked.cesantia) return null;
    return this.calcularCoberturaAporte(this.parseMoneda(this.cuentaMontoTexto.cesantia), this.valorMensualCesantia());
  });
  coberturaJubilacion = computed(() => {
    this.cuentaMontoVersion();
    if (!this.cuentaChecked.jubilacion) return null;
    return this.calcularCoberturaAporte(this.parseMoneda(this.cuentaMontoTexto.jubilacion), this.valorMensualJubilacion());
  });

  // ---- método de pago ----
  metodoPago = signal<MetodoPago>('transferencia');
  cuentaOrigenAporte = signal<'cesantia' | 'jubilacion'>('cesantia');
  cuentaAsopropDestino = signal<CuentaBancaria | null>(null);
  /**
   * Referencia y fecha son signals —y no campos planos como la observación— porque `puedeConfirmar`
   * es un `computed` que los evalúa: con un campo plano el cálculo no se volvería a ejecutar al
   * teclearlos y el botón de confirmar quedaría deshabilitado con todo ya lleno.
   */
  numeroReferencia = signal('');
  fechaPago = signal<Date | null>(new Date());
  observacion = '';
  archivoComprobante = signal<File | null>(null);
  readonly hoy = new Date();

  registrando = signal(false);
  errorOperacion = signal<string | null>(null);
  errorCodigo = signal<string | null>(null);

  saldoAporteOrigen = computed(() => {
    const c = this.cuentaOrigenAporte();
    return c === 'cesantia' ? this.saldoCesantia() : this.saldoJubilacion();
  });
  /** En débito solo sale de aportes la parte destinada al préstamo. */
  saldoDebitoInsuficiente = computed(
    () => this.metodoPago() === 'debito' && this.montoPrestamo() > this.saldoAporteOrigen() + 0.004
  );

  prestamoAdmiteOperaciones = computed(() => admiteOperaciones(this.prestamoVigente()?.idEstado));

  /**
   * Transferencia y depósito son dinero que entró por fuera del sistema: exigen la cuenta de ASOPREP
   * en la que se recibió y el comprobante que presentó el socio. El débito, en cambio, sale del saldo
   * de aportes que el propio sistema lleva, así que no tiene ningún respaldo externo que adjuntar.
   */
  requiereComprobante = computed(() => this.metodoPago() !== 'debito');

  /** La fecha del pago es parte del registro del cobro: tiene que estar y no puede ser futura. */
  fechaValida = computed(() => {
    const fecha = this.fechaPago();
    if (!fecha || isNaN(fecha.getTime())) return false;
    const limite = new Date(this.hoy);
    limite.setHours(23, 59, 59, 999);
    return fecha.getTime() <= limite.getTime();
  });

  /** ¿El cobro incluye al menos un préstamo? Uno o varios, da igual: `prestamosIncluidos()` cubre ambos. */
  cobraPrestamo = computed(() => this.prestamosIncluidos().length > 0);

  /** Préstamos incluidos que NO admiten operaciones de pago (estado terminal). Para `motivosNoConfirmar`. */
  private prestamosNoAdmitenOperaciones = computed(() =>
    this.prestamosIncluidos().filter((item) => !admiteOperaciones(item.prestamo.idEstado))
  );

  /**
   * Qué falta para poder confirmar. Es la lista que se muestra junto al botón: un botón de cobro
   * deshabilitado sin explicación obliga al usuario a adivinar cuál de las cinco condiciones no se
   * cumple, y varias (el reparto por centavos, el estado del préstamo) no son evidentes en pantalla.
   *
   * `puedeConfirmar` se deriva de acá para que no puedan quedar desalineados: si la lista está
   * vacía, se puede confirmar.
   */
  motivosNoConfirmar = computed<string[]>(() => {
    if (this.registrando()) return ['Registrando el cobro…'];

    const motivos: string[] = [];

    if (!this.cobraPrestamo() && this.montoAportesSocio() <= 0.004) {
      motivos.push('Cargue un monto mayor a cero en al menos un préstamo o en una cuenta de aportes.');
    }
    const noAdmiten = this.prestamosNoAdmitenOperaciones();
    if (noAdmiten.length === 1) {
      const p = noAdmiten[0].prestamo;
      motivos.push(`El préstamo #${p.idAsoprep} está en estado «${this.nombreEstadoPrestamo(Number(p.idEstado))}» y no admite operaciones de pago.`);
    } else if (noAdmiten.length > 1) {
      motivos.push(`${noAdmiten.length} de los préstamos incluidos no admiten operaciones de pago: revise sus estados.`);
    }
    if (this.metodoPago() === 'debito' && this.prestamosIncluidos().length > 1) {
      motivos.push('El débito de cuenta de aportes no está disponible para cobrar varios préstamos juntos: use transferencia o depósito.');
    }
    if (!this.completamenteAsignado()) {
      const restante = this.restante();
      motivos.push(
        restante > 0
          ? `Falta asignar ${this.formatMoneda(restante)} de los ${this.formatMoneda(this.montoTotal())} del monto del pago.`
          : `Hay ${this.formatMoneda(-restante)} asignados de más sobre el monto del pago: ajuste los montos.`
      );
    }
    if (this.saldoDebitoInsuficiente()) {
      motivos.push('El monto destinado al préstamo supera el saldo disponible en la cuenta de aportes de origen.');
    }

    if (!this.fechaValida()) {
      motivos.push('Indique la fecha del pago: no puede quedar vacía ni ser posterior a hoy.');
    }

    if (this.requiereComprobante()) {
      if (!this.cuentaAsopropDestino()) {
        motivos.push('Seleccione la cuenta de ASOPREP a la que ingresó el dinero.');
      }
      if (!this.numeroReferencia().trim()) {
        motivos.push('Ingrese el número de referencia de la transferencia o depósito.');
      }
      if (!this.archivoComprobante()) {
        motivos.push('Adjunte el comprobante de respaldo (PDF o imagen).');
      }
    } else if (!this.cuentaOrigenAporte()) {
      motivos.push('Seleccione la cuenta de aportes de la que se debita el pago.');
    }

    return motivos;
  });

  puedeConfirmar = computed(() => this.motivosNoConfirmar().length === 0);

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
    } else if (this.criterioIdPrestamoAsoprep.trim()) {
      this.buscarPorPrestamoAsoprep(this.criterioIdPrestamoAsoprep.trim());
      return;
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

  // Busca por el ID de préstamo del sistema ASOPREP (Prestamo.idAsoprep) en lugar de un campo
  // propio de Entidad, y resuelve a la(s) entidad(es) dueñas del préstamo encontrado.
  private buscarPorPrestamoAsoprep(idAsoprep: string): void {
    const c = new DatosBusqueda();
    c.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'idAsoprep', idAsoprep, TipoComandosBusqueda.IGUAL);

    this.buscando.set(true);
    this.prestamoService.selectByCriteria([c]).subscribe({
      next: (prestamos) => {
        this.buscando.set(false);
        const entidades: Entidad[] = [];
        const codigosVistos = new Set<number>();
        for (const p of prestamos ?? []) {
          if (p.entidad && !codigosVistos.has(p.entidad.codigo)) {
            codigosVistos.add(p.entidad.codigo);
            entidades.push(p.entidad);
          }
        }
        this.resultados.set(entidades);
        this.mostrandoResultados.set(true);
        this.entidadSeleccionada.set(null);
        if (entidades.length === 0) {
          this.snackBar.open('No se encontraron coincidencias.', 'Cerrar', { duration: 3000 });
        }
      },
      error: () => {
        this.buscando.set(false);
        this.snackBar.open('Ocurrió un error al buscar. Intente nuevamente.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  /**
   * Deja la pantalla como recién abierta: criterios en blanco, sin resultados y sin partícipe
   * seleccionado, para arrancar una búsqueda nueva sin tener que borrar campo por campo.
   */
  limpiarBusqueda(): void {
    this.criterioIdentificacion = '';
    this.criterioRolPetro = '';
    this.criterioIdPrestamoAsoprep = '';
    this.criterioNombre = '';
    // Si una confirmación anterior quedó a medias, el flag dejaría el botón deshabilitado para siempre.
    this.registrando.set(false);
    this.resultados.set([]);
    this.mostrandoResultados.set(false);
    this.entidadSeleccionada.set(null);
    this.prestamosOperables.set([]);
    this.prestamoVigente.set(null);
    this.cuotasPorPrestamo.set({});
    this.pagosPorCuota.set({});
    this.prestamosConPagos.set([]);
    this.saldosAporte.set([]);
    this.historico.set(null);
    this.resetAsignacion();
    this.montoTotalTexto.set('$0.00');
    this.numeroReferencia.set('');
    this.observacion = '';
    this.fechaPago.set(new Date());
    this.archivoComprobante.set(null);
  }

  seleccionarEntidad(entidad: Entidad): void {
    this.entidadSeleccionada.set(entidad);
    this.mostrandoResultados.set(false);
    this.registrando.set(false);
    this.resetAsignacion();
    this.cargarDatosParticipante(entidad);
  }

  volverABuscar(): void {
    this.mostrandoResultados.set(true);
    this.entidadSeleccionada.set(null);
  }

  private cargarDatosParticipante(entidad: Entidad): void {
    this.prestamosOperables.set([]);
    this.prestamoVigente.set(null);
    this.cuotasPorPrestamo.set({});
    this.pagosPorCuota.set({});
    this.prestamosConPagos.set([]);
    this.saldosAporte.set([]);
    this.historico.set(null);

    this.cargarPrestamos(entidad.codigo);
    this.cargarSaldosAporte(entidad.codigo);

    if (entidad.numeroIdentificacion) {
      const criterioCedula = new DatosBusqueda();
      criterioCedula.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'cedula', entidad.numeroIdentificacion, TipoComandosBusqueda.IGUAL);
      this.historicoService.selectByCriteria([criterioCedula]).subscribe({
        next: (registros) => {
          const masReciente = (registros ?? []).sort((a, b) => (b.idCarga ?? 0) - (a.idCarga ?? 0))[0] ?? null;
          this.historico.set(masReciente);
        },
        // No bloquea la pantalla: si el histórico no responde, el valor mensual simplemente queda en 0.
        error: () => {},
      });
    }

    this.cargarCuentasAsoprep();
  }

  /**
   * Trae los préstamos del partícipe y descarta los terminales por `idEstado`.
   *
   * El filtro va del lado del cliente a propósito: el estado operativo que evalúan los servicios
   * de pago está en `PRST.idEstado` (valores 1, 2, 8 y 11 admiten operaciones), que es una columna
   * distinta de `estadoPrestamo`. Filtrar por `estadoPrestamo = 2` en el criterio de búsqueda,
   * como hacía antes esta pantalla, dejaba fuera los créditos de plazo vencido y en mora, que sí
   * se pueden cobrar.
   */
  private cargarPrestamos(codigoEntidad: number): void {
    const criterioEntidad = new DatosBusqueda();
    criterioEntidad.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'entidad', 'codigo', String(codigoEntidad), TipoComandosBusqueda.IGUAL);

    const criterioOrdenPrestamo = new DatosBusqueda();
    criterioOrdenPrestamo.orderBy('codigo');
    criterioOrdenPrestamo.setTipoOrden(DatosBusqueda.ORDER_DESC);

    this.cargandoPrestamos.set(true);
    this.prestamoService.selectByCriteria([criterioEntidad, criterioOrdenPrestamo]).subscribe({
      next: (prestamos) => {
        this.cargandoPrestamos.set(false);
        const operables = (prestamos ?? []).filter((p) => admiteOperaciones(p.idEstado));
        this.prestamosOperables.set(operables);
        // Se conserva el préstamo elegido si sigue estando: recargar tras una operación no debe
        // mover al usuario a otro crédito.
        const codigoActual = this.prestamoVigente()?.codigo;
        const seleccionado = operables.find((p) => p.codigo === codigoActual) ?? operables[0] ?? null;
        this.prestamoVigente.set(seleccionado);
        // Se descarta el cache anterior antes de recargar: tras un pago o un abono las cuotas
        // cambiaron (y en el abono hasta los códigos), así que reusarlas mostraría datos viejos.
        this.cuotasPorPrestamo.set({});
        this.pagosPorCuota.set({});
        this.prestamosConPagos.set([]);
        // Se piden las cuotas de todos los créditos operables, no solo el elegido: los chips del
        // selector muestran el saldo de cada uno y ese saldo se calcula desde sus cuotas y pagos.
        this.cargandoPagos.set(operables.length > 0);
        for (const p of operables) {
          this.cargarCuotas(p);
          this.cargarPagos(p);
        }
      },
      error: () => {
        this.cargandoPrestamos.set(false);
        this.snackBar.open('No se pudo cargar el préstamo del partícipe.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  /**
   * Cuentas de ASOPREP que pueden recibir el cobro: vigentes (CNBCESTD = 1) y habilitadas para
   * cobro de crédito (CNBCCBCR = 1). El filtro va en el criterio de búsqueda, no del lado del
   * cliente: `getAll` trae todas las cuentas de tesorería, incluidas las de pagos y las dadas de
   * baja, y ninguna de esas es un destino válido para un cobro de préstamo.
   */
  private cargarCuentasAsoprep(): void {
    const criterioEstado = new DatosBusqueda();
    criterioEstado.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'estado', '1', TipoComandosBusqueda.IGUAL);

    const criterioCobroCredito = new DatosBusqueda();
    criterioCobroCredito.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'cobroCredito', '1', TipoComandosBusqueda.IGUAL);

    this.cuentaBancariaService.selectByCriteria([criterioEstado, criterioCobroCredito]).subscribe({
      next: (cuentas) => {
        const habilitadas = (cuentas ?? []).filter(
          (c) => Number(c.estado) === 1 && Number(c.cobroCredito) === 1
        );
        this.cuentasBancarias.set(habilitadas);
        if (!habilitadas.length) {
          this.snackBar.open(
            'No hay cuentas de ASOPREP habilitadas para cobro de crédito. Revise la parametrización de cuentas bancarias.',
            'Cerrar',
            { duration: 6000 }
          );
        }
      },
      error: () => this.snackBar.open('No se pudieron cargar las cuentas bancarias de ASOPREP.', 'Cerrar', { duration: 4000 }),
    });
  }

  /**
   * Check/monto ya cargados para el préstamo, por código: cuando el partícipe tiene varios créditos
   * operables, el operador puede ir cargando montos en más de uno antes de confirmar (préstamo por
   * préstamo, ver `registrarCobro`) y necesita encontrar lo que ya escribió al volver a uno.
   */
  private prestamoAsignacionGuardada: Record<number, { checked: boolean; montoTexto: string }> = {};

  seleccionarPrestamo(prestamo: Prestamo): void {
    // Se guarda lo que el operador ya cargó para el préstamo que se deja: antes esto se borraba al
    // cambiar de crédito, lo que impedía cargar valores en más de uno antes de confirmar.
    const anterior = this.prestamoVigente();
    if (anterior) {
      this.prestamoAsignacionGuardada[anterior.codigo] = {
        checked: this.cuentaChecked.prestamo,
        montoTexto: this.cuentaMontoTexto.prestamo,
      };
    }

    this.prestamoVigente.set(prestamo);
    // Las cuotas y los pagos de todos los créditos operables ya se cargaron; solo se repite el
    // pedido si el elegido todavía no está en el cache (p. ej. porque su llamada falló).
    if (!this.cuotasPorPrestamo()[prestamo.codigo]) this.cargarCuotas(prestamo);
    if (!this.pagosCargadosDe(prestamo)) {
      this.cargandoPagos.set(true);
      this.cargarPagos(prestamo);
    }

    const guardado = this.prestamoAsignacionGuardada[prestamo.codigo];
    this.cuentaChecked.prestamo = guardado?.checked ?? false;
    this.cuentaMontoTexto.prestamo = guardado?.montoTexto ?? '';
    this.cuentaMontoVersion.update((v) => v + 1);
  }

  /**
   * Monto cargado para este préstamo específico, esté vigente o no: para el vigente lee el estado
   * en vivo (`cuentaChecked.prestamo`/`cuentaMontoTexto.prestamo`); para los demás, lo que quedó en
   * `prestamoAsignacionGuardada` la última vez que se dejó de mirar. Es 0 si no está marcado.
   */
  montoIncluidoDe(prestamo: Prestamo): number {
    this.cuentaMontoVersion();
    if (this.prestamoVigente()?.codigo === prestamo.codigo) {
      return this.cuentaChecked.prestamo ? this.parseMoneda(this.cuentaMontoTexto.prestamo) : 0;
    }
    const guardado = this.prestamoAsignacionGuardada[prestamo.codigo];
    return guardado?.checked ? this.parseMoneda(guardado.montoTexto) : 0;
  }

  /**
   * Préstamos del partícipe con un monto cargado (marcados y con valor > 0), sea el vigente o
   * cualquier otro que el operador haya dejado con datos al cambiar de crédito. Es la base del
   * bloque de confirmación de la operación completa: 0, 1 o varios préstamos, todos con el mismo
   * botón (ver `registrarCobro`).
   */
  prestamosIncluidos = computed<{ prestamo: Prestamo; monto: number }[]>(() => {
    this.cuentaMontoVersion();
    return this.prestamosOperables()
      .map((prestamo) => ({ prestamo, monto: this.montoIncluidoDe(prestamo) }))
      .filter((item) => item.monto > 0.004);
  });

  /** Suma de `prestamosIncluidos()`: la parte de la operación que va a préstamos. */
  montoTotalPrestamosIncluidos = computed(() => +this.prestamosIncluidos().reduce((s, item) => s + item.monto, 0).toFixed(2));

  /** Quita un préstamo de la operación sin tener que seleccionarlo primero. */
  quitarPrestamoIncluido(prestamo: Prestamo): void {
    if (this.prestamoVigente()?.codigo === prestamo.codigo) {
      this.cuentaChecked.prestamo = false;
      this.cuentaMontoTexto.prestamo = '';
    } else {
      delete this.prestamoAsignacionGuardada[prestamo.codigo];
    }
    this.cuentaMontoVersion.update((v) => v + 1);
  }


  /**
   * Saldos por tipo de aporte agregados en la base de datos. Sustituye a la descarga completa de
   * CRD.APRT que hacía esta pantalla, que es la causa conocida del OutOfMemoryError de WildFly.
   */
  private cargarSaldosAporte(codigoEntidad: number): void {
    this.cargandoSaldos.set(true);
    this.operaciones.saldosPorEntidad(codigoEntidad).subscribe((resp) => {
      this.cargandoSaldos.set(false);
      if (resp.exito) {
        this.saldosAporte.set(resp.resultado ?? []);
      } else {
        this.saldosAporte.set([]);
        this.snackBar.open(`No se pudieron cargar los saldos de aportes: ${mensajeDeRespuesta(resp)}`, 'Cerrar', { duration: 5000 });
      }
    });
  }

  /**
   * Trae la tabla de amortización COMPLETA del préstamo, ordenada por número de cuota.
   *
   * Antes se pedía solo `saldo > 0`. Con ese filtro la pantalla no podía distinguir una cuota
   * pagada de una que nunca existió: todas las que llegaban se pintaban como «Pendiente» y no había
   * forma de ver hasta qué cuota está cubierto el crédito. Ahora llegan todas y el estado real
   * (DTPRESTD) decide cuáles siguen cobrables.
   */
  private cargarCuotas(prestamo: Prestamo): void {
    const criterioPrestamo = new DatosBusqueda();
    criterioPrestamo.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'prestamo', 'codigo', String(prestamo.codigo), TipoComandosBusqueda.IGUAL);

    const criterioOrdenCuota = new DatosBusqueda();
    criterioOrdenCuota.orderBy('numeroCuota');
    criterioOrdenCuota.setTipoOrden(DatosBusqueda.ORDER_ASC);

    this.detallePrestamoService.selectByCriteria([criterioPrestamo, criterioOrdenCuota]).subscribe({
      next: (cuotas) => {
        const ordenadas = [...(cuotas ?? [])]
          .map((c) => this.normalizarCuota(c))
          .sort((a, b) => (a.numeroCuota ?? 0) - (b.numeroCuota ?? 0));
        this.cuotasPorPrestamo.update((mapa) => ({ ...mapa, [prestamo.codigo]: ordenadas }));
      },
      error: () => this.snackBar.open('No se pudo cargar el detalle de cuotas del préstamo.', 'Cerrar', { duration: 4000 }),
    });
  }

  /** Consultas de pagos todavía en vuelo; mientras haya alguna, la pantalla sigue en «cargando». */
  private pagosEnVuelo = 0;

  /**
   * Trae los pagos de CRD.PGPR del préstamo y los acumula por cuota.
   *
   * Se descargan todos los pagos del crédito de una sola vez, no cuota por cuota: el partícipe puede
   * tener más de cien cuotas y una consulta por cada una dejaría la pantalla haciendo cientos de
   * llamadas para pintar un número.
   *
   * Solo cuentan los pagos vigentes: un pago anulado se revirtió, y sumarlo daría por cubierto algo
   * que se volvió a deber. `pagoVigente()` trata como vigente el pago sin la columna `anulado`,
   * igual que el `anulado IS NULL OR anulado = 0` del backend.
   *
   * Si la consulta falla, el préstamo NO se marca como cargado: es preferible que la pantalla siga
   * mostrando los saldos de PRST y oculte el indicador de puesta al día, a afirmar que se debe el
   * crédito completo porque no se pudieron leer los pagos.
   */
  private cargarPagos(prestamo: Prestamo): void {
    const criterioPrestamo = new DatosBusqueda();
    criterioPrestamo.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'prestamo', 'codigo', String(prestamo.codigo), TipoComandosBusqueda.IGUAL);

    this.pagosEnVuelo++;
    this.pagoPrestamoService.selectByCriteria([criterioPrestamo]).subscribe({
      next: (pagos) => {
        const acumulado = this.saldoPrestamo.acumularPagosPorCuota(pagos);

        this.pagosPorCuota.update((mapa) => ({ ...mapa, ...acumulado }));
        this.prestamosConPagos.update((codigos) =>
          codigos.includes(prestamo.codigo) ? codigos : [...codigos, prestamo.codigo]
        );
        this.terminarCargaPagos();
      },
      error: () => {
        this.terminarCargaPagos();
        this.snackBar.open(
          'No se pudieron cargar los pagos registrados del préstamo: no se puede calcular el valor para ponerse al día.',
          'Cerrar',
          { duration: 5000 }
        );
      },
    });
  }

  private terminarCargaPagos(): void {
    this.pagosEnVuelo = Math.max(this.pagosEnVuelo - 1, 0);
    if (this.pagosEnVuelo === 0) this.cargandoPagos.set(false);
  }

  // ================= estado y saldos reales de las cuotas =================

  /**
   * Las fechas del backend llegan como `LocalDateTime` de Java en tres formas posibles (arreglo
   * `[y,m,d,...]`, string formateado o `Date`). El pipe `date` no entiende el arreglo y deja la
   * celda en blanco, así que se normalizan al recibirlas.
   */
  private normalizarCuota(cuota: DetallePrestamo): DetallePrestamo {
    return {
      ...cuota,
      fechaVencimiento: this.funcionesDatos.convertirFechaDesdeBackend(cuota.fechaVencimiento) as Date,
      fechaPagado: this.funcionesDatos.convertirFechaDesdeBackend(cuota.fechaPagado) as Date,
    };
  }

  /**
   * Vencimiento de la cuota como `Date` utilizable, o `null`.
   *
   * `normalizarCuota` castea el resultado a `Date`, pero `convertirFechaDesdeBackend` devuelve
   * `null` cuando el dato no vino o no se pudo parsear: comparar ese `null` con una fecha daría
   * `NaN` y la cuota se contaría o no según el operador, así que se descarta explícitamente.
   */
  private fechaVencimientoDe(cuota: DetallePrestamo): Date | null {
    const fecha = cuota.fechaVencimiento as unknown;
    return fecha instanceof Date && !isNaN(fecha.getTime()) ? fecha : null;
  }

  /**
   * ¿La cuota ya no admite aplicación de pagos? Delegado en `SaldoPrestamoService` para que
   * cobros-personales y cruce-de-valores compartan el mismo criterio.
   */
  private esCuotaLiquidada(cuota: DetallePrestamo): boolean {
    return this.saldoPrestamo.esCuotaLiquidada(cuota);
  }

  /** Capital que sigue vivo en la cuota. Ver `SaldoPrestamoService.capitalPendienteDe`. */
  private capitalPendienteDe(cuota: DetallePrestamo): number {
    return this.saldoPrestamo.capitalPendienteDe(cuota, this.pagosPorCuota());
  }

  /**
   * Valor de la cuota tal como lo cobra el sistema: el campo `total` (DTPRTTLL), que el backend
   * arma como `cuota + desgravamen + valorSeguroIncendio` (`PrestamoServiceImpl.java:223`).
   *
   * NO se usa `Prestamo.valorCuota` (PRSTVLCT): esa columna es solo capital + interés y deja fuera
   * el desgravamen y el seguro de incendio, así que subestima lo que el socio tiene que pagar.
   */
  valorCuotaDe(cuota: DetallePrestamo | null | undefined): number {
    if (!cuota) return 0;
    if (cuota.total != null) return +cuota.total.toFixed(2);
    // Dato legado sin DTPRTTLL: mismo respaldo que el motor de pagos (MotorPagoPrestamoServiceImpl.java:108-115).
    return +(
      (cuota.capital ?? 0) +
      (cuota.interes ?? 0) +
      (cuota.desgravamen ?? 0) +
      (cuota.valorSeguroIncendio ?? 0)
    ).toFixed(2);
  }

  /** Deuda que queda en la cuota. Ver `SaldoPrestamoService.saldoPendienteDe`. */
  private saldoPendienteDe(cuota: DetallePrestamo): number {
    return this.saldoPrestamo.saldoPendienteDe(cuota, this.pagosPorCuota());
  }

  /** Cuotas ya descargadas del préstamo, o `undefined` si su pedido todavía no volvió. */
  private cuotasDe(prestamo: Prestamo | null): DetallePrestamo[] | undefined {
    return prestamo ? this.cuotasPorPrestamo()[prestamo.codigo] : undefined;
  }

  /** ¿Ya llegaron los pagos vigentes de este crédito? Sin ellos todo pendiente saldría inflado. */
  private pagosCargadosDe(prestamo: Prestamo | null): boolean {
    return !!prestamo && this.prestamosConPagos().includes(prestamo.codigo);
  }

  /**
   * Saldo total vigente. Ver `SaldoPrestamoService.saldoTotalDe`: mientras las cuotas y los pagos
   * no hayan llegado se muestra el valor almacenado en PRST para no dejar la celda en $0.00.
   */
  saldoTotalDe(prestamo: Prestamo | null): number {
    return this.saldoPrestamo.saldoTotalDe(prestamo, this.cuotasDe(prestamo), this.pagosPorCuota(), this.pagosCargadosDe(prestamo));
  }

  /** Saldo de capital vigente. Ver `SaldoPrestamoService.saldoCapitalDe`. */
  saldoCapitalDe(prestamo: Prestamo | null): number {
    return this.saldoPrestamo.saldoCapitalDe(prestamo, this.cuotasDe(prestamo), this.pagosPorCuota(), this.pagosCargadosDe(prestamo));
  }

  /** Pendiente de una cuota, para mostrarlo en la plantilla. */
  pendienteDeCuota(cuota: DetallePrestamo | null): number {
    return cuota ? this.saldoPendienteDe(cuota) : 0;
  }

  /** Nombre del estado real de la cuota, para la columna «Estado» del detalle. */
  nombreEstadoCuota(estado: number | null): string {
    return estado != null ? (NOMBRES_ESTADO_CUOTA[estado] ?? `Estado ${estado}`) : 'Pendiente';
  }

  /** Sufijo de clase CSS del estado real de la cuota. */
  claseEstadoCuota(estado: number | null): string {
    return estado != null ? (CLASES_ESTADO_CUOTA[estado] ?? 'pendiente') : 'pendiente';
  }

  /** Busca el saldo del tipo de aporte cuyo nombre contiene el fragmento (sin tildes, minúsculas). */
  private saldoPorNombre(fragmento: string): number {
    const encontrado = this.saldosAporte().find((a) =>
      (a.nombre ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(fragmento)
    );
    return Math.max(encontrado?.saldo ?? 0, 0);
  }

  /** idTipoAporte del tipo que corresponde a la cuenta de origen elegida para el débito. */
  private idTipoAportePara(clave: 'cesantia' | 'jubilacion'): number | null {
    const fragmento = clave === 'cesantia' ? 'cesant' : 'jubila';
    const encontrado = this.saldosAporte().find((a) =>
      (a.nombre ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(fragmento)
    );
    return encontrado?.idTipoAporte ?? null;
  }

  // ================= asignación por cuenta =================

  toggleCuenta(key: CuentaKey, checked: boolean): void {
    this.cuentaChecked[key] = checked;
    if (checked) {
      const otras = (['prestamo', 'cesantia', 'jubilacion'] as CuentaKey[])
        .filter((k) => k !== key && this.cuentaChecked[k])
        .reduce((s, k) => s + this.parseMoneda(this.cuentaMontoTexto[k]), 0);
      const restante = Math.max(this.montoTotal() - otras, 0);
      this.cuentaMontoTexto[key] = this.formatMoneda(restante);
    } else {
      this.cuentaMontoTexto[key] = '';
    }

    if (key === 'prestamo' && !checked && this.metodoPago() === 'debito') {
      this.metodoPago.set('transferencia');
    }

    this.cuentaMontoVersion.update((v) => v + 1);
  }

  onMontoCuentaCambio(): void {
    this.cuentaMontoVersion.update((v) => v + 1);
  }

  onMontoCuentaBlur(key: CuentaKey): void {
    const v = Math.max(this.parseMoneda(this.cuentaMontoTexto[key]), 0);
    this.cuentaMontoTexto[key] = this.formatMoneda(v);
    this.cuentaMontoVersion.update((n) => n + 1);
  }

  onMontoTotalBlur(): void {
    this.montoTotalTexto.set(this.formatMoneda(Math.max(this.montoTotal(), 0)));
    this.sincronizarCuentaUnica();
  }

  /** El campo «Monto del pago» cambió: se reasigna y se recomputan los indicadores. */
  onMontoTotalCambio(): void {
    this.sincronizarCuentaUnica();
    this.cuentaMontoVersion.update((v) => v + 1);
  }

  /**
   * El monto del pago es el dato maestro: cuando cambia y hay UNA sola cuenta marcada, se le asigna
   * entero.
   *
   * Sin esto, marcar la cuenta antes de teclear el monto —o corregir el monto después de haberlo
   * repartido— dejaba la fila con el valor viejo y el cobro quedaba sin poder confirmarse hasta
   * reasignar a mano. Con dos o más cuentas marcadas no se toca nada: el reparto lo decide el
   * usuario y no hay forma de adivinarlo.
   */
  private sincronizarCuentaUnica(): void {
    const marcadas = (['prestamo', 'cesantia', 'jubilacion'] as CuentaKey[]).filter((k) => this.cuentaChecked[k]);
    if (marcadas.length !== 1) return;
    this.cuentaMontoTexto[marcadas[0]] = this.formatMoneda(Math.max(this.montoTotal(), 0));
  }

  toggleDetallePrestamo(): void {
    this.detallePrestamoAbierto.update((v) => !v);
  }

  private resetAsignacion(): void {
    this.cuentaChecked = { prestamo: false, cesantia: false, jubilacion: false };
    this.cuentaMontoTexto = { prestamo: '', cesantia: '', jubilacion: '' };
    this.prestamoAsignacionGuardada = {};
    this.detallePrestamoAbierto.set(false);
    this.metodoPago.set('transferencia');
    this.errorOperacion.set(null);
    this.errorCodigo.set(null);
    this.cuentaMontoVersion.update((v) => v + 1);
  }

  // ================= cobertura: préstamo (cronológico, sobre cuotas reales) =================

  /**
   * Detalle de TODAS las cuotas del crédito con su estado real, más la vista previa de cómo caería
   * el monto asignado sobre las que siguen pendientes.
   *
   * Las liquidadas (pagadas y canceladas anticipadamente) se incluyen para que se vea hasta dónde
   * está cubierto el préstamo; el monto solo se reparte sobre las pendientes, en el mismo orden en
   * que el backend las cobra (número de cuota ascendente, la más antigua primero).
   *
   * La distribución es una estimación por saldo de cuota: el reparto real lo hace el backend con la
   * prelación desgravamen → mora → interés vencido → interés → capital → seguro, y el desglose
   * exacto llega en la respuesta del pago.
   */
  private calcularAsignacionPrestamo(monto: number): AsignacionCuota[] {
    let restante = monto;
    const codigoProxima = this.proximaCuota()?.codigo;
    const asignaciones: AsignacionCuota[] = [];

    for (const cuota of this.cuotasPrestamo()) {
      const estadoCuota = obtenerCodigoEstadoCuota(cuota);
      const liquidada = this.esCuotaLiquidada(cuota);
      // Devuelve 0 en las liquidadas: el estado ya las da por cubiertas, no se revisan sus pagos.
      const pendiente = this.saldoPendienteDe(cuota);

      let aplicado = 0;
      let resultado: AsignacionCuota['resultado'] = 'pendiente';

      if (!liquidada) {
        if (restante >= pendiente - 0.004 && pendiente > 0) {
          aplicado = pendiente;
          resultado = 'cubierta';
          restante = +(restante - pendiente).toFixed(2);
        } else if (restante > 0.004) {
          aplicado = +restante.toFixed(2);
          resultado = 'parcial';
          restante = 0;
        }
      }

      asignaciones.push({
        cuota,
        aplicado,
        pendiente,
        estadoCuota,
        liquidada,
        esProxima: !liquidada && cuota.codigo === codigoProxima,
        resultado,
      });
    }
    return asignaciones;
  }

  // ================= cobertura: aportes (mensual, sobre el valor del histórico) =================

  calcularCoberturaAporte(monto: number, valorMensual: number): { mensajeHtml: string } | null {
    if (monto <= 0 || valorMensual <= 0) return null;
    const mesesCompletos = Math.floor((monto + 0.004) / valorMensual);
    const residuo = +(monto - mesesCompletos * valorMensual).toFixed(2);
    if (mesesCompletos > 0 && residuo < 0.005) {
      return { mensajeHtml: `Este pago cubre completamente <b>${mesesCompletos}</b> mes(es) de aporte.` };
    }
    if (mesesCompletos > 0) {
      return {
        mensajeHtml: `Este pago cubre completamente ${mesesCompletos} mes(es) y aplica <b>${this.formatMoneda(residuo)}</b> de ${this.formatMoneda(valorMensual)} al siguiente mes.`,
      };
    }
    return { mensajeHtml: `Este pago cubre parcialmente el mes en curso, aplicando ${this.formatMoneda(residuo)} de ${this.formatMoneda(valorMensual)}.` };
  }

  // ================= archivo comprobante =================

  /** Valor del `accept` del input de comprobante. */
  readonly extensionesComprobante = this.comprobantes.extensionesAceptadas;

  /**
   * El `accept` del input es solo un filtro sugerido en el diálogo del sistema —el usuario puede
   * cambiarlo a «todos los archivos»—, así que el archivo se vuelve a verificar acá. Se rechaza al
   * seleccionarlo y no al confirmar: para entonces el cobro ya está registrado y el comprobante
   * quedaría sin subir.
   */
  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;

    if (file) {
      const problema = this.comprobantes.problemaDelArchivo(file);
      if (problema) {
        input.value = '';
        this.snackBar.open(problema, 'Cerrar', { duration: 5000 });
        return;
      }
    }

    this.archivoComprobante.set(file);
  }

  // ================= confirmar pago =================

  /**
   * Confirma el cobro. Son dos etapas encadenadas:
   *
   * 1. **Archivar el comprobante.** `rutaDocumentoRespaldo` viaja dentro del request del pago, así
   *    que el archivo tiene que estar en el servidor antes de llamar al endpoint. Si no se puede
   *    subir se aborta acá, sin haber tocado plata: es preferible a dejar el pago registrado y sin
   *    respaldo, que es exactamente lo que la ruta en `PGPRRTRS`/`PGAPRTRS` viene a evitar.
   * 2. **Registrar el cobro**, con esa ruta estampada en cada pago que se genere.
   */
  confirmarPago(): void {
    if (!this.puedeConfirmar()) return;
    const entidad = this.entidadSeleccionada();
    if (!entidad) return;

    this.errorOperacion.set(null);
    this.errorCodigo.set(null);

    const aportes = this.aportesARegistrar();
    if (aportes === null) {
      this.errorOperacion.set(
        'No se encontró el tipo de aporte de cesantía o jubilación entre los tipos vigentes del partícipe. Actualice los saldos e intente nuevamente.'
      );
      return;
    }

    // Uno, varios o ninguno: el mismo botón cubre los tres casos (ver `registrarCobro`).
    const prestamos = this.cobraPrestamo() ? this.prestamosIncluidos() : [];

    this.registrando.set(true);
    this.subirComprobante(prestamos, entidad.codigo, (ruta, exito) => {
      if (!exito) {
        this.registrando.set(false);
        return;
      }
      this.registrarCobro(entidad, prestamos, aportes, ruta);
    });
  }

  /**
   * Registra el cobro completo con el comprobante ya archivado.
   *
   * - Ningún préstamo: solo aportes del socio. `REGISTRO_APORTE` no migró todavía a CBCR — sigue
   *   aplicando en el acto con `registrarAporte`.
   * - Débito de cuenta de aportes (solo con un préstamo — el método de pago lo bloquea con varios):
   *   no entra dinero al banco, queda fuera del circuito por decisión del usuario del 2026-08-18
   *   (docs/crd/PLAN-CUTOVER-COBROS-POR-CONTABILIDAD.md §1) — sigue con `pagarConAportes`.
   * - Todo lo demás —un préstamo, varios, con o sin aportes combinados, en efectivo/transferencia/
   *   depósito— es dinero real entrando al banco: ya pasa por `CRD.CBCR` (`PAGO_CUOTA`/
   *   `PAGO_MULTIPLE`/`COBRO_MIXTO` según el caso).
   */
  private registrarCobro(
    entidad: Entidad,
    prestamos: { prestamo: Prestamo; monto: number }[],
    aportes: { clave: 'cesantia' | 'jubilacion'; idTipoAporte: number; valor: number }[],
    rutaDocumentoRespaldo: string | null
  ): void {
    const usuario = usuarioSesion();
    const fecha = this.operaciones.formatearFecha(this.fechaPago());
    const observacion = this.armarObservacion();

    // Cobro solo de aportes: no hay préstamo de por medio.
    if (!prestamos.length) {
      this.registrarAportesDelSocio(entidad.codigo, aportes, usuario, observacion, fecha, rutaDocumentoRespaldo, (registrados) => {
        this.registrando.set(false);
        this.mostrarRecibo('REGISTRO_APORTE', undefined, fecha, undefined, [], registrados, rutaDocumentoRespaldo);
      });
      return;
    }

    if (this.metodoPago() === 'debito') {
      const prestamo = prestamos[0].prestamo;
      const monto = +prestamos[0].monto.toFixed(2);
      const idTipoAporte = this.idTipoAportePara(this.cuentaOrigenAporte());
      if (idTipoAporte == null) {
        this.registrando.set(false);
        this.errorOperacion.set(
          'No se encontró el tipo de aporte seleccionado entre los saldos vigentes del partícipe. Actualice los saldos e intente nuevamente.'
        );
        return;
      }

      this.operaciones
        .pagarConAportes({
          idPrestamo: prestamo.codigo,
          usuario,
          observacion,
          fechaPago: fecha,
          rutaDocumentoRespaldo,
          aportes: [{ idTipoAporte, valor: monto }],
        })
        .subscribe((resp) => {
          if (!resp.exito || !resp.resultado) {
            this.registrando.set(false);
            this.registrarError(resp.error, mensajeDeRespuesta(resp));
            if (resp.error === 'SALDO_APORTES_INSUFICIENTE' || resp.error === 'TIPO_APORTE_NO_VIGENTE') {
              this.cargarSaldosAporte(entidad.codigo);
            }
            this.descartarComprobanteHuerfano(rutaDocumentoRespaldo);
            return;
          }
          const pago = resp.resultado;
          const movimientos = resp.movimientosAporte ?? [];
          this.registrarAportesDelSocio(entidad.codigo, aportes, usuario, observacion, fecha, rutaDocumentoRespaldo, (registrados) => {
            this.registrando.set(false);
            this.mostrarRecibo('PAGO_APORTES', resp.mensaje, fecha, pago, movimientos, registrados, rutaDocumentoRespaldo);
          });
        });
      return;
    }

    this.registrarCobroCreditoUnificado(entidad, prestamos, aportes, usuario, observacion, fecha, rutaDocumentoRespaldo);
  }

  /**
   * Dinero real entrando al banco, a través de CRD.CBCR: cubre `PAGO_CUOTA` (un préstamo, sin
   * aportes), `PAGO_MULTIPLE` (varios préstamos, sin aportes) y `COBRO_MIXTO` (uno o varios
   * préstamos MÁS aportes del socio en el mismo depósito) —
   * docs/crd/PLAN-CUTOVER-COBROS-POR-CONTABILIDAD.md y docs/crd/API-COBROS-APROBACION-CONTABILIDAD.md
   * §2. El cobro queda REGISTRADO, pendiente de aprobación: ningún préstamo se modifica y ningún
   * aporte se acredita todavía, así que el diálogo de resultado muestra el detalle completo
   * —préstamos y aportes por separado— pero encabezado como REGISTRADO, no como aplicado.
   */
  private registrarCobroCreditoUnificado(
    entidad: Entidad,
    prestamos: { prestamo: Prestamo; monto: number }[],
    aportes: { clave: 'cesantia' | 'jubilacion'; idTipoAporte: number; valor: number }[],
    usuario: string,
    observacion: string | null,
    fecha: string | null,
    rutaDocumentoRespaldo: string | null
  ): void {
    const cuenta = this.cuentaAsopropDestino();
    // Defensivo: `motivosNoConfirmar()` ya exige cuenta, referencia, comprobante y fecha antes de
    // habilitar el botón — no debería poder llegar acá sin ellos.
    if (!cuenta || !fecha || !rutaDocumentoRespaldo) {
      this.registrando.set(false);
      this.errorOperacion.set('Faltan datos del respaldo del cobro. Intente nuevamente.');
      this.descartarComprobanteHuerfano(rutaDocumentoRespaldo);
      return;
    }

    const tipoOperacion: TipoOperacionCobro = aportes.length
      ? 'COBRO_MIXTO'
      : prestamos.length > 1
        ? 'PAGO_MULTIPLE'
        : 'PAGO_CUOTA';

    // periodoDevengo: primer día del mes de la fecha del pago (docs/crd/PLAN-APORTES-DEVENGO-CONTRATOS.md
    // D3). Esta pantalla todavía no tiene un selector de período —el devengo es un frente aparte, en
    // curso— así que se asume que el aporte es del mes en que se recibe: es el caso normal de
    // ventanilla, y el único que esta pantalla puede expresar hoy.
    const periodoDevengo = `${(fecha ?? '').slice(0, 7)}-01`;

    const detalles: DetalleCobroCredito[] = [
      ...prestamos.map(({ prestamo, monto }) => ({ idPrestamo: prestamo.codigo, valor: +monto.toFixed(2) })),
      ...aportes.map((a) => ({ idTipoAporte: a.idTipoAporte, periodoDevengo, valor: +a.valor.toFixed(2) })),
    ];
    const valorTotal = +detalles.reduce((s, d) => s + d.valor, 0).toFixed(2);

    this.cobroCreditoService
      .registrar({
        idEntidad: entidad.codigo,
        tipoOperacion,
        idCuentaBancaria: cuenta.codigo,
        referencia: this.numeroReferencia().trim(),
        rutaRespaldo: rutaDocumentoRespaldo,
        valor: valorTotal,
        fecha,
        observacion,
        usuario,
        detalles,
      })
      .subscribe((resp) => {
        this.registrando.set(false);
        if (!resp.exito || !resp.resultado) {
          this.errorOperacion.set(resp.mensaje ?? 'No se pudo registrar el cobro.');
          this.descartarComprobanteHuerfano(rutaDocumentoRespaldo);
          return;
        }

        const registro = resp.resultado;
        const lineasDetalle: CobroRegistradoDetalleLinea[] = [
          ...prestamos.map(({ prestamo, monto }) => ({
            tipo: 'prestamo' as const,
            etiqueta: `Préstamo #${prestamo.idAsoprep ?? prestamo.codigo}`,
            valor: +monto.toFixed(2),
          })),
          ...aportes.map((a) => ({
            tipo: 'aporte' as const,
            etiqueta: this.nombreAporte(a.idTipoAporte, a.clave),
            valor: +a.valor.toFixed(2),
          })),
        ];
        const esMultilinea = prestamos.length > 1 || aportes.length > 0;

        this.dialog.open(CobroRegistradoDialogComponent, {
          data: {
            tipoOperacion,
            idCobro: registro.idCobro,
            valor: registro.valor,
            contabilidadActiva: registro.contabilidadActiva,
            tituloPrestamo: prestamos.length === 1 && !esMultilinea ? this.tituloPrestamo() : undefined,
            participante: entidad.razonSocial,
            fecha,
            referencia: this.numeroReferencia().trim(),
            detalles: esMultilinea ? lineasDetalle : undefined,
          },
          width: esMultilinea ? '760px' : '640px',
          maxWidth: '96vw',
          autoFocus: false,
        });

        this.resetAsignacion();
        this.montoTotalTexto.set('$0.00');
        this.numeroReferencia.set('');
        this.observacion = '';
        this.archivoComprobante.set(null);
      });
  }

  /** Nombre del tipo de aporte, para el detalle del diálogo de resultado. */
  private nombreAporte(idTipoAporte: number, clave: 'cesantia' | 'jubilacion'): string {
    return (
      this.saldosAporte().find((a) => a.idTipoAporte === idTipoAporte)?.nombre ??
      (clave === 'cesantia' ? 'Cesantía' : 'Jubilación')
    );
  }

  /**
   * Archiva el comprobante en el servidor y llama a `continuar(ruta, exito)`.
   *
   * `exito` es `false` solo si había un archivo que subir y la subida falló; con `true` la ruta
   * puede venir en `null` porque el método de pago no exige comprobante (débito de aportes).
   *
   * El vínculo con la operación queda en el otro sentido: el `PagoPrestamo`/`PagoAporte` guarda
   * esta ruta en `PGPRRTRS`/`PGAPRTRS`.
   *
   * @param idPrestamo `null` en un cobro que es solo de aportes: ahí no hay carpeta de préstamo.
   */
  private subirComprobante(
    prestamos: { prestamo: Prestamo; monto: number }[],
    idEntidad: number,
    continuar: (ruta: string | null, exito: boolean) => void
  ): void {
    const archivo = this.archivoComprobante();
    if (!archivo || !this.requiereComprobante()) {
      continuar(null, true);
      return;
    }

    const carpeta =
      prestamos.length === 1
        ? this.comprobantes.carpetaDePrestamo(prestamos[0].prestamo.codigo)
        : prestamos.length > 1
          ? this.comprobantes.carpetaDeCobroMultiple(idEntidad)
          : this.comprobantes.carpetaDeAportes(idEntidad);
    const nombreBase =
      prestamos.length === 1
        ? `${prestamos[0].prestamo.codigo}`
        : prestamos.length > 1
          ? `MULTI-${idEntidad}`
          : `ENTD-${idEntidad}`;

    this.comprobantes.archivar(archivo, carpeta, nombreBase).subscribe((resultado) => {
      if (resultado.error || !resultado.ruta) {
        this.snackBar.open(this.comprobantes.mensajeDeFallo(resultado.error ?? ''), 'Cerrar', { duration: 10000 });
        continuar(null, false);
        return;
      }
      continuar(resultado.ruta, true);
    });
  }

  /**
   * Borra un comprobante que quedó subido pero cuyo pago no llegó a registrarse. Es limpieza: si
   * falla no hay nada que avisarle al usuario, que ya tiene el error del pago en pantalla.
   */
  private descartarComprobanteHuerfano(ruta: string | null): void {
    this.comprobantes.descartar(ruta);
  }

  /**
   * Renglones de aporte del socio a registrar, ya resueltos a su `idTipoAporte`.
   *
   * Devuelve `null` —y no una lista vacía— si alguno de los tipos marcados no se puede resolver
   * contra los tipos vigentes del partícipe: en ese caso no hay que llamar al backend con un id
   * inventado, hay que avisar y que el usuario recargue los saldos.
   */
  private aportesARegistrar(): { clave: 'cesantia' | 'jubilacion'; idTipoAporte: number; valor: number }[] | null {
    const renglones: { clave: 'cesantia' | 'jubilacion'; idTipoAporte: number; valor: number }[] = [];
    for (const clave of ['cesantia', 'jubilacion'] as const) {
      if (!this.cuentaChecked[clave]) continue;
      const valor = +this.parseMoneda(this.cuentaMontoTexto[clave]).toFixed(2);
      if (valor <= 0.004) continue;
      const idTipoAporte = this.idTipoAportePara(clave);
      if (idTipoAporte == null) return null;
      renglones.push({ clave, idTipoAporte, valor });
    }
    return renglones;
  }

  /**
   * Registra un aporte por tipo y llama a `continuar` con los que se guardaron.
   *
   * Cada renglón es su propia transacción: si uno falla, los anteriores ya quedaron guardados. Por
   * eso el fallo no aborta el flujo —el comprobante tiene que reflejar lo que realmente entró— sino
   * que se avisa aparte cuáles no se pudieron registrar.
   */
  private registrarAportesDelSocio(
    idEntidad: number,
    renglones: { clave: 'cesantia' | 'jubilacion'; idTipoAporte: number; valor: number }[],
    usuario: string,
    observacion: string | null,
    fecha: string | null,
    rutaDocumentoRespaldo: string | null,
    continuar: (registrados: ResultadoRegistroAporte[]) => void
  ): void {
    if (!renglones.length) {
      continuar([]);
      return;
    }

    const llamadas = renglones.map((r) =>
      this.operaciones.registrarAporte({
        idEntidad,
        idTipoAporte: r.idTipoAporte,
        valor: r.valor,
        usuario,
        observacion,
        fechaTransaccion: fecha,
        // El mismo comprobante respalda todos los renglones: es un solo recibo del socio.
        rutaDocumentoRespaldo,
      })
    );

    forkJoin(llamadas).subscribe((respuestas) => {
      const registrados: ResultadoRegistroAporte[] = [];
      const fallidos: string[] = [];
      respuestas.forEach((resp, i) => {
        if (resp.exito && resp.resultado) {
          registrados.push(resp.resultado);
        } else {
          fallidos.push(`${renglones[i].clave === 'cesantia' ? 'Cesantía' : 'Jubilación'} (${this.formatMoneda(renglones[i].valor)}): ${mensajeDeRespuesta(resp)}`);
        }
      });

      if (fallidos.length) {
        this.snackBar.open(`No se pudo registrar: ${fallidos.join(' · ')}`, 'Entendido', { duration: 12000 });
      }
      continuar(registrados);
    });
  }

  /** El backend guarda una sola observación: se le agregan los datos del comprobante. */
  private armarObservacion(): string | null {
    const partes: string[] = [];
    if (this.observacion.trim()) partes.push(this.observacion.trim());
    if (this.metodoPago() === 'transferencia') partes.push('Transferencia bancaria');
    if (this.metodoPago() === 'deposito') partes.push('Depósito directo');
    if (this.numeroReferencia().trim()) partes.push(`Ref. ${this.numeroReferencia().trim()}`);
    const cuenta = this.cuentaAsopropDestino();
    if (cuenta && this.metodoPago() !== 'debito') {
      partes.push(`Cta. ${cuenta.banco?.nombre ?? ''} ${cuenta.numeroCuenta ?? ''}`.trim());
    }
    const texto = partes.join(' · ');
    return texto ? texto.slice(0, 200) : null;
  }

  private mostrarRecibo(
    tipo: 'PAGO_MANUAL' | 'PAGO_APORTES' | 'REGISTRO_APORTE',
    mensaje: string | undefined,
    fecha: string | null,
    resultado: ResultadoPagoCuota | undefined,
    movimientosAporte: MovimientoAporte[],
    aportesRegistrados: ResultadoRegistroAporte[],
    rutaComprobante: string | null
  ): void {
    const nombres: Record<number, string> = {};
    for (const a of this.saldosAporte()) nombres[a.idTipoAporte] = a.nombre;

    const extras: { label: string; valor: string }[] = [];
    if (rutaComprobante) {
      // El cobro no llega hasta acá sin el comprobante archivado, así que la ruta es la definitiva:
      // la misma que quedó guardada en PGPRRTRS/PGAPRTRS.
      extras.push({ label: 'Comprobante adjunto', valor: this.archivoComprobante()?.name ?? '—' });
      extras.push({ label: 'Archivado en', valor: rutaComprobante });
    }

    this.dialog.open(ReciboOperacionDialogComponent, {
      data: {
        tipo,
        tituloPrestamo: tipo === 'REGISTRO_APORTE' ? 'Aportes del socio' : this.tituloPrestamo(),
        participante: this.entidadSeleccionada()?.razonSocial ?? undefined,
        mensaje,
        fecha: fecha ?? undefined,
        pago: resultado,
        movimientosAporte,
        aportesRegistrados: aportesRegistrados.length ? aportesRegistrados : undefined,
        nombresTipoAporte: nombres,
        detalleExtra: extras.length ? extras : undefined,
      },
      width: '880px',
      maxWidth: '96vw',
      autoFocus: false,
    });

    this.recargarPrestamo();
    this.resetAsignacion();
    this.montoTotalTexto.set('$0.00');
    this.numeroReferencia.set('');
    this.observacion = '';
    this.archivoComprobante.set(null);
  }

  private registrarError(codigo: string | undefined, mensaje: string): void {
    this.errorCodigo.set(String(codigo ?? ''));
    this.errorOperacion.set(mensaje);
  }

  /** Vuelve a leer préstamo, cuotas y saldos tras cualquier operación que los modifique. */
  private recargarPrestamo(): void {
    const entidad = this.entidadSeleccionada();
    if (!entidad) return;
    this.cargarPrestamos(entidad.codigo);
    this.cargarSaldosAporte(entidad.codigo);
  }

  // ================= operaciones sobre el préstamo =================

  /**
   * Contexto para los diálogos, con los saldos recalculados desde las cuotas. `contextoDesdePrestamo`
   * copia `saldoTotal`/`saldoCapital` de PRST, que están congelados desde la última carga de
   * Petrocomercial: si se pasaran tal cual, los diálogos mostrarían el capital de hace meses y
   * validarían contra una deuda que ya no existe.
   */
  private contextoActual(): ContextoPrestamo | null {
    const prestamo = this.prestamoVigente();
    if (!prestamo) return null;
    return {
      ...contextoDesdePrestamo(prestamo, this.entidadSeleccionada()?.razonSocial),
      saldoTotal: this.saldoTotalPrestamo(),
      saldoCapital: this.saldoCapitalPrestamo(),
      valorCuota: this.valorCuotaPrestamo(),
      pendientesAcumulados: this.pendientesAcumulados(),
      respaldoSugerido: this.respaldoSugerido(),
    };
  }

  /**
   * Banco, referencia y comprobante que ya se cargaron en la pantalla, para que los diálogos los
   * precarguen. En débito de aportes no hay nada que sugerir: el dinero no entró de fuera.
   */
  private respaldoSugerido() {
    if (this.metodoPago() === 'debito') return null;
    return {
      metodo: this.metodoPago() as MetodoCobro,
      cuenta: this.cuentaAsopropDestino(),
      referencia: this.numeroReferencia(),
      archivo: this.archivoComprobante(),
    };
  }

  tituloPrestamo(): string {
    return this.contextoActual()?.titulo ?? 'Préstamo';
  }

  /**
   * Monto con el que se precarga el campo de valor de los diálogos de operación. Se prefiere el
   * asignado a la fila del préstamo cuando existe (es el que realmente va al crédito) y si no, el
   * total tecleado en «Monto del pago».
   */
  private valorSugeridoParaDialogo(): number {
    const asignadoAlPrestamo = this.montoPrestamo();
    if (asignadoAlPrestamo > 0.004) return +asignadoAlPrestamo.toFixed(2);
    return +Math.max(this.montoTotal(), 0).toFixed(2);
  }

  abrirPago(modoInicial: 'efectivo' | 'aportes' = 'efectivo'): void {
    const contexto = this.contextoActual();
    if (!contexto) return;
    this.dialog
      .open(PagoPrestamoDialogComponent, {
        data: { ...contexto, modoInicial },
        width: '780px',
        maxWidth: '96vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((salida?: SalidaDialogoPago) => this.procesarSalida(salida));
  }

  abrirAbonoCapital(): void {
    const contexto = this.contextoActual();
    if (!contexto) return;
    this.dialog
      .open(AbonoCapitalDialogComponent, {
        data: { ...contexto, valorSugerido: this.valorSugeridoParaDialogo() },
        width: '820px',
        maxWidth: '96vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((salida?: SalidaDialogoPago) => this.procesarSalida(salida));
  }

  abrirPrecancelacion(): void {
    const contexto = this.contextoActual();
    if (!contexto) return;
    this.dialog
      .open(PrecancelacionDialogComponent, {
        data: contexto,
        width: '820px',
        maxWidth: '96vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((salida?: SalidaDialogoPago) => this.procesarSalida(salida));
  }

  abrirHistorial(): void {
    const contexto = this.contextoActual();
    if (!contexto) return;
    this.dialog
      .open(HistorialOperacionesDialogComponent, {
        data: contexto,
        width: '840px',
        maxWidth: '96vw',
        autoFocus: false,
      })
      .afterClosed()
      // Siempre se recarga: cerrar con Esc o clic fuera no devuelve resultado, y para entonces
      // el usuario ya pudo haber anulado una operación desde el diálogo.
      .subscribe(() => this.recargarPrestamo());
  }

  /**
   * Encadena las derivaciones que sugiere la guía: cuando un flujo se rechaza porque en realidad
   * corresponde otro (pagar antes de abonar, precancelar en vez de pagar de más), el diálogo se
   * cierra devolviendo la acción y acá se abre el flujo correcto sin perder el préstamo elegido.
   */
  private procesarSalida(salida?: SalidaDialogoPago): void {
    if (!salida) return;
    switch (salida.accion) {
      case 'aplicado':
      case 'anulado':
        this.recargarPrestamo();
        this.resetAsignacion();
        this.montoTotalTexto.set('$0.00');
        break;
      case 'ir-a-pagar':
        this.abrirPago('efectivo');
        break;
      case 'ir-a-precancelar':
        this.abrirPrecancelacion();
        break;
      case 'ir-a-abonar':
        this.abrirAbonoCapital();
        break;
    }
  }

  // ================= utilidades =================

  formatMoneda(n: number | null | undefined): string {
    // 'es-EC' formats with a decimal comma ("500,00"), which parseMoneda() then mis-reads as
    // thousands (stripping the comma turns it into "50000") — use 'en-US' so format/parse round-trip.
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  parseMoneda(texto: string | null | undefined): number {
    if (!texto) return 0;
    const n = parseFloat(String(texto).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
}

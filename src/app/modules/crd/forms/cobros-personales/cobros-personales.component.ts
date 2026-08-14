import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';

import { CuentaBancaria } from '../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../tsr/service/cuenta-bancaria.service';

import { AbonoCapitalDialogComponent } from '../../dialog/pagos/abono-capital-dialog.component';
import { ContextoPrestamo, SalidaDialogoPago, contextoDesdePrestamo } from '../../dialog/pagos/contexto-prestamo';
import { HistorialOperacionesDialogComponent } from '../../dialog/pagos/historial-operaciones-dialog.component';
import { PagoPrestamoDialogComponent } from '../../dialog/pagos/pago-prestamo-dialog.component';
import { PrecancelacionDialogComponent } from '../../dialog/pagos/precancelacion-dialog.component';
import { ReciboOperacionDialogComponent } from '../../dialog/pagos/recibo-operacion-dialog.component';
import { DetallePrestamo } from '../../model/detalle-prestamo';
import { Entidad } from '../../model/entidad';
import { HistoricoDesgloseAporteParticipe } from '../../model/historico-desglose-aporte-participe';
import {
  CLASES_ESTADO_CUOTA,
  CodigoEstadoCuota,
  NOMBRES_ESTADO_CUOTA,
  obtenerCodigoEstadoCuota,
} from '../../model/estado-cuota-prestamo';
import { NOMBRE_ESTADO_PRESTAMO, admiteOperaciones } from '../../model/pagos/catalogos-pago';
import { SaldoAporte } from '../../model/pagos/operaciones-pago';
import { mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { Prestamo } from '../../model/prestamo';
import { DetallePrestamoService } from '../../service/detalle-prestamo.service';
import { EntidadService } from '../../service/entidad.service';
import { HistoricoDesgloseAporteParticipeService } from '../../service/historico-desglose-aporte-participe.service';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';
import { PrestamoService } from '../../service/prestamo.service';

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
  private historicoService = inject(HistoricoDesgloseAporteParticipeService);
  private cuentaBancariaService = inject(CuentaBancariaService);
  private operaciones = inject(OperacionesPagoPrestamoService);
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
  cargandoDatos = computed(() => this.cargandoPrestamos() || this.cargandoSaldos());
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

  estadoPrestamoTexto = computed(() => {
    const idEstado = this.prestamoVigente()?.idEstado;
    if (idEstado == null) return '—';
    return NOMBRE_ESTADO_PRESTAMO[Number(idEstado)] ?? `Estado ${idEstado}`;
  });

  // ---- monto del pago y asignación por cuenta ----
  montoTotalTexto = signal('$0.00');
  montoTotal = computed(() => this.parseMoneda(this.montoTotalTexto()));

  cuentaChecked: Record<CuentaKey, boolean> = { prestamo: false, cesantia: false, jubilacion: false };
  cuentaMontoTexto: Record<CuentaKey, string> = { prestamo: '', cesantia: '', jubilacion: '' };
  cuentaMontoVersion = signal(0); // se incrementa para forzar recomputo de los `computed` de abajo

  detallePrestamoAbierto = signal(false);

  asignado = computed(() => {
    this.cuentaMontoVersion();
    return (['prestamo', 'cesantia', 'jubilacion'] as CuentaKey[])
      .filter((k) => this.cuentaChecked[k])
      .reduce((s, k) => s + this.parseMoneda(this.cuentaMontoTexto[k]), 0);
  });
  restante = computed(() => +(this.montoTotal() - this.asignado()).toFixed(2));
  completamenteAsignado = computed(() => Math.abs(this.restante()) < 0.005);

  montoPrestamo = computed(() => {
    this.cuentaMontoVersion();
    return this.cuentaChecked.prestamo ? this.parseMoneda(this.cuentaMontoTexto.prestamo) : 0;
  });

  /**
   * Los montos asignados a cesantía/jubilación son un aporte del socio a sus propias cuentas, no
   * un pago de préstamo. El backend todavía no expone un endpoint para registrarlo (la guía de
   * servicios de pago cubre solo las operaciones sobre préstamos), así que la pantalla lo advierte
   * en vez de simular que se guardó.
   */
  montoAportesSinEndpoint = computed(() => {
    this.cuentaMontoVersion();
    return (['cesantia', 'jubilacion'] as CuentaKey[])
      .filter((k) => this.cuentaChecked[k])
      .reduce((s, k) => s + this.parseMoneda(this.cuentaMontoTexto[k]), 0);
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
  numeroReferencia = '';
  observacion = '';
  fechaPago = new Date();
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

  puedeConfirmar = computed(() => {
    const algunaCuentaMarcada = this.cuentaChecked.prestamo || this.cuentaChecked.cesantia || this.cuentaChecked.jubilacion;
    // Sin la parte de préstamo no hay ninguna operación que el backend pueda registrar hoy.
    const hayAlgoQueRegistrar = this.cuentaChecked.prestamo && this.montoPrestamo() > 0.004;
    return (
      algunaCuentaMarcada &&
      hayAlgoQueRegistrar &&
      this.prestamoAdmiteOperaciones() &&
      this.completamenteAsignado() &&
      !this.saldoDebitoInsuficiente() &&
      !this.registrando()
    );
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
    this.resultados.set([]);
    this.mostrandoResultados.set(false);
    this.entidadSeleccionada.set(null);
    this.prestamosOperables.set([]);
    this.prestamoVigente.set(null);
    this.cuotasPorPrestamo.set({});
    this.saldosAporte.set([]);
    this.historico.set(null);
    this.resetAsignacion();
    this.montoTotalTexto.set('$0.00');
    this.numeroReferencia = '';
    this.observacion = '';
    this.fechaPago = new Date();
    this.archivoComprobante.set(null);
  }

  seleccionarEntidad(entidad: Entidad): void {
    this.entidadSeleccionada.set(entidad);
    this.mostrandoResultados.set(false);
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

    this.cuentaBancariaService.getAll().subscribe({
      next: (cuentas) => this.cuentasBancarias.set((cuentas ?? []).filter((c) => Number(c.estado) === 1)),
      error: () => this.snackBar.open('No se pudieron cargar las cuentas bancarias de ASOPREP.', 'Cerrar', { duration: 4000 }),
    });
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
        // Se piden las cuotas de todos los créditos operables, no solo el elegido: los chips del
        // selector muestran el saldo de cada uno y ese saldo se calcula desde sus cuotas.
        for (const p of operables) this.cargarCuotas(p);
      },
      error: () => {
        this.cargandoPrestamos.set(false);
        this.snackBar.open('No se pudo cargar el préstamo del partícipe.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  seleccionarPrestamo(prestamo: Prestamo): void {
    this.prestamoVigente.set(prestamo);
    // Las cuotas de todos los créditos operables ya se cargaron; solo se repite el pedido si el
    // elegido todavía no está en el cache (p. ej. porque su llamada falló).
    if (!this.cuotasPorPrestamo()[prestamo.codigo]) this.cargarCuotas(prestamo);
    if (this.cuentaChecked.prestamo) {
      this.cuentaMontoTexto.prestamo = '';
      this.cuentaMontoVersion.update((v) => v + 1);
    }
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
        const ordenadas = [...(cuotas ?? [])].sort((a, b) => (a.numeroCuota ?? 0) - (b.numeroCuota ?? 0));
        this.cuotasPorPrestamo.update((mapa) => ({ ...mapa, [prestamo.codigo]: ordenadas }));
      },
      error: () => this.snackBar.open('No se pudo cargar el detalle de cuotas del préstamo.', 'Cerrar', { duration: 4000 }),
    });
  }

  // ================= estado y saldos reales de las cuotas =================

  /**
   * ¿La cuota ya no admite aplicación de pagos? Mismo criterio que
   * `DetallePrestamoDaoServiceImpl.selectCuotasPendientes`: PAGADA (4) y CANCELADA_ANTICIPADA (7)
   * quedan fuera, y el estado nulo de los datos legados cuenta como pendiente.
   */
  private esCuotaLiquidada(cuota: DetallePrestamo): boolean {
    const estado = obtenerCodigoEstadoCuota(cuota);
    return estado === CodigoEstadoCuota.PAGADA || estado === CodigoEstadoCuota.CANCELADA_ANTICIPADA;
  }

  /** Capital que sigue vivo en la cuota: lo pactado menos lo ya imputado a capital. */
  private capitalPendienteDe(cuota: DetallePrestamo): number {
    return Math.max((cuota.capital ?? 0) - (cuota.capitalPagado ?? 0), 0);
  }

  /** Todo lo que se debe por la cuota, igual que `totalConMoraIV()` del motor de pagos del backend. */
  private totalCuotaDe(cuota: DetallePrestamo): number {
    return +(
      (cuota.capital ?? 0) +
      (cuota.interes ?? 0) +
      (cuota.desgravamen ?? 0) +
      (cuota.valorSeguroIncendio ?? 0) +
      (cuota.mora ?? 0) +
      (cuota.interesVencido ?? 0)
    ).toFixed(2);
  }

  /** Lo ya imputado a la cuota. El seguro de incendio no tiene columna «pagado» en DTPR. */
  private totalPagadoDe(cuota: DetallePrestamo): number {
    return +(
      (cuota.capitalPagado ?? 0) +
      (cuota.interesPagado ?? 0) +
      (cuota.desgravamenPagado ?? 0) +
      (cuota.moraPagado ?? 0) +
      (cuota.interesVendidoPagado ?? 0)
    ).toFixed(2);
  }

  /**
   * Deuda que queda en la cuota (capital + interés + desgravamen + seguro + mora + interés vencido,
   * menos lo pagado).
   *
   * No se lee DTPRSLDO a ciegas porque la columna tiene dos significados según quién la escribió:
   * al generar la tabla de amortización guarda el capital insoluto DESPUÉS de esa cuota
   * (`PrestamoServiceImpl`), y recién la carga de Petrocomercial y el motor de pagos la reescriben
   * como el pendiente de la cuota. Por eso solo se usa cuando la cuota registra pagos —que es
   * cuando ya pasó por alguno de esos dos procesos— y si no se calcula el total de la cuota, que
   * para una cuota intacta es exactamente lo que se debe.
   */
  private saldoPendienteDe(cuota: DetallePrestamo): number {
    if (this.totalPagadoDe(cuota) > 0.004) return Math.max(cuota.saldo ?? 0, 0);
    return Math.max(this.totalCuotaDe(cuota), 0);
  }

  /** Cuotas ya descargadas del préstamo, o `undefined` si su pedido todavía no volvió. */
  private cuotasDe(prestamo: Prestamo | null): DetallePrestamo[] | undefined {
    return prestamo ? this.cuotasPorPrestamo()[prestamo.codigo] : undefined;
  }

  /**
   * Saldo total vigente. Mientras la tabla de amortización no haya llegado se muestra el valor
   * almacenado en PRST para no dejar la celda en $0.00, aunque ese valor puede estar viejo.
   */
  saldoTotalDe(prestamo: Prestamo | null): number {
    const cuotas = this.cuotasDe(prestamo);
    if (!cuotas) return prestamo?.saldoTotal ?? 0;
    return +cuotas
      .filter((c) => !this.esCuotaLiquidada(c))
      .reduce((s, c) => s + this.saldoPendienteDe(c), 0)
      .toFixed(2);
  }

  /** Saldo de capital vigente: Σ (capital − capitalPagado) de las cuotas no liquidadas. */
  saldoCapitalDe(prestamo: Prestamo | null): number {
    const cuotas = this.cuotasDe(prestamo);
    if (!cuotas) return prestamo?.saldoCapital ?? 0;
    return +cuotas
      .filter((c) => !this.esCuotaLiquidada(c))
      .reduce((s, c) => s + this.capitalPendienteDe(c), 0)
      .toFixed(2);
  }

  /** Pendiente de una cuota, para mostrarlo en la plantilla. */
  pendienteDeCuota(cuota: DetallePrestamo | null): number {
    if (!cuota || this.esCuotaLiquidada(cuota)) return 0;
    return this.saldoPendienteDe(cuota);
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
  }

  toggleDetallePrestamo(): void {
    this.detallePrestamoAbierto.update((v) => !v);
  }

  private resetAsignacion(): void {
    this.cuentaChecked = { prestamo: false, cesantia: false, jubilacion: false };
    this.cuentaMontoTexto = { prestamo: '', cesantia: '', jubilacion: '' };
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
      const pendiente = liquidada ? 0 : this.saldoPendienteDe(cuota);

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

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.archivoComprobante.set(file);
  }

  // ================= confirmar pago =================

  /**
   * Registra la parte del cobro que corresponde al préstamo. Según el método elegido usa
   * `pagarCuota` (efectivo, transferencia o depósito) o `pagarConAportes` (débito del saldo de
   * aportes del socio); ambos aplican la misma cascada y prelación del lado del servidor.
   */
  confirmarPago(): void {
    if (!this.puedeConfirmar()) return;
    const prestamo = this.prestamoVigente();
    if (!prestamo) return;

    this.errorOperacion.set(null);
    this.errorCodigo.set(null);
    this.registrando.set(true);

    const usuario = usuarioSesion();
    const fechaPago = this.operaciones.formatearFecha(this.fechaPago);
    const observacion = this.armarObservacion();
    const monto = +this.montoPrestamo().toFixed(2);

    if (this.metodoPago() === 'debito') {
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
          fechaPago,
          aportes: [{ idTipoAporte, valor: monto }],
        })
        .subscribe((resp) => {
          this.registrando.set(false);
          if (resp.exito && resp.resultado) {
            this.mostrarRecibo('PAGO_APORTES', resp.mensaje, fechaPago, resp.resultado, resp.movimientosAporte ?? []);
          } else {
            this.registrarError(resp.error, mensajeDeRespuesta(resp));
            if (resp.error === 'SALDO_APORTES_INSUFICIENTE' || resp.error === 'TIPO_APORTE_NO_VIGENTE') {
              const entidad = this.entidadSeleccionada();
              if (entidad) this.cargarSaldosAporte(entidad.codigo);
            }
          }
        });
      return;
    }

    this.operaciones
      .pagarCuota({ idPrestamo: prestamo.codigo, valor: monto, usuario, observacion, fechaPago })
      .subscribe((resp) => {
        this.registrando.set(false);
        if (resp.exito && resp.resultado) {
          this.mostrarRecibo('PAGO_MANUAL', resp.mensaje, fechaPago, resp.resultado, []);
        } else {
          this.registrarError(resp.error, mensajeDeRespuesta(resp));
        }
      });
  }

  /** El backend guarda una sola observación: se le agregan los datos del comprobante. */
  private armarObservacion(): string | null {
    const partes: string[] = [];
    if (this.observacion.trim()) partes.push(this.observacion.trim());
    if (this.metodoPago() === 'transferencia') partes.push('Transferencia bancaria');
    if (this.metodoPago() === 'deposito') partes.push('Depósito directo');
    if (this.numeroReferencia.trim()) partes.push(`Ref. ${this.numeroReferencia.trim()}`);
    const cuenta = this.cuentaAsopropDestino();
    if (cuenta && this.metodoPago() !== 'debito') {
      partes.push(`Cta. ${cuenta.banco?.nombre ?? ''} ${cuenta.numeroCuenta ?? ''}`.trim());
    }
    const texto = partes.join(' · ');
    return texto ? texto.slice(0, 200) : null;
  }

  private mostrarRecibo(
    tipo: 'PAGO_MANUAL' | 'PAGO_APORTES',
    mensaje: string | undefined,
    fecha: string | null,
    resultado: import('../../model/pagos/operaciones-pago').ResultadoPagoCuota,
    movimientosAporte: import('../../model/pagos/respuesta-pago').MovimientoAporte[]
  ): void {
    const nombres: Record<number, string> = {};
    for (const a of this.saldosAporte()) nombres[a.idTipoAporte] = a.nombre;

    const extras: { label: string; valor: string }[] = [];
    if (this.archivoComprobante()) {
      extras.push({ label: 'Comprobante adjunto', valor: this.archivoComprobante()!.name });
    }
    if (this.montoAportesSinEndpoint() > 0.004) {
      extras.push({
        label: 'Aportes del socio NO registrados',
        valor: this.formatMoneda(this.montoAportesSinEndpoint()),
      });
    }

    this.dialog.open(ReciboOperacionDialogComponent, {
      data: {
        tipo,
        tituloPrestamo: this.tituloPrestamo(),
        participante: this.entidadSeleccionada()?.razonSocial ?? undefined,
        mensaje,
        fecha: fecha ?? undefined,
        pago: resultado,
        movimientosAporte,
        nombresTipoAporte: nombres,
        detalleExtra: extras.length ? extras : undefined,
      },
      width: '880px',
      maxWidth: '96vw',
      autoFocus: false,
    });

    if (this.montoAportesSinEndpoint() > 0.004) {
      this.snackBar.open(
        `Se registró únicamente la parte del préstamo. Los ${this.formatMoneda(this.montoAportesSinEndpoint())} asignados a cesantía/jubilación no se guardaron: el backend aún no expone ese servicio.`,
        'Entendido',
        { duration: 10000 }
      );
    }

    this.recargarPrestamo();
    this.resetAsignacion();
    this.montoTotalTexto.set('$0.00');
    this.numeroReferencia = '';
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

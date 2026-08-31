import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';

import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubro } from '../../../../../../shared/model/detalle-rubro';
import { empresaSesionCodigo } from '../../../../../../shared/services/empresa-sesion';
import { DetalleRubroService } from '../../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../../../shared/services/usuario-sesion';

import { Aporte } from '../../../../model/aporte';
import { CuentaBancariaParticipe } from '../../../../model/cuenta-bancaria-participe';
import {
  DetalleSolicitudDevolucion,
  DeudaVigenteParticipe,
  SolicitudDevolucion,
} from '../../../../model/devolucion/devolucion-aporte';
import { DesgloseAporte, mensajeDeRespuesta } from '../../../../model/pagos/respuesta-pago';
import { DetallePrestamo } from '../../../../model/detalle-prestamo';
import { Entidad } from '../../../../model/entidad';
import { EstadoParticipe, esEstadoVigente } from '../../../../model/estado-participe';
import { ResultadoJubilacion } from '../../../../model/jubilacion';
import { Prestamo } from '../../../../model/prestamo';
import { ValorPagoPensionComplementaria } from '../../../../model/valor-pago-pension-complementaria';
import { AporteService } from '../../../../service/aporte.service';
import { CuentaBancariaParticipeService } from '../../../../service/cuenta-bancaria-participe.service';
import { DetallePrestamoService } from '../../../../service/detalle-prestamo.service';
import { DevolucionAporteService } from '../../../../service/devolucion-aporte.service';
import { EntidadService } from '../../../../service/entidad.service';
import { EstadoParticipeService } from '../../../../service/estado-participe.service';
import { OperacionesPagoPrestamoService } from '../../../../service/operaciones-pago-prestamo.service';
import { PrestamoService } from '../../../../service/prestamo.service';
import { ValorPagoPensionComplementariaService } from '../../../../service/valor-pago-pension-complementaria.service';

/** Rubro 23: tipo de cuenta bancaria — mismo catálogo que usa devolucion-aportes.component.ts. */
const RUBRO_TIPO_CUENTA_BANCARIA = 23;

interface AsignacionCuota {
  cuota: DetallePrestamo;
  aplicado: number;
  estado: 'cubierta' | 'parcial' | 'pendiente';
}

interface AsignacionPrestamo {
  prestamo: Prestamo;
  cuotas: AsignacionCuota[];
  totalAplicado: number;
  saldoRestante: number;
}

interface CuotasPrestamo {
  pagadas: DetallePrestamo[];
  pendientes: DetallePrestamo[];
}

// Estados de préstamo considerados "activos" para efectos de jubilación: vigente, de plazo
// vencido y en mora — todos representan deuda pendiente que debería resolverse al jubilar.
// Coincide con la definición usada en participe-dash.component.ts (más amplia que la de
// cobros-personales.component.ts, que solo trata VIGENTE como activo).
//
// ⚠️ EN_MORA es 11, no 10 (com.saa.rubros.EstadoPrestamo, saaBE — 10 es VIGENTE_POR_REVISAR, un
// estado distinto). Con el 10 acá, un préstamo realmente en mora quedaba fuera de este filtro por
// completo: ni aparecía en la lista, ni sumaba a `saldoTotalPrestamosActivos()`, así que la
// pantalla ni siquiera sabía que existía. Corregido junto con el saldo (ítem 1 del encargo).
const CODIGOS_PRESTAMO_ACTIVO = new Set<number>([2, 8, 11]);
const TEXTOS_PRESTAMO_ACTIVO = ['VIGENTE', 'DE PLAZO VENCIDO', 'EN MORA'];

// Cuántos pagos recientes mostrar en el historial de cada préstamo (no todo el ciclo de vida).
const MAX_HISTORIAL_PAGOS = 5;

@Component({
  selector: 'app-jubilar-participe',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './jubilar-participe.component.html',
  styleUrl: './jubilar-participe.component.scss',
})
export class JubilarParticipeComponent {
  private entidadService = inject(EntidadService);
  private prestamoService = inject(PrestamoService);
  private detallePrestamoService = inject(DetallePrestamoService);
  private aporteService = inject(AporteService);
  private estadoParticipeService = inject(EstadoParticipeService);
  private devolucionAporteService = inject(DevolucionAporteService);
  private cuentaParticipeService = inject(CuentaBancariaParticipeService);
  private detalleRubroService = inject(DetalleRubroService);
  private operacionesPago = inject(OperacionesPagoPrestamoService);
  private valorPagoPensionService = inject(ValorPagoPensionComplementariaService);
  private funcionesDatos = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);

  // Controla el autocompletado de "Monto a destinar a préstamos": se fija una sola vez por
  // partícipe seleccionado, apenas se conocen tanto sus aportes como sus préstamos activos.
  private montoPrestamosInicializado = false;
  // Último saldo remanente conocido — permite reautocompletar "Retiro efectivo" cada vez que
  // el saldo remanente cambia (p. ej. al ajustar el monto destinado a préstamos), sin pisar una
  // edición manual del operador cuando el saldo remanente no cambió (ver efecto en el constructor).
  private ultimoSaldoRemanenteConocido: number | null = null;

  constructor() {
    this.estadoParticipeService.getAll().subscribe({
      next: (estados) =>
        this.estadosPermitidos.set((estados ?? []).filter((e) => esEstadoVigente(e) && this.esEstadoPermitido(e))),
      error: () => this.snackBar.open('No se pudieron cargar los estados de partícipe.', 'Cerrar', { duration: 4000 }),
    });

    this.cargarTiposCuentaBancaria();

    effect(() => {
      const entidad = this.entidadSeleccionada();
      if (entidad && !this.cargandoDatos() && !this.montoPrestamosInicializado) {
        this.montoPrestamosTexto.set(this.formatMoneda(this.maxDestinablePrestamos()));
        this.montoPrestamosInicializado = true;
      }
    });

    // Por defecto todo el remanente se sugiere como retiro efectivo — el operador puede bajarlo;
    // lo que no retire pasa solo a pensión complementaria al procesar (ver montoPensionComplementaria).
    effect(() => {
      const saldo = this.saldoRemanenteJubilacion();
      if (this.ultimoSaldoRemanenteConocido === null || Math.abs(saldo - this.ultimoSaldoRemanenteConocido) > 0.004) {
        this.montoRetiroEfectivoTexto.set(this.formatMoneda(saldo));
      }
      this.ultimoSaldoRemanenteConocido = saldo;
    });
  }

  // ---- búsqueda ----
  criterioIdentificacion = '';
  criterioRolPetro = '';
  criterioNombre = '';
  criterioEstadoSeleccionado = signal<number | null>(null);
  estadosPermitidos = signal<EstadoParticipe[]>([]);

  buscando = signal(false);
  resultados = signal<Entidad[]>([]);
  mostrandoResultados = signal(false);
  entidadSeleccionada = signal<Entidad | null>(null);

  // ---- datos del participante seleccionado ----
  cargandoAportes = signal(false);
  cargandoPrestamos = signal(false);
  cargandoDeudaVigente = signal(false);
  cargandoDatos = computed(() => this.cargandoAportes() || this.cargandoPrestamos() || this.cargandoDeudaVigente());
  aportesJubilacion = signal<Aporte[]>([]);
  prestamosActivos = signal<Prestamo[]>([]);
  cuotasPorPrestamo = signal<Map<number, CuotasPrestamo>>(new Map());

  /**
   * Saldo pendiente RECONSTRUIDO por préstamo (`GET /rest/dvap/deudaVigente/{idEntidad}` →
   * `calcularTotalPendientePrestamo`, el mismo cálculo que usan `pagarCuota`/`pagarConAportes`).
   * `Prestamo.saldoTotal` (`PRSTSLTT`) quedó congelado desde la migración y puede diferir del
   * real por más del doble — nunca usarlo para decidir si un préstamo está cubierto.
   */
  mapaSaldoPendientePorPrestamo = signal<Map<number, number>>(new Map());
  /**
   * `true` si `deudaVigente` falló, o si algún préstamo de `prestamosActivos()` no vino en su
   * respuesta. Mientras sea `true`, `puedeJubilar()` no puede pasar: es preferible bloquear el
   * botón a dejarlo pasar con un saldo que no se pudo confirmar.
   */
  errorDeudaVigente = signal<string | null>(null);

  saldoDisponibleJubilacion = computed(() => this.aportesJubilacion().reduce((s, a) => s + (a.saldo ?? 0), 0));

  /** Saldo pendiente reconstruido de un préstamo, con el crudo (`saldoTotal`) solo como respaldo visual mientras carga. */
  saldoPendienteDe(prestamo: Prestamo): number {
    return this.mapaSaldoPendientePorPrestamo().get(prestamo.codigo) ?? (prestamo.saldoTotal ?? 0);
  }

  /** Todo préstamo activo tiene que tener su saldo confirmado por `deudaVigente` antes de poder jubilar. */
  saldoPendienteConfirmado = computed(() => {
    if (this.errorDeudaVigente()) return false;
    const mapa = this.mapaSaldoPendientePorPrestamo();
    return this.prestamosActivos().every((p) => mapa.has(p.codigo));
  });

  saldoTotalPrestamosActivos = computed(() =>
    this.prestamosActivos().reduce((s, p) => s + this.saldoPendienteDe(p), 0),
  );
  saldoInsuficienteParaPrestamos = computed(() => this.saldoDisponibleJubilacion() < this.saldoTotalPrestamosActivos() - 0.005);

  // ---- pago de préstamos (manual, aplicado cronológicamente del más antiguo al más reciente) ----
  detallesAbiertos = signal<Set<number>>(new Set());
  registrarExcepcion = signal(false);
  montoPrestamosTexto = signal('$0.00');

  // Tope de lo que tiene sentido destinar a préstamos: no más de lo disponible en aportes
  // jubilación, ni más de lo que realmente se debe.
  maxDestinablePrestamos = computed(() =>
    +Math.min(this.saldoDisponibleJubilacion(), this.saldoTotalPrestamosActivos()).toFixed(2),
  );
  montoDestinadoPrestamos = computed(() =>
    Math.min(Math.max(this.parseMoneda(this.montoPrestamosTexto()), 0), this.maxDestinablePrestamos()),
  );

  asignacionesPrestamos = computed<AsignacionPrestamo[]>(() => {
    let restante = this.montoDestinadoPrestamos();
    const cuotasMap = this.cuotasPorPrestamo();
    const resultado: AsignacionPrestamo[] = [];

    for (const prestamo of this.prestamosActivos()) {
      const cuotas = cuotasMap.get(prestamo.codigo)?.pendientes ?? [];
      const asignaciones: AsignacionCuota[] = [];
      let totalAplicado = 0;

      for (const cuota of cuotas) {
        const valor = cuota.saldo ?? 0;
        let aplicado = 0;
        let estado: AsignacionCuota['estado'] = 'pendiente';
        if (restante >= valor - 0.004 && valor > 0) {
          aplicado = valor;
          estado = 'cubierta';
          restante = +(restante - valor).toFixed(2);
        } else if (restante > 0.004) {
          aplicado = +restante.toFixed(2);
          estado = 'parcial';
          restante = 0;
        }
        totalAplicado += aplicado;
        asignaciones.push({ cuota, aplicado, estado });
      }

      totalAplicado = +totalAplicado.toFixed(2);
      resultado.push({
        prestamo,
        cuotas: asignaciones,
        totalAplicado,
        saldoRestante: +(this.saldoPendienteDe(prestamo) - totalAplicado).toFixed(2),
      });
    }

    return resultado;
  });

  totalAplicadoAPrestamos = computed(() => this.asignacionesPrestamos().reduce((s, a) => s + a.totalAplicado, 0));

  // Saldo pendiente en préstamos tras la asignación manual — puede darse por saldo insuficiente
  // o porque el operador decidió, a propósito, destinar menos de lo necesario.
  faltantePagoCompleto = computed(() =>
    Math.max(+(this.saldoTotalPrestamosActivos() - this.totalAplicadoAPrestamos()).toFixed(2), 0),
  );

  // ---- asignación del saldo remanente ----
  saldoRemanenteJubilacion = computed(() =>
    +Math.max(this.saldoDisponibleJubilacion() - this.totalAplicadoAPrestamos(), 0).toFixed(2),
  );

  montoRetiroEfectivoTexto = signal('$0.00');

  /**
   * Lo que el operador pide en efectivo, acotado a lo que realmente hay disponible — nunca el
   * texto crudo. `POST /rest/aprt/procesarJubilacion` (ítem 3) no recibe un monto: traslada TODO
   * lo que quede después de este retiro, así que ese monto tiene que estar siempre dentro de rango.
   */
  montoRetiroEfectivo = computed(() =>
    Math.min(Math.max(this.parseMoneda(this.montoRetiroEfectivoTexto()), 0), this.saldoRemanenteJubilacion()),
  );

  /**
   * Lo que pasa a pensión complementaria NO es una decisión del operador: `procesarJubilacion`
   * traslada automáticamente todo el saldo de cesantía/jubilación que quede después del retiro
   * efectivo — no hay parámetro de monto ni de "número de cuotas" en ese endpoint. Por eso esto es
   * de solo lectura, derivado, y no un campo editable como antes.
   */
  montoPensionComplementaria = computed(() =>
    +(this.saldoRemanenteJubilacion() - this.montoRetiroEfectivo()).toFixed(2),
  );

  // ---- cuenta bancaria del partícipe (destino del retiro efectivo) ----
  cuentasParticipe = signal<CuentaBancariaParticipe[]>([]);
  cargandoCuentasParticipe = signal(false);
  cuentaParticipeSeleccionada = signal<CuentaBancariaParticipe | null>(null);
  filtroCuentaParticipe = '';
  private tiposCuentaBancaria = signal<DetalleRubro[]>([]);

  /** Solo hace falta elegir cuenta cuando de verdad hay algo que retirar en efectivo. */
  requiereCuentaParticipe = computed(() => this.montoRetiroEfectivo() > 0.004);

  // ---- confirmar jubilación ----
  registrando = signal(false);
  jubilacionRegistrada = signal(false);
  resultadoJubilacion = signal<ResultadoJubilacion | null>(null);
  /** Error de cualquiera de los tres pasos de la orquestación (ítem 3) — cuál fue y por qué. */
  errorOrquestacion = signal<string | null>(null);

  /**
   * Paso 4 (CRD.VPPC — configura cuánto se le paga por MES, no confundir con
   * `resultadoJubilacion()?.valorTotalTrasladado`, que es el traspaso de una sola vez).
   *
   * Deliberadamente DESACOPLADO de los pasos 1-3: recién tiene sentido pedirle esto al operador
   * cuando ya sabe que el traslado se aplicó, y forzarlo a decidir la mensualidad ANTES de saber
   * si el resto del proceso iba a salir bien lo obligaría a llenar un formulario que después
   * podría no servir de nada. Se ofrece en la vista de éxito, con su propio botón — reintentar
   * este paso solo (POST) es seguro; reintentar los pasos 1-3 completos no lo sería.
   */
  valorPagarPensionTexto = '$0.00';
  numeroCuotasPensionTexto = '';
  tienePrestamoPension = false;
  valorSeguroPensionTexto = '';
  guardandoConfiguracionPension = signal(false);
  configuracionPensionGuardada = signal(false);

  puedeJubilar = computed(() => {
    const entidad = this.entidadSeleccionada();
    if (!entidad || this.cargandoDatos() || this.registrando()) return false;
    // Gate del ítem 1: sin el saldo reconstruido de CADA préstamo activo, no hay forma honesta
    // de saber si "pago completo" es cierto — el crudo (PRSTSLTT) puede estar desactualizado.
    if (!this.saldoPendienteConfirmado()) return false;
    const pagoCompletoOExcepcion = this.prestamosActivos().length === 0 || this.faltantePagoCompleto() <= 0.005 || this.registrarExcepcion();
    if (!pagoCompletoOExcepcion) return false;
    return !this.requiereCuentaParticipe() || this.cuentaParticipeSeleccionada() !== null;
  });

  // ================= búsqueda =================

  buscar(): void {
    const criterios: DatosBusqueda[] = [];

    if (this.criterioIdentificacion.trim()) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'numeroIdentificacion', this.criterioIdentificacion.trim(), TipoComandosBusqueda.IGUAL);
      criterios.push(c);
    }
    if (this.criterioRolPetro.trim()) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'rolPetroComercial', this.criterioRolPetro.trim(), TipoComandosBusqueda.IGUAL);
      criterios.push(c);
    }
    if (this.criterioNombre.trim()) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'razonSocial', this.criterioNombre.trim(), TipoComandosBusqueda.LIKE);
      criterios.push(c);
    }
    if (this.criterioEstadoSeleccionado() !== null) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'idEstado', String(this.criterioEstadoSeleccionado()), TipoComandosBusqueda.IGUAL);
      criterios.push(c);
    }

    if (criterios.length === 0) {
      this.snackBar.open('Ingrese al menos un criterio de búsqueda.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.buscando.set(true);
    this.entidadService.selectByCriteria(criterios).subscribe({
      next: (entidades) => {
        this.buscando.set(false);
        // Filtro de seguridad: solo Activo/Cesante son elegibles para este proceso, sin
        // importar si el criterio de estado ya fue enviado al backend.
        const permitidos = (entidades ?? []).filter((e) => this.estadosPermitidos().some((ep) => ep.codigoExterno === e.idEstado));
        this.resultados.set(permitidos);
        this.mostrandoResultados.set(true);
        this.entidadSeleccionada.set(null);
        if (permitidos.length === 0) {
          this.snackBar.open('No se encontraron coincidencias entre partícipes activos o cesantes.', 'Cerrar', { duration: 3500 });
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
    this.resetProceso();
    this.cargarDatosParticipante(entidad);
  }

  volverABuscar(): void {
    this.mostrandoResultados.set(true);
    this.entidadSeleccionada.set(null);
  }

  private cargarDatosParticipante(entidad: Entidad): void {
    this.cargandoAportes.set(true);
    this.cargandoPrestamos.set(true);
    this.aportesJubilacion.set([]);
    this.prestamosActivos.set([]);
    this.cuotasPorPrestamo.set(new Map());
    this.cargarDeudaVigente(entidad);
    this.cargarCuentasParticipe(entidad.codigo);

    const criterioEntidad = new DatosBusqueda();
    criterioEntidad.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'entidad', 'codigo', String(entidad.codigo), TipoComandosBusqueda.IGUAL);

    this.aporteService.selectByCriteria([criterioEntidad]).subscribe({
      next: (aportes) => {
        this.aportesJubilacion.set((aportes ?? []).filter((a) => this.esTipoAporte(a, 'jubila')));
        this.cargandoAportes.set(false);
      },
      error: () => {
        this.snackBar.open('No se pudieron cargar los aportes del partícipe.', 'Cerrar', { duration: 4000 });
        this.cargandoAportes.set(false);
      },
    });

    this.prestamoService.selectByCriteria([criterioEntidad]).subscribe({
      next: (prestamos) => {
        const activos = (prestamos ?? [])
          .filter((p) => this.esPrestamoActivo(p))
          .sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime());
        this.prestamosActivos.set(activos);
        this.cargandoPrestamos.set(false);
        if (activos.length > 0) this.cargarCuotas(activos);
      },
      error: () => {
        this.snackBar.open('No se pudo cargar los préstamos del partícipe.', 'Cerrar', { duration: 4000 });
        this.cargandoPrestamos.set(false);
      },
    });
  }

  /**
   * `GET /rest/dvap/deudaVigente/{idEntidad}` — saldo RECONSTRUIDO por préstamo
   * (`calcularTotalPendientePrestamo`), no el crudo `PRSTSLTT`. A diferencia de
   * `devolucion-aportes.component.ts` (donde esto es solo informativo), acá alimenta
   * `puedeJubilar()`: si falla, `errorDeudaVigente` queda con un mensaje y el botón de jubilar no
   * se habilita hasta reintentar con éxito.
   */
  private cargarDeudaVigente(entidad: Entidad): void {
    this.cargandoDeudaVigente.set(true);
    this.errorDeudaVigente.set(null);
    this.mapaSaldoPendientePorPrestamo.set(new Map());

    this.devolucionAporteService.deudaVigente(entidad.codigo).subscribe({
      next: (resp) => {
        this.cargandoDeudaVigente.set(false);
        if (!resp.exito || !resp.resultado) {
          this.errorDeudaVigente.set(
            'No se pudo verificar el saldo pendiente de los préstamos del partícipe. No se puede continuar sin confirmarlo.',
          );
          return;
        }
        const mapa = new Map<number, number>();
        for (const linea of resp.resultado.prestamos) {
          mapa.set(linea.idPrestamo, linea.saldoPendiente);
        }
        this.mapaSaldoPendientePorPrestamo.set(mapa);
      },
      error: () => {
        this.cargandoDeudaVigente.set(false);
        this.errorDeudaVigente.set(
          'No se pudo verificar el saldo pendiente de los préstamos del partícipe. No se puede continuar sin confirmarlo.',
        );
      },
    });
  }

  reintentarDeudaVigente(): void {
    const entidad = this.entidadSeleccionada();
    if (entidad) this.cargarDeudaVigente(entidad);
  }

  /**
   * Cuentas bancarias activas del partícipe (CRD.CNBP) — mismo patrón que
   * `devolucion-aportes.component.ts`: es el destino del retiro efectivo (paso 2 del ítem 3), y
   * `POST /rest/dvap/registrar` exige `idCuentaBancariaParticipe` salvo débito automático, que
   * esta pantalla no ofrece.
   */
  private cargarCuentasParticipe(codigoEntidad: number): void {
    const criterioEntidad = new DatosBusqueda();
    criterioEntidad.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'entidad', 'codigo', String(codigoEntidad), TipoComandosBusqueda.IGUAL);
    const criterioEstado = new DatosBusqueda();
    criterioEstado.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'estado', '1', TipoComandosBusqueda.IGUAL);

    this.cargandoCuentasParticipe.set(true);
    this.cuentaParticipeService.selectByCriteria([criterioEntidad, criterioEstado]).subscribe({
      next: (cuentas) => {
        this.cargandoCuentasParticipe.set(false);
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

  private cargarTiposCuentaBancaria(): void {
    const enMemoria = this.detalleRubroService.getDetallesByParent(RUBRO_TIPO_CUENTA_BANCARIA);
    if (enMemoria.length > 0) {
      this.tiposCuentaBancaria.set(enMemoria);
      return;
    }
    this.detalleRubroService.getAll().subscribe({
      next: (todos) =>
        this.tiposCuentaBancaria.set((todos ?? []).filter((d) => d.rubro?.codigoAlterno === RUBRO_TIPO_CUENTA_BANCARIA)),
      error: () => this.tiposCuentaBancaria.set([]),
    });
  }

  get cuentasParticipeFiltradas(): CuentaBancariaParticipe[] {
    const q = this.filtroCuentaParticipe.trim().toLowerCase();
    const lista = this.cuentasParticipe();
    if (!q) return lista;
    return lista.filter((c) => this.textoBusquedaCuentaParticipe(c).includes(q));
  }

  private textoBusquedaCuentaParticipe(cuenta: CuentaBancariaParticipe): string {
    const banco = cuenta.bancoExterno?.nombre ?? '';
    const tipo = this.nombreTipoCuentaBancaria(cuenta.tipoCuenta);
    return `${banco} ${tipo} ${cuenta.numeroCuenta ?? ''}`.toLowerCase();
  }

  etiquetaCuentaParticipe(cuenta: CuentaBancariaParticipe | null): string {
    if (!cuenta) return '';
    const banco = cuenta.bancoExterno?.nombre ?? 'Banco';
    const tipo = this.nombreTipoCuentaBancaria(cuenta.tipoCuenta);
    const numero = this.enmascararCuenta(cuenta.numeroCuenta);
    return tipo ? `${banco} · ${tipo} · ${numero}` : `${banco} · ${numero}`;
  }

  private nombreTipoCuentaBancaria(tipo: number | null | undefined): string {
    if (tipo == null) return '';
    const detalle = this.tiposCuentaBancaria().find((d) => Number(d.codigoAlterno) === Number(tipo));
    return detalle?.descripcion?.trim() ?? '';
  }

  enmascararCuenta(numero: string | null | undefined): string {
    const limpio = String(numero ?? '').trim();
    if (!limpio) return '—';
    if (limpio.length <= 4) return limpio;
    return '••••' + limpio.slice(-4);
  }

  private cargarCuotas(prestamos: Prestamo[]): void {
    const consultas = prestamos.map((prestamo) => {
      const criterioPrestamo = new DatosBusqueda();
      criterioPrestamo.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'prestamo', 'codigo', String(prestamo.codigo), TipoComandosBusqueda.IGUAL);
      return this.detallePrestamoService.selectByCriteria([criterioPrestamo]);
    });

    forkJoin(consultas.length ? consultas : [of([])]).subscribe({
      next: (resultados) => {
        const mapa = new Map<number, CuotasPrestamo>();
        prestamos.forEach((prestamo, index) => {
          const todas = resultados[index] ?? [];
          const pendientes = todas
            .filter((c) => (c.saldo ?? 0) > 0.004)
            .sort((a, b) => (a.numeroCuota ?? 0) - (b.numeroCuota ?? 0));
          // Historial de pagos: cuotas ya saldadas, mostrando solo las más recientes.
          const pagadas = todas
            .filter((c) => (c.saldo ?? 0) <= 0.004 && !!c.fechaPagado)
            .sort((a, b) => (b.numeroCuota ?? 0) - (a.numeroCuota ?? 0))
            .slice(0, MAX_HISTORIAL_PAGOS)
            .reverse();
          mapa.set(prestamo.codigo, { pagadas, pendientes });
        });
        this.cuotasPorPrestamo.set(mapa);
      },
      error: () => this.snackBar.open('No se pudo cargar el detalle de cuotas de los préstamos.', 'Cerrar', { duration: 4000 }),
    });
  }

  cuotasPagadasDe(codigoPrestamo: number): DetallePrestamo[] {
    return this.cuotasPorPrestamo().get(codigoPrestamo)?.pagadas ?? [];
  }

  esPagoConMora(cuota: DetallePrestamo): boolean {
    const vencimiento = this.funcionesDatos.convertirFechaDesdeBackend(cuota.fechaVencimiento);
    const pagado = this.funcionesDatos.convertirFechaDesdeBackend(cuota.fechaPagado);
    if (!vencimiento || !pagado) return false;
    return pagado.getTime() > vencimiento.getTime();
  }

  private esPrestamoActivo(p: Prestamo): boolean {
    const estado: any = p.estadoPrestamo;
    const codigoExterno = estado && typeof estado === 'object' ? Number(estado.codigoExterno ?? estado.codigo) : Number(estado);
    if (!isNaN(codigoExterno) && CODIGOS_PRESTAMO_ACTIVO.has(codigoExterno)) return true;

    const nombre = (estado && typeof estado === 'object' ? estado.nombre : '') ?? '';
    const nombreNormalizado = nombre.toUpperCase();
    return TEXTOS_PRESTAMO_ACTIVO.some((texto) => nombreNormalizado.includes(texto));
  }

  private esTipoAporte(aporte: Aporte, fragmento: string): boolean {
    const nombre = (aporte.tipoAporte?.nombre ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return nombre.includes(fragmento);
  }

  private esEstadoPermitido(estado: EstadoParticipe): boolean {
    const nombre = this.normalizarTexto(estado?.nombre ?? '');
    return nombre === 'activo' || nombre === 'cesante';
  }

  private normalizarTexto(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .trim();
  }

  // ================= asignación / pago de préstamos =================

  toggleDetallePrestamo(codigoPrestamo: number): void {
    const abiertos = new Set(this.detallesAbiertos());
    if (abiertos.has(codigoPrestamo)) {
      abiertos.delete(codigoPrestamo);
    } else {
      abiertos.add(codigoPrestamo);
    }
    this.detallesAbiertos.set(abiertos);
  }

  onMontoPrestamosBlur(): void {
    const clamped = Math.min(Math.max(this.parseMoneda(this.montoPrestamosTexto()), 0), this.maxDestinablePrestamos());
    this.montoPrestamosTexto.set(this.formatMoneda(clamped));
  }

  usarSaldoCompletoPrestamos(): void {
    this.montoPrestamosTexto.set(this.formatMoneda(this.maxDestinablePrestamos()));
  }

  noDestinarAPrestamos(): void {
    this.montoPrestamosTexto.set('$0.00');
  }

  onMontoAllocationBlur(): void {
    const clamped = Math.min(Math.max(this.parseMoneda(this.montoRetiroEfectivoTexto()), 0), this.saldoRemanenteJubilacion());
    this.montoRetiroEfectivoTexto.set(this.formatMoneda(clamped));
  }

  private resetProceso(): void {
    this.detallesAbiertos.set(new Set());
    this.registrarExcepcion.set(false);
    this.montoPrestamosTexto.set('$0.00');
    this.montoPrestamosInicializado = false;
    this.montoRetiroEfectivoTexto.set('$0.00');
    this.ultimoSaldoRemanenteConocido = null;
    this.cuentaParticipeSeleccionada.set(null);
    this.filtroCuentaParticipe = '';
    this.errorOrquestacion.set(null);
    this.resultadoJubilacion.set(null);
    this.jubilacionRegistrada.set(false);
    this.valorPagarPensionTexto = '$0.00';
    this.numeroCuotasPensionTexto = '';
    this.tienePrestamoPension = false;
    this.valorSeguroPensionTexto = '';
    this.guardandoConfiguracionPension.set(false);
    this.configuracionPensionGuardada.set(false);
  }

  // ================= confirmar jubilación (ítem 3: orquestación) =================

  /**
   * Tres pasos, en este orden, cada uno opcional salvo el último:
   *
   * 1. Cruce contra préstamos → `pagarConAportes` por cada préstamo con algo asignado.
   * 2. Retiro en efectivo → `DevolucionAporteService.registrar` (devolución de aportes).
   * 3. `POST /rest/aprt/procesarJubilacion` — traslada lo que QUEDE de cesantía/jubilación a
   *    pensión complementaria y cambia el estado del partícipe. Va SIEMPRE último: si se llamara
   *    antes, se llevaría todo y los pasos 1-2 se quedarían sin de dónde salir la plata.
   *
   * Nada de esto es atómico entre pasos (cada uno es su propia transacción del lado del backend,
   * igual que el resto de este cutover) — por eso, si algo falla a mitad de camino,
   * `errorOrquestacion` dice EXACTAMENTE qué paso falló y qué ya quedó hecho, para que el
   * operador no reintente desde cero y duplique lo que sí se aplicó.
   */
  confirmarJubilacion(): void {
    if (!this.puedeJubilar()) return;

    const entidad = this.entidadSeleccionada();
    if (!entidad) return;

    const idEmpresa = empresaSesionCodigo();
    if (idEmpresa == null) {
      this.errorOrquestacion.set('No se pudo determinar la empresa de la sesión. Vuelva a iniciar sesión y reintente.');
      return;
    }

    this.errorOrquestacion.set(null);
    this.registrando.set(true);

    const usuario = usuarioSesion();
    const fecha = this.operacionesPago.formatearFecha(new Date()) ?? '';
    const pozo = this.construirPozoJubilacion();
    const asignaciones = this.asignacionesPrestamos().filter((a) => a.totalAplicado > 0.004);

    this.ejecutarCrucePrestamo(asignaciones, 0, pozo, idEmpresa, usuario, fecha, (ok) => {
      if (!ok) {
        this.registrando.set(false);
        return;
      }
      this.ejecutarRetiroEfectivo(entidad, pozo, idEmpresa, usuario, fecha, (ok2) => {
        if (!ok2) {
          this.registrando.set(false);
          return;
        }
        this.ejecutarProcesarJubilacion(entidad, idEmpresa, usuario, fecha);
      });
    });
  }

  /**
   * Saldo disponible de aportes jubilación, agrupado por tipo — la misma fuente que ya suma
   * `saldoDisponibleJubilacion` (los renglones de `aportesJubilacion()`), no una consulta aparte
   * que pudiera desincronizarse con lo que la pantalla ya muestra. Se consume en orden, primero
   * por el cruce contra préstamos y con lo que sobre, por el retiro efectivo.
   */
  private construirPozoJubilacion(): { idTipoAporte: number; restante: number }[] {
    const mapa = new Map<number, number>();
    for (const aporte of this.aportesJubilacion()) {
      const idTipoAporte = aporte.tipoAporte?.codigo;
      if (!idTipoAporte) continue;
      mapa.set(idTipoAporte, (mapa.get(idTipoAporte) ?? 0) + (aporte.saldo ?? 0));
    }
    return Array.from(mapa.entries()).map(([idTipoAporte, restante]) => ({
      idTipoAporte,
      restante: +restante.toFixed(2),
    }));
  }

  /** Toma del pozo, en orden, hasta cubrir `monto`. Muta `pozo` — el llamador decide cuándo se pisa. */
  private tomarDelPozo(
    pozo: { idTipoAporte: number; restante: number }[],
    monto: number,
  ): DesgloseAporte[] {
    const desglose: DesgloseAporte[] = [];
    let porCubrir = monto;
    for (const fondo of pozo) {
      if (porCubrir <= 0.004) break;
      const toma = +Math.min(fondo.restante, porCubrir).toFixed(2);
      if (toma <= 0.004) continue;
      desglose.push({ idTipoAporte: fondo.idTipoAporte, valor: toma });
      fondo.restante = +(fondo.restante - toma).toFixed(2);
      porCubrir = +(porCubrir - toma).toFixed(2);
    }
    return desglose;
  }

  // ---- paso 1: cruce contra préstamos ----

  private ejecutarCrucePrestamo(
    asignaciones: AsignacionPrestamo[],
    indice: number,
    pozo: { idTipoAporte: number; restante: number }[],
    idEmpresa: number,
    usuario: string,
    fecha: string,
    continuar: (ok: boolean) => void,
  ): void {
    if (indice >= asignaciones.length) {
      continuar(true);
      return;
    }

    const asignacion = asignaciones[indice];
    const etiquetaPrestamo = `#${asignacion.prestamo.idAsoprep ?? asignacion.prestamo.codigo}`;
    const desglose = this.tomarDelPozo(pozo, asignacion.totalAplicado);

    if (!desglose.length) {
      this.errorOrquestacion.set(
        `No quedó saldo de aportes disponible para cubrir el préstamo ${etiquetaPrestamo}. ` +
          (indice > 0 ? `Ya se cruzaron ${indice} préstamo(s) anterior(es) — no reintente desde cero.` : ''),
      );
      continuar(false);
      return;
    }

    this.operacionesPago
      .pagarConAportes({ idEmpresa, idPrestamo: asignacion.prestamo.codigo, usuario, fechaPago: fecha, aportes: desglose })
      .subscribe((resp) => {
        if (!resp.exito || !resp.resultado) {
          this.errorOrquestacion.set(
            `No se pudo cruzar el préstamo ${etiquetaPrestamo} contra aportes: ${mensajeDeRespuesta(resp)} ` +
              (indice > 0 ? `Ya se cruzaron ${indice} préstamo(s) anterior(es) — no reintente desde cero.` : ''),
          );
          continuar(false);
          return;
        }
        this.ejecutarCrucePrestamo(asignaciones, indice + 1, pozo, idEmpresa, usuario, fecha, continuar);
      });
  }

  // ---- paso 2: retiro efectivo ----

  private ejecutarRetiroEfectivo(
    entidad: Entidad,
    pozo: { idTipoAporte: number; restante: number }[],
    idEmpresa: number,
    usuario: string,
    fecha: string,
    continuar: (ok: boolean) => void,
  ): void {
    const monto = this.montoRetiroEfectivo();
    if (monto <= 0.004) {
      continuar(true);
      return;
    }

    const cuenta = this.cuentaParticipeSeleccionada();
    if (!cuenta) {
      this.errorOrquestacion.set(
        'Seleccione la cuenta bancaria del partícipe para el retiro efectivo. El cruce contra préstamos, si había, ya se aplicó — no reintente desde cero.',
      );
      continuar(false);
      return;
    }

    const idUsuario = this.idUsuarioSesion();
    if (!idUsuario) {
      this.errorOrquestacion.set('No se pudo determinar el usuario de la sesión. Vuelva a iniciar sesión y reintente.');
      continuar(false);
      return;
    }

    const detalle: DetalleSolicitudDevolucion[] = this.tomarDelPozo(pozo, monto);
    if (!detalle.length) {
      this.errorOrquestacion.set(
        'No quedó saldo de aportes disponible para el retiro efectivo. El cruce contra préstamos, si había, ya se aplicó — no reintente desde cero.',
      );
      continuar(false);
      return;
    }

    const solicitud: SolicitudDevolucion = {
      idEntidad: entidad.codigo,
      idCuentaBancariaParticipe: cuenta.codigo,
      idEmpresa,
      idUsuario,
      usuario,
      fecha,
      motivo: 'Retiro efectivo por jubilación',
      debitoAutomatico: false,
      detalle,
    };

    this.devolucionAporteService.registrar(solicitud).subscribe((resp) => {
      if (!resp.exito) {
        this.errorOrquestacion.set(
          `No se pudo registrar el retiro efectivo: ${resp.mensaje ?? 'error desconocido'}. El cruce contra préstamos, si había, ya se aplicó — no reintente desde cero.`,
        );
        continuar(false);
        return;
      }
      continuar(true);
    });
  }

  // ---- paso 3: traslado del remanente a pensión complementaria ----

  private ejecutarProcesarJubilacion(entidad: Entidad, idEmpresa: number, usuario: string, fecha: string): void {
    this.aporteService.procesarJubilacion({ idEntidad: entidad.codigo, usuario, fecha, idEmpresa }).subscribe((resp) => {
      this.registrando.set(false);
      if (!resp.exito || !resp.resultado) {
        this.errorOrquestacion.set(
          `El cruce contra préstamos y el retiro efectivo, si los había, ya se aplicaron. Falta el último paso — trasladar el ` +
            `remanente a pensión complementaria — y no se pudo completar: ${resp.mensaje ?? 'error desconocido'}. ` +
            'No reintente desde cero: solo hace falta reintentar este último paso.',
        );
        return;
      }
      this.resultadoJubilacion.set(resp.resultado);
      this.jubilacionRegistrada.set(true);
      this.snackBar.open(resp.mensaje ?? 'Partícipe jubilado exitosamente.', 'Cerrar', { duration: 5000 });
    });
  }

  cerrarConfirmacion(): void {
    this.jubilacionRegistrada.set(false);
    this.resetProceso();
    this.volverABuscar();
  }

  /**
   * Paso 4: `POST /rest/vppc` (`ValorPagoPensionComplementariaService.add`, ya existía — mismos
   * campos y misma semántica que `proceso-pago-jubilados.component.ts`, que ya gestiona esta
   * misma tabla para los jubilados existentes; se copia el mapeo de ahí en vez de inventarlo).
   *
   * `tienePrestamo`/`valorSeguro`: verificado en el backend — `PagoPensionComplementariaServiceImpl`
   * solo lee `valorPagar` y `valorSeguro` (lo resta del total para obtener la pensión neta);
   * `getTienePrestamo()` no lo llama nada del lado del backend. Aun así lo pido, porque
   * `proceso-pago-jubilados.component.ts` ya lo captura como checkbox — dos pantallas que tocan
   * la misma fila tienen que pedir los mismos campos, aunque uno hoy no tenga lector.
   */
  guardarConfiguracionPension(): void {
    const entidad = this.entidadSeleccionada();
    if (!entidad) return;

    const valorPagar = this.parseMoneda(this.valorPagarPensionTexto);
    if (valorPagar <= 0.004) {
      this.snackBar.open('Ingrese un valor de pago mensual válido.', 'Cerrar', { duration: 3500 });
      return;
    }

    const numeroCuotasTexto = this.numeroCuotasPensionTexto.trim();
    const numeroCuotas = numeroCuotasTexto ? Number(numeroCuotasTexto) : null;
    if (numeroCuotas !== null && (!Number.isFinite(numeroCuotas) || numeroCuotas <= 0)) {
      this.snackBar.open('El número de cuotas debe ser mayor a cero.', 'Cerrar', { duration: 3500 });
      return;
    }

    const valorSeguroTexto = this.valorSeguroPensionTexto.trim();
    const valorSeguro = valorSeguroTexto ? this.parseMoneda(valorSeguroTexto) : null;

    this.guardandoConfiguracionPension.set(true);
    this.valorPagoPensionService
      .add({
        entidad: { codigo: entidad.codigo } as Entidad,
        valorPagar,
        numeroCuotas,
        tienePrestamo: this.tienePrestamoPension ? 1 : 0,
        valorSeguro,
        estado: 1,
        usuarioIngreso: usuarioSesion(),
        fechaIngreso: this.funcionesDatos.formatearFechaParaBackend(new Date()) ?? undefined,
      })
      .subscribe({
        next: (resultado) => {
          this.guardandoConfiguracionPension.set(false);
          if (!resultado) {
            this.snackBar.open(
              'No se pudo registrar la configuración de pago mensual. Puede completarla luego desde Pago Jubilados.',
              'Cerrar',
              { duration: 6000 },
            );
            return;
          }
          this.configuracionPensionGuardada.set(true);
          this.snackBar.open('Configuración de pago mensual registrada.', 'Cerrar', { duration: 4000 });
        },
        error: () => {
          this.guardandoConfiguracionPension.set(false);
          this.snackBar.open(
            'No se pudo registrar la configuración de pago mensual. Puede completarla luego desde Pago Jubilados.',
            'Cerrar',
            { duration: 6000 },
          );
        },
      });
  }

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }

  // ================= utilidades =================

  formatMoneda(n: number): string {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  parseMoneda(texto: string | null | undefined): number {
    if (!texto) return 0;
    const n = parseFloat(String(texto).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
}

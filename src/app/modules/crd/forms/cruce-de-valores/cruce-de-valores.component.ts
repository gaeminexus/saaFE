import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';

import { AbonoCapitalDialogComponent } from '../../dialog/pagos/abono-capital-dialog.component';
import { ContextoPrestamo, SalidaDialogoPago, contextoDesdePrestamo } from '../../dialog/pagos/contexto-prestamo';
import { HistorialOperacionesDialogComponent } from '../../dialog/pagos/historial-operaciones-dialog.component';
import { PagoPrestamoDialogComponent } from '../../dialog/pagos/pago-prestamo-dialog.component';
import { PrecancelacionDialogComponent } from '../../dialog/pagos/precancelacion-dialog.component';
import { ReciboOperacionDialogComponent } from '../../dialog/pagos/recibo-operacion-dialog.component';
import { DetallePrestamo } from '../../model/detalle-prestamo';
import { Entidad } from '../../model/entidad';
import { NOMBRE_ESTADO_PRESTAMO, TOLERANCIA_MONTO, admiteOperaciones } from '../../model/pagos/catalogos-pago';
import { ResultadoPagoCuota, SaldoAporte } from '../../model/pagos/operaciones-pago';
import { DesgloseAporte, MovimientoAporte, mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { Prestamo } from '../../model/prestamo';
import { DetallePrestamoService } from '../../service/detalle-prestamo.service';
import { EntidadService } from '../../service/entidad.service';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';
import { PrestamoService } from '../../service/prestamo.service';

/** Fondo disponible del partícipe y cuánto decide usar de él en este cruce. */
interface FondoAporte {
  idTipoAporte: number;
  nombre: string;
  saldo: number;
  texto: string;
}

type EstadoCobertura = 'cubierta' | 'parcial' | 'pendiente';

interface CoberturaCuota {
  cuota: DetallePrestamo;
  aplicado: number;
  estado: EstadoCobertura;
}

type EstadoCruce = 'pendiente' | 'procesando' | 'ok' | 'error';

interface PrestamoCruce {
  prestamo: Prestamo;
  cuotas: DetallePrestamo[];
  open: boolean;
  montoTexto: string;
  nota: string | null;
  estado: EstadoCruce;
  mensaje: string | null;
  idEvento: number | null;
  resultado: ResultadoPagoCuota | null;
  movimientos: MovimientoAporte[];
}

/**
 * Cruce de valores: cancelar cuotas de préstamo con el saldo de aportes del partícipe.
 *
 * Se apoya en `POST /prst/pagarConAportes` (§5 de la guía), que aplica el pago en cascada desde la
 * cuota más antigua con la prelación desgravamen → mora → interés vencido → interés → capital →
 * seguro. Por eso la pantalla ya no permite dirigir dinero a una cuota puntual: el usuario decide
 * cuánto va a cada préstamo y de qué tipos de aporte sale, y la tabla de cuotas es una
 * proyección de cómo caería ese monto.
 *
 * Cada préstamo es una llamada aparte: el backend no tiene una operación que abarque varios
 * créditos, así que un cruce sobre N préstamos son N transacciones independientes, cada una
 * anulable por separado desde el historial.
 */
@Component({
  selector: 'app-cruce-de-valores',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './cruce-de-valores.component.html',
  styleUrl: './cruce-de-valores.component.scss',
})
export class CruceDeValoresComponent {
  private entidadService = inject(EntidadService);
  private prestamoService = inject(PrestamoService);
  private detallePrestamoService = inject(DetallePrestamoService);
  private operaciones = inject(OperacionesPagoPrestamoService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly hoy = new Date();

  // ---- búsqueda (mismos criterios que Cobros Personales, para consistencia entre pantallas) ----
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
  cargandoSaldos = signal(false);
  prestamosCruce = signal<PrestamoCruce[]>([]);

  /** Fondos disponibles por tipo de aporte vigente, tal como los agrega la base de datos. */
  fondos: FondoAporte[] = [];
  private fondosVersion = signal(0);

  fechaPago = signal<Date>(new Date());
  observacion = '';

  // Los objetos de prestamosCruce se mutan directamente (monto, nota, estado) en vez de
  // reconstruirse; este contador fuerza a los computed() de abajo a recalcular tras cada mutación.
  private version = signal(0);
  private bump(): void {
    this.version.update((v) => v + 1);
  }

  registrando = signal(false);
  cruceRegistrado = signal(false);
  resumenCruce = signal<{ exitosos: number; fallidos: number; total: number } | null>(null);

  // ---- totales ----

  saldoDisponibleTotal = computed(() => {
    this.fondosVersion();
    return +this.fondos.reduce((s, f) => s + Math.max(f.saldo, 0), 0).toFixed(2);
  });

  fondoDisponibleTotal = computed(() => {
    this.fondosVersion();
    return +this.fondos.reduce((s, f) => s + this.parseMoneda(f.texto), 0).toFixed(2);
  });

  fondoUtilizadoTotal = computed(() => {
    this.version();
    return +this.prestamosCruce().reduce((s, pc) => s + this.parseMoneda(pc.montoTexto), 0).toFixed(2);
  });

  fondoRestante = computed(() => +(this.fondoDisponibleTotal() - this.fondoUtilizadoTotal()).toFixed(2));

  hayExcesoEnAlgunFondo = computed(() => {
    this.fondosVersion();
    return this.fondos.some((f) => this.parseMoneda(f.texto) > f.saldo + TOLERANCIA_MONTO);
  });

  tieneSeleccion = computed(() => this.fondoUtilizadoTotal() > 0.004);

  prestamosACruzar = computed(() => {
    this.version();
    return this.prestamosCruce().filter((pc) => this.parseMoneda(pc.montoTexto) > 0.004);
  });

  puedeConfirmar = computed(
    () =>
      this.tieneSeleccion() &&
      !this.hayExcesoEnAlgunFondo() &&
      this.fondoRestante() >= -TOLERANCIA_MONTO &&
      !this.registrando()
  );

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

  seleccionarEntidad(entidad: Entidad): void {
    this.entidadSeleccionada.set(entidad);
    this.mostrandoResultados.set(false);
    this.cargarDatosParticipante(entidad);
  }

  volverABuscar(): void {
    this.mostrandoResultados.set(true);
    this.entidadSeleccionada.set(null);
  }

  private cargarDatosParticipante(entidad: Entidad): void {
    this.prestamosCruce.set([]);
    this.fondos = [];
    this.fondosVersion.update((v) => v + 1);
    this.cruceRegistrado.set(false);
    this.resumenCruce.set(null);
    this.observacion = '';

    this.cargarPrestamos(entidad.codigo);
    this.cargarSaldos(entidad.codigo);
  }

  /**
   * Se traen todos los préstamos del partícipe y se descartan los terminales por `idEstado`
   * (3, 4 y 5). El filtro va del lado del cliente porque el estado que evalúan los servicios de
   * pago está en `PRST.idEstado`, no en `estadoPrestamo`: filtrar por `estadoPrestamo = 2` dejaba
   * fuera los créditos de plazo vencido y en mora, que sí se pueden cruzar.
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
        const wrappers: PrestamoCruce[] = (prestamos ?? [])
          .filter((p) => admiteOperaciones(p.idEstado))
          .map((p) => ({
            prestamo: p,
            cuotas: [],
            open: false,
            montoTexto: '',
            nota: null,
            estado: 'pendiente' as EstadoCruce,
            mensaje: null,
            idEvento: null,
            resultado: null,
            movimientos: [],
          }));
        this.prestamosCruce.set(wrappers);
        wrappers.forEach((pc) => this.cargarCuotas(pc));
      },
      error: () => {
        this.cargandoPrestamos.set(false);
        this.snackBar.open('No se pudieron cargar los préstamos del partícipe.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  /**
   * Saldos por tipo de aporte agregados por la base de datos. Sustituye a la descarga completa de
   * CRD.APRT que hacía esta pantalla, que es la causa conocida del OutOfMemoryError de WildFly.
   */
  private cargarSaldos(codigoEntidad: number): void {
    this.cargandoSaldos.set(true);
    this.operaciones.saldosPorEntidad(codigoEntidad).subscribe((resp) => {
      this.cargandoSaldos.set(false);
      if (!resp.exito) {
        this.fondos = [];
        this.fondosVersion.update((v) => v + 1);
        this.snackBar.open(`No se pudieron cargar los saldos de aportes: ${mensajeDeRespuesta(resp)}`, 'Cerrar', { duration: 5000 });
        return;
      }
      // Un saldo 0 o negativo indica inconsistencia de datos: no se ofrece pagar con ese tipo.
      this.fondos = (resp.resultado ?? [])
        .filter((a) => (a.saldo ?? 0) > 0.004)
        .map((a: SaldoAporte) => ({
          idTipoAporte: a.idTipoAporte,
          nombre: a.nombre,
          saldo: +(a.saldo ?? 0).toFixed(2),
          texto: '',
        }));
      this.fondosVersion.update((v) => v + 1);
    });
  }

  private cargarCuotas(pc: PrestamoCruce): void {
    const criterioPrestamo = new DatosBusqueda();
    criterioPrestamo.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'prestamo', 'codigo', String(pc.prestamo.codigo), TipoComandosBusqueda.IGUAL);

    const criterioSaldo = new DatosBusqueda();
    criterioSaldo.asignaUnCampoSinTrunc(TipoDatosBusqueda.DOUBLE, 'saldo', '0', TipoComandosBusqueda.MAYOR);

    const criterioOrdenCuota = new DatosBusqueda();
    criterioOrdenCuota.orderBy('numeroCuota');
    criterioOrdenCuota.setTipoOrden(DatosBusqueda.ORDER_ASC);

    this.detallePrestamoService.selectByCriteria([criterioPrestamo, criterioSaldo, criterioOrdenCuota]).subscribe({
      next: (cuotas) => {
        pc.cuotas = (cuotas ?? []).filter((c) => (c.saldo ?? 0) > 0.004);
        this.bump();
      },
      error: () => this.snackBar.open(`No se pudo cargar el detalle de cuotas del préstamo #${pc.prestamo.idAsoprep}.`, 'Cerrar', { duration: 4000 }),
    });
  }

  // ================= fondos de aportes =================

  onFondoTextoCambio(): void {
    this.fondosVersion.update((v) => v + 1);
  }

  onFondoBlur(fondo: FondoAporte): void {
    let v = Math.max(this.parseMoneda(fondo.texto), 0);
    if (v > fondo.saldo + TOLERANCIA_MONTO) {
      this.snackBar.open(`El monto no puede superar el saldo disponible de ${fondo.nombre} (${this.formatMoneda(fondo.saldo)}).`, 'Cerrar', { duration: 3500 });
      v = fondo.saldo;
    }
    v = +v.toFixed(2);
    fondo.texto = v > 0.004 ? this.formatMoneda(v) : '';
    this.fondosVersion.update((n) => n + 1);
    this.reconciliarSobreasignacion();
  }

  usarMaximoFondo(fondo: FondoAporte): void {
    fondo.texto = fondo.saldo > 0.004 ? this.formatMoneda(fondo.saldo) : '';
    this.fondosVersion.update((v) => v + 1);
  }

  usarTodosLosFondos(): void {
    for (const f of this.fondos) f.texto = f.saldo > 0.004 ? this.formatMoneda(f.saldo) : '';
    this.fondosVersion.update((v) => v + 1);
  }

  limpiarFondos(): void {
    for (const f of this.fondos) f.texto = '';
    this.fondosVersion.update((v) => v + 1);
    this.reconciliarSobreasignacion();
  }

  montoFondo(fondo: FondoAporte): number {
    this.fondosVersion();
    return this.parseMoneda(fondo.texto);
  }

  /**
   * Cuando el fondo disponible baja por debajo de lo ya repartido entre préstamos (típicamente
   * porque el usuario redujo un fondo después de asignar), se libera el excedente automáticamente:
   * se recorta desde el préstamo más reciente hacia el más antiguo, preservando lo que el usuario
   * asignó primero.
   */
  private reconciliarSobreasignacion(): void {
    let exceso = +(this.fondoUtilizadoTotal() - this.fondoDisponibleTotal()).toFixed(2);
    if (exceso <= TOLERANCIA_MONTO) return;

    const prestamos = this.prestamosCruce();
    for (let i = prestamos.length - 1; i >= 0 && exceso > TOLERANCIA_MONTO; i--) {
      const pc = prestamos[i];
      const asignado = this.parseMoneda(pc.montoTexto);
      if (asignado <= 0.004) continue;
      const reduccion = Math.min(asignado, exceso);
      const nuevo = +(asignado - reduccion).toFixed(2);
      pc.montoTexto = nuevo > 0.004 ? this.formatMoneda(nuevo) : '';
      pc.nota = null;
      exceso = +(exceso - reduccion).toFixed(2);
    }

    this.snackBar.open(
      'El fondo disponible se redujo — se ajustaron automáticamente los montos ya asignados a los préstamos.',
      'Cerrar',
      { duration: 4500 }
    );
    this.bump();
  }

  // ================= asignación por préstamo =================

  toggleAbierto(pc: PrestamoCruce): void {
    pc.open = !pc.open;
    this.bump();
  }

  montoAplicadoPrestamo(pc: PrestamoCruce): number {
    this.version();
    return this.parseMoneda(pc.montoTexto);
  }

  /** Máximo asignable a este préstamo: su saldo, acotado por lo que queda del fondo compartido. */
  private maxParaPrestamo(pc: PrestamoCruce): number {
    const usadoPorOtros = this.fondoUtilizadoTotal() - this.parseMoneda(pc.montoTexto);
    const presupuesto = this.fondoDisponibleTotal() - usadoPorOtros;
    return Math.max(Math.min(pc.prestamo.saldoTotal ?? 0, presupuesto), 0);
  }

  onMontoPrestamoBlur(pc: PrestamoCruce): void {
    const bruto = Math.max(this.parseMoneda(pc.montoTexto), 0);
    const max = this.maxParaPrestamo(pc);
    const v = +Math.min(bruto, max).toFixed(2);

    if (bruto > max + TOLERANCIA_MONTO) {
      const saldo = pc.prestamo.saldoTotal ?? 0;
      pc.nota =
        max < saldo - TOLERANCIA_MONTO
          ? `El fondo disponible solo alcanza para ${this.formatMoneda(max)} en este préstamo.`
          : `El monto no puede superar el saldo del préstamo (${this.formatMoneda(saldo)}).`;
    } else {
      pc.nota = null;
    }

    pc.montoTexto = v > 0.004 ? this.formatMoneda(v) : '';
    this.bump();
  }

  cancelarSaldoTotal(pc: PrestamoCruce): void {
    if (this.fondoDisponibleTotal() <= 0.004) {
      this.snackBar.open('Primero indique cuánto va a usar de cada fondo de aportes.', 'Cerrar', { duration: 3000 });
      return;
    }
    const saldoTotal = pc.prestamo.saldoTotal ?? 0;
    const max = this.maxParaPrestamo(pc);
    const v = +Math.min(saldoTotal, max).toFixed(2);
    pc.montoTexto = v > 0.004 ? this.formatMoneda(v) : '';
    pc.nota =
      v < saldoTotal - TOLERANCIA_MONTO
        ? `El fondo disponible no alcanza para cancelar el saldo total (${this.formatMoneda(saldoTotal)}). Se asignaron ${this.formatMoneda(v)}.`
        : null;
    this.bump();
  }

  aplicarCuotas(pc: PrestamoCruce, cantidad: number): void {
    if (this.fondoDisponibleTotal() <= 0.004) {
      this.snackBar.open('Primero indique cuánto va a usar de cada fondo de aportes.', 'Cerrar', { duration: 3000 });
      return;
    }
    const objetivo = pc.cuotas.slice(0, cantidad).reduce((s, c) => s + (c.saldo ?? 0), 0);
    const v = +Math.min(objetivo, this.maxParaPrestamo(pc)).toFixed(2);
    pc.montoTexto = v > 0.004 ? this.formatMoneda(v) : '';
    pc.nota = null;
    this.bump();
  }

  quitarCruce(pc: PrestamoCruce): void {
    pc.montoTexto = '';
    pc.nota = null;
    this.bump();
  }

  limpiarSeleccion(): void {
    for (const pc of this.prestamosCruce()) {
      pc.montoTexto = '';
      pc.nota = null;
      pc.estado = 'pendiente';
      pc.mensaje = null;
    }
    this.bump();
  }

  /**
   * Proyección de cómo caería el monto asignado sobre las cuotas pendientes: se consume de la más
   * antigua a la más nueva, que es el orden en el que aplica el backend. Es una estimación por
   * saldo de cuota — el desglose real (desgravamen, mora, interés, capital, seguro) lo devuelve el
   * servidor en la respuesta del pago y se muestra en el comprobante.
   */
  coberturaProyectada(pc: PrestamoCruce): CoberturaCuota[] {
    this.version();
    let restante = this.parseMoneda(pc.montoTexto);
    const salida: CoberturaCuota[] = [];
    for (const cuota of pc.cuotas) {
      const valor = cuota.saldo ?? 0;
      let aplicado = 0;
      let estado: EstadoCobertura = 'pendiente';
      if (restante >= valor - 0.004 && valor > 0) {
        aplicado = valor;
        estado = 'cubierta';
        restante = +(restante - valor).toFixed(2);
      } else if (restante > 0.004) {
        aplicado = +restante.toFixed(2);
        estado = 'parcial';
        restante = 0;
      }
      salida.push({ cuota, aplicado, estado });
    }
    return salida;
  }

  cuotasCubiertas(pc: PrestamoCruce): number {
    return this.coberturaProyectada(pc).filter((c) => c.estado === 'cubierta').length;
  }

  cuotasParciales(pc: PrestamoCruce): number {
    return this.coberturaProyectada(pc).filter((c) => c.estado === 'parcial').length;
  }

  estadoPrestamoTexto(pc: PrestamoCruce): string {
    const idEstado = pc.prestamo.idEstado;
    if (idEstado == null) return '—';
    return NOMBRE_ESTADO_PRESTAMO[Number(idEstado)] ?? `Estado ${idEstado}`;
  }

  // ================= ejecutar el cruce =================

  /**
   * Ejecuta un `pagarConAportes` por préstamo, en secuencia.
   *
   * No hay atomicidad entre préstamos: cada llamada es su propia transacción. Si una falla el
   * backend no deja nada escrito para ese préstamo, así que su parte del fondo vuelve al pozo y se
   * sigue con el siguiente; al final se informa cuáles se aplicaron y cuáles no.
   */
  confirmarCruce(): void {
    if (!this.puedeConfirmar()) return;
    this.registrando.set(true);
    this.resumenCruce.set(null);

    // Pozo de fondos que se va consumiendo en el orden en que los devolvió el backend.
    const pozo = this.fondos
      .map((f) => ({ idTipoAporte: f.idTipoAporte, nombre: f.nombre, restante: this.parseMoneda(f.texto) }))
      .filter((f) => f.restante > 0.004);

    const cola = this.prestamosACruzar();
    for (const pc of cola) {
      pc.estado = 'pendiente';
      pc.mensaje = null;
      pc.idEvento = null;
      pc.resultado = null;
      pc.movimientos = [];
    }
    this.bump();

    this.procesarSiguiente(cola, 0, pozo, { exitosos: 0, fallidos: 0 });
  }

  private procesarSiguiente(
    cola: PrestamoCruce[],
    indice: number,
    pozo: { idTipoAporte: number; nombre: string; restante: number }[],
    conteo: { exitosos: number; fallidos: number }
  ): void {
    if (indice >= cola.length) {
      this.registrando.set(false);
      this.cruceRegistrado.set(true);
      this.resumenCruce.set({ ...conteo, total: cola.length });
      this.refrescarTrasCruce();
      return;
    }

    const pc = cola[indice];
    const monto = +this.parseMoneda(pc.montoTexto).toFixed(2);

    // Se toma del pozo en orden hasta cubrir el monto de este préstamo.
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

    if (!desglose.length) {
      pc.estado = 'error';
      pc.mensaje = 'No quedó saldo de aportes disponible para este préstamo.';
      conteo.fallidos++;
      this.bump();
      this.procesarSiguiente(cola, indice + 1, pozo, conteo);
      return;
    }

    // El reparto en pantalla nunca debería exceder el fondo, pero si por redondeo el pozo no
    // alcanza se envía menos de lo asignado: hay que reflejarlo en la tarjeta, si no la pantalla
    // seguiría mostrando "a cruzar" un monto mayor que el que realmente se envió.
    const enviado = +desglose.reduce((s, d) => s + d.valor, 0).toFixed(2);
    if (enviado < monto - TOLERANCIA_MONTO) {
      pc.montoTexto = this.formatMoneda(enviado);
      pc.nota = `El saldo de aportes solo alcanzó para ${this.formatMoneda(enviado)} de los ${this.formatMoneda(monto)} asignados.`;
    }

    pc.estado = 'procesando';
    this.bump();

    this.operaciones
      .pagarConAportes({
        idPrestamo: pc.prestamo.codigo,
        usuario: usuarioSesion(),
        observacion: this.observacion.trim() || null,
        fechaPago: this.operaciones.formatearFecha(this.fechaPago()),
        aportes: desglose,
      })
      .subscribe((resp) => {
        if (resp.exito && resp.resultado) {
          pc.estado = 'ok';
          pc.mensaje = resp.mensaje ?? 'Cruce aplicado.';
          pc.idEvento = resp.resultado.idEvento;
          pc.resultado = resp.resultado;
          pc.movimientos = resp.movimientosAporte ?? [];
          conteo.exitosos++;
        } else {
          pc.estado = 'error';
          pc.mensaje = mensajeDeRespuesta(resp);
          conteo.fallidos++;
          // La transacción no dejó nada escrito: el dinero reservado vuelve al pozo para que los
          // préstamos siguientes puedan usarlo.
          for (const renglon of desglose) {
            const fondo = pozo.find((f) => f.idTipoAporte === renglon.idTipoAporte);
            if (fondo) fondo.restante = +(fondo.restante + renglon.valor).toFixed(2);
          }
        }
        this.bump();
        this.procesarSiguiente(cola, indice + 1, pozo, conteo);
      });
  }

  private refrescarTrasCruce(): void {
    // Los montos ya aplicados dejan de estar "por repartir": si no se limpian, la barra de totales
    // los sigue contando contra un fondo que acaba de volver a cero y se pinta en rojo sobre una
    // operación que sí se registró.
    for (const pc of this.prestamosCruce()) {
      if (pc.estado === 'ok') pc.montoTexto = '';
    }
    this.bump();

    const entidad = this.entidadSeleccionada();
    if (!entidad) return;
    this.cargarSaldos(entidad.codigo);
    for (const pc of this.prestamosCruce()) {
      this.cargarCuotas(pc);
    }
  }

  verComprobante(pc: PrestamoCruce): void {
    if (!pc.resultado) return;
    const nombres: Record<number, string> = {};
    for (const f of this.fondos) nombres[f.idTipoAporte] = f.nombre;

    this.dialog.open(ReciboOperacionDialogComponent, {
      data: {
        tipo: 'PAGO_APORTES',
        tituloPrestamo: this.tituloDe(pc),
        participante: this.entidadSeleccionada()?.razonSocial ?? undefined,
        mensaje: pc.mensaje ?? undefined,
        fecha: this.operaciones.formatearFecha(this.fechaPago()) ?? undefined,
        pago: pc.resultado,
        movimientosAporte: pc.movimientos,
        nombresTipoAporte: nombres,
      },
      width: '880px',
      maxWidth: '96vw',
      autoFocus: false,
    });
  }

  iniciarOtroCruce(): void {
    this.cruceRegistrado.set(false);
    this.resumenCruce.set(null);
    this.limpiarSeleccion();
    this.limpiarFondos();
    this.observacion = '';
    const entidad = this.entidadSeleccionada();
    if (entidad) this.cargarPrestamos(entidad.codigo);
  }

  // ================= operaciones individuales del préstamo =================

  private contextoDe(pc: PrestamoCruce): ContextoPrestamo {
    return contextoDesdePrestamo(pc.prestamo, this.entidadSeleccionada()?.razonSocial);
  }

  tituloDe(pc: PrestamoCruce): string {
    return this.contextoDe(pc).titulo;
  }

  abrirPago(pc: PrestamoCruce, modoInicial: 'efectivo' | 'aportes' = 'aportes'): void {
    this.dialog
      .open(PagoPrestamoDialogComponent, {
        data: { ...this.contextoDe(pc), modoInicial },
        width: '780px',
        maxWidth: '96vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((salida?: SalidaDialogoPago) => this.procesarSalida(pc, salida));
  }

  abrirAbonoCapital(pc: PrestamoCruce): void {
    this.dialog
      .open(AbonoCapitalDialogComponent, {
        data: this.contextoDe(pc),
        width: '820px',
        maxWidth: '96vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((salida?: SalidaDialogoPago) => this.procesarSalida(pc, salida));
  }

  abrirPrecancelacion(pc: PrestamoCruce): void {
    this.dialog
      .open(PrecancelacionDialogComponent, {
        data: this.contextoDe(pc),
        width: '820px',
        maxWidth: '96vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((salida?: SalidaDialogoPago) => this.procesarSalida(pc, salida));
  }

  abrirHistorial(pc: PrestamoCruce): void {
    this.dialog
      .open(HistorialOperacionesDialogComponent, {
        data: this.contextoDe(pc),
        width: '840px',
        maxWidth: '96vw',
        autoFocus: false,
      })
      .afterClosed()
      // Siempre se recarga: cerrar con Esc o clic fuera no devuelve resultado, y para entonces
      // el usuario ya pudo haber anulado una operación desde el diálogo.
      .subscribe(() => {
        const entidad = this.entidadSeleccionada();
        if (!entidad) return;
        this.cargarPrestamos(entidad.codigo);
        this.cargarSaldos(entidad.codigo);
      });
  }

  private procesarSalida(pc: PrestamoCruce, salida?: SalidaDialogoPago): void {
    if (!salida) return;
    switch (salida.accion) {
      case 'aplicado':
      case 'anulado': {
        const entidad = this.entidadSeleccionada();
        if (entidad) {
          this.cargarPrestamos(entidad.codigo);
          this.cargarSaldos(entidad.codigo);
        }
        break;
      }
      case 'ir-a-pagar':
        this.abrirPago(pc, 'efectivo');
        break;
      case 'ir-a-precancelar':
        this.abrirPrecancelacion(pc);
        break;
      case 'ir-a-abonar':
        this.abrirAbonoCapital(pc);
        break;
    }
  }

  // ================= utilidades =================

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  parseMoneda(texto: string | null | undefined): number {
    if (!texto) return 0;
    const n = parseFloat(String(texto).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
}

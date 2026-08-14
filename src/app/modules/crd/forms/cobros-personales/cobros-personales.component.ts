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
  aplicado: number;
  estado: 'cubierta' | 'parcial' | 'pendiente';
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
  cuotasPendientes = signal<DetallePrestamo[]>([]);
  historico = signal<HistoricoDesgloseAporteParticipe | null>(null);
  cuentasBancarias = signal<CuentaBancaria[]>([]);

  /** Saldos reales por tipo de aporte, agregados por la base de datos. */
  saldosAporte = signal<SaldoAporte[]>([]);
  cargandoSaldos = signal(false);

  saldoCesantia = computed(() => this.saldoPorNombre('cesant'));
  saldoJubilacion = computed(() => this.saldoPorNombre('jubila'));
  valorMensualCesantia = computed(() => this.historico()?.aporteCesantia ?? 0);
  valorMensualJubilacion = computed(() => this.historico()?.aporteJubilacion ?? 0);
  saldoTotalPrestamo = computed(() => this.prestamoVigente()?.saldoTotal ?? 0);

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

  asignacionesPrestamo = computed<AsignacionCuota[]>(() => {
    this.cuentaMontoVersion();
    if (!this.cuentaChecked.prestamo) return [];
    return this.calcularAsignacionPrestamo(this.parseMoneda(this.cuentaMontoTexto.prestamo));
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
    this.cuotasPendientes.set([]);
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
        if (seleccionado) this.cargarCuotasPendientes(seleccionado);
      },
      error: () => {
        this.cargandoPrestamos.set(false);
        this.snackBar.open('No se pudo cargar el préstamo del partícipe.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  seleccionarPrestamo(prestamo: Prestamo): void {
    this.prestamoVigente.set(prestamo);
    this.cuotasPendientes.set([]);
    this.cargarCuotasPendientes(prestamo);
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

  private cargarCuotasPendientes(prestamo: Prestamo): void {
    // Filtrar cuotas con saldo > 0 y ordenar por numeroCuota ASC directamente en el backend
    const criterioPrestamo = new DatosBusqueda();
    criterioPrestamo.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'prestamo', 'codigo', String(prestamo.codigo), TipoComandosBusqueda.IGUAL);

    const criterioSaldo = new DatosBusqueda();
    criterioSaldo.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.DOUBLE, 'saldo', '0', TipoComandosBusqueda.MAYOR
    );

    const criterioOrdenCuota = new DatosBusqueda();
    criterioOrdenCuota.orderBy('numeroCuota');
    criterioOrdenCuota.setTipoOrden(DatosBusqueda.ORDER_ASC);

    this.detallePrestamoService.selectByCriteria([criterioPrestamo, criterioSaldo, criterioOrdenCuota]).subscribe({
      next: (cuotas) => {
        // Doble-verificación en frontend por redondeo (saldo puede ser 0.001 etc.)
        const pendientes = (cuotas ?? []).filter((c) => (c.saldo ?? 0) > 0.004);
        this.cuotasPendientes.set(pendientes);
      },
      error: () => this.snackBar.open('No se pudo cargar el detalle de cuotas del préstamo.', 'Cerrar', { duration: 4000 }),
    });
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
      if (key === 'prestamo') this.detallePrestamoAbierto.set(false);
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
   * Vista previa de cómo caería el pago sobre las cuotas. Es una estimación por saldo de cuota:
   * el reparto real lo hace el backend con la prelación desgravamen → mora → interés vencido →
   * interés → capital → seguro, y el desglose exacto llega en la respuesta del pago.
   */
  private calcularAsignacionPrestamo(monto: number): AsignacionCuota[] {
    let restante = monto;
    const asignaciones: AsignacionCuota[] = [];
    for (const cuota of this.cuotasPendientes()) {
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
      asignaciones.push({ cuota, aplicado, estado });
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

  private contextoActual(): ContextoPrestamo | null {
    const prestamo = this.prestamoVigente();
    if (!prestamo) return null;
    return contextoDesdePrestamo(prestamo, this.entidadSeleccionada()?.razonSocial);
  }

  tituloPrestamo(): string {
    return this.contextoActual()?.titulo ?? 'Préstamo';
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
        data: contexto,
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

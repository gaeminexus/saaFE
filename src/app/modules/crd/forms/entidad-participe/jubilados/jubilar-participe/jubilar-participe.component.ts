import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';

import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { FuncionesDatosService } from '../../../../../../shared/services/funciones-datos.service';

import { Aporte } from '../../../../model/aporte';
import { DetallePrestamo } from '../../../../model/detalle-prestamo';
import { Entidad } from '../../../../model/entidad';
import { EstadoParticipe, esEstadoVigente } from '../../../../model/estado-participe';
import { Prestamo } from '../../../../model/prestamo';
import { AporteService } from '../../../../service/aporte.service';
import { DetallePrestamoService } from '../../../../service/detalle-prestamo.service';
import { EntidadService } from '../../../../service/entidad.service';
import { EstadoParticipeService } from '../../../../service/estado-participe.service';
import { PrestamoService } from '../../../../service/prestamo.service';

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
const CODIGOS_PRESTAMO_ACTIVO = new Set<number>([2, 8, 10]);
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

    effect(() => {
      const entidad = this.entidadSeleccionada();
      if (entidad && !this.cargandoDatos() && !this.montoPrestamosInicializado) {
        this.montoPrestamosTexto.set(this.formatMoneda(this.maxDestinablePrestamos()));
        this.montoPrestamosInicializado = true;
      }
    });

    effect(() => {
      const saldo = this.saldoRemanenteJubilacion();
      if (this.ultimoSaldoRemanenteConocido === null || Math.abs(saldo - this.ultimoSaldoRemanenteConocido) > 0.004) {
        this.montoRetiroEfectivoTexto.set(this.formatMoneda(saldo));
        this.montoPensionTexto.set('$0.00');
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
  cargandoDatos = computed(() => this.cargandoAportes() || this.cargandoPrestamos());
  aportesJubilacion = signal<Aporte[]>([]);
  prestamosActivos = signal<Prestamo[]>([]);
  cuotasPorPrestamo = signal<Map<number, CuotasPrestamo>>(new Map());

  saldoDisponibleJubilacion = computed(() => this.aportesJubilacion().reduce((s, a) => s + (a.saldo ?? 0), 0));
  saldoTotalPrestamosActivos = computed(() => this.prestamosActivos().reduce((s, p) => s + (p.saldoTotal ?? 0), 0));
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
        saldoRestante: +((prestamo.saldoTotal ?? 0) - totalAplicado).toFixed(2),
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
  montoPensionTexto = signal('$0.00');
  numeroCuotasPensionTexto = '';

  asignadoAllocation = computed(
    () => this.parseMoneda(this.montoRetiroEfectivoTexto()) + this.parseMoneda(this.montoPensionTexto()),
  );
  restanteAllocation = computed(() => +(this.saldoRemanenteJubilacion() - this.asignadoAllocation()).toFixed(2));
  completamenteAsignadoAllocation = computed(() => {
    if (this.saldoRemanenteJubilacion() === 0) return true;
    return Math.abs(this.restanteAllocation()) < 0.005;
  });

  // ---- confirmar jubilación ----
  registrando = signal(false);
  jubilacionRegistrada = signal(false);

  puedeJubilar = computed(() => {
    const entidad = this.entidadSeleccionada();
    if (!entidad || this.cargandoDatos() || this.registrando()) return false;
    const pagoCompletoOExcepcion = this.prestamosActivos().length === 0 || this.faltantePagoCompleto() <= 0.005 || this.registrarExcepcion();
    return pagoCompletoOExcepcion && this.completamenteAsignadoAllocation();
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

  onMontoAllocationBlur(campo: 'retiro' | 'pension'): void {
    if (campo === 'retiro') {
      this.montoRetiroEfectivoTexto.set(this.formatMoneda(Math.max(this.parseMoneda(this.montoRetiroEfectivoTexto()), 0)));
    } else {
      this.montoPensionTexto.set(this.formatMoneda(Math.max(this.parseMoneda(this.montoPensionTexto()), 0)));
    }
  }

  private resetProceso(): void {
    this.detallesAbiertos.set(new Set());
    this.registrarExcepcion.set(false);
    this.montoPrestamosTexto.set('$0.00');
    this.montoPrestamosInicializado = false;
    this.montoRetiroEfectivoTexto.set('$0.00');
    this.montoPensionTexto.set('$0.00');
    this.ultimoSaldoRemanenteConocido = null;
    this.numeroCuotasPensionTexto = '';
    this.jubilacionRegistrada.set(false);
  }

  // ================= confirmar jubilación =================

  confirmarJubilacion(): void {
    if (!this.puedeJubilar()) return;
    this.registrando.set(true);

    const entidad = this.entidadSeleccionada();
    const montoRetiroEfectivo = this.parseMoneda(this.montoRetiroEfectivoTexto());
    const montoPension = this.parseMoneda(this.montoPensionTexto());
    const numeroCuotasPension = this.numeroCuotasPensionTexto ? Number(this.numeroCuotasPensionTexto) : null;

    const payload = {
      entidad: entidad?.codigo,
      fecha: this.funcionesDatos.formatearFechaParaBackend(new Date()),
      saldoAportesJubilacionDisponible: this.saldoDisponibleJubilacion(),
      montoDestinadoPrestamos: this.montoDestinadoPrestamos(),
      excepcionLiquidacionParcial: this.faltantePagoCompleto() > 0.005 && this.registrarExcepcion(),
      prestamos: this.asignacionesPrestamos().map((a) => ({
        codigo: a.prestamo.codigo,
        montoAplicado: a.totalAplicado,
        saldoRestante: a.saldoRestante,
        cuotas: a.cuotas.filter((c) => c.aplicado > 0).map((c) => ({ codigo: c.cuota.codigo, aplicado: c.aplicado })),
      })),
      // TODO(pendiente-backend): no existe todavía un modelo/servicio para "retiro efectivo" —
      // cuando el backend defina el contrato, seguir el mismo patrón que
      // valor-pago-pension-complementaria.ts (modelo + servicio dedicados) en vez de este objeto plano.
      retiroEfectivo: montoRetiroEfectivo > 0 ? { monto: montoRetiroEfectivo } : null,
      pensionComplementaria: montoPension > 0 ? { valorPagar: montoPension, numeroCuotas: numeroCuotasPension } : null,
    };

    // TODO(pendiente-backend): reemplazar este stub por la llamada real una vez el equipo de
    // backend publique el endpoint de "jubilar partícipe" (liquidación de préstamos activos +
    // asignación de saldo remanente + cambio de estado de la entidad a Jubilado).
    setTimeout(() => {
      console.warn('[Jubilar Participe] Jubilación simulada — endpoint real pendiente del equipo de backend:', payload);
      this.registrando.set(false);
      this.jubilacionRegistrada.set(true);
      this.snackBar.open('Partícipe jubilado exitosamente.', 'Cerrar', { duration: 4000 });
    }, 400);
  }

  cerrarConfirmacion(): void {
    this.jubilacionRegistrada.set(false);
    this.resetProceso();
    this.volverABuscar();
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

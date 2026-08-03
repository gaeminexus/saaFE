import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';

import { CuentaBancaria } from '../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../tsr/service/cuenta-bancaria.service';

import { Aporte } from '../../model/aporte';
import { DetallePrestamo } from '../../model/detalle-prestamo';
import { Entidad } from '../../model/entidad';
import { HistoricoDesgloseAporteParticipe } from '../../model/historico-desglose-aporte-participe';
import { Prestamo } from '../../model/prestamo';
import { AporteService } from '../../service/aporte.service';
import { DetallePrestamoService } from '../../service/detalle-prestamo.service';
import { EntidadService } from '../../service/entidad.service';
import { HistoricoDesgloseAporteParticipeService } from '../../service/historico-desglose-aporte-participe.service';
import { PrestamoService } from '../../service/prestamo.service';

type CuentaKey = 'prestamo' | 'cesantia' | 'jubilacion';
type MetodoPago = 'debito' | 'transferencia' | 'deposito';

interface AsignacionCuota {
  cuota: DetallePrestamo;
  aplicado: number;
  estado: 'cubierta' | 'parcial' | 'pendiente';
}

// El backend (com.saa.model.crd.Prestamo) persiste `estadoPrestamo` como un Long plano
// (columna ESPSCDGO), pero el modelo de este frontend lo tipa como objeto EstadoPrestamo.
// VIGENTE = 2, confirmado contra com.saa.rubros.EstadoPrestamo.java — hasta verificar la
// forma real de la respuesta del API, este helper acepta ambas formas.
const ESTADO_PRESTAMO_VIGENTE = 2;

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
  private aporteService = inject(AporteService);
  private historicoService = inject(HistoricoDesgloseAporteParticipeService);
  private cuentaBancariaService = inject(CuentaBancariaService);
  private funcionesDatos = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);

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
  cargandoDatos = signal(false);
  prestamoVigente = signal<Prestamo | null>(null);
  cuotasPendientes = signal<DetallePrestamo[]>([]);
  aportesCesantia = signal<Aporte[]>([]);
  aportesJubilacion = signal<Aporte[]>([]);
  historico = signal<HistoricoDesgloseAporteParticipe | null>(null);
  cuentasBancarias = signal<CuentaBancaria[]>([]);

  totalAportadoCesantia = computed(() => this.aportesCesantia().reduce((s, a) => s + (a.valor ?? 0), 0));
  totalAportadoJubilacion = computed(() => this.aportesJubilacion().reduce((s, a) => s + (a.valor ?? 0), 0));
  valorMensualCesantia = computed(() => this.historico()?.aporteCesantia ?? 0);
  valorMensualJubilacion = computed(() => this.historico()?.aporteJubilacion ?? 0);
  saldoTotalPrestamo = computed(() => this.prestamoVigente()?.saldoTotal ?? 0);

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

  registrando = signal(false);
  pagoRegistrado = signal(false);

  saldoAporteOrigen = computed(() => {
    const c = this.cuentaOrigenAporte();
    return c === 'cesantia' ? this.totalAportadoCesantia() : this.totalAportadoJubilacion();
  });
  saldoDebitoInsuficiente = computed(() => this.metodoPago() === 'debito' && this.montoTotal() > this.saldoAporteOrigen());

  puedeConfirmar = computed(() => {
    const algunaCuentaMarcada = this.cuentaChecked.prestamo || this.cuentaChecked.cesantia || this.cuentaChecked.jubilacion;
    return algunaCuentaMarcada && this.completamenteAsignado() && !this.saldoDebitoInsuficiente() && !this.registrando();
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
    this.cargandoDatos.set(true);
    this.prestamoVigente.set(null);
    this.cuotasPendientes.set([]);
    this.aportesCesantia.set([]);
    this.aportesJubilacion.set([]);
    this.historico.set(null);

    // Criterios para préstamo: entidad + estado VIGENTE (=2) + orden por código DESC
    const criterioEntidad = new DatosBusqueda();
    criterioEntidad.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'entidad', 'codigo', String(entidad.codigo), TipoComandosBusqueda.IGUAL);

    const criterioEstadoVigente = new DatosBusqueda();
    criterioEstadoVigente.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG, 'estadoPrestamo',
      String(ESTADO_PRESTAMO_VIGENTE), TipoComandosBusqueda.IGUAL
    );

    const criterioOrdenPrestamo = new DatosBusqueda();
    criterioOrdenPrestamo.orderBy('codigo');
    criterioOrdenPrestamo.setTipoOrden(DatosBusqueda.ORDER_DESC);

    this.prestamoService.selectByCriteria([criterioEntidad, criterioEstadoVigente, criterioOrdenPrestamo]).subscribe({
      next: (prestamos) => {
        // El backend ya filtra vigentes; tomamos el primero (más reciente por código DESC)
        const vigente = (prestamos ?? [])[0] ?? null;
        this.prestamoVigente.set(vigente);
        if (vigente) this.cargarCuotasPendientes(vigente);
      },
      error: () => this.snackBar.open('No se pudo cargar el préstamo del partícipe.', 'Cerrar', { duration: 4000 }),
    });

    this.aporteService.selectByCriteria([criterioEntidad]).subscribe({
      next: (aportes) => {
        const todos = aportes ?? [];
        this.aportesCesantia.set(todos.filter((a) => this.esTipoAporte(a, 'cesant')));
        this.aportesJubilacion.set(todos.filter((a) => this.esTipoAporte(a, 'jubila')));
      },
      error: () => this.snackBar.open('No se pudieron cargar los aportes del partícipe.', 'Cerrar', { duration: 4000 }),
    });

    if (entidad.numeroIdentificacion) {
      const criterioCedula = new DatosBusqueda();
      criterioCedula.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'cedula', entidad.numeroIdentificacion, TipoComandosBusqueda.IGUAL);
      this.historicoService.selectByCriteria([criterioCedula]).subscribe({
        next: (registros) => {
          const masReciente = (registros ?? []).sort((a, b) => (b.idCarga ?? 0) - (a.idCarga ?? 0))[0] ?? null;
          this.historico.set(masReciente);
        },
        // No bloquea la pantalla: si el histórico no responde, el valor mensual simplemente queda en 0
        // hasta que el equipo de backend confirme el endpoint (ver notas de la conversación de diseño).
        error: () => {},
      });
    }

    this.cuentaBancariaService.getAll().subscribe({
      next: (cuentas) => this.cuentasBancarias.set((cuentas ?? []).filter((c) => Number(c.estado) === 1)),
      error: () => this.snackBar.open('No se pudieron cargar las cuentas bancarias de ASOPREP.', 'Cerrar', { duration: 4000 }),
    });

    this.cargandoDatos.set(false);
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

  private esTipoAporte(aporte: Aporte, fragmento: string): boolean {
    const nombre = (aporte.tipoAporte?.nombre ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return nombre.includes(fragmento);
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
    if (key === 'prestamo' && checked) {
      this.metodoPago.set('debito');
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
    this.pagoRegistrado.set(false);
    this.cuentaMontoVersion.update((v) => v + 1);
  }

  // ================= cobertura: préstamo (cronológico, sobre cuotas reales) =================

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

  confirmarPago(): void {
    if (!this.puedeConfirmar()) return;
    this.registrando.set(true);

    const entidad = this.entidadSeleccionada();
    const payload = {
      entidad: entidad?.codigo,
      fecha: this.funcionesDatos.formatearFechaParaBackend(this.fechaPago),
      observacion: this.observacion,
      metodo: this.metodoPago(),
      montoTotal: this.montoTotal(),
      cuentaOrigenAporte: this.metodoPago() === 'debito' ? this.cuentaOrigenAporte() : null,
      cuentaAsoprep: this.metodoPago() !== 'debito' ? this.cuentaAsopropDestino()?.codigo : null,
      numeroReferencia: this.numeroReferencia || null,
      prestamo: this.cuentaChecked.prestamo
        ? {
            codigo: this.prestamoVigente()?.codigo,
            monto: this.parseMoneda(this.cuentaMontoTexto.prestamo),
            cuotas: this.asignacionesPrestamo().filter((a) => a.aplicado > 0).map((a) => ({ codigo: a.cuota.codigo, aplicado: a.aplicado })),
          }
        : null,
      cesantia: this.cuentaChecked.cesantia ? { monto: this.parseMoneda(this.cuentaMontoTexto.cesantia) } : null,
      jubilacion: this.cuentaChecked.jubilacion ? { monto: this.parseMoneda(this.cuentaMontoTexto.jubilacion) } : null,
    };

    // TODO(pendiente-backend): reemplazar este stub por la llamada real una vez el equipo de
    // backend publique el endpoint de "pago combinado" (préstamo + aportes, un solo comprobante).
    // El shape esperado del payload es el objeto `payload` construido arriba; ajustar según el
    // contrato que finalmente exponga el nuevo servicio.
    setTimeout(() => {
      console.warn('[Cobros Personales] Pago simulado — endpoint real pendiente del equipo de backend:', payload);
      this.registrando.set(false);
      this.pagoRegistrado.set(true);
    }, 400);
  }

  cerrarConfirmacion(): void {
    this.pagoRegistrado.set(false);
    this.resetAsignacion();
    this.montoTotalTexto.set('$0.00');
  }

  // ================= utilidades =================

  formatMoneda(n: number): string {
    // 'es-EC' formats with a decimal comma ("500,00"), which parseMoneda() then mis-reads as
    // thousands (stripping the comma turns it into "50000") — use 'en-US' so format/parse round-trip.
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  parseMoneda(texto: string | null | undefined): number {
    if (!texto) return 0;
    const n = parseFloat(String(texto).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
}

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';

import { Aporte } from '../../model/aporte';
import { DetallePrestamo } from '../../model/detalle-prestamo';
import { Entidad } from '../../model/entidad';
import { Prestamo } from '../../model/prestamo';
import { AporteService } from '../../service/aporte.service';
import { DetallePrestamoService } from '../../service/detalle-prestamo.service';
import { EntidadService } from '../../service/entidad.service';
import { PrestamoService } from '../../service/prestamo.service';

type TipoFondo = 'cesantia' | 'jubilacion';
type EstadoCuota = 'pendiente' | 'parcial' | 'cruzada';

interface CuotaCruce {
  detalle: DetallePrestamo;
  aplicado: number;
  aplicadoTexto: string;
}

interface PrestamoCruce {
  prestamo: Prestamo;
  cuotas: CuotaCruce[];
  open: boolean;
  nota: string | null;
}

// El backend (com.saa.model.crd.Prestamo) persiste `estadoPrestamo` como un Long plano
// (columna ESPSCDGO). VIGENTE = 2, confirmado contra com.saa.rubros.EstadoPrestamo.java
// (mismo criterio ya usado en cobros-personales.component.ts).
const ESTADO_PRESTAMO_VIGENTE = 2;

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
  private aporteService = inject(AporteService);
  private snackBar = inject(MatSnackBar);

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
  cargandoDatos = signal(false);
  prestamosCruce = signal<PrestamoCruce[]>([]);
  aportesCesantia = signal<Aporte[]>([]);
  aportesJubilacion = signal<Aporte[]>([]);

  // Los objetos de prestamosCruce/cuotas se mutan directamente (aplicado, nota, open) en vez de
  // reconstruirse; este contador fuerza a los computed() de abajo a recalcular tras cada mutación,
  // siguiendo el mismo patrón que cuentaMontoVersion en cobros-personales.component.ts.
  private version = signal(0);
  private bump(): void {
    this.version.update((v) => v + 1);
  }

  // ---- fondos de aportes: monto que el usuario decide usar de cada uno en este cruce ----
  fondoTexto: Record<TipoFondo, string> = { cesantia: '', jubilacion: '' };
  private fondoTextoVersion = signal(0);

  saldoDisponibleCesantia = computed(() => this.sumaSaldo(this.aportesCesantia()));
  saldoDisponibleJubilacion = computed(() => this.sumaSaldo(this.aportesJubilacion()));
  totalAportadoCesantia = computed(() => this.aportesCesantia().reduce((s, a) => s + (a.valor ?? 0), 0));
  totalAportadoJubilacion = computed(() => this.aportesJubilacion().reduce((s, a) => s + (a.valor ?? 0), 0));
  totalUtilizadoCesantia = computed(() => this.aportesCesantia().reduce((s, a) => s + (a.valorPagado ?? 0), 0));
  totalUtilizadoJubilacion = computed(() => this.aportesJubilacion().reduce((s, a) => s + (a.valorPagado ?? 0), 0));

  fondoMonto = computed(() => {
    this.fondoTextoVersion();
    return {
      cesantia: this.parseMoneda(this.fondoTexto.cesantia),
      jubilacion: this.parseMoneda(this.fondoTexto.jubilacion),
    };
  });
  fondoDisponibleTotal = computed(() => this.fondoMonto().cesantia + this.fondoMonto().jubilacion);
  fondoUtilizadoTotal = computed(() => {
    this.version();
    return this.prestamosCruce().reduce((s, pc) => s + this.montoAplicadoPrestamo(pc), 0);
  });
  fondoRestante = computed(() => +(this.fondoDisponibleTotal() - this.fondoUtilizadoTotal()).toFixed(2));

  tieneSeleccion = computed(() => this.fondoUtilizadoTotal() > 0.004);
  puedeConfirmar = computed(
    () => this.tieneSeleccion() && this.fondoUtilizadoTotal() <= this.fondoDisponibleTotal() + 0.004 && !this.registrando()
  );

  registrando = signal(false);
  cruceRegistrado = signal(false);

  private sumaSaldo(aportes: Aporte[]): number {
    return aportes.reduce((s, a) => s + (a.saldo ?? (a.valor ?? 0) - (a.valorPagado ?? 0)), 0);
  }

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
    this.cargandoDatos.set(true);
    this.prestamosCruce.set([]);
    this.aportesCesantia.set([]);
    this.aportesJubilacion.set([]);
    this.fondoTexto = { cesantia: '', jubilacion: '' };
    this.fondoTextoVersion.update((v) => v + 1);
    this.cruceRegistrado.set(false);

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
        const wrappers: PrestamoCruce[] = (prestamos ?? []).map((p) => ({ prestamo: p, cuotas: [], open: false, nota: null }));
        this.prestamosCruce.set(wrappers);
        wrappers.forEach((pc) => this.cargarCuotas(pc));
      },
      error: () => this.snackBar.open('No se pudieron cargar los préstamos vigentes del partícipe.', 'Cerrar', { duration: 4000 }),
    });

    this.aporteService.selectByCriteria([criterioEntidad]).subscribe({
      next: (aportes) => {
        const todos = aportes ?? [];
        this.aportesCesantia.set(todos.filter((a) => this.esTipoAporte(a, 'cesant')));
        this.aportesJubilacion.set(todos.filter((a) => this.esTipoAporte(a, 'jubila')));
      },
      error: () => this.snackBar.open('No se pudieron cargar los aportes del partícipe.', 'Cerrar', { duration: 4000 }),
    });

    this.cargandoDatos.set(false);
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
        const pendientes = (cuotas ?? []).filter((c) => (c.saldo ?? 0) > 0.004);
        pc.cuotas = pendientes.map((detalle) => ({ detalle, aplicado: 0, aplicadoTexto: '' }));
        this.bump();
      },
      error: () => this.snackBar.open(`No se pudo cargar el detalle de cuotas del préstamo #${pc.prestamo.idAsoprep}.`, 'Cerrar', { duration: 4000 }),
    });
  }

  private esTipoAporte(aporte: Aporte, fragmento: string): boolean {
    const nombre = (aporte.tipoAporte?.nombre ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    return nombre.includes(fragmento);
  }

  // ================= fondos de aportes =================

  onFondoTextoCambio(): void {
    this.fondoTextoVersion.update((v) => v + 1);
  }

  usarMaximoFondo(tipo: TipoFondo): void {
    const saldo = tipo === 'cesantia' ? this.saldoDisponibleCesantia() : this.saldoDisponibleJubilacion();
    this.fondoTexto[tipo] = saldo > 0.004 ? this.formatMoneda(saldo) : '';
    this.fondoTextoVersion.update((v) => v + 1);
    this.reconciliarSobreasignacion();
  }

  onFondoBlur(tipo: TipoFondo): void {
    const saldo = tipo === 'cesantia' ? this.saldoDisponibleCesantia() : this.saldoDisponibleJubilacion();
    let v = Math.max(this.parseMoneda(this.fondoTexto[tipo]), 0);
    if (v > saldo + 0.004) {
      const label = tipo === 'cesantia' ? 'Cesantía' : 'Jubilación';
      this.snackBar.open(`El monto no puede superar el saldo disponible de Aportes ${label} (${this.formatMoneda(saldo)}).`, 'Cerrar', { duration: 3500 });
      v = saldo;
    }
    v = +v.toFixed(2);
    this.fondoTexto[tipo] = v > 0.004 ? this.formatMoneda(v) : '';
    this.fondoTextoVersion.update((n) => n + 1);
    // Si el nuevo monto del fondo es menor que lo ya cruzado, se reajustan automáticamente las
    // cuotas afectadas (ver reconciliarSobreasignacion) en vez de dejar la pantalla en un estado
    // de "fondo insuficiente" que el usuario tendría que resolver manualmente.
    this.reconciliarSobreasignacion();
  }

  // Cuando el fondo disponible baja por debajo de lo ya aplicado a cuotas (típicamente porque el
  // usuario redujo el monto de un fondo después de haber cruzado pagos), se libera el excedente
  // automáticamente: se recorta desde el préstamo más reciente de la lista hacia el más antiguo, y
  // dentro de cada préstamo desde la cuota más lejana hacia la más próxima — preservando lo que el
  // usuario cruzó primero.
  private reconciliarSobreasignacion(): void {
    let exceso = +(this.fondoUtilizadoTotal() - this.fondoDisponibleTotal()).toFixed(2);
    if (exceso <= 0.005) return;

    const prestamos = this.prestamosCruce();
    for (let i = prestamos.length - 1; i >= 0 && exceso > 0.005; i--) {
      const pc = prestamos[i];
      for (let j = pc.cuotas.length - 1; j >= 0 && exceso > 0.005; j--) {
        const ca = pc.cuotas[j];
        if (ca.aplicado <= 0.004) continue;
        const reduccion = Math.min(ca.aplicado, exceso);
        ca.aplicado = +(ca.aplicado - reduccion).toFixed(2);
        ca.aplicadoTexto = ca.aplicado > 0.004 ? this.formatMoneda(ca.aplicado) : '';
        exceso = +(exceso - reduccion).toFixed(2);
      }
      pc.nota = null;
    }

    this.snackBar.open(
      'El fondo disponible se redujo — se ajustaron automáticamente las cuotas ya cruzadas para reflejar el nuevo saldo.',
      'Cerrar',
      { duration: 4500 }
    );
    this.bump();
  }

  // ================= préstamos: asignación de cuotas =================

  toggleAbierto(pc: PrestamoCruce): void {
    pc.open = !pc.open;
    this.bump();
  }

  montoAplicadoPrestamo(pc: PrestamoCruce): number {
    return pc.cuotas.reduce((s, ca) => s + (ca.aplicado || 0), 0);
  }

  cuotasCruzadas(pc: PrestamoCruce): number {
    return pc.cuotas.filter((ca) => this.estadoCuota(ca) === 'cruzada').length;
  }

  cuotasParciales(pc: PrestamoCruce): number {
    return pc.cuotas.filter((ca) => this.estadoCuota(ca) === 'parcial').length;
  }

  estadoCuota(ca: CuotaCruce): EstadoCuota {
    const saldo = ca.detalle.saldo ?? 0;
    if (ca.aplicado >= saldo - 0.004) return 'cruzada';
    if (ca.aplicado > 0.004) return 'parcial';
    return 'pendiente';
  }

  // Cuánto se le puede asignar como máximo a esta cuota puntual, dado lo que ya consumen todas las
  // demás cuotas de todos los préstamos sobre el fondo compartido (cesantía + jubilación).
  private maxAllowedForCuota(ca: CuotaCruce): number {
    const usadoPorOtras = this.fondoUtilizadoTotal() - ca.aplicado;
    const presupuesto = this.fondoDisponibleTotal() - usadoPorOtras;
    return Math.max(Math.min(ca.detalle.saldo ?? 0, presupuesto), 0);
  }

  quickToggleCuota(pc: PrestamoCruce, ca: CuotaCruce): void {
    if (ca.aplicado > 0.004) {
      ca.aplicado = 0;
      ca.aplicadoTexto = '';
    } else {
      const max = this.maxAllowedForCuota(ca);
      if (max <= 0.004) {
        this.snackBar.open('No queda fondo disponible para aplicar a esta cuota.', 'Cerrar', { duration: 3000 });
        this.bump();
        return;
      }
      ca.aplicado = +max.toFixed(2);
      ca.aplicadoTexto = this.formatMoneda(ca.aplicado);
    }
    pc.nota = null;
    this.bump();
  }

  onCuotaMontoBlur(pc: PrestamoCruce, ca: CuotaCruce): void {
    const raw = Math.max(this.parseMoneda(ca.aplicadoTexto), 0);
    const max = this.maxAllowedForCuota(ca);
    const v = Math.min(raw, max);
    if (raw > max + 0.004) {
      const saldoCuota = ca.detalle.saldo ?? 0;
      const msg = max < saldoCuota - 0.004
        ? `El fondo disponible solo alcanza para ${this.formatMoneda(max)} en esta cuota.`
        : `El monto no puede superar el saldo de la cuota (${this.formatMoneda(saldoCuota)}).`;
      this.snackBar.open(msg, 'Cerrar', { duration: 3500 });
    }
    ca.aplicado = +v.toFixed(2);
    ca.aplicadoTexto = ca.aplicado > 0.004 ? this.formatMoneda(ca.aplicado) : '';
    pc.nota = null;
    this.bump();
  }

  private fillPrestamoCuotas(pc: PrestamoCruce, target: number): number {
    const usadoElsewhere = this.fondoUtilizadoTotal() - this.montoAplicadoPrestamo(pc);
    const budgetTotal = Math.max(this.fondoDisponibleTotal() - usadoElsewhere, 0);
    const saldoTotalPrestamo = pc.prestamo.saldoTotal ?? 0;
    const capped = Math.max(Math.min(target, saldoTotalPrestamo, budgetTotal), 0);

    let running = capped;
    for (const ca of pc.cuotas) {
      const valor = ca.detalle.saldo ?? 0;
      if (running >= valor - 0.004) {
        ca.aplicado = valor;
        running = +(running - valor).toFixed(2);
      } else if (running > 0.004) {
        ca.aplicado = +running.toFixed(2);
        running = 0;
      } else {
        ca.aplicado = 0;
      }
      ca.aplicadoTexto = ca.aplicado > 0.004 ? this.formatMoneda(ca.aplicado) : '';
    }
    return capped;
  }

  cancelarSaldoTotal(pc: PrestamoCruce): void {
    if (this.fondoDisponibleTotal() <= 0.004) {
      this.snackBar.open('Ingrese un monto en al menos un fondo de aportes primero.', 'Cerrar', { duration: 3000 });
      return;
    }
    const saldoTotal = pc.prestamo.saldoTotal ?? 0;
    const aplicado = this.fillPrestamoCuotas(pc, saldoTotal);
    pc.nota = aplicado < saldoTotal - 0.005
      ? `El fondo disponible no alcanza para cancelar el saldo total (${this.formatMoneda(saldoTotal)}). Se aplicaron ${this.formatMoneda(aplicado)}.`
      : null;
    this.bump();
  }

  aplicarMontoPersonalizado(pc: PrestamoCruce, montoTexto: string): void {
    if (this.fondoDisponibleTotal() <= 0.004) {
      this.snackBar.open('Ingrese un monto en al menos un fondo de aportes primero.', 'Cerrar', { duration: 3000 });
      return;
    }
    const monto = this.parseMoneda(montoTexto);
    const aplicado = this.fillPrestamoCuotas(pc, monto);
    if (aplicado < monto - 0.005) {
      const saldoTotal = pc.prestamo.saldoTotal ?? 0;
      pc.nota = aplicado >= saldoTotal - 0.005
        ? `El préstamo queda cubierto en su totalidad (${this.formatMoneda(saldoTotal)}); el resto del monto ingresado no se aplicó.`
        : `El fondo disponible no alcanza para cubrir el monto ingresado (${this.formatMoneda(monto)}). Se aplicaron ${this.formatMoneda(aplicado)}.`;
    } else {
      pc.nota = null;
    }
    this.bump();
  }

  quitarCruce(pc: PrestamoCruce): void {
    pc.cuotas.forEach((ca) => {
      ca.aplicado = 0;
      ca.aplicadoTexto = '';
    });
    pc.nota = null;
    this.bump();
  }

  limpiarSeleccion(): void {
    this.prestamosCruce().forEach((pc) => {
      pc.cuotas.forEach((ca) => {
        ca.aplicado = 0;
        ca.aplicadoTexto = '';
      });
      pc.nota = null;
    });
    this.bump();
  }

  // ================= confirmar cruce =================

  confirmarCruce(): void {
    if (!this.puedeConfirmar()) return;
    this.registrando.set(true);

    const entidad = this.entidadSeleccionada();
    const payload = {
      entidad: entidad?.codigo,
      fondos: { cesantia: this.fondoMonto().cesantia, jubilacion: this.fondoMonto().jubilacion },
      prestamos: this.prestamosCruce()
        .filter((pc) => this.montoAplicadoPrestamo(pc) > 0.004)
        .map((pc) => ({
          codigo: pc.prestamo.codigo,
          monto: this.montoAplicadoPrestamo(pc),
          cuotas: pc.cuotas
            .filter((ca) => ca.aplicado > 0.004)
            .map((ca) => ({ codigo: ca.detalle.codigo, aplicado: ca.aplicado })),
        })),
    };

    // TODO(pendiente-backend): reemplazar este stub por la llamada real una vez el equipo de backend
    // publique el endpoint de cruce de valores (débito del/de los fondo(s) de aportes seleccionados +
    // abono a las cuotas de préstamo marcadas, en una sola transacción). Shape esperado: `payload`.
    setTimeout(() => {
      console.warn('[Cruce de Valores] Cruce simulado — endpoint real pendiente del equipo de backend:', payload);
      this.registrando.set(false);
      this.cruceRegistrado.set(true);
    }, 400);
  }

  iniciarOtroCruce(): void {
    this.cruceRegistrado.set(false);
    this.limpiarSeleccion();
    this.fondoTexto = { cesantia: '', jubilacion: '' };
    this.fondoTextoVersion.update((v) => v + 1);
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

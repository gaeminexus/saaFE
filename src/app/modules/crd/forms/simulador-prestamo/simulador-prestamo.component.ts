import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { guardarArchivo, mensajeReporteFallido } from '../../../../shared/services/descarga-reporte';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';

import { Entidad } from '../../model/entidad';
import {
  admiteOperaciones,
  ModalidadAbono,
  NOMBRE_ESTADO_PRESTAMO,
  NOMBRE_TIPO_AMORTIZACION,
} from '../../model/pagos/catalogos-pago';
import { SimulacionAbonoCapital } from '../../model/pagos/operaciones-pago';
import { mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { SolicitudReporteSimulacion } from '../../model/simuladores/reporte-simulacion';
import {
  ParametrosReestructuracion,
  ResultadoSimulacionReestructuracion,
} from '../../model/simuladores/simulador-prestamo-existente';
import { Prestamo } from '../../model/prestamo';
import { EntidadService } from '../../service/entidad.service';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';
import { PrestamoService } from '../../service/prestamo.service';

type Pestana = 'abono' | 'reestructuracion';

/**
 * Simulador sobre un préstamo existente (§7 de `docs/crd/PLAN-SIMULADORES-PRESTAMOS.md`, fase 5):
 * abono a capital y reestructuración. **No escribe nada** en ninguno de los dos casos.
 *
 * El buscador de partícipe y préstamo sigue el mismo patrón que `cobros-personales.component.ts`
 * (mismos criterios, mismo filtro de préstamos operables por `idEstado`).
 *
 * El abono reusa `GET /prst/simularAbonoCapital`. La reestructuración usa
 * `POST /prst/simularReestructuracion` contra el contrato **canónico** de la §7.1 del plan
 * (fijado por el árbitro el 2026-08-25 tras la fase 2 del backend) — no es un inferido.
 */
@Component({
  selector: 'app-simulador-prestamo',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './simulador-prestamo.component.html',
  styleUrl: './simulador-prestamo.component.scss',
})
export class SimuladorPrestamoComponent {
  private entidadService = inject(EntidadService);
  private prestamoService = inject(PrestamoService);
  private servicio = inject(OperacionesPagoPrestamoService);
  private funcionesDatos = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);

  readonly ModalidadAbono = ModalidadAbono;

  /**
   * Bandera única para habilitar "Exportar PDF" en las dos pestañas (fase 6 del plan).
   *
   * Habilitada el 2026-08-25, cuando se cumplieron sus dos precondiciones: el WAR con
   * `POST /prst/simulacion/reporte` (fase 3) desplegado, y los 3 `.jasper` compilados y
   * commiteados (fase 3b). Antes de eso el endpoint devolvía 500 — ver §9 de
   * docs/crd/PLAN-SIMULADORES-PRESTAMOS.md.
   */
  readonly exportarPdfHabilitado = true;

  pestana = signal<Pestana>('abono');

  // ---- búsqueda de partícipe (mismos criterios que cobros-personales) ----
  criterioIdentificacion = '';
  criterioRolPetro = '';
  criterioIdPrestamoAsoprep = '';
  criterioNombre = '';
  buscando = signal(false);
  resultados = signal<Entidad[]>([]);
  mostrandoResultados = signal(false);
  entidadSeleccionada = signal<Entidad | null>(null);

  // ---- préstamos del partícipe ----
  cargandoPrestamos = signal(false);
  prestamosOperables = signal<Prestamo[]>([]);
  prestamoSeleccionado = signal<Prestamo | null>(null);

  // ---- pestaña abono a capital ----
  montoAbonoTexto = '';
  modalidadAbono = signal<number>(ModalidadAbono.REDUCIR_PLAZO);
  simulandoAbono = signal(false);
  resultadoAbono = signal<SimulacionAbonoCapital | null>(null);
  errorAbono = signal<string | null>(null);
  exportandoPdfAbono = signal(false);
  errorPdfAbono = signal<string | null>(null);

  // ---- pestaña reestructuración ----
  capitalizarVencido = false;
  nuevaTasaAnual: number | null = null;
  nuevoPlazo: number | null = null;
  mesesGracia: number | null = 0;
  simulandoReestructuracion = signal(false);
  resultadoReestructuracion = signal<ResultadoSimulacionReestructuracion | null>(null);
  errorReestructuracion = signal<string | null>(null);
  exportandoPdfReestructuracion = signal(false);
  errorPdfReestructuracion = signal<string | null>(null);

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

  /** Busca por el ID ASOPREP del préstamo y resuelve a la entidad dueña, igual que cobros-personales. */
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
    this.cargarPrestamos(entidad.codigo);
  }

  volverABuscar(): void {
    this.mostrandoResultados.set(true);
    this.entidadSeleccionada.set(null);
    this.prestamosOperables.set([]);
    this.prestamoSeleccionado.set(null);
    this.limpiarResultados();
  }

  /** Mismo filtro que cobros-personales: `idEstado` no terminal, no `estadoPrestamo`. */
  private cargarPrestamos(codigoEntidad: number): void {
    const criterioEntidad = new DatosBusqueda();
    criterioEntidad.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'entidad', 'codigo', String(codigoEntidad), TipoComandosBusqueda.IGUAL);

    const criterioOrden = new DatosBusqueda();
    criterioOrden.orderBy('codigo');
    criterioOrden.setTipoOrden(DatosBusqueda.ORDER_DESC);

    this.cargandoPrestamos.set(true);
    this.prestamoService.selectByCriteria([criterioEntidad, criterioOrden]).subscribe({
      next: (prestamos) => {
        this.cargandoPrestamos.set(false);
        const operables = (prestamos ?? []).filter((p) => admiteOperaciones(p.idEstado));
        this.prestamosOperables.set(operables);
        this.prestamoSeleccionado.set(operables[0] ?? null);
        this.limpiarResultados();
        if (!operables.length) {
          this.snackBar.open('Este partícipe no tiene préstamos que admitan simulación.', 'Cerrar', { duration: 4000 });
        }
      },
      error: () => {
        this.cargandoPrestamos.set(false);
        this.prestamosOperables.set([]);
        this.snackBar.open('No se pudieron cargar los préstamos del partícipe.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  seleccionarPrestamo(prestamo: Prestamo): void {
    this.prestamoSeleccionado.set(prestamo);
    this.limpiarResultados();
  }

  private limpiarResultados(): void {
    this.resultadoAbono.set(null);
    this.errorAbono.set(null);
    this.errorPdfAbono.set(null);
    this.resultadoReestructuracion.set(null);
    this.errorReestructuracion.set(null);
    this.errorPdfReestructuracion.set(null);
  }

  estadoPrestamoTexto(prestamo: Prestamo | null): string {
    if (!prestamo) return '—';
    return NOMBRE_ESTADO_PRESTAMO[Number(prestamo.idEstado)] ?? `Estado ${prestamo.idEstado}`;
  }

  nombreAmortizacion(tipo: number | null | undefined): string {
    if (tipo == null) return '—';
    return NOMBRE_TIPO_AMORTIZACION[tipo] ?? `Tipo ${tipo}`;
  }

  cambiarPestana(p: Pestana): void {
    this.pestana.set(p);
  }

  // ================= pestaña 1: abono a capital =================

  get valorAbono(): number {
    return this.parseMoneda(this.montoAbonoTexto);
  }

  get puedeSimularAbono(): boolean {
    return !!this.prestamoSeleccionado() && this.valorAbono > 0.004 && !this.simulandoAbono();
  }

  onValorAbonoBlur(): void {
    const v = Math.max(this.valorAbono, 0);
    this.montoAbonoTexto = v > 0.004 ? this.formatMoneda(v) : '';
  }

  simularAbono(): void {
    const prestamo = this.prestamoSeleccionado();
    if (!prestamo || !this.puedeSimularAbono) return;

    this.errorAbono.set(null);
    this.simulandoAbono.set(true);
    this.resultadoAbono.set(null);

    this.servicio.simularAbonoCapital(prestamo.codigo, this.valorAbono, this.modalidadAbono()).subscribe((resp) => {
      this.simulandoAbono.set(false);
      if (resp.exito && resp.resultado) {
        this.resultadoAbono.set(resp.resultado);
      } else {
        this.resultadoAbono.set(null);
        this.errorAbono.set(mensajeDeRespuesta(resp));
      }
    });
  }

  /**
   * PDF de la simulación de abono contra `POST /prst/simulacion/reporte` (§7 del plan). El
   * backend recalcula desde `idPrestamo`/`valor`/`modalidad` — los mismos tres parámetros de
   * `simularAbonoCapital` — y no se le manda la tabla que se ve en pantalla.
   */
  exportarPdfAbono(): void {
    const prestamo = this.prestamoSeleccionado();
    if (!this.exportarPdfHabilitado || !prestamo || !this.resultadoAbono() || this.exportandoPdfAbono()) return;

    this.errorPdfAbono.set(null);
    this.exportandoPdfAbono.set(true);

    const entidad = this.entidadSeleccionada();
    const solicitud: SolicitudReporteSimulacion = {
      tipo: 'ABONO_CAPITAL',
      idPrestamo: prestamo.codigo,
      valorAbono: this.valorAbono,
      modalidadAbono: this.modalidadAbono(),
      nombreSocio: entidad?.razonSocial,
      identificacionSocio: entidad?.numeroIdentificacion,
    };

    this.servicio.reporteSimulacion(solicitud).subscribe({
      next: (blob) => {
        this.exportandoPdfAbono.set(false);
        guardarArchivo(blob, `simulacion-abono-prestamo-${prestamo.idAsoprep}.pdf`);
      },
      error: (err) => {
        this.exportandoPdfAbono.set(false);
        mensajeReporteFallido(err).then((mensaje) => this.errorPdfAbono.set(mensaje));
      },
    });
  }

  // ================= pestaña 2: reestructuración =================

  /**
   * `capitalDeArranque` y `saldoCapitalPendiente` son la base de toda la simulación: si el
   * backend no pudo determinar el capital pendiente del préstamo, hoy puede devolver 0 en vez de
   * rechazar (el backend va a empezar a validarlo con un error explícito, pero mientras tanto la
   * pantalla no puede dibujar una tabla y una comparativa como si el 0 fuera un dato real — es
   * dinero, y un cero silencioso es peor que un error).
   */
  capitalReestructuracionValido(sim: ResultadoSimulacionReestructuracion | null): boolean {
    return !!sim && !!sim.capitalDeArranque && !!sim.saldoCapitalPendiente;
  }

  get puedeSimularReestructuracion(): boolean {
    return !!this.prestamoSeleccionado() && !this.simulandoReestructuracion();
  }

  simularReestructuracion(): void {
    const prestamo = this.prestamoSeleccionado();
    if (!prestamo || !this.puedeSimularReestructuracion) return;

    this.errorReestructuracion.set(null);
    this.simulandoReestructuracion.set(true);
    this.resultadoReestructuracion.set(null);

    const parametros: ParametrosReestructuracion = {
      idPrestamo: prestamo.codigo,
      capitalizarVencido: this.capitalizarVencido,
      nuevaTasaAnual: this.nuevaTasaAnual,
      nuevoPlazo: this.nuevoPlazo,
      mesesGracia: this.mesesGracia ?? 0,
    };

    this.servicio.simularReestructuracion(parametros).subscribe((resp) => {
      this.simulandoReestructuracion.set(false);
      if (resp.exito && resp.resultado) {
        this.resultadoReestructuracion.set(resp.resultado);
      } else {
        this.resultadoReestructuracion.set(null);
        this.errorReestructuracion.set(mensajeDeRespuesta(resp));
      }
    });
  }

  /**
   * PDF de la simulación de reestructuración contra `POST /prst/simulacion/reporte` (§7 del
   * plan). El backend recalcula desde los mismos parámetros de `simularReestructuracion` — no se
   * le manda la tabla que se ve en pantalla.
   */
  exportarPdfReestructuracion(): void {
    const prestamo = this.prestamoSeleccionado();
    const resultado = this.resultadoReestructuracion();
    if (
      !this.exportarPdfHabilitado || !prestamo || !resultado ||
      !this.capitalReestructuracionValido(resultado) || this.exportandoPdfReestructuracion()
    ) return;

    this.errorPdfReestructuracion.set(null);
    this.exportandoPdfReestructuracion.set(true);

    const entidad = this.entidadSeleccionada();
    const solicitud: SolicitudReporteSimulacion = {
      tipo: 'REESTRUCTURACION',
      reestructuracion: {
        idPrestamo: prestamo.codigo,
        capitalizarVencido: this.capitalizarVencido,
        nuevaTasaAnual: this.nuevaTasaAnual,
        nuevoPlazo: this.nuevoPlazo,
        mesesGracia: this.mesesGracia ?? 0,
      },
      nombreSocio: entidad?.razonSocial,
      identificacionSocio: entidad?.numeroIdentificacion,
    };

    this.servicio.reporteSimulacion(solicitud).subscribe({
      next: (blob) => {
        this.exportandoPdfReestructuracion.set(false);
        guardarArchivo(blob, `simulacion-reestructuracion-prestamo-${prestamo.idAsoprep}.pdf`);
      },
      error: (err) => {
        this.exportandoPdfReestructuracion.set(false);
        mensajeReporteFallido(err).then((mensaje) => this.errorPdfReestructuracion.set(mensaje));
      },
    });
  }

  // ================= presentación =================

  /**
   * `fechaVencimiento` llega como arreglo `[y,m,d,h,mi]` (Jackson descarta el offset en vez de
   * convertirlo): se normaliza SIEMPRE con `FuncionesDatosService`, nunca con el pipe `date` a
   * secas (§10.4 de docs/crd/PLAN-SIMULADORES-PRESTAMOS.md).
   */
  formatFecha(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, 2) || '—';
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private parseMoneda(texto: string | null | undefined): number {
    if (!texto) return 0;
    const n = parseFloat(String(texto).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
}

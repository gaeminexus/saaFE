import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { AppStateService } from '../../../../shared/services/app-state.service';
import { UsuarioService } from '../../../../shared/services/usuario.service';
import { Usuario } from '../../../../shared/model/usuario';

import { Entidad } from '../../model/entidad';
import { Prestamo } from '../../model/prestamo';
import { DetallePrestamo } from '../../model/detalle-prestamo';
import { NovedadParticipeCarga } from '../../model/novedad-participe-carga';
import {
  AfectacionValoresParticipeCarga,
  OpcionAporteExcedente,
} from '../../model/afectacion-valores-participe-carga';
import { TopeAfectacionManual } from '../../model/tope-afectacion-manual';
import {
  CodigoEstadoCuota,
  obtenerCodigoEstadoCuota as leerCodigoEstadoCuota,
  obtenerNombreEstadoCuota,
} from '../../model/estado-cuota-prestamo';
import { EstadoPrestamoOperativo } from '../../model/pagos/catalogos-pago';

import { EntidadService } from '../../service/entidad.service';
import { PrestamoService } from '../../service/prestamo.service';
import { DetallePrestamoService } from '../../service/detalle-prestamo.service';
import { PagoPrestamoService } from '../../service/pago-prestamo.service';
import { ComponentesPagados, SaldoPrestamoService } from '../../service/saldo-prestamo.service';
import { AfectacionValoresParticipeCargaService } from '../../service/afectacion-valores-participe-carga.service';
import { ServiciosAsoprepService } from '../../../asoprep/service/servicios-asoprep.service';

export interface AfectacionParticipeDialogData {
  idCarga: number;
  codigoPetro: number;
  nombreParticipe: string;
  /**
   * TODAS las novedades del partícipe en esta carga, SIN filtrar por `tipoNovedad` — se usan para
   * el fan-out de afectaciones ya guardadas y para decidir de qué novedad cuelga cada destino.
   *
   * ⛔ Filtrarlas antes de pasarlas acá fue el origen de un bug real (2026-09-03, caso SANCHEZ
   * 7508): el listado solo pasaba las novedades `tipoNovedad > 3` ("motivo"), y una novedad
   * `tipoNovedad <= 3` con afectaciones ya guardadas quedaba fuera del fan-out — "asignado ahora"
   * contaba de menos, y el operador podía terminar afectando dos veces lo mismo.
   */
  novedades: NovedadParticipeCarga[];
  /** Solo las que se muestran como "MOTIVOS" en pantalla (`tipoNovedad > 3`) — subconjunto de `novedades`. */
  motivos: NovedadParticipeCarga[];
}

interface PrestamoAfectable {
  prestamo: Prestamo;
  cuotas: DetallePrestamo[];
  /**
   * Novedad de la que "sale" este préstamo — generalización de `coincideProductoObjetivo`
   * (`detalle-consulta-carga.component.ts`) a varias novedades: compara el producto del préstamo
   * contra el `codigoProducto`/`codigoPetroProducto` de cada novedad del partícipe. `null` = NINGUNA
   * novedad coincide — es el caso "sin novedad obvia" del §4 del plan: este préstamo NO se puede
   * afectar desde acá (los controles quedan deshabilitados), no se inventa una asignación.
   */
  novedadOrigen: NovedadParticipeCarga | null;
}

interface PrestamoErrorCarga {
  prestamo: Prestamo;
  motivo: string;
}

interface ResultadoCargaPrestamo {
  item: PrestamoAfectable;
  pagosPorCuota: Record<number, ComponentesPagados>;
  cargaFallida: boolean;
  motivo?: string;
}

/** `AfectacionValoresParticipeCarga` tal como llegó, más de qué novedad la pedí (no de lo que diga el objeto embebido). */
interface AfectacionEtiquetada extends AfectacionValoresParticipeCarga {
  __novedadOrigen: NovedadParticipeCarga;
}

/**
 * Diálogo de afectación por PARTÍCIPE (`docs/crd/PLAN-AFECTACION-POR-PARTICIPE.md` §4) — un
 * partícipe, un pozo, un estado. Reemplaza, para comparación, al diálogo por novedad
 * (`afectacion-financiera-cuotas-dialog`) sin tocarlo.
 *
 * Autocontenido a propósito: cada instancia pide sus propios datos (no recibe ~30 closures del
 * padre como el diálogo viejo) — la ventana de edición es "todas las novedades y todos los
 * préstamos/aportes de ESTE partícipe en esta carga", así que no depende del componente que lo abrió
 * más que para saber a quién.
 *
 * Motor de reparto (checkbox "todo el sobrante", input de cabecera, edición por cuota, prelación
 * oldest-first) portado literal desde `detalle-consulta-carga.component.ts` — ES la regla del §8
 * del plan, no se reinventa. Lo único nuevo es: (a) el pozo de cuotas afectables abarca TODAS las
 * novedades del partícipe, no una sola, y (b) a qué novedad se cuelga cada AVPC cuando hay más de
 * una — ver `elegirNovedadParaAporte`/`novedadOrigen` de `PrestamoAfectable`.
 */
@Component({
  selector: 'app-afectacion-participe-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './afectacion-participe-dialog.component.html',
  styleUrl: './afectacion-participe-dialog.component.scss',
})
export class AfectacionParticipeDialogComponent implements OnInit {
  cargando = signal(false);
  guardando = signal(false);
  entidad = signal<Entidad | null>(null);

  topeAfectacionParticipe = signal<TopeAfectacionManual | null>(null);
  topeAfectacionConsultaFallida = signal(false);

  /**
   * Red de seguridad (2026-09-03, caso SANCHEZ 7508): compara lo que ESTA pantalla pudo juntar de
   * `afectacionesRegistradas` contra el `afectado` que ya calcula `/asgn/topeAfectacion` — el
   * mismo número que usa la validación real. Si no coinciden, esta pantalla está viendo MENOS de
   * lo que en verdad hay afectado (por ejemplo, un destino que no sabe mostrar) y dejar editar
   * arriesgaría afectar dos veces la misma plata. No intenta adivinar la causa: bloquea y avisa el
   * monto exacto, en vez de aproximar. `null` = todo cuadra, se puede editar.
   */
  bloqueadoPorInconsistencia = signal<string | null>(null);

  prestamosAfectables = signal<PrestamoAfectable[]>([]);
  erroresCargaPrestamos = signal<PrestamoErrorCarga[]>([]);
  pagosPorCuotaAfectacion = signal<Record<number, ComponentesPagados>>({});
  private afectacionesRegistradas = signal<AfectacionEtiquetada[]>([]);

  valoresAfectarEditados = signal<Record<number, number>>({});
  detalleCuotaEnEdicion = signal<Set<number>>(new Set());
  prestamosConTodoAplicado = signal<Set<number>>(new Set());
  private valorRepartoPrestamoTexto: Record<number, string> = {};
  prestamosExpandidos = new Set<number>();

  // ── excedente aplicado a un aporte ──
  opcionesAporteExcedente = signal<OpcionAporteExcedente[]>([]);
  mensajeOpcionesAporteVacio = signal<string | null>(null);
  isLoadingOpcionesAporte = signal(false);
  valoresAporteEditados = signal<Record<number, number>>({});
  aporteEnEdicion = signal<Set<number>>(new Set());
  /** idTipoAporte → código de la novedad a la que se le atribuye ese aporte (§14, decisión del árbitro 2026-09-03). */
  aporteNovedadSeleccionada = signal<Record<number, number>>({});
  private aporteNovedadElegidaManualmente = new Set<number>();

  constructor(
    public dialogRef: MatDialogRef<AfectacionParticipeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AfectacionParticipeDialogData,
    private entidadService: EntidadService,
    private prestamoService: PrestamoService,
    private detallePrestamoService: DetallePrestamoService,
    private pagoPrestamoService: PagoPrestamoService,
    private saldoPrestamo: SaldoPrestamoService,
    private afectacionValoresParticipeCargaService: AfectacionValoresParticipeCargaService,
    private serviciosAsoprepService: ServiciosAsoprepService,
    private funcionesDatos: FuncionesDatosService,
    private appStateService: AppStateService,
    private usuarioService: UsuarioService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarContexto();
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }

  // ================= carga del contexto =================

  private cargarContexto(): void {
    this.cargando.set(true);
    this.erroresCargaPrestamos.set([]);

    // Independiente del resto: solo informa, no bloquea ni gatea nada (mismo criterio que en
    // detalle-consulta-carga).
    this.cargarTopeAfectacion();

    const consultasAfectaciones = this.data.novedades
      .filter((n) => n.codigo != null)
      .map((novedad) => {
        const criterios: DatosBusqueda[] = [];
        const db = new DatosBusqueda();
        db.asignaValorConCampoPadre(
          TipoDatosBusqueda.LONG,
          'novedadParticipeCarga',
          'codigo',
          String(novedad.codigo),
          TipoComandosBusqueda.IGUAL
        );
        criterios.push(db);
        return this.afectacionValoresParticipeCargaService.selectByCriteria(criterios).pipe(
          map((data) => (Array.isArray(data) ? data : data ? [data] : []).map((a) => ({ ...a, __novedadOrigen: novedad }) as AfectacionEtiquetada)),
          catchError(() => of([] as AfectacionEtiquetada[]))
        );
      });

    forkJoin(consultasAfectaciones.length ? consultasAfectaciones : [of([] as AfectacionEtiquetada[])]).subscribe((listas) => {
      const afectaciones = listas.flat();
      this.afectacionesRegistradas.set(afectaciones);
      this.valoresAporteEditados.set(this.construirMapaValoresAportados(afectaciones));
      this.verificarConsistenciaAfectado();
      // El auto-asignado de novedad para aporte se recalcula DESPUÉS de que `prestamosAfectables`
      // esté listo (dentro de `cargarPrestamosAfectables`) — antes de eso, `pozoRestantePorNovedad`
      // no puede descontar lo que ya consumen los préstamos y el pozo por novedad quedaría inflado.
      this.cargarPrestamosAfectables(afectaciones);
    });

    const novedadParaOpcionesAporte = this.data.motivos[0]?.codigo ?? this.data.novedades[0]?.codigo;
    if (novedadParaOpcionesAporte) {
      this.cargarOpcionesAporte(novedadParaOpcionesAporte);
    }
  }

  private cargarTopeAfectacion(): void {
    this.topeAfectacionConsultaFallida.set(false);
    this.serviciosAsoprepService.topeAfectacion(this.data.idCarga, this.data.codigoPetro).subscribe({
      next: (tope) => {
        if (tope) {
          this.topeAfectacionParticipe.set(tope);
          this.verificarConsistenciaAfectado();
        } else {
          this.topeAfectacionParticipe.set(null);
          this.topeAfectacionConsultaFallida.set(true);
        }
      },
      error: () => {
        this.topeAfectacionParticipe.set(null);
        this.topeAfectacionConsultaFallida.set(true);
      },
    });
  }

  /**
   * Ver el comentario de `bloqueadoPorInconsistencia`. Se llama después de CADA pieza que hace
   * falta para el chequeo (el tope y el fan-out de afectaciones) — es barato y evita depender de
   * cuál de las dos termine última.
   */
  private verificarConsistenciaAfectado(): void {
    const tope = this.topeAfectacionParticipe();
    if (!tope) return; // se re-evalúa cuando el tope llegue; si falla del todo, montoDisponibleAfectacion ya cae a 0 y guardarAfectaciones lo frena igual

    const calculado = this.redondear(this.afectacionesRegistradas().reduce((sum, a) => sum + (Number(a.valorAfectar) || 0), 0));
    const backend = this.redondear(tope.afectado);

    if (Math.abs(calculado - backend) > 0.01) {
      this.bloqueadoPorInconsistencia.set(
        `El sistema registra ${this.formatMoneda(backend)} ya afectados para este partícipe, pero esta pantalla solo pudo confirmar ` +
          `${this.formatMoneda(calculado)} en los destinos que sabe mostrar. Para no arriesgar una afectación duplicada, no se puede ` +
          `editar ni guardar hasta confirmarlo — use la pantalla de novedades actual para este partícipe mientras tanto, y avise al equipo.`
      );
    } else {
      this.bloqueadoPorInconsistencia.set(null);
    }
  }

  private cargarPrestamosAfectables(afectaciones: AfectacionEtiquetada[]): void {
    const criteriosEntidad: DatosBusqueda[] = [];
    const dbCodigoPetro = new DatosBusqueda();
    dbCodigoPetro.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'rolPetroComercial',
      String(this.data.codigoPetro),
      TipoComandosBusqueda.IGUAL
    );
    criteriosEntidad.push(dbCodigoPetro);

    this.entidadService.selectByCriteria(criteriosEntidad).subscribe({
      next: (entidadesData) => {
        const entidades = Array.isArray(entidadesData) ? entidadesData : entidadesData ? [entidadesData] : [];
        const entidad = entidades[0] || null;
        this.entidad.set(entidad);

        if (!entidad?.codigo) {
          this.cargando.set(false);
          this.prestamosAfectables.set([]);
          this.pagosPorCuotaAfectacion.set({});
          this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
          this.snackBar.open('No se encontró la entidad del partícipe para consultar préstamos', 'Cerrar', { duration: 4000 });
          return;
        }

        const criteriosPrestamos: DatosBusqueda[] = [];
        const dbEntidad = new DatosBusqueda();
        dbEntidad.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'entidad', 'codigo', String(entidad.codigo), TipoComandosBusqueda.IGUAL);
        criteriosPrestamos.push(dbEntidad);
        const dbOrden = new DatosBusqueda();
        dbOrden.orderBy('fechaInicio');
        dbOrden.setTipoOrden(DatosBusqueda.ORDER_ASC);
        criteriosPrestamos.push(dbOrden);

        this.prestamoService.selectByCriteria(criteriosPrestamos).subscribe({
          next: (prestamosData) => {
            const prestamos = (Array.isArray(prestamosData) ? prestamosData : prestamosData ? [prestamosData] : []).filter(
              (p) => p?.idEstado === EstadoPrestamoOperativo.VIGENTE || p?.idEstado === EstadoPrestamoOperativo.EN_MORA
            );

            if (prestamos.length === 0) {
              this.cargando.set(false);
              this.prestamosAfectables.set([]);
              this.pagosPorCuotaAfectacion.set({});
              this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
              Object.keys(this.valoresAporteEditados()).forEach((idTipoAporteTexto) =>
                this.recalcularNovedadAporte(Number(idTipoAporteTexto))
              );
              return;
            }

            const requests = prestamos.map((prestamo) => {
              const criteriosDetalle: DatosBusqueda[] = [];
              const dbPrestamo = new DatosBusqueda();
              dbPrestamo.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'prestamo', 'codigo', String(prestamo.codigo), TipoComandosBusqueda.IGUAL);
              criteriosDetalle.push(dbPrestamo);
              const dbOrdenDetalle = new DatosBusqueda();
              dbOrdenDetalle.orderBy('numeroCuota');
              dbOrdenDetalle.setTipoOrden(DatosBusqueda.ORDER_ASC);
              criteriosDetalle.push(dbOrdenDetalle);

              const criterioPagos = new DatosBusqueda();
              criterioPagos.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'prestamo', 'codigo', String(prestamo.codigo), TipoComandosBusqueda.IGUAL);

              const detalleData$ = this.detallePrestamoService.selectByCriteria(criteriosDetalle).pipe(catchError(() => of(null)));
              const pagos$ = this.pagoPrestamoService.selectByCriteria([criterioPagos]).pipe(
                map((pagos) => ({ pagos, sinRegistros: false })),
                catchError((error) => of({ pagos: null, sinRegistros: this.esErrorPagosSinRegistros(error) }))
              );

              return forkJoin({ detalleData: detalleData$, pagos: pagos$ }).pipe(
                map(({ detalleData, pagos }): ResultadoCargaPrestamo => {
                  const novedadOrigen = this.elegirNovedadParaPrestamo(prestamo);

                  if (detalleData == null) {
                    return {
                      item: { prestamo, cuotas: [], novedadOrigen },
                      pagosPorCuota: {},
                      cargaFallida: true,
                      motivo: 'No se pudieron cargar sus cuotas.',
                    };
                  }

                  const cuotas = (Array.isArray(detalleData) ? detalleData : [detalleData])
                    .map((detalle) => this.normalizarDetallePrestamo(detalle))
                    .filter((detalle) => !this.esCuotaPagadaOCancelada(detalle))
                    .sort((a, b) => this.obtenerFechaOrdenCuota(a) - this.obtenerFechaOrdenCuota(b));

                  if (pagos.pagos == null) {
                    return {
                      item: { prestamo, cuotas, novedadOrigen },
                      pagosPorCuota: {},
                      cargaFallida: false,
                      motivo:
                        !pagos.sinRegistros && cuotas.length > 0
                          ? 'No se pudieron cargar sus pagos: los saldos mostrados pueden estar por encima de lo real. Verifique antes de cruzar.'
                          : undefined,
                    };
                  }

                  const listaPagos = Array.isArray(pagos.pagos) ? pagos.pagos : [pagos.pagos];
                  return {
                    item: { prestamo, cuotas, novedadOrigen },
                    pagosPorCuota: this.saldoPrestamo.acumularPagosPorCuota(listaPagos),
                    cargaFallida: false,
                  };
                })
              );
            });

            forkJoin(requests).subscribe({
              next: (resultados) => {
                const prestamosConCuotas = resultados.map((r) => r.item).filter((item) => item.cuotas.length > 0);
                // Coinciden primero, después el resto — igual que `ordenarPrestamosPorProductoObjetivo` original.
                prestamosConCuotas.sort((a, b) => Number(!!b.novedadOrigen) - Number(!!a.novedadOrigen));
                const pagosPorCuotaTotal = resultados.reduce<Record<number, ComponentesPagados>>((acc, r) => ({ ...acc, ...r.pagosPorCuota }), {});
                const erroresCarga: PrestamoErrorCarga[] = resultados
                  .filter((r): r is ResultadoCargaPrestamo & { motivo: string } => !!r.motivo)
                  .map((r) => ({ prestamo: r.item.prestamo, motivo: r.motivo }));

                this.pagosPorCuotaAfectacion.set(pagosPorCuotaTotal);
                this.prestamosAfectables.set(prestamosConCuotas);
                this.erroresCargaPrestamos.set(erroresCarga);
                this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
                // Recién acá `prestamosAfectables` está listo — es seguro calcular a qué novedad
                // se atribuye cada aporte YA guardado (el pozo por novedad ya puede descontar lo
                // que consumen los préstamos).
                Object.keys(this.valoresAporteEditados()).forEach((idTipoAporteTexto) =>
                  this.recalcularNovedadAporte(Number(idTipoAporteTexto))
                );
                this.cargando.set(false);
              },
              error: () => {
                this.prestamosAfectables.set([]);
                this.pagosPorCuotaAfectacion.set({});
                this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
                this.cargando.set(false);
                this.snackBar.open('No se pudieron cargar las cuotas afectables', 'Cerrar', { duration: 4000 });
              },
            });
          },
          error: () => {
            this.cargando.set(false);
            this.prestamosAfectables.set([]);
            this.pagosPorCuotaAfectacion.set({});
            this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
            this.snackBar.open('No se pudieron cargar los préstamos activos del partícipe', 'Cerrar', { duration: 4000 });
          },
        });
      },
      error: () => {
        this.cargando.set(false);
        this.prestamosAfectables.set([]);
        this.pagosPorCuotaAfectacion.set({});
        this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
        this.snackBar.open('No se pudo consultar la entidad del partícipe', 'Cerrar', { duration: 4000 });
      },
    });
  }

  /**
   * Generaliza `coincideProductoObjetivo` (detalle-consulta-carga) a varias novedades: si más de
   * una coincide con el mismo préstamo, gana la de código MENOR — determinista y estable entre
   * guardados (§7.3 del plan), no depende del orden en que volvieron de la consulta.
   */
  private elegirNovedadParaPrestamo(prestamo: Prestamo): NovedadParticipeCarga | null {
    const codigoProductoPrestamo = prestamo.producto?.codigo != null ? String(prestamo.producto.codigo) : null;
    const codigoPetroProductoPrestamo = prestamo.producto?.codigoPetro ? String(prestamo.producto.codigoPetro) : null;

    const candidatas = this.data.novedades.filter((n) => {
      const codigoProductoNovedad = n.codigoProducto != null ? String(n.codigoProducto) : null;
      const codigoPetroProductoNovedad = n.participeXCargaArchivo?.detalleCargaArchivo?.codigoPetroProducto
        ? String(n.participeXCargaArchivo.detalleCargaArchivo.codigoPetroProducto)
        : null;
      return (
        (codigoProductoNovedad !== null && codigoProductoPrestamo === codigoProductoNovedad) ||
        (codigoPetroProductoNovedad !== null && codigoPetroProductoPrestamo === codigoPetroProductoNovedad)
      );
    });

    if (candidatas.length === 0) return null;
    return candidatas.reduce((menor, actual) => (actual.codigo < menor.codigo ? actual : menor));
  }

  // ================= tope por partícipe =================

  /**
   * El POZO real — `disponible` de `/asgn/topeAfectacion`, sin ningún ajuste. Hasta el
   * 2026-09-03 este getter hacía `tope.restante + valorPersistidoAlCargar` ("agregar de vuelta lo
   * ya persistido, porque restante ya lo descuenta") — una fórmula que tenía sentido cuando el
   * fan-out de afectaciones estaba limitado a una sola novedad (necesitaba reconciliar una vista
   * PARCIAL contra un número GLOBAL) pero se volvió activamente peligrosa acá: con el fan-out ya
   * ampliado a TODAS las novedades del partícipe, `valorPersistidoAlCargar` es el `afectado`
   * completo, y sumarlo a `restante` (que ya vale 0 cuando hay exceso) da el `afectado`, no el
   * `disponible` — la pantalla mostraba "Disponible $439,59" para un partícipe cuyo pozo real es
   * $298,19, exactamente al revés. Caso real, 2026-09-03: SANCHEZ (rol 7508), disponible 298,19,
   * afectado 439,59 (145+149+336) — con la fórmula vieja "Disponible" mostraba 439,59.
   *
   * Ya no hace falta el ajuste: el fan-out completo + `verificarConsistenciaAfectado` garantizan
   * que la sesión ve TODO lo persistido, así que comparar el total de la sesión (que arranca
   * sembrado con eso) contra el pozo crudo es correcto y mucho más simple.
   */
  get montoDisponibleAfectacion(): number {
    const tope = this.topeAfectacionParticipe();
    return tope ? this.redondear(tope.disponible) : 0;
  }

  get totalValorAfectarActual(): number {
    return this.redondear(Object.values(this.valoresAfectarEditados()).reduce((sum, v) => sum + (Number(v) || 0), 0));
  }

  get totalValorAportarActual(): number {
    return this.redondear(Object.values(this.valoresAporteEditados()).reduce((sum, v) => sum + (Number(v) || 0), 0));
  }

  /** Puede ser NEGATIVO — significa exceso, no "falta". El HTML lo etiqueta según el signo, nunca "Restante" fijo. */
  get saldoPendienteAfectacion(): number {
    return this.redondear(this.montoDisponibleAfectacion - this.totalValorAfectarActual - this.totalValorAportarActual);
  }

  // ================= reparto automático por préstamo =================
  //
  // Motor ÚNICO, portado literal de `detalle-consulta-carga.component.ts` (pedido del usuario
  // 2026-08-31): "aplicar todo el sobrante" y "valor por préstamo" son la MISMA operación —
  // repartir un monto sobre las cuotas del préstamo, de la más antigua a la más nueva, cada cuota
  // hasta su pendiente y la última absorbiendo el resto. No se reinventa (§8 del plan).

  private montoAsignadoActualEnPrestamo(item: PrestamoAfectable): number {
    const codigos = new Set(item.cuotas.map((c) => c.codigo).filter((c): c is number => c != null));
    return this.redondear(
      Object.entries(this.valoresAfectarEditados())
        .filter(([codigo]) => codigos.has(Number(codigo)))
        .reduce((sum, [, valor]) => sum + (Number(valor) || 0), 0)
    );
  }

  private topeRepartoPrestamo(item: PrestamoAfectable): number {
    return this.redondear(this.saldoPendienteAfectacion + this.montoAsignadoActualEnPrestamo(item));
  }

  private aplicarRepartoAutomaticoPrestamo(item: PrestamoAfectable, monto: number): void {
    let restante = this.redondear(Math.max(monto, 0));
    const nuevosValores: Record<number, number> = {};

    for (const cuota of item.cuotas) {
      if (cuota.codigo == null) continue;
      const max = this.redondear(this.getValorMaximoAfectarCuota(cuota));
      if (max <= 0) {
        nuevosValores[cuota.codigo] = 0;
        continue;
      }
      const aplicado = restante >= max - 0.004 ? max : Math.max(restante, 0);
      nuevosValores[cuota.codigo] = this.redondear(aplicado);
      restante = this.redondear(Math.max(restante - aplicado, 0));
    }

    this.valoresAfectarEditados.update((actual) => ({ ...actual, ...nuevosValores }));
  }

  isAplicarTodoElSobranteActivo(item: PrestamoAfectable): boolean {
    const codigo = item.prestamo.codigo;
    return codigo != null && this.prestamosConTodoAplicado().has(codigo);
  }

  onToggleAplicarTodoElSobrante(item: PrestamoAfectable, marcado: boolean): void {
    const codigo = item.prestamo.codigo;
    if (codigo == null || !item.novedadOrigen) return;

    this.prestamosConTodoAplicado.update((actual) => {
      const copia = new Set(actual);
      if (marcado) copia.add(codigo);
      else copia.delete(codigo);
      return copia;
    });

    this.aplicarRepartoAutomaticoPrestamo(item, marcado ? this.topeRepartoPrestamo(item) : 0);
    delete this.valorRepartoPrestamoTexto[codigo];
  }

  getValorRepartoPrestamoTexto(item: PrestamoAfectable): string {
    const codigo = item.prestamo.codigo;
    if (codigo == null) return '';
    if (this.valorRepartoPrestamoTexto[codigo] !== undefined) return this.valorRepartoPrestamoTexto[codigo];
    const asignado = this.montoAsignadoActualEnPrestamo(item);
    return asignado > 0.004 ? this.formatearMontoDosDecimales(asignado) : '';
  }

  onValorRepartoPrestamoInput(item: PrestamoAfectable, valor: string): void {
    const codigo = item.prestamo.codigo;
    if (codigo == null) return;
    this.valorRepartoPrestamoTexto[codigo] = valor;
  }

  onValorRepartoPrestamoBlur(item: PrestamoAfectable): void {
    const codigo = item.prestamo.codigo;
    if (codigo == null || !item.novedadOrigen) return;

    const texto = this.valorRepartoPrestamoTexto[codigo];
    delete this.valorRepartoPrestamoTexto[codigo];
    if (texto === undefined || texto.trim() === '') return;

    const solicitado = this.redondear(this.parsearMontoEntrada(texto));
    if (Number.isNaN(solicitado) || solicitado < 0) return;

    const tope = this.topeRepartoPrestamo(item);
    const monto = Math.min(solicitado, tope);
    if (monto < solicitado - 0.004) {
      this.snackBar.open('El valor ingresado supera lo disponible para este préstamo: se ajustó al máximo posible.', 'Cerrar', { duration: 4000 });
    }

    this.aplicarRepartoAutomaticoPrestamo(item, monto);

    const quedoCompleto = this.redondear(monto) >= this.redondear(tope) - 0.004 && tope > 0.004;
    this.prestamosConTodoAplicado.update((actual) => {
      const yaEstaba = actual.has(codigo);
      if (quedoCompleto === yaEstaba) return actual;
      const copia = new Set(actual);
      if (quedoCompleto) copia.add(codigo);
      else copia.delete(codigo);
      return copia;
    });
  }

  // ================= edición por cuota =================

  private itemDeCuota(detalleCodigo: number): PrestamoAfectable | null {
    return this.prestamosAfectables().find((item) => item.cuotas.some((c) => c.codigo === detalleCodigo)) ?? null;
  }

  private cuotaAnteriorSinCubrir(item: PrestamoAfectable, detalleCodigo: number): DetallePrestamo | null {
    for (const cuota of item.cuotas) {
      if (cuota.codigo === detalleCodigo) return null;
      const max = this.redondear(this.getValorMaximoAfectarCuota(cuota));
      if (max <= 0) continue;
      const asignado = this.redondear(this.valoresAfectarEditados()[cuota.codigo] || 0);
      if (asignado < max - 0.004) return cuota;
    }
    return null;
  }

  onValorAfectarFocus(detalle: DetallePrestamo): void {
    if (!detalle.codigo) return;
    const edicion = new Set(this.detalleCuotaEnEdicion());
    edicion.add(detalle.codigo);
    this.detalleCuotaEnEdicion.set(edicion);
  }

  onValorAfectarBlur(detalle: DetallePrestamo): void {
    if (!detalle.codigo) return;
    const edicion = new Set(this.detalleCuotaEnEdicion());
    edicion.delete(detalle.codigo);
    this.detalleCuotaEnEdicion.set(edicion);

    const valorActual = this.valoresAfectarEditados()[detalle.codigo] || 0;
    this.valoresAfectarEditados.update((actual) => ({ ...actual, [detalle.codigo]: this.redondear(Number(valorActual) || 0) }));
  }

  onAutocompletarValorCuota(detalle: DetallePrestamo): void {
    const detalleCodigo = detalle.codigo;
    if (!detalleCodigo) return;

    const valorMaximoCuota = this.redondear(this.getValorMaximoAfectarCuota(detalle));
    if (valorMaximoCuota <= 0) return;

    const item = this.itemDeCuota(detalleCodigo);
    if (!item?.novedadOrigen) return;
    const anterior = this.cuotaAnteriorSinCubrir(item, detalleCodigo);
    if (anterior) {
      this.snackBar.open(
        `Complete primero la cuota N° ${anterior.numeroCuota} antes de asignar esta: la prelación va de la más antigua a la más nueva.`,
        'Cerrar',
        { duration: 4500 }
      );
      return;
    }

    const totalSinActual =
      this.totalValorAportarActual +
      Object.entries(this.valoresAfectarEditados())
        .filter(([codigo]) => Number(codigo) !== detalleCodigo)
        .reduce((sum, [, current]) => sum + (Number(current) || 0), 0);

    const saldoDisponible = this.redondear(this.montoDisponibleAfectacion - this.redondear(totalSinActual));
    if (saldoDisponible <= 0) {
      this.valoresAfectarEditados.update((actual) => ({ ...actual, [detalleCodigo]: 0 }));
      return;
    }

    const valorAutocompletado = this.redondear(Math.min(valorMaximoCuota, saldoDisponible));
    this.valoresAfectarEditados.update((actual) => ({ ...actual, [detalleCodigo]: valorAutocompletado }));
  }

  onValorAfectarChange(detalle: DetallePrestamo, valor: string | number): void {
    const detalleCodigo = detalle.codigo;
    const valorNumerico = this.redondear(this.parsearMontoEntrada(valor));
    const valorMaximoCuota = this.getValorMaximoAfectarCuota(detalle);

    if (!detalleCodigo) return;

    if (Number.isNaN(valorNumerico) || valorNumerico < 0) {
      this.valoresAfectarEditados.update((actual) => ({ ...actual, [detalleCodigo]: 0 }));
      return;
    }

    if (valorNumerico > valorMaximoCuota) {
      this.snackBar.open('El valor a cruzar no puede superar el saldo pendiente de la cuota', 'Cerrar', { duration: 3500 });
      this.valoresAfectarEditados.update((actual) => ({ ...actual, [detalleCodigo]: valorMaximoCuota }));
      return;
    }

    if (valorNumerico > 0.004) {
      const item = this.itemDeCuota(detalleCodigo);
      const anterior = item ? this.cuotaAnteriorSinCubrir(item, detalleCodigo) : null;
      if (anterior) {
        this.snackBar.open(
          `Complete primero la cuota N° ${anterior.numeroCuota} antes de asignar esta: la prelación va de la más antigua a la más nueva.`,
          'Cerrar',
          { duration: 4500 }
        );
        this.valoresAfectarEditados.update((actual) => ({ ...actual, [detalleCodigo]: 0 }));
        return;
      }
    }

    const totalSinActual =
      this.totalValorAportarActual +
      Object.entries(this.valoresAfectarEditados())
        .filter(([codigo]) => Number(codigo) !== detalleCodigo)
        .reduce((sum, [, current]) => sum + (Number(current) || 0), 0);

    const totalConActual = this.redondear(totalSinActual + valorNumerico);
    const montoDisponible = this.redondear(this.montoDisponibleAfectacion);

    if (totalConActual > montoDisponible) {
      this.snackBar.open('La suma de valores a cruzar no puede superar el valor recibido desde Petro', 'Cerrar', { duration: 4000 });
      return;
    }

    const itemDelCambio = this.itemDeCuota(detalleCodigo);
    if (itemDelCambio?.prestamo.codigo != null) {
      this.prestamosConTodoAplicado.update((actual) => {
        if (!actual.has(itemDelCambio.prestamo.codigo)) return actual;
        const copia = new Set(actual);
        copia.delete(itemDelCambio.prestamo.codigo);
        return copia;
      });
    }

    this.valoresAfectarEditados.update((actual) => ({ ...actual, [detalleCodigo]: valorNumerico }));
  }

  getValorAfectarEditado(detalleCodigo: number | undefined): string {
    if (!detalleCodigo) return '0,00';
    const valor = Number(this.valoresAfectarEditados()[detalleCodigo] || 0);
    const valorRedondeado = this.redondear(valor);
    if (this.detalleCuotaEnEdicion().has(detalleCodigo)) return String(valorRedondeado).replace('.', ',');
    return this.formatearMontoDosDecimales(valorRedondeado);
  }

  getValorCuotaOriginal(detalle: DetallePrestamo | null | undefined): number {
    if (!detalle) return 0;
    return Number(detalle.totalConSeguro ?? detalle.total ?? detalle.cuota ?? detalle.saldo ?? detalle.capital ?? 0);
  }

  getValorMaximoAfectarCuota(detalle: DetallePrestamo | null | undefined): number {
    if (!detalle) return 0;
    return this.redondear(this.saldoPrestamo.saldoPendienteDe(detalle, this.pagosPorCuotaAfectacion()));
  }

  getEstadoCuotaTexto(detalle: DetallePrestamo | null | undefined): string {
    const codigo = leerCodigoEstadoCuota(detalle);
    return obtenerNombreEstadoCuota(codigo)?.toUpperCase() ?? '-';
  }

  // ================= excedente aplicado a un aporte =================

  private cargarOpcionesAporte(idNovedad: number): void {
    this.isLoadingOpcionesAporte.set(true);
    this.afectacionValoresParticipeCargaService.opcionesAporte(idNovedad).subscribe({
      next: (resp) => {
        this.isLoadingOpcionesAporte.set(false);
        const opciones = resp?.opciones ?? [];
        this.opcionesAporteExcedente.set(opciones);
        this.mensajeOpcionesAporteVacio.set(
          opciones.length || !resp ? null : `No hay tipos de aporte vigentes para ${resp.mes}/${resp.anio}.`
        );
      },
      error: () => {
        this.isLoadingOpcionesAporte.set(false);
        this.opcionesAporteExcedente.set([]);
        this.mensajeOpcionesAporteVacio.set(null);
        this.snackBar.open('No se pudieron cargar las opciones de aporte para el excedente.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  onValorAporteFocus(idTipoAporte: number): void {
    const edicion = new Set(this.aporteEnEdicion());
    edicion.add(idTipoAporte);
    this.aporteEnEdicion.set(edicion);
  }

  onValorAporteBlur(idTipoAporte: number): void {
    const edicion = new Set(this.aporteEnEdicion());
    edicion.delete(idTipoAporte);
    this.aporteEnEdicion.set(edicion);

    const valorActual = this.valoresAporteEditados()[idTipoAporte] || 0;
    this.valoresAporteEditados.update((actual) => ({ ...actual, [idTipoAporte]: this.redondear(Number(valorActual) || 0) }));
    this.recalcularNovedadAporte(idTipoAporte);
  }

  onValorAporteChange(idTipoAporte: number, valor: string | number): void {
    const valorNumerico = this.redondear(this.parsearMontoEntrada(valor));

    if (Number.isNaN(valorNumerico) || valorNumerico < 0) {
      this.valoresAporteEditados.update((actual) => ({ ...actual, [idTipoAporte]: 0 }));
      return;
    }

    const totalSinActual =
      this.totalValorAfectarActual +
      Object.entries(this.valoresAporteEditados())
        .filter(([codigo]) => Number(codigo) !== idTipoAporte)
        .reduce((sum, [, current]) => sum + (Number(current) || 0), 0);

    const totalConActual = this.redondear(totalSinActual + valorNumerico);
    if (totalConActual > this.redondear(this.montoDisponibleAfectacion)) {
      this.snackBar.open('La suma de valores a cruzar no puede superar el valor recibido desde Petro', 'Cerrar', { duration: 4000 });
      return;
    }

    this.valoresAporteEditados.update((actual) => ({ ...actual, [idTipoAporte]: valorNumerico }));
  }

  getValorAporteEditado(idTipoAporte: number): string {
    const valor = Number(this.valoresAporteEditados()[idTipoAporte] || 0);
    const valorRedondeado = this.redondear(valor);
    if (this.aporteEnEdicion().has(idTipoAporte)) return String(valorRedondeado).replace('.', ',');
    return this.formatearMontoDosDecimales(valorRedondeado);
  }

  /**
   * A qué novedad se atribuye este aporte, para mostrar en pantalla ("se registra en: ...") y para
   * elegir con qué opciones llenar el `<select>` de override. `undefined` mientras el valor sea 0
   * o no haya ninguna novedad con pozo — en ese caso NO se puede guardar esta fila (ver `guardarAfectaciones`).
   */
  novedadAsignadaAporte(idTipoAporte: number): NovedadParticipeCarga | null {
    const codigo = this.aporteNovedadSeleccionada()[idTipoAporte];
    return codigo != null ? this.data.novedades.find((n) => n.codigo === codigo) ?? null : null;
  }

  onCambiarNovedadAporte(idTipoAporte: number, codigoNovedad: number): void {
    this.aporteNovedadElegidaManualmente.add(idTipoAporte);
    this.aporteNovedadSeleccionada.update((actual) => ({ ...actual, [idTipoAporte]: codigoNovedad }));
  }

  /**
   * Recalcula a qué novedad se atribuye este aporte — SOLO si el operador no la eligió a mano
   * (§14, decisión del árbitro 2026-09-03: "asignar automáticamente a la novedad del partícipe CON
   * POZO DISPONIBLE, consumiendo de mayor a menor"). Se llama al terminar de editar el valor del
   * aporte, y al cargar los ya guardados — nunca reactivamente en cada tecla.
   */
  private recalcularNovedadAporte(idTipoAporte: number): void {
    if (this.aporteNovedadElegidaManualmente.has(idTipoAporte)) return;

    const valor = this.valoresAporteEditados()[idTipoAporte] || 0;
    if (valor <= 0.004) {
      this.aporteNovedadSeleccionada.update((actual) => {
        const copia = { ...actual };
        delete copia[idTipoAporte];
        return copia;
      });
      return;
    }

    const elegida = this.elegirNovedadParaAporte(idTipoAporte);
    this.aporteNovedadSeleccionada.update((actual) => {
      const copia = { ...actual };
      if (elegida) copia[idTipoAporte] = elegida.codigo;
      else delete copia[idTipoAporte];
      return copia;
    });
  }

  private elegirNovedadParaAporte(idTipoAporteActual: number): NovedadParticipeCarga | null {
    const restantePorNovedad = this.pozoRestantePorNovedad(idTipoAporteActual);
    const candidatas = this.data.novedades
      .map((n) => ({ novedad: n, restante: restantePorNovedad.get(n.codigo) ?? 0 }))
      .filter((c) => c.restante > 0.01)
      .sort((a, b) => b.restante - a.restante || a.novedad.codigo - b.novedad.codigo);
    return candidatas[0]?.novedad ?? null;
  }

  /**
   * Pozo restante de CADA novedad del partícipe — NO es un tope de gasto (el único tope real y
   * compartido sigue siendo `montoDisponibleAfectacion`, igual que siempre). Es solo bookkeeping
   * de trazabilidad: "de qué pozo salió esta plata", para decidir a qué novedad cuelga un AVPC de
   * aporte cuando hay más de una novedad con plata disponible.
   *
   * `montoRecibido` de cada novedad es SU parte del disponible total (es el mismo campo que
   * documentó el §1 del plan sobre SANCHEZ PRADO). Se descuenta lo que ya consumieron los
   * préstamos ya asignados a esa novedad (`novedadOrigen`) y lo que ya consumieron OTROS aportes
   * ya asignados a esa novedad — nunca el aporte que se está por asignar.
   */
  private pozoRestantePorNovedad(excluirIdTipoAporte?: number): Map<number, number> {
    const restante = new Map<number, number>();
    this.data.novedades.forEach((n) => restante.set(n.codigo, this.redondear(n.montoRecibido || 0)));

    this.prestamosAfectables().forEach((item) => {
      if (!item.novedadOrigen) return;
      const consumido = item.cuotas.reduce((sum, c) => sum + (this.valoresAfectarEditados()[c.codigo] || 0), 0);
      restante.set(item.novedadOrigen.codigo, this.redondear((restante.get(item.novedadOrigen.codigo) || 0) - consumido));
    });

    Object.entries(this.aporteNovedadSeleccionada()).forEach(([idTipoAporteTexto, codigoNovedad]) => {
      const idTipoAporte = Number(idTipoAporteTexto);
      if (idTipoAporte === excluirIdTipoAporte) return;
      const valor = this.valoresAporteEditados()[idTipoAporte] || 0;
      restante.set(codigoNovedad, this.redondear((restante.get(codigoNovedad) || 0) - valor));
    });

    return restante;
  }

  // ================= guardar =================

  guardarAfectaciones(): void {
    if (this.bloqueadoPorInconsistencia()) {
      this.snackBar.open('No se puede guardar: los números de este partícipe no coinciden con el sistema. Ver el aviso arriba.', 'Cerrar', { duration: 5000 });
      return;
    }

    const usuario = this.obtenerUsuarioActual();
    if (!usuario) {
      this.snackBar.open('No se pudo identificar el usuario actual', 'Cerrar', { duration: 3500 });
      return;
    }

    if (this.redondear(this.totalValorAfectarActual + this.totalValorAportarActual) > this.redondear(this.montoDisponibleAfectacion)) {
      this.snackBar.open('La suma de valores a cruzar supera el valor recibido desde Petro', 'Cerrar', { duration: 4000 });
      return;
    }

    // Los aportes con valor > 0 necesitan una novedad asignada ANTES de construir nada — si el
    // pozo se agotó en todas las novedades del partícipe, no hay de dónde colgar el AVPC y no se
    // inventa una asignación (§14, punto 2 del árbitro: "ahí sí PARÁ y avisame").
    const aportesSinNovedad = Object.entries(this.valoresAporteEditados())
      .filter(([, valor]) => this.redondear(Number(valor) || 0) > 0.004)
      .filter(([idTipoAporte]) => !this.novedadAsignadaAporte(Number(idTipoAporte)));
    if (aportesSinNovedad.length > 0) {
      this.snackBar.open(
        'No hay pozo disponible en ninguna novedad de este partícipe para registrar el aporte. No se guardó nada — avise al equipo antes de continuar.',
        'Cerrar',
        { duration: 8000 }
      );
      return;
    }

    const cuotasDisponibles = new Map<number, { prestamo: Prestamo; detalle: DetallePrestamo; novedadOrigen: NovedadParticipeCarga }>();
    this.prestamosAfectables().forEach((item) => {
      if (!item.novedadOrigen) return;
      item.cuotas.forEach((detalle) => cuotasDisponibles.set(detalle.codigo, { prestamo: item.prestamo, detalle, novedadOrigen: item.novedadOrigen! }));
    });

    const actuales = this.valoresAfectarEditados();
    const existentesPrestamo = new Map<number, AfectacionEtiquetada>();
    this.afectacionesRegistradas().forEach((item) => {
      const detalleCodigo = item.detallePrestamo?.codigo;
      if (detalleCodigo) existentesPrestamo.set(detalleCodigo, item);
    });

    const operaciones: any[] = [];

    Object.entries(actuales).forEach(([detalleCodigoTexto, valor]) => {
      const detalleCodigo = Number(detalleCodigoTexto);
      const valorAfectar = this.redondear(Number(valor || 0));
      const cuotaSeleccionada = cuotasDisponibles.get(detalleCodigo);
      const existente = existentesPrestamo.get(detalleCodigo);
      if (!cuotaSeleccionada) return;

      if (valorAfectar > 0) {
        const payload = this.construirPayloadAfectacion(cuotaSeleccionada.novedadOrigen, cuotaSeleccionada.prestamo, cuotaSeleccionada.detalle, valorAfectar, usuario, existente);
        operaciones.push(existente?.codigo ? this.afectacionValoresParticipeCargaService.update(payload) : this.afectacionValoresParticipeCargaService.add(payload));
      } else if (existente?.codigo) {
        operaciones.push(this.afectacionValoresParticipeCargaService.delete(existente.codigo));
      }
    });

    this.afectacionesRegistradas().forEach((item) => {
      const detalleCodigo = item.detallePrestamo?.codigo;
      if (!detalleCodigo || detalleCodigo in actuales) return;
      if (item.codigo) operaciones.push(this.afectacionValoresParticipeCargaService.delete(item.codigo));
    });

    const existentesAporte = new Map<number, AfectacionEtiquetada>();
    this.afectacionesRegistradas().forEach((item) => {
      const idTipoAporte = item.tipoAporte?.codigo;
      if (idTipoAporte) existentesAporte.set(idTipoAporte, item);
    });

    const actualesAporte = this.valoresAporteEditados();
    const filasAporteParaBatch: AfectacionValoresParticipeCarga[] = [];

    Object.entries(actualesAporte).forEach(([idTipoAporteTexto, valor]) => {
      const idTipoAporte = Number(idTipoAporteTexto);
      const valorAfectar = this.redondear(Number(valor || 0));
      const existente = existentesAporte.get(idTipoAporte);

      if (valorAfectar > 0) {
        const novedadElegida = this.novedadAsignadaAporte(idTipoAporte)!; // validado arriba
        filasAporteParaBatch.push(this.construirPayloadAfectacionAporte(novedadElegida, idTipoAporte, valorAfectar, usuario, existente));
      } else if (existente?.codigo) {
        operaciones.push(this.afectacionValoresParticipeCargaService.delete(existente.codigo));
      }
    });

    this.afectacionesRegistradas().forEach((item) => {
      const idTipoAporte = item.tipoAporte?.codigo;
      if (!idTipoAporte || idTipoAporte in actualesAporte) return;
      if (item.codigo) operaciones.push(this.afectacionValoresParticipeCargaService.delete(item.codigo));
    });

    if (operaciones.length === 0 && filasAporteParaBatch.length === 0) {
      this.snackBar.open('No hay cambios por guardar en las afectaciones', 'Cerrar', { duration: 3000 });
      return;
    }

    this.guardando.set(true);

    forkJoin({
      prestamos: operaciones.length ? forkJoin(operaciones) : of(null),
      aportes: filasAporteParaBatch.length ? this.afectacionValoresParticipeCargaService.batch(filasAporteParaBatch) : of(null),
    }).subscribe({
      next: ({ aportes }) => {
        this.guardando.set(false);

        const advertencias = aportes?.advertenciasReparto ?? [];
        if (advertencias.length) {
          const texto = advertencias.map((a) => a.mensaje).join(' · ');
          this.snackBar.open(`Afectaciones guardadas, pero el reparto no cuadra: ${texto}`, 'Cerrar', { duration: 10000 });
        } else {
          this.snackBar.open('Afectaciones registradas correctamente', 'Cerrar', { duration: 3500 });
        }

        this.dialogRef.close(true);
      },
      error: () => {
        this.guardando.set(false);
        this.snackBar.open('No se pudieron guardar las afectaciones', 'Cerrar', { duration: 4000 });
      },
    });
  }

  /**
   * ⛔ SUMA, no sobreescribe (bug real encontrado 2026-09-03, SANCHEZ rol 7508: AVPC 145 y 149
   * cuelgan de la MISMA cuota 512966 — 141,40 y 273,63). Con `acc[detalleCodigo] = valor`, la
   * segunda fila pisaba a la primera: el input mostraba solo una de las dos y "asignado ahora"
   * salía mal, y el guardado (ver `guardarAfectaciones`) actualizaba solo la que sobrevivió en el
   * mapa dejando a la otra huérfana para siempre — invisible, no editable, pero seguía sumando en
   * el `afectado` real del backend. Una cuota puede tener más de un AVPC (una fila por cascada);
   * el input tiene que reflejar el TOTAL para poder corregirlo.
   */
  private construirMapaValoresAfectados(afectaciones: AfectacionValoresParticipeCarga[]): Record<number, number> {
    return afectaciones.reduce((acc, item) => {
      const detalleCodigo = item.detallePrestamo?.codigo;
      if (detalleCodigo) acc[detalleCodigo] = this.redondear((acc[detalleCodigo] || 0) + (Number(item.valorAfectar) || 0));
      return acc;
    }, {} as Record<number, number>);
  }

  /** Misma corrección que `construirMapaValoresAfectados` — suma, no sobreescribe, por si un tipo de aporte llega a tener más de una fila. */
  private construirMapaValoresAportados(afectaciones: AfectacionValoresParticipeCarga[]): Record<number, number> {
    return afectaciones.reduce((acc, item) => {
      const idTipoAporte = item.tipoAporte?.codigo;
      if (idTipoAporte) acc[idTipoAporte] = this.redondear((acc[idTipoAporte] || 0) + (Number(item.valorAfectar) || 0));
      return acc;
    }, {} as Record<number, number>);
  }

  private construirPayloadAfectacion(
    novedad: NovedadParticipeCarga,
    prestamo: Prestamo,
    detalle: DetallePrestamo,
    valorAfectar: number,
    usuario: Usuario,
    existente?: AfectacionValoresParticipeCarga
  ): AfectacionValoresParticipeCarga {
    const valorCuotaOriginal = this.getValorCuotaOriginal(detalle);
    const capitalOriginal = Number(detalle.capital || 0);
    const interesOriginal = Number(detalle.interes || 0);
    const desgravamenOriginal = Number(detalle.desgravamen || 0);

    return {
      codigo: existente?.codigo,
      novedadParticipeCarga: novedad,
      prestamo,
      detallePrestamo: detalle,
      valorCuotaOriginal,
      capitalCuotaOriginal: capitalOriginal,
      interesCuotaOriginal: interesOriginal,
      desgravamenCuotaOriginal: desgravamenOriginal,
      valorAfectar,
      capitalAfectar: 0,
      interesAfectar: 0,
      desgravamenAfectar: 0,
      diferenciaTotal: this.redondear(valorCuotaOriginal - valorAfectar),
      diferenciaCapital: this.redondear(capitalOriginal),
      diferenciaInteres: this.redondear(interesOriginal),
      diferenciaDesgravamen: this.redondear(desgravamenOriginal),
      fechaAfectacion: new Date(),
      usuarioRegistro: usuario.nombre || usuario.codigo?.toString() || '',
      fechaCreacionRegistro: existente?.fechaCreacionRegistro || new Date(),
      observaciones: `Afectación registrada para novedad ${novedad.codigo} (pantalla por partícipe)`,
      estado: 1,
    };
  }

  private construirPayloadAfectacionAporte(
    novedad: NovedadParticipeCarga,
    idTipoAporte: number,
    valorAfectar: number,
    usuario: Usuario,
    existente?: AfectacionValoresParticipeCarga
  ): AfectacionValoresParticipeCarga {
    return {
      codigo: existente?.codigo,
      novedadParticipeCarga: novedad,
      prestamo: null,
      detallePrestamo: null,
      tipoAporte: { codigo: idTipoAporte },
      valorAfectar,
      fechaAfectacion: new Date(),
      usuarioRegistro: usuario.nombre || usuario.codigo?.toString() || '',
      fechaCreacionRegistro: existente?.fechaCreacionRegistro || new Date(),
      observaciones: `Excedente de la novedad ${novedad.codigo} aplicado a aporte (pantalla por partícipe, asignación automática por pozo disponible)`,
      estado: 1,
    };
  }

  // ================= helpers UI =================

  trackByCuota(_index: number, cuota: DetallePrestamo): number {
    return cuota.codigo;
  }

  togglePrestamo(prestamoCodigo: number | undefined): void {
    if (!prestamoCodigo) return;
    if (this.prestamosExpandidos.has(prestamoCodigo)) this.prestamosExpandidos.delete(prestamoCodigo);
    else this.prestamosExpandidos.add(prestamoCodigo);
  }

  isPrestamoExpandido(prestamoCodigo: number | undefined): boolean {
    return prestamoCodigo != null && this.prestamosExpandidos.has(prestamoCodigo);
  }

  getTipoPrestamoNombre(prestamo: Prestamo | null | undefined): string {
    return prestamo?.producto?.nombre || 'N/A';
  }

  formatearFecha(fecha: Date | string | null | undefined): string {
    return this.funcionesDatos.formatoFecha(fecha, 2) || '—';
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ================= helpers privados =================

  private obtenerUsuarioActual(): Usuario | null {
    const usuarioMemoria = this.usuarioService.getUsuarioLog();
    if (usuarioMemoria?.codigo) return usuarioMemoria;

    const usuarioEstado = this.appStateService.getUsuario();
    if (usuarioEstado?.codigo) return usuarioEstado;

    for (const clave of ['usuario', 'usuarioLog']) {
      const texto = localStorage.getItem(clave);
      if (!texto) continue;
      try {
        const usuario = JSON.parse(texto) as Usuario;
        if (usuario?.codigo) return usuario;
      } catch {
        // sigue con la siguiente clave
      }
    }
    return null;
  }

  private esErrorPagosSinRegistros(error: unknown): boolean {
    const mensaje = typeof error === 'string' ? error : (error as { mensaje?: unknown })?.mensaje;
    if (typeof mensaje !== 'string') return false;
    const normalizado = mensaje.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    return normalizado.includes('no devolvio ningun registro');
  }

  private esCuotaPagadaOCancelada(detalle: DetallePrestamo | null | undefined): boolean {
    const codigoEstado = leerCodigoEstadoCuota(detalle);
    return codigoEstado === CodigoEstadoCuota.PAGADA || codigoEstado === CodigoEstadoCuota.CANCELADA_ANTICIPADA;
  }

  private normalizarDetallePrestamo(detalle: DetallePrestamo): DetallePrestamo {
    return {
      ...detalle,
      fechaVencimiento: this.funcionesDatos.convertirFechaDesdeBackend(detalle.fechaVencimiento) as any,
      fechaPagado: this.funcionesDatos.convertirFechaDesdeBackend(detalle.fechaPagado) as any,
      fechaRegistro: this.funcionesDatos.convertirFechaDesdeBackend(detalle.fechaRegistro) as any,
    };
  }

  private obtenerFechaOrdenCuota(detalle: DetallePrestamo): number {
    return this.funcionesDatos.convertirFechaDesdeBackend(detalle.fechaVencimiento)?.getTime() || Number.MAX_SAFE_INTEGER;
  }

  private redondear(valor: number): number {
    return Math.round((Number(valor) || 0) * 100) / 100;
  }

  private parsearMontoEntrada(valor: string | number | null | undefined): number {
    if (valor === null || valor === undefined) return 0;
    if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;

    const texto = String(valor).trim();
    if (!texto) return 0;

    const normalizado = texto.replace(/\s+/g, '');
    const ultimoPunto = normalizado.lastIndexOf('.');
    const ultimaComa = normalizado.lastIndexOf(',');
    let canonical = normalizado;

    if (ultimoPunto > -1 && ultimaComa > -1) {
      const separadorDecimal = ultimoPunto > ultimaComa ? '.' : ',';
      const separadorMiles = separadorDecimal === '.' ? ',' : '.';
      canonical = canonical.split(separadorMiles).join('');
      if (separadorDecimal === ',') canonical = canonical.replace(',', '.');
    } else if (ultimaComa > -1) {
      canonical = canonical.replace(',', '.');
    }

    const numero = Number(canonical);
    return Number.isFinite(numero) ? numero : 0;
  }

  private formatearMontoDosDecimales(valor: number): string {
    return this.redondear(valor).toFixed(2).replace('.', ',');
  }
}

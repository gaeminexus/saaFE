import { Component, OnInit, signal, ViewChild, AfterViewInit, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { mensajeDeError } from '../../../../../../shared/utils/mensaje-error.util';
import { CargaArchivo } from '../../../../model/carga-archivo';
import { DetalleCargaArchivo } from '../../../../model/detalle-carga-archivo';
import { ParticipeXCargaArchivo } from '../../../../model/participe-x-carga-archivo';
import { CargaArchivoService } from '../../../../service/carga-archivo.service';
import { DetalleCargaArchivoService } from '../../../../service/detalle-carga-archivo.service';
import { ParticipeXCargaArchivoService } from '../../../../service/participe-x-carga-archivo.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Filial } from '../../../../model/filial';
import { DatosBusqueda } from '../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { DetalleRubroService } from '../../../../../../shared/services/detalle-rubro.service';
import { DetalleRubro } from '../../../../../../shared/model/detalle-rubro';
import { NovedadCargaService } from '../../../../service/novedad-carga.service';
import { NovedadCarga, NovedadAgrupada } from '../../../../model/novedad-carga';
import { ConfirmDialogComponent } from '../../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { CoincidenciasEntidadDialogComponent } from '../../../../dialog/coincidencias-entidad-dialog/coincidencias-entidad-dialog.component';
import { ServiciosAsoprepService } from '../../../../../asoprep/service/servicios-asoprep.service';
import { EntidadService } from '../../../../service/entidad.service';
import { Entidad } from '../../../../model/entidad';
import { Prestamo } from '../../../../model/prestamo';
import { DetallePrestamo } from '../../../../model/detalle-prestamo';
import {
  CodigoEstadoCuota,
  obtenerCodigoEstadoCuota as leerCodigoEstadoCuota,
  obtenerNombreEstadoCuota,
} from '../../../../model/estado-cuota-prestamo';
import {
  AfectacionValoresParticipeCarga,
  OpcionAporteExcedente,
} from '../../../../model/afectacion-valores-participe-carga';
import { ExportService } from '../../../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../../../shared/services/funciones-datos.service';
import { AppStateService } from '../../../../../../shared/services/app-state.service';
import { UsuarioService } from '../../../../../../shared/services/usuario.service';
import { NovedadParticipeCargaService } from '../../../../service/novedad-participe-carga.service';
import { PrestamoService } from '../../../../service/prestamo.service';
import { DetallePrestamoService } from '../../../../service/detalle-prestamo.service';
import { PagoPrestamoService } from '../../../../service/pago-prestamo.service';
import { ComponentesPagados, SaldoPrestamoService } from '../../../../service/saldo-prestamo.service';
import { EstadoPrestamoOperativo } from '../../../../model/pagos/catalogos-pago';
import { AfectacionValoresParticipeCargaService } from '../../../../service/afectacion-valores-participe-carga.service';
import { NovedadParticipeCarga } from '../../../../model/novedad-participe-carga';
import { TopeAfectacionManual } from '../../../../model/tope-afectacion-manual';
import { PrevueloAfectacionCarga } from '../../../../model/prevuelo-afectacion';
import { Usuario } from '../../../../../../shared/model/usuario';
import { forkJoin, of, catchError, map } from 'rxjs';
import { AfectacionFinancieraCuotasDialogComponent } from '../../../../dialog/afectacion-financiera-cuotas-dialog/afectacion-financiera-cuotas-dialog.component';
import { ProcesoArchivoErrorDialogComponent } from '../../../../dialog/archivos-petro/proceso-archivo-error-dialog/proceso-archivo-error-dialog.component';

const RUBRO_ESTADOS_CARGA = 166;
const RUBRO_NOVEDADES_CARGA = 169;
const OK = 0;
const PARTICIPE_NO_ENCONTRADO = 1;
const CODIGO_ROL_DUPLICADO = 2;
const NOMBRE_ENTIDAD_DUPLICADO = 3;


interface Mes {
  valor: number;
  nombre: string;
}

interface AporteAgrupado {
  codigoAporte: string;
  nombreAporte: string;
  totalParticipes: number;
  totales: {
    saldoActual: number;
    interesAnual: number;
    valorSeguro: number;
    totalDescontar: number;
    capitalDescontado: number;
    interesDescontado: number;
    seguroDescontado: number;
    totalDescontado: number;
    capitalNoDescontado: number;
    interesNoDescontado: number;
    desgravamenNoDescontado: number;
  };
  participes: MatTableDataSource<ParticipeXCargaArchivo>;
}

interface PrestamoAfectable {
  prestamo: Prestamo;
  cuotas: DetallePrestamo[];
}

/**
 * Préstamo cuyas cuotas o pagos NO se pudieron cargar al armar la lista de afectables — a
 * diferencia de un préstamo que sí cargó pero no tiene cuotas pendientes, este es un fallo de
 * consulta, no un dato real. Sin esto, los dos casos se veían idénticos en pantalla: la lista
 * simplemente no incluía el préstamo, sin ningún aviso (caso medido 2026-09-01, partícipe 401,
 * préstamo 7991 — EN MORA con 47 cuotas pendientes, invisible en el diálogo de afectación).
 */
interface PrestamoErrorCarga {
  prestamo: Prestamo;
  motivo: string;
}

/** Resultado de cargar un préstamo del listado de afectables — ver `PrestamoErrorCarga`. */
interface ResultadoCargaPrestamo {
  item: PrestamoAfectable;
  pagosPorCuota: Record<number, ComponentesPagados>;
  cargaFallida: boolean;
  /** Solo con `cargaFallida: true` — distingue si falló la consulta de cuotas o la de pagos. */
  motivo?: string;
}

@Component({
  selector: 'app-detalle-consulta-carga.component',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './detalle-consulta-carga.component.html',
  styleUrl: './detalle-consulta-carga.component.scss'
})
export class DetalleConsultaCargaComponent implements OnInit, AfterViewInit {
  @ViewChildren(MatSort) sorts!: QueryList<MatSort>;

  // Datos de la carga
  cargaArchivo: CargaArchivo | null = null;
  detalles: DetalleCargaArchivo[] = [];
  aporteAgrupados: AporteAgrupado[] = [];

  // Datos de filtros (solo lectura)
  anioSeleccionado: number | null = null;
  mesSeleccionado: number | null = null;
  filialSeleccionada: Filial | null = null;
  nombreArchivo: string = '';

  // Combos (solo display)
  anios: number[] = [];
  meses: Mes[] = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' }
  ];

  // Totales generales
  totalRegistros: number = 0;
  totalesGenerales: {
    saldoActual: number;
    interesAnual: number;
    valorSeguro: number;
    totalDescontar: number;
    capitalDescontado: number;
    interesDescontado: number;
    seguroDescontado: number;
    totalDescontado: number;
    capitalNoDescontado: number;
    interesNoDescontado: number;
    desgravamenNoDescontado: number;
  } = {
    saldoActual: 0,
    interesAnual: 0,
    valorSeguro: 0,
    totalDescontar: 0,
    capitalDescontado: 0,
    interesDescontado: 0,
    seguroDescontado: 0,
    totalDescontado: 0,
    capitalNoDescontado: 0,
    interesNoDescontado: 0,
    desgravamenNoDescontado: 0
  };

  displayedColumns: string[] = [
    'codigo', 'nombre', 'plazoInicial', 'saldoActual', 'mesesPlazo',
    'interesAnual', 'valorSeguro', 'montoDescontar', 'capitalDescontado',
    'interesDescontado', 'seguroDescontado', 'totalDescontado',
    'capitalNoDescontado', 'interesNoDescontado', 'desgravamenNoDescontado'
  ];

  // Loading state
  isLoading: boolean = false;

  // Estados (Rubro 166)
  estadosCatalogo = signal<DetalleRubro[]>([]);
  estadoActual = signal<DetalleRubro | null>(null);

  // Novedades (Rubro 169)
  catalogoNovedades = signal<NovedadCarga[]>([]);
  descripcionesNovedadPorCodigo = signal<Record<number, string>>({});
  novedadesAgrupadas = signal<NovedadAgrupada[]>([]);
  novedadesFiltradas: NovedadAgrupada[] = [];
  tabNovedadSeleccionado = 0;
  expandedNovedad = signal<number | null>(null);
  loadingNovedad = signal<number | null>(null);

  // Paginación de novedades
  pageSize = 10;
  pageIndexMap = new Map<number, number>(); // codigo novedad -> pageIndex
  pageSizeOptions = [5, 10, 20, 50];

  // Control de secciones visibles
  mostrarResumen = signal<boolean>(false);
  mostrarNovedades = signal<boolean>(false);
  mostrarProcesar = signal<boolean>(false);
  archivoYaProcesado = signal<boolean>(false);

  // Signals para novedades de descuentos
  novedadesDescuentos = signal<NovedadParticipeCarga[]>([]);
  isLoadingNovedadesDescuentos = signal<boolean>(false);
  filtroTipoNovedadSeleccionado = signal<number | 'TODOS'>('TODOS');
  private registrosParticipesCarga: ParticipeXCargaArchivo[] = [];
  private novedadesDescuentosCargadas = false;
  novedadFinancieraSeleccionada = signal<NovedadParticipeCarga | null>(null);
  prestamosAfectables = signal<PrestamoAfectable[]>([]);
  afectacionesRegistradas = signal<AfectacionValoresParticipeCarga[]>([]);
  valoresAfectarEditados = signal<Record<number, number>>({});
  /**
   * Lo realmente cobrado a cada cuota (CRD.PGPR), para reconstruir el saldo pendiente real —
   * ver `getValorMaximoAfectarCuota()`. `DetallePrestamo.saldo` (DTPRSLDO) NO sirve para esto: en
   * los créditos migrados de Petrocomercial viene en 0 aunque la cuota no tenga ningún pago
   * (mismo hallazgo documentado en `cobros-personales.component.ts`, que es de donde sale este
   * cálculo — `SaldoPrestamoService.saldoPendienteDe()`). Verificado 2026-08-31 tras el pedido del
   * usuario de que una cuota PARCIAL solo deje asignar su saldo, no su valor total.
   */
  pagosPorCuotaAfectacion = signal<Record<number, ComponentesPagados>>({});
  /**
   * Préstamos que pasaron el filtro de estado pero cuyas cuotas/pagos no se pudieron consultar
   * (ver `PrestamoErrorCarga`). Informativo, como `deudaConsultaFallida` en devolución de aportes:
   * no bloquea nada, solo evita que un fallo de red se lea igual que "no tiene cuotas pendientes".
   */
  erroresCargaPrestamos = signal<PrestamoErrorCarga[]>([]);
  detalleCuotaEnEdicion = signal<Set<number>>(new Set());
  isLoadingAfectacionFinanciera = signal<boolean>(false);
  isSavingAfectacionFinanciera = signal<boolean>(false);

  /**
   * Tope de afectación manual del partícipe en esta carga (`GET /asgn/topeAfectacion`,
   * `VALIDACION-TOPE-AFECTACION-MANUAL.md` §8) — de sólo lectura, informa mientras el operador
   * trabaja. NO bloquea nada acá: la validación real que impide procesar sigue siendo la del
   * backend al aplicar (§4 del plan) — esto es prevención, no la última línea de defensa.
   */
  topeAfectacionParticipe = signal<TopeAfectacionManual | null>(null);
  /** Distingue "no se pudo consultar" de "no hay tope que mostrar" — mismo patrón que `deudaConsultaFallida`. */
  topeAfectacionConsultaFallida = signal(false);

  /**
   * El prevuelo (`GET /asgn/prevueloAfectacion`, `VALIDACION-TOPE-AFECTACION-MANUAL.md` §9 y
   * §14): corre en seco, sobre toda la carga, la misma validación que bloquea al procesar — para
   * que el operador vea el descuadre MIENTRAS reparte, no recién al intentar procesar (o, para
   * los faltantes, no recién cuando la red final frena la carga después de 20+ minutos). Solo
   * lectura, no bloquea nada.
   *
   * Dos listas SEPARADAS (§14) — nunca combinadas en una con signo: `detalle` (excesos, hay que
   * BAJAR la afectación) y `detalleFaltante` (hay que SUBIRLA/completarla). Los mensajes de cada
   * fila son del backend tal cual, nunca redactados acá — deben leerse igual en pantalla y en el
   * error del proceso.
   *
   * ⛔ Alcance: solo ve exceso/faltante de afectaciones MANUALES. No proyecta lo que el flujo
   * automático vaya a aplicar encima del tope manual — el panel lo dice explícito en pantalla.
   */
  prevueloAfectacion = signal<PrevueloAfectacionCarga | null>(null);
  prevueloAfectacionCargando = signal(false);
  /** El endpoint puede no estar desplegado todavía — no se aproxima, se dice explícito. */
  prevueloAfectacionNoDisponible = signal(false);
  prevueloAfectacionPanelAbierto = signal(false);
  readonly prevueloAfectacionColumnas = ['codigoPetro', 'cedula', 'participe', 'disponible', 'afectado', 'exceso', 'avpc', 'mensaje'];
  /** Faltantes (§14) — misma forma que la de excesos, con `faltante` en vez de `exceso`. */
  readonly prevueloFaltanteColumnas = ['codigoPetro', 'cedula', 'participe', 'disponible', 'afectado', 'faltante', 'avpc', 'mensaje'];

  /**
   * Reparto automático por préstamo (motor único, pedido del usuario 2026-08-31): "aplicar todo el
   * sobrante" (checkbox) y "valor por préstamo" (input de cabecera) son la MISMA operación —
   * repartir un monto sobre las cuotas del préstamo, de la más antigua a la más nueva, cada cuota
   * hasta su pendiente y la última absorbiendo el resto — con distinta fuente para el monto. Ver
   * `aplicarRepartoAutomaticoPrestamo()`. El set solo controla el estado visual del checkbox: una
   * edición manual posterior de una cuota individual lo desmarca (ya no representa "todo aplicado").
   */
  prestamosConTodoAplicado = signal<Set<number>>(new Set());
  /** Texto del input "valor por préstamo" en la cabecera de cada tarjeta, por código de préstamo. */
  valorRepartoPrestamoTexto: Record<number, string> = {};

  // Excedente aplicado a un aporte (docs/crd/API-EXCEDENTE-PETRO-A-APORTES.md)
  opcionesAporteExcedente = signal<OpcionAporteExcedente[]>([]);
  /** Solo con `opcionesAporteExcedente()` vacío: "no hay tipos de aporte vigentes para <mes> <año>". */
  mensajeOpcionesAporteVacio = signal<string | null>(null);
  valoresAporteEditados = signal<Record<number, number>>({});
  aporteEnEdicion = signal<Set<number>>(new Set());
  isLoadingOpcionesAporte = signal<boolean>(false);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cargaArchivoService: CargaArchivoService,
    private detalleCargaArchivoService: DetalleCargaArchivoService,
    private participeXCargaArchivoService: ParticipeXCargaArchivoService,
    private detalleRubroService: DetalleRubroService,
    private novedadCargaService: NovedadCargaService,
    private serviciosAsoprepService: ServiciosAsoprepService,
    private entidadService: EntidadService,
    private prestamoService: PrestamoService,
    private detallePrestamoService: DetallePrestamoService,
    private pagoPrestamoService: PagoPrestamoService,
    private saldoPrestamo: SaldoPrestamoService,
    private exportService: ExportService,
    private funcionesDatos: FuncionesDatosService,
    private appStateService: AppStateService,
    private usuarioService: UsuarioService,
    private novedadParticipeCargaService: NovedadParticipeCargaService,
    private afectacionValoresParticipeCargaService: AfectacionValoresParticipeCargaService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    // Generar años del 2025 al 2035
    for (let anio = 2025; anio <= 2035; anio++) {
      this.anios.push(anio);
    }
  }

  ngAfterViewInit(): void {
    // Asignar sort a cada MatTableDataSource cuando estén disponibles
    this.sorts.changes.subscribe(() => {
      this.asignarSorts();
    });
    this.asignarSorts();
  }

  /**
   * Asigna el MatSort a cada MatTableDataSource de los aportes
   */
  private asignarSorts(): void {
    const sortsArray = this.sorts.toArray();
    this.aporteAgrupados.forEach((aporte, index) => {
      if (sortsArray[index]) {
        aporte.participes.sort = sortsArray[index];
      }
    });
  }

  ngOnInit(): void {
    // Verificar si los DetalleRubros ya están cargados en memoria
    const detallesEnMemoria = this.detalleRubroService.getDetalles();

    if (detallesEnMemoria.length > 0) {
      // ✅ Los datos ya están cargados, usar directamente
      this.inicializarComponente();
    } else {
      // ⚠️ Los datos no están cargados, cargar desde backend
      this.detalleRubroService.inicializar().subscribe({
        next: (detalles) => {
          this.inicializarComponente();
        },
        error: (error) => {
          this.snackBar.open('Error al cargar datos del sistema', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  /**
   * Inicializa el componente una vez que los rubros están disponibles
   */
  private inicializarComponente(): void {
    // Cargar catálogos (acceso SÍNCRONO desde caché)
    this.cargarCatalogoEstados();
    this.cargarCatalogoNovedades();

    // Obtener ID de la carga y cargar datos
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.cargarDatos(parseInt(id, 10));
    } else {
      this.snackBar.open('No se proporcionó ID de carga', 'Cerrar', { duration: 3000 });
      this.volverAtras();
    }
  }

  /**
   * Carga todos los datos de la carga de archivo
   */
  private cargarDatos(idCarga: number): void {
    this.isLoading = true;

    // Primero obtener la carga archivo principal
    this.cargaArchivoService.getById(idCarga.toString()).subscribe({
      next: (carga: any) => {
        if (!carga) {
          this.snackBar.open('No se encontró la carga de archivo', 'Cerrar', { duration: 3000 });
          this.volverAtras();
          return;
        }

        this.cargaArchivo = carga;
        this.anioSeleccionado = carga.anioAfectacion;
        this.mesSeleccionado = carga.mesAfectacion;
        this.filialSeleccionada = carga.filial;
        this.nombreArchivo = carga.nombre;

        // Determinar qué secciones mostrar según el estado
        const codigoEstado = carga.codigoEstado || '1';
        this.determinarSeccionesVisibles(codigoEstado);

        // Buscar el estado actual en el catálogo
        const estadoEncontrado = this.estadosCatalogo().find(e => e.codigo === codigoEstado);
        this.estadoActual.set(estadoEncontrado || null);

        // Copiar totales desde la carga
        this.totalesGenerales = {
          saldoActual: carga.totalSaldoActual || 0,
          interesAnual: carga.totalInteresAnual || 0,
          valorSeguro: carga.totalValorSeguro || 0,
          totalDescontar: carga.totalDescontar || 0,
          capitalDescontado: carga.totalCapitalDescontado || 0,
          interesDescontado: carga.totalInteresDescontado || 0,
          seguroDescontado: carga.totalSeguroDescontado || 0,
          totalDescontado: carga.totalDescontado || 0,
          capitalNoDescontado: carga.totalCapitalNoDescontado || 0,
          interesNoDescontado: carga.totalInteresNoDescontado || 0,
          desgravamenNoDescontado: carga.totalDesgravamenNoDescontado || 0
        };

        // Cargar detalles
        this.cargarDetalles(idCarga);
        this.cargarConfirmadaPetro(idCarga);
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open('Error al cargar datos de la carga', 'Cerrar', { duration: 3000 });
        this.volverAtras();
      }
    });
  }

  /**
   * ¿Ya se hizo el paso 1 del cobro de Petro (confirmación de recepción)? La confirmación en sí
   * se mueve a la Bandeja de Contabilidad (docs/crd/API-COBROS-APROBACION-CONTABILIDAD.md §5.1) —
   * acá solo se necesita SABER si ya está confirmada, para seguir bloqueando "Procesar Archivo"
   * (paso 2) hasta que lo esté. Consulta liviana, no reimplementa el paso 1 completo.
   */
  confirmadaPetro = signal(false);

  private cargarConfirmadaPetro(idCarga: number): void {
    this.serviciosAsoprepService.obtenerTransferencias(idCarga).subscribe({
      next: (data) => this.confirmadaPetro.set(data?.confirmada ?? false),
      error: () => this.confirmadaPetro.set(false),
    });
  }

  /**
   * Carga los detalles de la carga archivo
   */
  private cargarDetalles(idCarga: number): void {
    const criterioArray: DatosBusqueda[] = [];
    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'cargaArchivo',
      'codigo',
      idCarga.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterioArray.push(criterio);

    this.detalleCargaArchivoService.selectByCriteria(criterioArray).subscribe({
      next: (detalles: any) => {
        if (!detalles || (Array.isArray(detalles) && detalles.length === 0)) {
          this.isLoading = false;
          this.snackBar.open('No se encontraron detalles para esta carga', 'Cerrar', { duration: 3000 });
          return;
        }

        this.detalles = Array.isArray(detalles) ? detalles : [detalles];

        // Cargar partícipes para cada detalle
        this.cargarParticipes();
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open('Error al cargar detalles de la carga', 'Cerrar', { duration: 3000 });
      }
    });
  }

  /**
   * Carga los partícipes para todos los detalles
   */
  private cargarParticipes(): void {
    if (this.detalles.length === 0) {
      this.isLoading = false;
      return;
    }

    // Crear un observable por cada detalle para buscar sus partícipes
    const observables = this.detalles.map(detalle => {
      const criterioArray: DatosBusqueda[] = [];
      const criterio = new DatosBusqueda();

      criterio.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'detalleCargaArchivo',
        'codigo',
        detalle.codigo.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterioArray.push(criterio);

      return this.participeXCargaArchivoService.selectByCriteria(criterioArray);
    });

    // Ejecutar todas las búsquedas en paralelo
    forkJoin(observables).subscribe({
      next: (resultados: any[]) => {
        this.isLoading = false;

        // Combinar todos los resultados en un solo array
        const todosLosParticipes: ParticipeXCargaArchivo[] = [];

        resultados.forEach(participes => {
          if (participes) {
            const participesArray = Array.isArray(participes) ? participes : [participes];
            todosLosParticipes.push(...participesArray);
          }
        });

        if (todosLosParticipes.length === 0) {
          this.snackBar.open('No se encontraron partícipes para esta carga', 'Cerrar', { duration: 3000 });
          return;
        }

        this.registrosParticipesCarga = todosLosParticipes;
        this.novedadesDescuentosCargadas = false;
        this.novedadesDescuentos.set([]);

        // Agrupar partícipes por detalle (producto/aporte)
        this.agruparDatosPorAporte(todosLosParticipes);

        // Procesar novedades
        this.procesarNovedades(todosLosParticipes);
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open('Error al cargar partícipes', 'Cerrar', { duration: 3000 });
      }
    });
  }

  /**
   * Agrupa los partícipes por aporte/producto
   */
  private agruparDatosPorAporte(participes: ParticipeXCargaArchivo[]): void {
    const aportesMap = new Map<string, AporteAgrupado>();

    participes.forEach(participe => {
      const detalle = participe.detalleCargaArchivo;
      const codigoAporte = detalle.codigoPetroProducto;

      if (!aportesMap.has(codigoAporte)) {
        // Crear nuevo grupo de aporte
        aportesMap.set(codigoAporte, {
          codigoAporte: codigoAporte,
          nombreAporte: detalle.nombreProductoPetro,
          totalParticipes: 0,
          totales: {
            saldoActual: 0,
            interesAnual: 0,
            valorSeguro: 0,
            totalDescontar: 0,
            capitalDescontado: 0,
            interesDescontado: 0,
            seguroDescontado: 0,
            totalDescontado: 0,
            capitalNoDescontado: 0,
            interesNoDescontado: 0,
            desgravamenNoDescontado: 0
          },
          participes: new MatTableDataSource<ParticipeXCargaArchivo>([])
        });
      }

      const aporte = aportesMap.get(codigoAporte)!;
      aporte.participes.data.push(participe);
      aporte.totalParticipes++;

      // Acumular totales
      aporte.totales.saldoActual += participe.saldoActual || 0;
      aporte.totales.interesAnual += participe.interesAnual || 0;
      aporte.totales.valorSeguro += participe.valorSeguro || 0;
      aporte.totales.totalDescontar += participe.montoDescontar || 0;
      aporte.totales.capitalDescontado += participe.capitalDescontado || 0;
      aporte.totales.interesDescontado += participe.interesDescontado || 0;
      aporte.totales.seguroDescontado += participe.seguroDescontado || 0;
      aporte.totales.totalDescontado += participe.totalDescontado || 0;
      aporte.totales.capitalNoDescontado += participe.capitalNoDescontado || 0;
      aporte.totales.interesNoDescontado += participe.interesNoDescontado || 0;
      aporte.totales.desgravamenNoDescontado += participe.desgravamenNoDescontado || 0;
    });

    this.aporteAgrupados = Array.from(aportesMap.values());
    this.totalRegistros = participes.length;
  }

  /**
   * Obtiene el nombre de la filial
   */
  getFilialNombre(): string {
    return this.filialSeleccionada?.nombre || 'N/A';
  }

  /**
   * Descarga el archivo desde el servidor
   */
  descargarArchivo(): void {
    if (!this.cargaArchivo || !this.cargaArchivo.rutaArchivo) {
      this.snackBar.open('No hay archivo disponible para descargar', 'Cerrar', { duration: 3000 });
      return;
    }

    // Aquí implementarías la lógica para descargar el archivo
    // Por ahora mostramos un mensaje
    this.snackBar.open('Funcionalidad de descarga en construcción', 'Cerrar', { duration: 3000 });

    // TODO: Implementar descarga real del archivo
    // window.open(rutaDescarga, '_blank');
  }

  // ==================== MÓDULO DE ESTADOS ====================

  /**
   * Cargar catálogo de estados desde DetalleRubro con código padre 166
   */
  private cargarCatalogoEstados(): void {
    const detalles = this.detalleRubroService.getDetallesByParent(RUBRO_ESTADOS_CARGA);
    this.estadosCatalogo.set(detalles || []);
  }

  /**
   * Determinar qué secciones mostrar según el estado de la carga
   */
  private determinarSeccionesVisibles(codigoEstado: string): void {
    // Estado 1 = todas las secciones visibles
    if (codigoEstado === '1') {
      this.mostrarResumen.set(true);
      this.mostrarNovedades.set(true);
      this.mostrarProcesar.set(true);
      this.archivoYaProcesado.set(false);
    } else {
      // Por ahora, otros estados también muestran todo
      // TODO: Implementar lógica específica para otros estados
      this.mostrarResumen.set(true);
      this.mostrarNovedades.set(true);
      this.mostrarProcesar.set(true);
      this.archivoYaProcesado.set(false);
    }
  }

  // ==================== MÓDULO DE NOVEDADES ====================

  /**
   * Cargar catálogo de novedades desde DetalleRubro con código padre 169
   */
  private cargarCatalogoNovedades(): void {
    const detalles = this.detalleRubroService.getDetallesByParent(RUBRO_NOVEDADES_CARGA);


    if (!detalles || detalles.length === 0) {
      // Intentar cargar todos los detalles para debug
      const todosLosDetalles = this.detalleRubroService.getDetalles();

      this.catalogoNovedades.set([]);
      this.descripcionesNovedadPorCodigo.set({});

      return;
    }

    const descripcionesPorCodigo: Record<number, string> = {};
    detalles.forEach((detalle) => {
      const descripcion = this.detalleRubroService.getDescripcionByParentAndAlterno(
        RUBRO_NOVEDADES_CARGA,
        detalle.codigoAlterno
      ) || detalle.descripcion || 'Sin descripción';

      descripcionesPorCodigo[detalle.codigoAlterno] = descripcion;
    });

    const catalogo: NovedadCarga[] = detalles.map(detalle => ({
      codigo: detalle.codigoAlterno,
      descripcion: descripcionesPorCodigo[detalle.codigoAlterno] || 'Sin descripción',
      tipo: detalle.codigoAlterno <= 3 ? 'PARTICIPE' : 'DESCUENTO',
      severidad: this.mapearSeveridad(detalle.codigoAlterno),
      icono: this.mapearIcono(detalle.codigoAlterno),
      colorChip: this.mapearColor(detalle.codigoAlterno)
    }));

    this.catalogoNovedades.set(catalogo);
    this.descripcionesNovedadPorCodigo.set(descripcionesPorCodigo);
  }

  /**
   * Procesar novedades después de cargar datos desde backend
   */
  private procesarNovedades(todosLosRegistros: ParticipeXCargaArchivo[]): void {
    const catalogo = this.catalogoNovedades();

    if (catalogo.length === 0) {
      this.cargarCatalogoNovedades();

      // Verificar si se cargó
      const catalogoActualizado = this.catalogoNovedades();
      if (catalogoActualizado.length === 0) {
        return;
      }
    }

    const agrupadas = this.novedadCargaService.agruparPorNovedad(
      todosLosRegistros,
      this.catalogoNovedades()
    );


    this.novedadesAgrupadas.set(agrupadas);
    this.onTabNovedadChange(0); // Inicializar con tab de Partícipes

  }

  /**
   * Toggle expansión de novedad
   */
  toggleExpansion(codigo: number): void {
    const isExpanding = this.expandedNovedad() !== codigo;

    if (isExpanding) {
      // Mostrar loading
      this.loadingNovedad.set(codigo);

      // Simular carga de datos (en caso de que sea costoso renderizar)
      setTimeout(() => {
        this.expandedNovedad.set(codigo);
        this.loadingNovedad.set(null);

        // Inicializar pageIndex si no existe
        if (!this.pageIndexMap.has(codigo)) {
          this.pageIndexMap.set(codigo, 0);
        }
      }, 100);
    } else {
      // Colapsar
      this.expandedNovedad.set(null);
    }
  }

  /**
   * Obtener registros paginados de una novedad
   */
  getPagedRegistros(registros: any[], codigoNovedad: number): any[] {
    const pageIndex = this.pageIndexMap.get(codigoNovedad) || 0;
    const start = pageIndex * this.pageSize;
    const end = start + this.pageSize;
    return registros.slice(start, end);
  }

  /**
   * Cambiar página de una novedad
   */
  onPageChange(event: any, codigoNovedad: number): void {
    this.pageIndexMap.set(codigoNovedad, event.pageIndex);
  }

  /**
   * Obtener índice de página actual
   */
  getPageIndex(codigoNovedad: number): number {
    return this.pageIndexMap.get(codigoNovedad) || 0;
  }

  /**
   * Cambiar tab de novedades
   */
  onTabNovedadChange(index: number): void {
    this.tabNovedadSeleccionado = index;
    this.novedadesFiltradas = this.novedadesAgrupadas().filter(n => n.novedad.tipo === 'PARTICIPE');

    if (index === 1 && !this.novedadesDescuentosCargadas && !this.isLoadingNovedadesDescuentos()) {
      this.novedadesDescuentosCargadas = true;
      this.cargarNovedadesDescuentos(this.registrosParticipesCarga);
    }
  }

  /**
   * Contar novedades por tipo
   */
  contarNovedades(tipo: 'PARTICIPE'): number {
    return this.novedadesAgrupadas()
      .filter(n => n.novedad.tipo === tipo)
      .reduce((sum, n) => sum + n.total, 0);
  }

  /**
   * Corregir registro según tipo de novedad
   */
  corregirRegistro(registro: ParticipeXCargaArchivo): void {
    const novedad = registro.novedadesCarga;

    if (novedad === PARTICIPE_NO_ENCONTRADO) {
      // PARTICIPE NO ENCONTRADO - Mostrar diálogo de coincidencias
      this.mostrarCoincidencias(registro);
    } else if (novedad === CODIGO_ROL_DUPLICADO) {
      this.corregirDuplicado(registro);
    } else if (novedad === NOMBRE_ENTIDAD_DUPLICADO) {
      // NOMBRE DUPLICADO - Mostrar coincidencias por Petro35
      this.mostrarCoincidenciasPetro35(registro);
    } else {
      this.snackBar.open(
        `⚠ Corrección para novedad ${novedad} no implementada aún`,
        'Cerrar',
        { duration: 3000 }
      );
    }
  }

  /**
   * Mostrar diálogo de coincidencias para partícipe no encontrado
   */
  private mostrarCoincidencias(registro: ParticipeXCargaArchivo): void {
    const dialogRef = this.dialog.open(CoincidenciasEntidadDialogComponent, {
      width: '800px',
      data: {
        nombreBusqueda: registro.nombre,
        registroOriginal: registro
      }
    });

    dialogRef.afterClosed().subscribe(entidadSeleccionada => {
      if (entidadSeleccionada) {

        // Llamar al servicio para actualizar el código Petro con la entidad seleccionada
        this.isLoading = true;
        this.serviciosAsoprepService.actualizaCodigoPetroEntidad(
          registro.codigoPetro,
          registro.codigo!,
          entidadSeleccionada.codigo
        ).subscribe({
          next: (participeActualizado: ParticipeXCargaArchivo | null) => {
            if (participeActualizado) {
              // Actualizar el registro en la lista local
              this.actualizarRegistroEnNovedades(registro, participeActualizado);

              this.snackBar.open(
                `✓ Entidad "${entidadSeleccionada.razonSocial}" asociada correctamente`,
                'Cerrar',
                { duration: 3000 }
              );
            }

            this.isLoading = false;
          },
          error: (error: any) => {
            this.snackBar.open(
              '❌ Error al asociar la entidad',
              'Cerrar',
              { duration: 5000 }
            );
            this.isLoading = false;
          }
        });
      }
    });
  }

  /**
   * Actualizar registro en novedades después de corrección
   */
  private actualizarRegistroEnNovedades(
    registroOriginal: ParticipeXCargaArchivo,
    registroActualizado: ParticipeXCargaArchivo
  ): void {
    // Obtener todas las novedades agrupadas actuales
    const novedadesActuales = this.novedadesAgrupadas();

    // Buscar la novedad que contiene el registro
    const novedadConRegistro = novedadesActuales.find(novedad =>
      novedad.registros.some(r => r.codigo === registroOriginal.codigo)
    );

    if (!novedadConRegistro) {
      return;
    }


    // Remover el registro de la novedad actual
    const registrosFiltrados = novedadConRegistro.registros.filter(
      r => r.codigo !== registroOriginal.codigo
    );

    // Actualizar el total de la novedad
    novedadConRegistro.registros = registrosFiltrados;
    novedadConRegistro.total = registrosFiltrados.length;


    // Buscar o crear la novedad "Sin novedad" (código 0)
    let novedadSinNovedad = novedadesActuales.find(n => n.novedad.codigo === 0);

    if (!novedadSinNovedad) {
      // Crear la novedad "Sin novedad" si no existe
      const catalogoNovedad = this.catalogoNovedades().find(c => c.codigo === 0);
      if (catalogoNovedad) {
        novedadSinNovedad = {
          novedad: catalogoNovedad,
          total: 0,
          registros: []
        };
        novedadesActuales.push(novedadSinNovedad);
      }
    }

    // Agregar el registro actualizado a "Sin novedad"
    if (novedadSinNovedad) {
      novedadSinNovedad.registros.push(registroActualizado);
      novedadSinNovedad.total = novedadSinNovedad.registros.length;
    }

    // Filtrar novedades vacías
    const novedadesFiltradas = novedadesActuales.filter(n => n.total > 0);

    // Actualizar el signal de novedades agrupadas
    this.novedadesAgrupadas.set(novedadesFiltradas);

    // Refrescar las novedades filtradas del tab actual
    this.onTabNovedadChange(this.tabNovedadSeleccionado);

  }

  /**
   * Corregir partícipe no encontrado (Novedad 1)
   */
  private corregirParticipeNoEncontrado(registro: ParticipeXCargaArchivo): void {
    this.novedadCargaService.buscarParticipesSimilares(
      registro.nombre,
      registro.codigoPetro
    ).subscribe({
      next: (similares) => {

        // TODO: Abrir dialog de selección
        this.snackBar.open(
          `✓ Encontrados ${similares.length} partícipes similares`,
          'Cerrar',
          { duration: 3000 }
        );
      },
      error: (error) => {
        this.snackBar.open(
          '❌ Error al buscar partícipes similares',
          'Cerrar',
          { duration: 3000 }
        );
      }
    });
  }

  /**
   * Corregir duplicado (Novedad 2)
   */
  private corregirDuplicado(registro: ParticipeXCargaArchivo): void {
    // TODO: Implementar lógica de duplicados
  }

  /**
   * Mapear código de novedad a severidad
   */
  private mapearSeveridad(codigo: number): 'success' | 'warning' | 'error' {
    if (codigo === 0) return 'success';
    if (codigo <= 2) return 'warning';
    return 'error';
  }

  /**
   * Mapear código de novedad a icono Material
   */
  private mapearIcono(codigo: number): string {
    const iconos: Record<number, string> = {
      0: 'check_circle',
      1: 'person_search',
      2: 'content_copy',
      3: 'error',
      4: 'payments',
      5: 'account_balance',
      6: 'receipt',
      7: 'warning',
      8: 'priority_high',
      18: 'history',
      19: 'content_copy',
      20: 'do_not_disturb_on',
      21: 'money_off',
      22: 'sync_problem',
      23: 'rule'
    };
    return iconos[codigo] || 'help';
  }

  /**
   * Mapear código de novedad a color de chip
   */
  private mapearColor(codigo: number): string {
    if (codigo === 0) return '#4caf50';
    if (codigo <= 2) return '#ff9800';
    return '#f44336';
  }

  /**
   * Procesar archivo - enviar al backend
   */
  procesarArchivo(): void {
    if (!this.cargaArchivo) {
      this.snackBar.open('No hay carga de archivo disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    // Validar que todas las novedades de PARTICIPE estén resueltas (código 0 = Sin novedad)
    // Las novedades de DESCUENTO son informativas y no bloquean el proceso
    const novedadesPendientes = this.novedadesAgrupadas().filter(
      novedad => novedad.novedad.tipo === 'PARTICIPE' && novedad.novedad.codigo !== 0 && novedad.total > 0
    );

    if (novedadesPendientes.length > 0) {
      const totalRegistrosPendientes = novedadesPendientes.reduce((sum, nov) => sum + nov.total, 0);
      this.snackBar.open(
        `⚠️ Debe resolver todas las novedades antes de procesar el archivo. Hay ${totalRegistrosPendientes} registro(s) pendiente(s).`,
        'Cerrar',
        { duration: 5000 }
      );
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: {
        title: 'Confirmar Procesamiento',
        message: '¿Está seguro de que desea procesar este archivo? Esta acción generará los registros definitivos en el sistema.',
        type: 'warning',
        confirmText: 'Procesar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.archivoYaProcesado.set(true);
        this.serviciosAsoprepService.aplicarPagosArchivoPetro(this.cargaArchivo!.codigo!).subscribe({
          next: () => {
            this.snackBar.open('Archivo procesado exitosamente. Los registros han sido generados en el sistema.', 'Cerrar', { duration: 5000 });
          },
          error: (err) => {
            this.archivoYaProcesado.set(false);
            const mensaje = mensajeDeError(err, 'Error al procesar el archivo');
            this.dialog.open(ProcesoArchivoErrorDialogComponent, {
              width: '760px',
              maxWidth: '95vw',
              maxHeight: '90vh',
              autoFocus: false,
              data: { idCarga: this.cargaArchivo!.codigo!, mensaje },
            });
          }
        });
      }
    });
  }

  /**
   * Vuelve a la pantalla anterior
   */
  volverAtras(): void {
    this.router.navigate(['/menucreditos/consulta-archivos-petro']);
  }

  /**
   * Filtra registros por tipo de total (campo específico con valor mayor a 0)
   */
  filtrarPorTotal(codigoAporte: string, campoFiltro: keyof AporteAgrupado['totales']): void {
    if (!this.cargaArchivo?.codigo) return;

    // Encontrar el aporte para verificar el valor del total
    const aporte = this.aporteAgrupados.find((a: AporteAgrupado) => a.codigoAporte === codigoAporte);
    if (!aporte) return;

    // Validar que el total no sea cero
    const valorTotal = aporte.totales[campoFiltro];
    if (valorTotal === 0) {
      this.snackBar.open(
        `El total de ${this.obtenerEtiquetaCampo(campoFiltro)} es cero. No hay registros que mostrar.`,
        'Cerrar',
        { duration: 3000 }
      );
      return;
    }

    // Obtener código del detalle desde el primer partícipe
    const codigoDetalleCarga = aporte.participes.data[0]?.detalleCargaArchivo?.codigo;
    if (!codigoDetalleCarga) {
      return;
    }

    // Guardar partícipes originales para restaurar en caso de error
    const participesOriginales = [...aporte.participes.data];

    // Limpiar partícipes para mostrar loading en el panel
    aporte.participes.data = [];

    const criterioArray: DatosBusqueda[] = [];

    // Filtro por código de detalle de carga
    let db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'detalleCargaArchivo',
      'codigo',
      codigoDetalleCarga.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterioArray.push(db);

    // Filtro por campo específico > 0
    // Nota: totalDescontar se mapea a montoDescontar en backend
    const campoBackend = campoFiltro === 'totalDescontar' ? 'montoDescontar' : campoFiltro;
    db = new DatosBusqueda();
    db.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.DOUBLE,
      campoBackend,
      '0',
      TipoComandosBusqueda.MAYOR
    );
    criterioArray.push(db);

    // Ordenar por nombre
    db = new DatosBusqueda();
    db.orderBy('nombre');
    db.setTipoOrden(DatosBusqueda.ORDER_ASC);
    criterioArray.push(db);

    this.participeXCargaArchivoService.selectByCriteria(criterioArray).subscribe({
      next: (registros) => {
        if (registros && registros.length > 0) {
          this.mostrarRegistrosFiltrados(registros, codigoAporte, campoFiltro);
        } else {
          // Restaurar partícipes originales
          aporte.participes.data = participesOriginales;
          this.snackBar.open('No se encontraron registros para este filtro', 'Cerrar', {
            duration: 3000
          });
        }
      },
      error: (error) => {
        // Restaurar partícipes originales en caso de error
        aporte.participes.data = participesOriginales;
        this.snackBar.open('Error al filtrar registros', 'Cerrar', { duration: 3000 });
      }
    });
  }

  /**
   * Muestra los registros filtrados (puedes personalizarlo según necesites)
   */
  private mostrarRegistrosFiltrados(
    registros: ParticipeXCargaArchivo[],
    codigoAporte: string,
    campo: keyof AporteAgrupado['totales']
  ): void {
    // Actualizar la tabla del acordeón correspondiente con los registros filtrados
    const aporte = this.aporteAgrupados.find((a: AporteAgrupado) => a.codigoAporte === codigoAporte);
    if (aporte) {
      aporte.participes.data = registros;
    }

    this.snackBar.open(
      `Se encontraron ${registros.length} registro(s) con ${this.obtenerEtiquetaCampo(campo)} > 0`,
      'Cerrar',
      { duration: 3000 }
    );
  }

  /**
   * Obtiene la etiqueta legible del campo
   */
  private obtenerEtiquetaCampo(campo: keyof AporteAgrupado['totales']): string {
    const etiquetas: Record<keyof AporteAgrupado['totales'], string> = {
      saldoActual: 'Saldo Actual',
      interesAnual: 'Interés Anual',
      valorSeguro: 'Valor Seguro',
      totalDescontar: 'Total a Descontar',
      capitalDescontado: 'Capital Descontado',
      interesDescontado: 'Interés Descontado',
      seguroDescontado: 'Seguro Descontado',
      totalDescontado: 'Total Descontado',
      capitalNoDescontado: 'Capital No Descontado',
      interesNoDescontado: 'Interés No Descontado',
      desgravamenNoDescontado: 'Desgravamen No Descontado'
    };
    return etiquetas[campo];
  }

  /**
   * Muestra el diálogo de coincidencias usando getByNombrePetro35
   * para novedad de NOMBRE DUPLICADO (código 3)
   */
  private mostrarCoincidenciasPetro35(registro: ParticipeXCargaArchivo): void {
    // Llamar al servicio getByNombrePetro35
    this.entidadService.getByNombrePetro35(registro.nombre).subscribe({
      next: (entidades: Entidad[] | null) => {
        if (!entidades || entidades.length === 0) {
          this.snackBar.open('No se encontraron coincidencias por nombre Petro35', 'Cerrar', {
            duration: 3000
          });
          return;
        }

        // Abrir el dialog con las entidades encontradas
        const dialogRef = this.dialog.open(CoincidenciasEntidadDialogComponent, {
          width: '800px',
          data: {
            nombreBusqueda: registro.nombre,
            registroOriginal: registro
          }
        });

        // Cargar manualmente las coincidencias en el diálogo
        dialogRef.componentInstance.coincidencias = entidades;
        dialogRef.componentInstance.isLoading = false;

        dialogRef.afterClosed().subscribe(entidadSeleccionada => {
          if (entidadSeleccionada) {
            this.isLoading = true;
            this.serviciosAsoprepService.actualizaCodigoPetroEntidad(
              registro.codigoPetro,
              registro.codigo!,
              entidadSeleccionada.codigo
            ).subscribe({
              next: (participeActualizado: ParticipeXCargaArchivo | null) => {
                if (participeActualizado) {
                  this.actualizarRegistroEnNovedades(registro, participeActualizado);
                  this.snackBar.open(
                    `✓ Entidad "${entidadSeleccionada.razonSocial}" asociada correctamente`,
                    'Cerrar',
                    { duration: 3000 }
                  );
                }
                this.isLoading = false;
              },
              error: (error: any) => {
                this.snackBar.open('❌ Error al asociar la entidad', 'Cerrar', { duration: 5000 });
                this.isLoading = false;
              }
            });
          }
        });
      },
      error: (error: any) => {
        this.snackBar.open('❌ Error al buscar coincidencias', 'Cerrar', { duration: 5000 });
      }
    });
  }

  /**
   * Exporta la tabla de un aporte específico a CSV
   */
  exportarAporteACSV(codigoAporte: string, event: Event): void {
    event.stopPropagation(); // Prevenir que se expanda/colapse el panel

    const aporte = this.aporteAgrupados.find(a => a.codigoAporte === codigoAporte);
    if (!aporte) {
      this.snackBar.open('No se encontró el aporte', 'Cerrar', { duration: 3000 });
      return;
    }

    const data = aporte.participes.data;
    if (data.length === 0) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const headers = [
      'Código',
      'Nombre',
      'Plazo Inicial',
      'Saldo Actual',
      'Meses Plazo',
      'Interés Anual',
      'Valor Seguro',
      'Monto a Descontar',
      'Capital Descontado',
      'Interés Descontado',
      'Seguro Descontado',
      'Total Descontado',
      'Capital No Descontado',
      'Interés No Descontado',
      'Desgravamen No Descontado'
    ];

    const dataKeys = [
      'codigoPetro',
      'nombre',
      'plazoInicial',
      'saldoActual',
      'mesesPlazo',
      'interesAnual',
      'valorSeguro',
      'montoDescontar',
      'capitalDescontado',
      'interesDescontado',
      'seguroDescontado',
      'totalDescontado',
      'capitalNoDescontado',
      'interesNoDescontado',
      'desgravamenNoDescontado'
    ];

    const fileName = `${aporte.nombreAporte}_${codigoAporte}`;

    this.exportService.exportToCSV(data, fileName, headers, dataKeys);
    this.snackBar.open(`Exportado ${data.length} registros a CSV`, 'Cerrar', { duration: 3000 });
  }

  /**
   * Exporta a CSV las novedades de descuentos filtradas
   */
  exportarNovedadesDescuentosACSV(): void {
    const data = this.novedadesDescuentosFiltradas;

    if (data.length === 0) {
      this.snackBar.open('No hay novedades de descuentos para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const rows = data.map((item) => ({
      codigoPetro: item.participeXCargaArchivo?.codigoPetro || '-',
      participe: item.participeXCargaArchivo?.nombre || '-',
      tipoNovedad: this.getDescripcionTipoNovedad(item.tipoNovedad),
      descripcion: item.descripcion || '-',
      codigoProducto: item.codigoProducto || '-',
      codigoPrestamo: item.codigoPrestamo || '-',
      idAsoprepPrestamo: item.idAsoprepPrestamo || '-',
      codigoCuota: item.codigoCuota || '-',
      montoEsperado: Number(item.montoEsperado || 0),
      montoRecibido: Number(item.montoRecibido || 0),
      montoDiferencia: Number(item.montoDiferencia || 0)
    }));

    const headers = [
      'Código Petro',
      'Partícipe',
      'Tipo Novedad',
      'Descripción',
      'Código Producto',
      'Código Préstamo',
      'ID ASOPREP',
      'Código Cuota',
      'Monto Esperado',
      'Monto Recibido',
      'Monto Diferencia'
    ];

    const dataKeys = [
      'codigoPetro',
      'participe',
      'tipoNovedad',
      'descripcion',
      'codigoProducto',
      'codigoPrestamo',
      'idAsoprepPrestamo',
      'codigoCuota',
      'montoEsperado',
      'montoRecibido',
      'montoDiferencia'
    ];

    const filtro = this.filtroTipoNovedadSeleccionado();
    const filtroTexto = filtro === 'TODOS' ? 'todos' : `tipo-${filtro}`;
    const fileName = `novedades_descuentos_carga_${this.cargaArchivo?.codigo || 'sin-id'}_${filtroTexto}`;

    this.exportService.exportToCSV(rows, fileName, headers, dataKeys);
    this.snackBar.open(`Exportadas ${rows.length} novedades de descuentos a CSV`, 'Cerrar', { duration: 3000 });
  }

  /**
   * Formatea una fecha para mostrar en template
   */
  formatearFecha(fecha: any): string {
    if (!fecha) return '-';

    // Usar el método centralizado del servicio compartido
    const fechaConvertida = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!fechaConvertida) return '-';

    // Formatear manualmente (DD-MM-YYYY / HH:mm)
    const dia = fechaConvertida.getDate().toString().padStart(2, '0');
    const mes = (fechaConvertida.getMonth() + 1).toString().padStart(2, '0');
    const anio = fechaConvertida.getFullYear();
    const hora = fechaConvertida.getHours().toString().padStart(2, '0');
    const minuto = fechaConvertida.getMinutes().toString().padStart(2, '0');

    return `${dia}-${mes}-${anio} / ${hora}:${minuto}`;
  }

  /**
   * @deprecated Usar funcionesDatos.convertirFechaDesdeBackend() en su lugar
   * Mantener por compatibilidad temporal
   */
  private convertirFecha(fecha: any): Date | null {
    return this.funcionesDatos.convertirFechaDesdeBackend(fecha);
  }

  /**
   * Cargar novedades de descuentos (NovedadParticipeCarga)
   */
  private cargarNovedadesDescuentos(registros: ParticipeXCargaArchivo[]): void {
    const registrosValidos = registros.filter(r => r.codigo !== undefined && r.codigo !== null);
    const codigoCargaArchivo = this.cargaArchivo?.codigo;

    if (registrosValidos.length === 0 || !codigoCargaArchivo) {
      this.novedadesDescuentos.set([]);
      return;
    }

    this.isLoadingNovedadesDescuentos.set(true);

    const registrosByCodigo = new Map<number, ParticipeXCargaArchivo>(
      registrosValidos.map(r => [r.codigo, r])
    );

    const criterios: DatosBusqueda[] = [];

    const dbCargaArchivo = new DatosBusqueda();
    dbCargaArchivo.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'codigoCargaArchivo',
      String(codigoCargaArchivo),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbCargaArchivo);

    const dbOrden = new DatosBusqueda();
    dbOrden.orderBy('tipoNovedad');
    dbOrden.setTipoOrden(DatosBusqueda.ORDER_ASC);
    criterios.push(dbOrden);

    this.novedadParticipeCargaService.selectByCriteria(criterios).pipe(
      map((novedades) => (novedades || []).map((novedad) => {
        const codigoParticipe = novedad.participeXCargaArchivo?.codigo;
        const participeCompleto = codigoParticipe ? registrosByCodigo.get(codigoParticipe) : undefined;

        return {
          ...novedad,
          participeXCargaArchivo: participeCompleto || novedad.participeXCargaArchivo
        } as NovedadParticipeCarga;
      })),
      catchError(() => of([] as NovedadParticipeCarga[]))
    ).subscribe({
      next: (novedades) => {
        const novedadesOrdenadas = novedades
          .filter((n) => (n.tipoNovedad || 0) > 3)
          .sort((a, b) => (a.tipoNovedad || 0) - (b.tipoNovedad || 0));

        this.novedadesDescuentos.set(novedadesOrdenadas);
        this.isLoadingNovedadesDescuentos.set(false);
      },
      error: (error) => {
        console.error('Error al cargar novedades de descuentos:', error);
        this.novedadesDescuentos.set([]);
        this.isLoadingNovedadesDescuentos.set(false);
      }
    });
  }

  /**
   * Obtener usuario actual con triple fallback
   */
  private obtenerUsuarioActual(): Usuario | null {
    // 1. Intentar desde UsuarioService (accede a memoria + localStorage)
    const usuarioService = this.usuarioService.getUsuarioLog();
    if (usuarioService && usuarioService.codigo) {
      return usuarioService;
    }

    // 2. Intentar desde AppStateService (memoria)
    const usuarioState = this.appStateService.getUsuario();
    if (usuarioState && usuarioState.codigo) {
      return usuarioState;
    }

    // 3. Fallback manual directo a localStorage
    const posiblesClavesUsuario = ['usuario', 'usuarioLog'];
    for (const clave of posiblesClavesUsuario) {
      const usuarioStr = localStorage.getItem(clave);
      if (!usuarioStr) {
        continue;
      }

      try {
        const usuario = JSON.parse(usuarioStr) as Usuario;
        if (usuario && usuario.codigo) {
          return usuario;
        }
      } catch (error) {
        console.error(`Error al parsear usuario desde localStorage (${clave}):`, error);
      }
    }

    // 4. Último recurso: construir desde datos fragmentarios
    const userName = localStorage.getItem('userName')?.trim();
    const idUsuario = localStorage.getItem('idUsuario');
    if (userName || idUsuario) {
      return {
        codigo: idUsuario ? Number(idUsuario) : 0,
        nombre: userName || ''
      } as Usuario;
    }

    return null;
  }

  /**
   * Mapear tipoNovedad a descripción legible
   */
  getDescripcionTipoNovedad(tipoNovedad: number | null | undefined): string {
    if (tipoNovedad === null || tipoNovedad === undefined) {
      return '-';
    }

    const codigoAlterno = Number(tipoNovedad);
    const descripcion = this.descripcionesNovedadPorCodigo()[codigoAlterno];

    if (descripcion && descripcion.trim().length > 0) {
      return descripcion;
    }

    return 'Sin descripción';
  }

  /**
   * Lo persistido de la novedad ABIERTA, tal como se cargó del backend (`afectacionesRegistradas`,
   * sembrado una vez por apertura/guardado en `cargarContextoAfectacionFinanciera` — no cambia con
   * cada tecla que el operador tipea, a diferencia de `totalValorAfectarActual`). Es el término que
   * hay que sumarle de vuelta a `restante`: el backend ya lo restó del disponible del partícipe
   * porque es una novedad más, pero DENTRO de este diálogo es reasignable, no gastado — mismo
   * principio que `topeRepartoPrestamo` usa un nivel más abajo, por préstamo en vez de por novedad.
   */
  private get valorPersistidoNovedadAlCargar(): number {
    return this.redondear(this.afectacionesRegistradas().reduce((sum, a) => sum + (Number(a.valorAfectar) || 0), 0));
  }

  /**
   * ⚠️ Sale del tope POR PARTÍCIPE (`GET /asgn/topeAfectacion`, `VALIDACION-TOPE-AFECTACION-
   * MANUAL.md` §8), no del monto de la novedad abierta — corregido 2026-09-02 tras el caso
   * SANCHEZ (rol 7508): con el pozo por novedad, dos novedades del mismo partícipe podían
   * ofrecer cada una "todo el sobrante" hasta agotar su propio monto, sumando más de lo que el
   * partícipe tenía disponible en total ($439,59 afectados contra $406,73 disponibles).
   *
   * `restante` que manda el backend ya excluye TODAS las novedades del partícipe, incluida esta —
   * hay que sumarle de vuelta `valorPersistidoNovedadAlCargar()` porque, dentro de este diálogo,
   * lo que ya está afectado acá es reasignable (mover entre cuotas/préstamos/aportes de la MISMA
   * novedad), no un gasto nuevo. Sin esa suma, se resta dos veces lo mismo — una vez porque el
   * backend ya lo descontó del `restante`, otra porque `totalValorAfectarActual`/
   * `totalValorAportarActual` también lo incluyen — y el pozo queda corto en vez de bien calculado.
   *
   * `null` mientras el tope no llegó o si la consulta falló: devuelve 0 a propósito. NO cae al
   * viejo cálculo por novedad — eso reintroduciría el defecto en silencio. El operador ve por qué
   * (banner de "confirmando tope" / "no se pudo consultar") en vez de un número que parece sano
   * pero no lo es.
   */
  get montoDisponibleAfectacion(): number {
    const tope = this.topeAfectacionParticipe();
    if (!tope) {
      return 0;
    }
    return this.redondear(tope.restante + this.valorPersistidoNovedadAlCargar);
  }

  get totalValorAfectarActual(): number {
    const total = Object.values(this.valoresAfectarEditados()).reduce((sum, valor) => sum + (Number(valor) || 0), 0);
    return this.redondear(total);
  }

  get totalValorAportarActual(): number {
    const total = Object.values(this.valoresAporteEditados()).reduce((sum, valor) => sum + (Number(valor) || 0), 0);
    return this.redondear(total);
  }

  get saldoPendienteAfectacion(): number {
    return this.redondear(
      this.montoDisponibleAfectacion - this.totalValorAfectarActual - this.totalValorAportarActual
    );
  }

  /**
   * Obtener total de novedades de descuentos
   */
  get totalNovedadesDescuentos(): number {
    return this.novedadesDescuentos().length;
  }

  get tiposNovedadDisponibles(): number[] {
    const tipos = new Set(
      this.novedadesDescuentos()
        .map((item) => Number(item.tipoNovedad || 0))
        .filter((tipo) => tipo > 0)
    );

    return Array.from(tipos).sort((a, b) => a - b);
  }

  get novedadesDescuentosFiltradas(): NovedadParticipeCarga[] {
    const filtro = this.filtroTipoNovedadSeleccionado();
    const novedades = this.novedadesDescuentos();

    if (filtro === 'TODOS') {
      return novedades;
    }

    return novedades.filter((item) => Number(item.tipoNovedad || 0) === filtro);
  }

  get totalNovedadesDescuentosFiltradas(): number {
    return this.novedadesDescuentosFiltradas.length;
  }

  get totalMontoEsperadoFiltrado(): number {
    return this.novedadesDescuentosFiltradas.reduce((sum, item) => sum + Number(item.montoEsperado || 0), 0);
  }

  get totalMontoRecibidoFiltrado(): number {
    return this.novedadesDescuentosFiltradas.reduce((sum, item) => sum + Number(item.montoRecibido || 0), 0);
  }

  get totalMontoDiferenciaFiltrado(): number {
    return this.novedadesDescuentosFiltradas.reduce((sum, item) => sum + Number(item.montoDiferencia || 0), 0);
  }

  // ================= familia (docs/crd/API-FAMILIA-NOVEDADES-CARGA.md) =================
  //
  // Dos secciones/colores (BLOQUEANTE detiene el proceso, COBRANZA no) + INFORMATIVA colapsada por
  // defecto: no son accionables, solo hacen ruido. El campo viene del servidor —`familia` es
  // READ_ONLY— y NUNCA se deriva del signo de `montoDiferencia` acá: esa fue la condición interina
  // que reemplaza este contrato, justamente para que no haya dos criterios que puedan divergir.

  mostrarInformativas = signal(false);
  /**
   * Filtro "ver solo bloqueantes" (pedido del usuario 2026-09-01, disparado desde el propio banner
   * rojo: "es donde el operador ya está mirando cuando le surge la necesidad"). Convive con el
   * filtro por tipo —se aplica DESPUÉS, no lo reemplaza— y el contador del banner NUNCA se calcula
   * sobre esto: sigue leyendo `novedadesDescuentos()` completo, sin filtrar, porque es el gate real
   * para procesar y no puede moverse según lo que el operador esté mirando en ese momento.
   */
  mostrarSoloBloqueantes = signal(false);

  get novedadesBloqueantesFiltradas(): NovedadParticipeCarga[] {
    return this.novedadesDescuentosFiltradas.filter((n) => n.familia === 'BLOQUEANTE');
  }

  get novedadesCobranzaFiltradas(): NovedadParticipeCarga[] {
    return this.novedadesDescuentosFiltradas.filter((n) => n.familia === 'COBRANZA');
  }

  get novedadesInformativasFiltradas(): NovedadParticipeCarga[] {
    return this.novedadesDescuentosFiltradas.filter((n) => n.familia === 'INFORMATIVA');
  }

  /**
   * `familia` ausente donde se esperaba: NO se adivina por signo (pedido explícito del árbitro,
   * 2026-09-01). Se muestra aparte, como anomalía a reportar, nunca mezclada en BLOQUEANTE/COBRANZA.
   */
  get novedadesSinFamiliaFiltradas(): NovedadParticipeCarga[] {
    return this.novedadesDescuentosFiltradas.filter((n) => n.familia == null);
  }

  /** Cuántas BLOQUEANTE quedan en TODA la carga (no solo el filtro de tipo actual): es el gate real para procesar. */
  get totalNovedadesBloqueantes(): number {
    return this.novedadesDescuentos().filter((n) => n.familia === 'BLOQUEANTE').length;
  }

  /** Anomalía: cuántas novedades llegaron sin `familia` en toda la carga. Debería ser siempre 0. */
  get totalNovedadesSinFamilia(): number {
    return this.novedadesDescuentos().filter((n) => n.familia == null).length;
  }

  toggleMostrarInformativas(): void {
    this.mostrarInformativas.update((v) => !v);
  }

  toggleSoloBloqueantes(): void {
    this.mostrarSoloBloqueantes.update((v) => !v);
  }

  /**
   * Fila única para la tabla, agrupada por familia (BLOQUEANTE → COBRANZA → sin clasificar →
   * INFORMATIVA), en vez de tres tablas idénticas: mismo resultado visual ("dos secciones" +
   * colores por fila), sin triplicar los `matColumnDef`. INFORMATIVA solo entra si el operador la
   * pidió con el toggle — no son accionables y por defecto solo hacen ruido.
   *
   * Con "ver solo bloqueantes" activo, se corta acá: ni COBRANZA, ni sin clasificar, ni
   * INFORMATIVA aparecen, sin importar el toggle de informativas (que además queda oculto en el
   * HTML mientras este filtro está activo — no tiene nada que hacer).
   */
  get novedadesTablaOrdenadas(): NovedadParticipeCarga[] {
    if (this.mostrarSoloBloqueantes()) {
      return this.novedadesBloqueantesFiltradas;
    }
    return [
      ...this.novedadesBloqueantesFiltradas,
      ...this.novedadesCobranzaFiltradas,
      ...this.novedadesSinFamiliaFiltradas,
      ...(this.mostrarInformativas() ? this.novedadesInformativasFiltradas : []),
    ];
  }

  familiaEtiqueta(n: NovedadParticipeCarga): string {
    switch (n.familia) {
      case 'BLOQUEANTE': return 'Bloqueante';
      case 'COBRANZA': return 'Cobranza';
      case 'INFORMATIVA': return 'Informativa';
      default: return 'Sin clasificar';
    }
  }

  familiaIcono(n: NovedadParticipeCarga): string {
    switch (n.familia) {
      case 'BLOQUEANTE': return 'block';
      case 'COBRANZA': return 'campaign';
      case 'INFORMATIVA': return 'check_circle';
      default: return 'help_outline';
    }
  }

  togglePanelAfectacionFinanciera(novedad: NovedadParticipeCarga): void {
    this.resetAfectacionFinancieraState();
    this.novedadFinancieraSeleccionada.set(novedad);
    this.isLoadingAfectacionFinanciera.set(true);

    const dialogRef = this.dialog.open(AfectacionFinancieraCuotasDialogComponent, {
      width: '95%',
      maxWidth: '1200px',
      maxHeight: '90vh',
      panelClass: 'afectacion-financiera-dialog',
      data: {
        novedad,
        getPrestamosAfectables: () => this.prestamosAfectables(),
        getErroresCargaPrestamos: () => this.erroresCargaPrestamos(),
        getTopeAfectacionParticipe: () => this.topeAfectacionParticipe(),
        getTopeAfectacionConsultaFallida: () => this.topeAfectacionConsultaFallida(),
        getAfectacionesRegistradas: () => this.afectacionesRegistradas(),
        getValoresAfectarEditados: () => this.valoresAfectarEditados(),
        onValorAfectarChange: (detalle: DetallePrestamo, valor: string | number) => this.onValorAfectarChange(detalle, valor),
        onValorAfectarFocus: (detalle: DetallePrestamo) => this.onValorAfectarFocus(detalle),
        onValorAfectarBlur: (detalle: DetallePrestamo) => this.onValorAfectarBlur(detalle),
        onAutocompletarValorCuota: (detalle: DetallePrestamo) => this.onAutocompletarValorCuota(detalle),
        getValorAfectarEditado: (detalleCodigo: number | undefined) => this.getValorAfectarEditado(detalleCodigo),
        getValorCuotaOriginal: (detalle: DetallePrestamo | null | undefined) => this.getValorCuotaOriginal(detalle),
        getSaldoPendienteCuota: (detalle: DetallePrestamo | null | undefined) => this.getValorMaximoAfectarCuota(detalle),
        getEstadoCuotaTexto: (detalle: DetallePrestamo | null | undefined) => this.getEstadoCuotaTexto(detalle),
        getMontoDisponibleAfectacion: () => this.montoDisponibleAfectacion,
        getTotalValorAfectarActual: () => this.totalValorAfectarActual,
        getSaldoPendienteAfectacion: () => this.saldoPendienteAfectacion,
        isLoadingAfectacionFinanciera: () => this.isLoadingAfectacionFinanciera(),
        isSavingAfectacionFinanciera: () => this.isSavingAfectacionFinanciera(),
        formatearFecha: (fecha: Date | string | null) => this.formatearFecha(fecha),
        onGuardarAfectaciones: () => this.guardarAfectacionesFinancieras(),
        // Reparto automático por préstamo: check "aplicar todo el sobrante" + valor de cabecera
        isAplicarTodoElSobranteActivo: (item: PrestamoAfectable) => this.isAplicarTodoElSobranteActivo(item),
        onToggleAplicarTodoElSobrante: (item: PrestamoAfectable, marcado: boolean) => this.onToggleAplicarTodoElSobrante(item, marcado),
        getValorRepartoPrestamoTexto: (item: PrestamoAfectable) => this.getValorRepartoPrestamoTexto(item),
        onValorRepartoPrestamoInput: (item: PrestamoAfectable, valor: string) => this.onValorRepartoPrestamoInput(item, valor),
        onValorRepartoPrestamoBlur: (item: PrestamoAfectable) => this.onValorRepartoPrestamoBlur(item),
        // Excedente aplicado a un aporte (docs/crd/API-EXCEDENTE-PETRO-A-APORTES.md)
        getOpcionesAporte: () => this.opcionesAporteExcedente(),
        getMensajeOpcionesAporteVacio: () => this.mensajeOpcionesAporteVacio(),
        isLoadingOpcionesAporte: () => this.isLoadingOpcionesAporte(),
        getValorAporteEditado: (idTipoAporte: number) => this.getValorAporteEditado(idTipoAporte),
        onValorAporteChange: (idTipoAporte: number, valor: string | number) => this.onValorAporteChange(idTipoAporte, valor),
        onValorAporteFocus: (idTipoAporte: number) => this.onValorAporteFocus(idTipoAporte),
        onValorAporteBlur: (idTipoAporte: number) => this.onValorAporteBlur(idTipoAporte),
        getTotalValorAportarActual: () => this.totalValorAportarActual,
      }
    });

    dialogRef.afterOpened().subscribe(() => {
      this.cargarContextoAfectacionFinanciera(novedad);
      this.cargarOpcionesAporte(novedad);
    });

    dialogRef.afterClosed().subscribe(() => {
      this.resetAfectacionFinancieraState();
    });
  }

  private resetAfectacionFinancieraState(): void {
    this.novedadFinancieraSeleccionada.set(null);
    this.prestamosAfectables.set([]);
    this.pagosPorCuotaAfectacion.set({});
    this.afectacionesRegistradas.set([]);
    this.valoresAfectarEditados.set({});
    this.detalleCuotaEnEdicion.set(new Set());
    this.isLoadingAfectacionFinanciera.set(false);
    this.isSavingAfectacionFinanciera.set(false);
    this.opcionesAporteExcedente.set([]);
    this.mensajeOpcionesAporteVacio.set(null);
    this.valoresAporteEditados.set({});
    this.aporteEnEdicion.set(new Set());
    this.isLoadingOpcionesAporte.set(false);
    this.prestamosConTodoAplicado.set(new Set());
    this.valorRepartoPrestamoTexto = {};
  }

  onValorAfectarFocus(detalle: DetallePrestamo): void {
    if (!detalle.codigo) {
      return;
    }

    const edicion = new Set(this.detalleCuotaEnEdicion());
    edicion.add(detalle.codigo);
    this.detalleCuotaEnEdicion.set(edicion);
  }

  onValorAfectarBlur(detalle: DetallePrestamo): void {
    if (!detalle.codigo) {
      return;
    }

    const edicion = new Set(this.detalleCuotaEnEdicion());
    edicion.delete(detalle.codigo);
    this.detalleCuotaEnEdicion.set(edicion);

    const valorActual = this.valoresAfectarEditados()[detalle.codigo] || 0;
    this.valoresAfectarEditados.update((actual) => ({
      ...actual,
      [detalle.codigo]: this.redondear(Number(valorActual) || 0),
    }));
  }

  /** El préstamo (con su lista de cuotas ya ordenada de la más antigua a la más nueva) que contiene esta cuota. */
  private itemDeCuota(detalleCodigo: number): PrestamoAfectable | null {
    return this.prestamosAfectables().find((item) => item.cuotas.some((c) => c.codigo === detalleCodigo)) ?? null;
  }

  /**
   * Prelación obligatoria (pedido del usuario 2026-08-31, mismo criterio que ya usa
   * `cobros-personales.component.ts`): de la cuota más antigua a la más nueva, sin huecos. Devuelve
   * la primera cuota de este préstamo, anterior a `detalleCodigo`, que todavía no está cubierta del
   * todo — o `null` si no hay ninguna (la asignación es válida).
   *
   * El backend también valida esto (`saabe-c1`); que la UI lo haga imposible es mejor que dejar
   * pasar el hueco y mostrar el rechazo del servidor después de cargado el resto del formulario.
   */
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

  onAutocompletarValorCuota(detalle: DetallePrestamo): void {
    const detalleCodigo = detalle.codigo;
    if (!detalleCodigo) {
      return;
    }

    const valorMaximoCuota = this.redondear(this.getValorMaximoAfectarCuota(detalle));
    if (valorMaximoCuota <= 0) {
      return;
    }

    const item = this.itemDeCuota(detalleCodigo);
    const anterior = item ? this.cuotaAnteriorSinCubrir(item, detalleCodigo) : null;
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

    this.valoresAfectarEditados.update((actual) => ({
      ...actual,
      [detalleCodigo]: valorAutocompletado,
    }));
  }

  onValorAfectarChange(detalle: DetallePrestamo, valor: string | number): void {
    const detalleCodigo = detalle.codigo;
    const valorNumerico = this.redondear(this.parsearMontoEntrada(valor));
    const valorMaximoCuota = this.getValorMaximoAfectarCuota(detalle);

    if (!detalleCodigo) {
      return;
    }

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
      this.snackBar.open('La suma de valores a cruzar no puede superar el valor recibido desde Petro', 'Cerrar', {
        duration: 4000,
      });
      return;
    }

    // Edición manual de una sola cuota: ya no representa "todo el sobrante aplicado" en este préstamo.
    const itemDelCambio = this.itemDeCuota(detalleCodigo);
    if (itemDelCambio?.prestamo.codigo != null) {
      this.prestamosConTodoAplicado.update((actual) => {
        if (!actual.has(itemDelCambio.prestamo.codigo)) return actual;
        const copia = new Set(actual);
        copia.delete(itemDelCambio.prestamo.codigo);
        return copia;
      });
    }

    this.valoresAfectarEditados.update((actual) => ({
      ...actual,
      [detalleCodigo]: valorNumerico,
    }));
  }

  getValorAfectarEditado(detalleCodigo: number | undefined): string {
    if (!detalleCodigo) {
      return '0,00';
    }

    const valor = Number(this.valoresAfectarEditados()[detalleCodigo] || 0);
    const valorRedondeado = this.redondear(valor);

    if (this.detalleCuotaEnEdicion().has(detalleCodigo)) {
      return String(valorRedondeado).replace('.', ',');
    }

    return this.formatearMontoDosDecimales(valorRedondeado);
  }

  // ================= reparto automático por préstamo =================
  //
  // Motor único (pedido del usuario 2026-08-31): "aplicar todo el sobrante a este préstamo"
  // (checkbox) y "valor por préstamo" (input de cabecera) son la MISMA operación —repartir un
  // monto sobre las cuotas del préstamo, de la más antigua a la más nueva, cada cuota hasta su
  // pendiente y la última absorbiendo el resto— con distinta fuente para el monto. Se escribe una
  // sola vez en `aplicarRepartoAutomaticoPrestamo` y ambas entradas la llaman.

  /** Lo que YA está asignado a las cuotas de este préstamo específico (no de otros). */
  private montoAsignadoActualEnPrestamo(item: PrestamoAfectable): number {
    const codigos = new Set(item.cuotas.map((c) => c.codigo).filter((c): c is number => c != null));
    return this.redondear(
      Object.entries(this.valoresAfectarEditados())
        .filter(([codigo]) => codigos.has(Number(codigo)))
        .reduce((sum, [, valor]) => sum + (Number(valor) || 0), 0)
    );
  }

  /**
   * Tope de lo que se puede repartir sobre ESTE préstamo: el pozo compartido es uno solo (mismo
   * criterio que el diálogo de excedente Petro a un aporte), así que lo que ya asignaron otros
   * préstamos u otros aportes reduce lo disponible acá. Se suma de vuelta lo que este préstamo YA
   * tiene asignado porque el reparto automático lo reemplaza entero, no lo agrega encima.
   */
  private topeRepartoPrestamo(item: PrestamoAfectable): number {
    return this.redondear(this.saldoPendienteAfectacion + this.montoAsignadoActualEnPrestamo(item));
  }

  /** El motor: reparte `monto` sobre `item.cuotas` (ya ordenadas de la más antigua a la más nueva). */
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

  /** Estado visual del checkbox "aplicar todo el sobrante a este préstamo". */
  isAplicarTodoElSobranteActivo(item: PrestamoAfectable): boolean {
    const codigo = item.prestamo.codigo;
    return codigo != null && this.prestamosConTodoAplicado().has(codigo);
  }

  onToggleAplicarTodoElSobrante(item: PrestamoAfectable, marcado: boolean): void {
    const codigo = item.prestamo.codigo;
    if (codigo == null) return;

    this.prestamosConTodoAplicado.update((actual) => {
      const copia = new Set(actual);
      if (marcado) {
        copia.add(codigo);
      } else {
        copia.delete(codigo);
      }
      return copia;
    });

    // Marcado: reparte todo lo disponible sobre este préstamo. Desmarcado: libera lo que tenía
    // asignado (vuelve el sobrante al pozo compartido) en vez de dejarlo a medias y sin indicar nada.
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

  /** Al salir del input de cabecera: aplica el reparto, topado al pozo disponible para este préstamo. */
  onValorRepartoPrestamoBlur(item: PrestamoAfectable): void {
    const codigo = item.prestamo.codigo;
    if (codigo == null) return;

    const texto = this.valorRepartoPrestamoTexto[codigo];
    delete this.valorRepartoPrestamoTexto[codigo];
    if (texto === undefined || texto.trim() === '') return;

    const solicitado = this.redondear(this.parsearMontoEntrada(texto));
    if (Number.isNaN(solicitado) || solicitado < 0) return;

    const tope = this.topeRepartoPrestamo(item);
    const monto = Math.min(solicitado, tope);
    if (monto < solicitado - 0.004) {
      this.snackBar.open('El valor ingresado supera lo disponible para este préstamo: se ajustó al máximo posible.', 'Cerrar', {
        duration: 4000,
      });
    }

    this.aplicarRepartoAutomaticoPrestamo(item, monto);

    // Un valor manual de cabecera no necesariamente agota el sobrante: el checkbox solo queda
    // marcado si de hecho coincide con "todo el sobrante disponible".
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

  // ================= excedente aplicado a un aporte =================

  private cargarOpcionesAporte(novedad: NovedadParticipeCarga): void {
    if (!novedad.codigo) {
      this.opcionesAporteExcedente.set([]);
      this.mensajeOpcionesAporteVacio.set(null);
      return;
    }

    this.isLoadingOpcionesAporte.set(true);
    this.afectacionValoresParticipeCargaService.opcionesAporte(novedad.codigo).subscribe({
      next: (resp) => {
        this.isLoadingOpcionesAporte.set(false);
        const opciones = resp?.opciones ?? [];
        this.opcionesAporteExcedente.set(opciones);
        // opciones: [] no es un error — el partícipe no tiene tipo vigente en el mes de la CARGA
        // (mes/año de la respuesta, no los de hoy). Sin esto la pantalla solo ofrece préstamo.
        this.mensajeOpcionesAporteVacio.set(
          opciones.length || !resp
            ? null
            : `No hay tipos de aporte vigentes para ${this.nombreMes(resp.mes)} ${resp.anio}.`
        );
      },
      error: () => {
        this.isLoadingOpcionesAporte.set(false);
        this.opcionesAporteExcedente.set([]);
        this.mensajeOpcionesAporteVacio.set(null);
        this.snackBar.open('No se pudieron cargar las opciones de aporte para el excedente.', 'Cerrar', {
          duration: 4000,
        });
      },
    });
  }

  private nombreMes(mes: number): string {
    return this.meses.find((m) => m.valor === mes)?.nombre.toLowerCase() ?? String(mes);
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
    this.valoresAporteEditados.update((actual) => ({
      ...actual,
      [idTipoAporte]: this.redondear(Number(valorActual) || 0),
    }));
  }

  /**
   * Mismo tope compartido que las cuotas de préstamo: la suma de TODO lo asignado (cuotas +
   * aportes) no puede superar el excedente de la novedad — es un solo pozo, no dos.
   */
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
    const montoDisponible = this.redondear(this.montoDisponibleAfectacion);

    if (totalConActual > montoDisponible) {
      this.snackBar.open('La suma de valores a cruzar no puede superar el valor recibido desde Petro', 'Cerrar', {
        duration: 4000,
      });
      return;
    }

    this.valoresAporteEditados.update((actual) => ({
      ...actual,
      [idTipoAporte]: valorNumerico,
    }));
  }

  getValorAporteEditado(idTipoAporte: number): string {
    const valor = Number(this.valoresAporteEditados()[idTipoAporte] || 0);
    const valorRedondeado = this.redondear(valor);

    if (this.aporteEnEdicion().has(idTipoAporte)) {
      return String(valorRedondeado).replace('.', ',');
    }

    return this.formatearMontoDosDecimales(valorRedondeado);
  }

  guardarAfectacionesFinancieras(): void {
    const novedad = this.novedadFinancieraSeleccionada();
    const usuario = this.obtenerUsuarioActual();

    if (!novedad?.codigo) {
      this.snackBar.open('Seleccione una novedad financiera para registrar afectaciones', 'Cerrar', { duration: 3500 });
      return;
    }

    if (!usuario) {
      this.snackBar.open('No se pudo identificar el usuario actual', 'Cerrar', { duration: 3500 });
      return;
    }

    if (
      this.redondear(this.totalValorAfectarActual + this.totalValorAportarActual) >
      this.redondear(this.montoDisponibleAfectacion)
    ) {
      this.snackBar.open('La suma de valores a cruzar supera el valor recibido desde Petro', 'Cerrar', {
        duration: 4000,
      });
      return;
    }

    const cuotasDisponibles = new Map<number, { prestamo: Prestamo; detalle: DetallePrestamo }>();
    this.prestamosAfectables().forEach((item) => {
      item.cuotas.forEach((detalle) => cuotasDisponibles.set(detalle.codigo, { prestamo: item.prestamo, detalle }));
    });

    const actuales = this.valoresAfectarEditados();
    const existentes = new Map<number, AfectacionValoresParticipeCarga>();
    this.afectacionesRegistradas().forEach((item) => {
      const detalleCodigo = item.detallePrestamo?.codigo;
      if (detalleCodigo) {
        existentes.set(detalleCodigo, item);
      }
    });

    const operaciones: any[] = [];

    Object.entries(actuales).forEach(([detalleCodigoTexto, valor]) => {
      const detalleCodigo = Number(detalleCodigoTexto);
      const valorAfectar = this.redondear(Number(valor || 0));
      const cuotaSeleccionada = cuotasDisponibles.get(detalleCodigo);
      const existente = existentes.get(detalleCodigo);

      if (!cuotaSeleccionada) {
        return;
      }

      if (valorAfectar > 0) {
        const payload = this.construirPayloadAfectacion(
          novedad,
          cuotaSeleccionada.prestamo,
          cuotaSeleccionada.detalle,
          valorAfectar,
          usuario,
          existente
        );

        operaciones.push(
          existente?.codigo
            ? this.afectacionValoresParticipeCargaService.update(payload)
            : this.afectacionValoresParticipeCargaService.add(payload)
        );
      } else if (existente?.codigo) {
        operaciones.push(this.afectacionValoresParticipeCargaService.delete(existente.codigo));
      }
    });

    this.afectacionesRegistradas().forEach((item) => {
      const detalleCodigo = item.detallePrestamo?.codigo;
      if (!detalleCodigo || detalleCodigo in actuales) {
        return;
      }

      if (item.codigo) {
        operaciones.push(this.afectacionValoresParticipeCargaService.delete(item.codigo));
      }
    });

    // Excedente a un aporte: filas separadas (tipoAporte, sin prestamo/detallePrestamo — CK_AVPC_
    // PRST_XOR_TPAP) que se guardan con /batch, no con add/update. Igual que arriba: valor 0 borra
    // una fila que ya existía, y las que desaparecieron del mapa actual también se borran.
    const existentesAporte = new Map<number, AfectacionValoresParticipeCarga>();
    this.afectacionesRegistradas().forEach((item) => {
      const idTipoAporte = item.tipoAporte?.codigo;
      if (idTipoAporte) {
        existentesAporte.set(idTipoAporte, item);
      }
    });

    const actualesAporte = this.valoresAporteEditados();
    const filasAporteParaBatch: AfectacionValoresParticipeCarga[] = [];

    Object.entries(actualesAporte).forEach(([idTipoAporteTexto, valor]) => {
      const idTipoAporte = Number(idTipoAporteTexto);
      const valorAfectar = this.redondear(Number(valor || 0));
      const existente = existentesAporte.get(idTipoAporte);

      if (valorAfectar > 0) {
        filasAporteParaBatch.push(
          this.construirPayloadAfectacionAporte(novedad, idTipoAporte, valorAfectar, usuario, existente)
        );
      } else if (existente?.codigo) {
        operaciones.push(this.afectacionValoresParticipeCargaService.delete(existente.codigo));
      }
    });

    this.afectacionesRegistradas().forEach((item) => {
      const idTipoAporte = item.tipoAporte?.codigo;
      if (!idTipoAporte || idTipoAporte in actualesAporte) {
        return;
      }

      if (item.codigo) {
        operaciones.push(this.afectacionValoresParticipeCargaService.delete(item.codigo));
      }
    });

    if (operaciones.length === 0 && filasAporteParaBatch.length === 0) {
      this.snackBar.open('No hay cambios por guardar en las afectaciones', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isSavingAfectacionFinanciera.set(true);

    forkJoin({
      prestamos: operaciones.length ? forkJoin(operaciones) : of(null),
      aportes: filasAporteParaBatch.length
        ? this.afectacionValoresParticipeCargaService.batch(filasAporteParaBatch)
        : of(null),
    }).subscribe({
      next: ({ aportes }) => {
        this.isSavingAfectacionFinanciera.set(false);

        // Aviso, no error: el backend ya guardó todo (cada fila es su propia transacción) — esto
        // es la MISMA regla que va a bloquear el proceso del archivo si nadie completa el reparto
        // (docs/crd/API-EXCEDENTE-PETRO-A-APORTES.md §3).
        const advertencias = aportes?.advertenciasReparto ?? [];
        if (advertencias.length) {
          const texto = advertencias.map((a) => a.mensaje).join(' · ');
          this.snackBar.open(`Afectaciones guardadas, pero el reparto no cuadra: ${texto}`, 'Cerrar', {
            duration: 10000,
          });
        } else {
          this.snackBar.open('Afectaciones financieras registradas correctamente', 'Cerrar', { duration: 3500 });
        }

        this.cargarContextoAfectacionFinanciera(novedad);
        this.cargarOpcionesAporte(novedad);
      },
      error: () => {
        this.isSavingAfectacionFinanciera.set(false);
        this.snackBar.open('No se pudieron guardar las afectaciones financieras', 'Cerrar', { duration: 4000 });
      }
    });
  }

  getValorCuotaOriginal(detalle: DetallePrestamo | null | undefined): number {
    if (!detalle) {
      return 0;
    }

    return Number(detalle.totalConSeguro ?? detalle.total ?? detalle.cuota ?? detalle.saldo ?? detalle.capital ?? 0);
  }

  /**
   * Tope real de lo que se puede cruzar contra esta cuota: su saldo pendiente, NO su valor total.
   *
   * `DetallePrestamo.saldo` (DTPRSLDO) no sirve para esto — mismo hallazgo que documentó
   * `cobros-personales.component.ts`: en los créditos migrados de Petrocomercial viene en 0 aunque
   * la cuota no tenga ningún pago real. El cálculo correcto reconstruye el pendiente desde los
   * pagos vigentes de CRD.PGPR (`pagosPorCuotaAfectacion`), con la MISMA fórmula que ya usa el resto
   * del sistema (`SaldoPrestamoService.saldoPendienteDe`) — así una cuota PARCIAL (con un pago
   * previo, sea de Petro o manual) solo ofrece lo que de verdad le falta, no su total.
   */
  getValorMaximoAfectarCuota(detalle: DetallePrestamo | null | undefined): number {
    if (!detalle) {
      return 0;
    }

    return this.redondear(this.saldoPrestamo.saldoPendienteDe(detalle, this.pagosPorCuotaAfectacion()));
  }

  getEstadoCuotaTexto(detalle: DetallePrestamo | null | undefined): string {
    const codigo = this.obtenerCodigoEstadoCuota(detalle);
    return obtenerNombreEstadoCuota(codigo)?.toUpperCase() ?? '-';
  }

  private cargarContextoAfectacionFinanciera(novedad: NovedadParticipeCarga): void {
    // Se resetea al arrancar, no en cada rama de salida: es una carga nueva, así que un aviso de
    // "no se pudo cargar" de la novedad/partícipe anterior no puede sobrevivir a este llamado.
    this.erroresCargaPrestamos.set([]);
    this.topeAfectacionParticipe.set(null);
    this.topeAfectacionConsultaFallida.set(false);

    const codigoPetro = novedad.participeXCargaArchivo?.codigoPetro;

    if (!codigoPetro) {
      this.snackBar.open('No se encontró el código Petro del partícipe', 'Cerrar', { duration: 3500 });
      this.prestamosAfectables.set([]);
      this.pagosPorCuotaAfectacion.set({});
      this.afectacionesRegistradas.set([]);
      this.valoresAfectarEditados.set({});
      this.valoresAporteEditados.set({});
      return;
    }

    // Independiente del resto de esta función: no bloquea ni gatea nada, es solo un aviso.
    this.cargarTopeAfectacion(codigoPetro);

    this.isLoadingAfectacionFinanciera.set(true);
    // NO blanquea `prestamosAfectables` acá: en una recarga (p. ej. justo después de "Guardar")
    // la lista ya tiene datos, y limpiarla de entrada hacía que todo desapareciera y volviera a
    // aparecer un instante después — el "salto" que el usuario pidió evitar (2026-09-01). Se
    // reemplaza recién cuando llega la respuesta nueva, más abajo. Los caminos de "no hay nada que
    // mostrar" (sin código Petro, sin entidad, sin préstamos, error) sí la vacían explícitamente,
    // porque ahí es un dato real, no una recarga en vuelo.

    const criteriosAfectaciones: DatosBusqueda[] = [];
    const dbNovedad = new DatosBusqueda();
    dbNovedad.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'novedadParticipeCarga',
      'codigo',
      String(novedad.codigo),
      TipoComandosBusqueda.IGUAL
    );
    criteriosAfectaciones.push(dbNovedad);

    this.afectacionValoresParticipeCargaService.selectByCriteria(criteriosAfectaciones).subscribe({
      next: (afectacionesData) => {
        const afectaciones = Array.isArray(afectacionesData) ? afectacionesData : afectacionesData ? [afectacionesData] : [];
        this.afectacionesRegistradas.set(afectaciones);
        // A diferencia de valoresAfectarEditados (depende de qué cuotas terminen siendo
        // afectables), esto es una función pura de `afectaciones`: no hace falta repetirlo en
        // cada rama del árbol de abajo.
        this.valoresAporteEditados.set(this.construirMapaValoresAportados(afectaciones));

        const criteriosEntidad: DatosBusqueda[] = [];
        const dbCodigoPetro = new DatosBusqueda();
        dbCodigoPetro.asignaUnCampoSinTrunc(
          TipoDatosBusqueda.LONG,
          'rolPetroComercial',
          String(codigoPetro),
          TipoComandosBusqueda.IGUAL
        );
        criteriosEntidad.push(dbCodigoPetro);

        this.entidadService.selectByCriteria(criteriosEntidad).subscribe({
          next: (entidadesData) => {
            const entidades = Array.isArray(entidadesData) ? entidadesData : entidadesData ? [entidadesData] : [];
            const entidad = entidades[0] || null;

            if (!entidad?.codigo) {
              this.isLoadingAfectacionFinanciera.set(false);
              this.prestamosAfectables.set([]);
              this.pagosPorCuotaAfectacion.set({});
              this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
              this.snackBar.open('No se encontró la entidad del partícipe para consultar préstamos', 'Cerrar', {
                duration: 4000,
              });
              return;
            }

            const criteriosPrestamos: DatosBusqueda[] = [];
            const dbEntidad = new DatosBusqueda();
            dbEntidad.asignaValorConCampoPadre(
              TipoDatosBusqueda.LONG,
              'entidad',
              'codigo',
              String(entidad.codigo),
              TipoComandosBusqueda.IGUAL
            );
            criteriosPrestamos.push(dbEntidad);

            const dbOrdenPrestamo = new DatosBusqueda();
            dbOrdenPrestamo.orderBy('fechaInicio');
            dbOrdenPrestamo.setTipoOrden(DatosBusqueda.ORDER_ASC);
            criteriosPrestamos.push(dbOrdenPrestamo);

            this.prestamoService.selectByCriteria(criteriosPrestamos).subscribe({
              next: (prestamosData) => {
                // Se filtra por ESTADO (`idEstado`, PRSTIDST), no por `saldoTotal` (PRSTSLTT): esa
                // columna no la actualiza nadie en todo el backend (`Prestamo.setSaldoTotal()`
                // existe y no tiene llamadores) y quedó congelada en el valor migrado — un
                // préstamo en mora con `PRSTSLTT` en 0/NULL desaparecía de la lista, deba lo que
                // deba. `cobros-personales.component.ts:292` documenta el mismo problema y ya
                // había abandonado `saldoTotal`/`saldoCapital` de PRST a favor de calcular desde
                // cuotas y pagos (`SaldoPrestamoService`, igual que acá abajo).
                //
                // Solo VIGENTE y EN_MORA: decisión explícita del usuario (2026-09-01).
                // DE_PLAZO_VENCIDO NO entra.
                const prestamos = (Array.isArray(prestamosData) ? prestamosData : prestamosData ? [prestamosData] : [])
                  .filter(
                    (prestamo) =>
                      prestamo?.idEstado === EstadoPrestamoOperativo.VIGENTE ||
                      prestamo?.idEstado === EstadoPrestamoOperativo.EN_MORA
                  );

                if (prestamos.length === 0) {
                  this.isLoadingAfectacionFinanciera.set(false);
                  this.prestamosAfectables.set([]);
                  this.pagosPorCuotaAfectacion.set({});
                  this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
                  return;
                }

                // Todas las cuotas pendientes, sin tope: el tope de 5 anterior era de presentación,
                // no del backend (selectByCriteria no pagina del lado del servidor) — cortaba la
                // pantalla cuando el partícipe debía más de 5 cuotas, pedido del usuario 2026-08-31.
                const requests = prestamos.map((prestamo) => {
                  const criteriosDetalle: DatosBusqueda[] = [];
                  const dbPrestamo = new DatosBusqueda();
                  dbPrestamo.asignaValorConCampoPadre(
                    TipoDatosBusqueda.LONG,
                    'prestamo',
                    'codigo',
                    String(prestamo.codigo),
                    TipoComandosBusqueda.IGUAL
                  );
                  criteriosDetalle.push(dbPrestamo);

                  const dbOrdenDetalle = new DatosBusqueda();
                  dbOrdenDetalle.orderBy('numeroCuota');
                  dbOrdenDetalle.setTipoOrden(DatosBusqueda.ORDER_ASC);
                  criteriosDetalle.push(dbOrdenDetalle);

                  const criterioPagos = new DatosBusqueda();
                  criterioPagos.asignaValorConCampoPadre(
                    TipoDatosBusqueda.LONG,
                    'prestamo',
                    'codigo',
                    String(prestamo.codigo),
                    TipoComandosBusqueda.IGUAL
                  );

                  // `catchError` PROPIO en cada consulta, no uno compartido envolviendo el
                  // `forkJoin`: si no fuera así, un 400 real de `pagos` (ver más abajo) tira todo
                  // el `forkJoin` de una — RxJS no deja que uno de los dos falle sin matar al
                  // otro — y el `map` de abajo nunca llega a correr. `null` (a diferencia de `[]`)
                  // en `detalleData`/`pagos` significa "no se pudo saber", nunca "sin resultados":
                  // parte porque `handleError` devuelve `null` cuando Angular no pudo interpretar
                  // un 200 (`if (+error.status === 200) return of(null)`, en 316 servicios del
                  // frontend), y parte por lo que arma `detalleData$`/`pagos$` acá abajo.
                  const detalleData$ = this.detallePrestamoService
                    .selectByCriteria(criteriosDetalle)
                    .pipe(catchError(() => of(null)));

                  // Puente temporal, no la solución (§6 del registro de deuda técnica): la
                  // solución real es de backend — que `selectByCriteria` devuelva `[]` en vez de
                  // lanzar cuando no hay resultados, tanto en `PagoPrestamoServiceImpl` como en
                  // `DetallePrestamoServiceImpl` (mismo patrón `if (result.isEmpty()) throw` en
                  // los dos, confirmado 2026-09-02) — pero eso es un cambio de convención de
                  // Service que toca todo el proyecto y necesita WAR nuevo. Mientras tanto, acá se
                  // lee el TEXTO del error para no tratar "el préstamo no tiene pagos" (caso
                  // normal — todo crédito recién otorgado está así) igual que un fallo real.
                  const pagos$ = this.pagoPrestamoService.selectByCriteria([criterioPagos]).pipe(
                    map((pagos) => ({ pagos, sinRegistros: false })),
                    catchError((error) => of({ pagos: null, sinRegistros: this.esErrorPagosSinRegistros(error) }))
                  );

                  return forkJoin({ detalleData: detalleData$, pagos: pagos$ }).pipe(
                    map(({ detalleData, pagos }): ResultadoCargaPrestamo => {
                      // Sin cuotas no hay nada que afectar de este préstamo, sea porque de verdad
                      // no tiene ninguna o porque la consulta falló — los dos casos se tratan
                      // igual acá (a diferencia de pagos, más abajo, donde SÍ importa cuál fue).
                      if (detalleData == null) {
                        return {
                          item: { prestamo, cuotas: [] } as PrestamoAfectable,
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
                        // El préstamo SE MUESTRA igual: sin pagos, `saldoPendienteDe()` devuelve
                        // el total de cada cuota, que es lo correcto cuando de verdad no hay
                        // pagos. `sinRegistros` viene del texto del error (ver `pagos$` arriba):
                        // si el backend dijo específicamente "no encontró pagos", ese total ES el
                        // saldo real y no hace falta ningún aviso — mostrarlo igual sería ruido
                        // en el caso más común (todo crédito recién otorgado). Cualquier OTRO
                        // motivo de fallo si necesita aviso: no se puede distinguir "sin pagos" de
                        // "la consulta se rompió" y en ese caso el total mostrado podría estar
                        // inflado.
                        return {
                          item: { prestamo, cuotas } as PrestamoAfectable,
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
                        item: { prestamo, cuotas } as PrestamoAfectable,
                        pagosPorCuota: this.saldoPrestamo.acumularPagosPorCuota(listaPagos),
                        cargaFallida: false,
                      };
                    })
                  );
                });

                forkJoin(requests).subscribe({
                  next: (resultados) => {
                    // Los `cargaFallida` (cuotas) no entran a `prestamosConCuotas` porque sus
                    // `cuotas` siempre vienen vacías, así que el `.filter` de abajo ya los saca
                    // solo. Los que solo fallaron en pagos SÍ tienen `cuotas` y entran igual —
                    // ambos casos se listan aparte para avisar, con su propio motivo.
                    const prestamosConCuotas = resultados.map((r) => r.item).filter((item) => item.cuotas.length > 0);
                    const prestamosOrdenados = this.ordenarPrestamosPorProductoObjetivo(prestamosConCuotas, novedad);
                    const pagosPorCuotaTotal = resultados.reduce<Record<number, ComponentesPagados>>(
                      (acc, r) => ({ ...acc, ...r.pagosPorCuota }),
                      {}
                    );
                    const erroresCarga: PrestamoErrorCarga[] = resultados
                      .filter((r): r is ResultadoCargaPrestamo & { motivo: string } => !!r.motivo)
                      .map((r) => ({ prestamo: r.item.prestamo, motivo: r.motivo }));

                    this.pagosPorCuotaAfectacion.set(pagosPorCuotaTotal);
                    this.prestamosAfectables.set(prestamosOrdenados);
                    this.erroresCargaPrestamos.set(erroresCarga);
                    this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
                    this.isLoadingAfectacionFinanciera.set(false);
                  },
                  error: () => {
                    this.prestamosAfectables.set([]);
                    this.pagosPorCuotaAfectacion.set({});
                    this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
                    this.isLoadingAfectacionFinanciera.set(false);
                    this.snackBar.open('No se pudieron cargar las cuotas afectables', 'Cerrar', { duration: 4000 });
                  }
                });
              },
              error: () => {
                this.isLoadingAfectacionFinanciera.set(false);
                this.prestamosAfectables.set([]);
                this.pagosPorCuotaAfectacion.set({});
                this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
                this.snackBar.open('No se pudieron cargar los préstamos activos del partícipe', 'Cerrar', {
                  duration: 4000,
                });
              }
            });
          },
          error: () => {
            this.isLoadingAfectacionFinanciera.set(false);
            this.prestamosAfectables.set([]);
            this.pagosPorCuotaAfectacion.set({});
            this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
            this.snackBar.open('No se pudo consultar la entidad del partícipe', 'Cerrar', { duration: 4000 });
          }
        });
      },
      error: () => {
        this.isLoadingAfectacionFinanciera.set(false);
        this.afectacionesRegistradas.set([]);
        this.prestamosAfectables.set([]);
        this.pagosPorCuotaAfectacion.set({});
        this.valoresAfectarEditados.set({});
        this.valoresAporteEditados.set({});
        this.snackBar.open('No se pudieron cargar las afectaciones registradas', 'Cerrar', { duration: 4000 });
      }
    });
  }

  /**
   * Tope de afectación manual del partícipe — informativo, no bloquea nada (§8 del plan). Se
   * pide en paralelo con el resto de `cargarContextoAfectacionFinanciera`, nunca gatea ni retrasa
   * el resto de la carga.
   */
  private cargarTopeAfectacion(codigoPetro: number): void {
    const idCarga = this.cargaArchivo?.codigo;
    if (!idCarga) {
      this.topeAfectacionParticipe.set(null);
      this.topeAfectacionConsultaFallida.set(false);
      return;
    }

    this.topeAfectacionConsultaFallida.set(false);
    this.serviciosAsoprepService.topeAfectacion(idCarga, codigoPetro).subscribe({
      next: (tope) => {
        if (tope) {
          this.topeAfectacionParticipe.set(tope);
        } else {
          // El `handleError` compartido convierte un fallo de parseo en `null` — acá no es
          // "sin tope que mostrar", es "no se pudo consultar" (mismo matiz que `deudaVigente`
          // en devolución de aportes).
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
   * Botón «Verificar antes de procesar» (§9 del plan). Sin bloquear nada — el operador decide si
   * corrige o procesa igual, la validación que impide aplicar sigue siendo la del proceso. Si el
   * endpoint todavía no está desplegado o falla por cualquier motivo, se dice explícito en vez de
   * aproximar con datos viejos o parciales.
   */
  verificarAntesDeProcesar(): void {
    const idCarga = this.cargaArchivo?.codigo;
    if (!idCarga) {
      return;
    }

    this.prevueloAfectacionPanelAbierto.set(true);
    this.prevueloAfectacionCargando.set(true);
    this.prevueloAfectacionNoDisponible.set(false);
    this.prevueloAfectacion.set(null);

    this.serviciosAsoprepService.prevueloAfectacion(idCarga).subscribe({
      next: (resultado) => {
        this.prevueloAfectacionCargando.set(false);
        if (resultado) {
          this.prevueloAfectacion.set(resultado);
        } else {
          this.prevueloAfectacionNoDisponible.set(true);
        }
      },
      error: () => {
        this.prevueloAfectacionCargando.set(false);
        this.prevueloAfectacionNoDisponible.set(true);
      },
    });
  }

  cerrarPrevueloAfectacion(): void {
    this.prevueloAfectacionPanelAbierto.set(false);
  }

  private construirMapaValoresAfectados(afectaciones: AfectacionValoresParticipeCarga[]): Record<number, number> {
    return afectaciones.reduce((acc, item) => {
      const detalleCodigo = item.detallePrestamo?.codigo;
      if (detalleCodigo) {
        acc[detalleCodigo] = Number(item.valorAfectar || 0);
      }
      return acc;
    }, {} as Record<number, number>);
  }

  private construirMapaValoresAportados(afectaciones: AfectacionValoresParticipeCarga[]): Record<number, number> {
    return afectaciones.reduce((acc, item) => {
      const idTipoAporte = item.tipoAporte?.codigo;
      if (idTipoAporte) {
        acc[idTipoAporte] = Number(item.valorAfectar || 0);
      }
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
      observaciones: `Afectación registrada para novedad ${novedad.codigo}`,
      estado: 1,
    };
  }

  /**
   * Fila del excedente aplicada a un aporte, para `/batch` — nunca lleva `prestamo`/
   * `detallePrestamo` (CK_AVPC_PRST_XOR_TPAP). Sin campos de cuota (valorCuotaOriginal,
   * capitalCuotaOriginal, etc.): no aplican y el backend los deja en null sin problema
   * (`calcularDiferencias()` solo actúa si el par original/afectar no es null).
   */
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
      observaciones: `Excedente de la novedad ${novedad.codigo} aplicado a aporte`,
      estado: 1,
    };
  }

  private obtenerCodigoEstadoCuota(detalle: DetallePrestamo | null | undefined): number | null {
    // Lee solo estado (DTPRESTD); idEstado es un espejo y no sirve como respaldo
    return leerCodigoEstadoCuota(detalle);
  }

  /**
   * ¿El error de `pagoPrestamoService.selectByCriteria` es el 400 de "no hay pagos" y no otra
   * cosa? `PagoPrestamoServiceImpl.selectByCriteria` lanza `IncomeException("Busqueda por
   * criterio PagoPrestamo no devolvio ningun registro")` cuando el resultado viene vacío
   * (líneas 90-92), `PagoPrestamoRest` lo convierte en 400 (`entity(e.getMessage())`), y
   * `MensajeErrorJsonFilter` lo envuelve en `{"mensaje": "..."}` antes de que llegue acá — así
   * que en el `catchError` de `pagos$` el valor recibido ya es ese objeto (`handleError` de
   * `PagoPrestamoService` hace `throwError(() => error.error)`, no la respuesta completa).
   *
   * Comparar por texto es frágil — no hay un código de error estable para esto, a diferencia de
   * `CodigoErrorDevolucion` en devolución de aportes — pero es lo que hay hasta que el backend
   * cambie la convención. Si el cuerpo no viene con el texto esperado (por cualquier motivo:
   * cambió el mensaje, vino vacío, es otro tipo de error), se responde `false` a propósito: mejor
   * un aviso de más que un saldo inflado en silencio.
   */
  private esErrorPagosSinRegistros(error: unknown): boolean {
    const mensaje = typeof error === 'string' ? error : (error as { mensaje?: unknown })?.mensaje;
    if (typeof mensaje !== 'string') return false;

    const normalizado = mensaje
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return normalizado.includes('no devolvio ningun registro');
  }

  private esCuotaPagadaOCancelada(detalle: DetallePrestamo | null | undefined): boolean {
    const codigoEstado = this.obtenerCodigoEstadoCuota(detalle);
    return (
      codigoEstado === CodigoEstadoCuota.PAGADA ||
      codigoEstado === CodigoEstadoCuota.CANCELADA_ANTICIPADA
    );
  }

  private normalizarDetallePrestamo(detalle: DetallePrestamo): DetallePrestamo {
    return {
      ...detalle,
      fechaVencimiento: this.convertirFecha(detalle.fechaVencimiento) as any,
      fechaPagado: this.convertirFecha(detalle.fechaPagado) as any,
      fechaRegistro: this.convertirFecha(detalle.fechaRegistro) as any,
    };
  }

  private obtenerFechaOrdenCuota(detalle: DetallePrestamo): number {
    return this.convertirFecha(detalle.fechaVencimiento)?.getTime() || Number.MAX_SAFE_INTEGER;
  }

  private redondear(valor: number): number {
    return Math.round((Number(valor) || 0) * 100) / 100;
  }

  private parsearMontoEntrada(valor: string | number | null | undefined): number {
    if (valor === null || valor === undefined) {
      return 0;
    }

    if (typeof valor === 'number') {
      return Number.isFinite(valor) ? valor : 0;
    }

    const texto = String(valor).trim();
    if (!texto) {
      return 0;
    }

    const normalizado = texto.replace(/\s+/g, '');
    const ultimoPunto = normalizado.lastIndexOf('.');
    const ultimaComa = normalizado.lastIndexOf(',');

    let canonical = normalizado;

    if (ultimoPunto > -1 && ultimaComa > -1) {
      const separadorDecimal = ultimoPunto > ultimaComa ? '.' : ',';
      const separadorMiles = separadorDecimal === '.' ? ',' : '.';
      canonical = canonical.split(separadorMiles).join('');
      if (separadorDecimal === ',') {
        canonical = canonical.replace(',', '.');
      }
    } else if (ultimaComa > -1) {
      canonical = canonical.replace(',', '.');
    }

    const numero = Number(canonical);
    return Number.isFinite(numero) ? numero : 0;
  }

  private formatearMontoDosDecimales(valor: number): string {
    return this.redondear(valor).toFixed(2).replace('.', ',');
  }

  private ordenarPrestamosPorProductoObjetivo(
    prestamos: PrestamoAfectable[],
    novedad: NovedadParticipeCarga
  ): PrestamoAfectable[] {
    const codigoProductoNovedad = novedad.codigoProducto != null ? String(novedad.codigoProducto) : null;
    const codigoPetroProductoNovedad = novedad.participeXCargaArchivo?.detalleCargaArchivo?.codigoPetroProducto
      ? String(novedad.participeXCargaArchivo.detalleCargaArchivo.codigoPetroProducto)
      : null;

    const coincideProductoObjetivo = (item: PrestamoAfectable): boolean => {
      const codigoProductoPrestamo = item.prestamo?.producto?.codigo != null
        ? String(item.prestamo.producto.codigo)
        : null;
      const codigoPetroProductoPrestamo = item.prestamo?.producto?.codigoPetro
        ? String(item.prestamo.producto.codigoPetro)
        : null;

      return (
        (codigoProductoNovedad !== null && codigoProductoPrestamo === codigoProductoNovedad) ||
        (codigoPetroProductoNovedad !== null && codigoPetroProductoPrestamo === codigoPetroProductoNovedad)
      );
    };

    const prestamosOrdenados = [...prestamos].sort((a, b) => {
      const aMatch = coincideProductoObjetivo(a);
      const bMatch = coincideProductoObjetivo(b);

      if (aMatch === bMatch) {
        return 0;
      }

      return aMatch ? -1 : 1;
    });

    return prestamosOrdenados;
  }
}


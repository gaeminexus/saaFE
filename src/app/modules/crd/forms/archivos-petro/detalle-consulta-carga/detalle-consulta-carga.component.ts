import { Component, OnInit, signal, ViewChild, AfterViewInit, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { CargaArchivo } from '../../../model/carga-archivo';
import { DetalleCargaArchivo } from '../../../model/detalle-carga-archivo';
import { ParticipeXCargaArchivo } from '../../../model/participe-x-carga-archivo';
import { CargaArchivoService } from '../../../service/carga-archivo.service';
import { DetalleCargaArchivoService } from '../../../service/detalle-carga-archivo.service';
import { ParticipeXCargaArchivoService } from '../../../service/participe-x-carga-archivo.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Filial } from '../../../model/filial';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { NovedadCargaService } from '../../../service/novedad-carga.service';
import { NovedadCarga, NovedadAgrupada } from '../../../model/novedad-carga';
import { ConfirmDialogComponent } from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { CoincidenciasEntidadDialogComponent } from '../../../dialog/coincidencias-entidad-dialog/coincidencias-entidad-dialog.component';
import { ServiciosAsoprepService } from '../../../../asoprep/service/servicios-asoprep.service';
import { EntidadService } from '../../../service/entidad.service';
import { Entidad } from '../../../model/entidad';
import { Prestamo } from '../../../model/prestamo';
import { DetallePrestamo } from '../../../model/detalle-prestamo';
import { AfectacionValoresParticipeCarga } from '../../../model/afectacion-valores-participe-carga';
import { ExportService } from '../../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { UsuarioService } from '../../../../../shared/services/usuario.service';
import { NovedadParticipeCargaService } from '../../../service/novedad-participe-carga.service';
import { PrestamoService } from '../../../service/prestamo.service';
import { DetallePrestamoService } from '../../../service/detalle-prestamo.service';
import { AfectacionValoresParticipeCargaService } from '../../../service/afectacion-valores-participe-carga.service';
import { NovedadParticipeCarga } from '../../../model/novedad-participe-carga';
import { Usuario } from '../../../../../shared/model/usuario';
import { forkJoin, of, catchError, map } from 'rxjs';
import { AfectacionFinancieraCuotasDialogComponent } from '../../../dialog/afectacion-financiera-cuotas-dialog/afectacion-financiera-cuotas-dialog.component';

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
  isLoadingAfectacionFinanciera = signal<boolean>(false);
  isSavingAfectacionFinanciera = signal<boolean>(false);

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
      },
      error: (error) => {
        this.isLoading = false;
        this.snackBar.open('Error al cargar datos de la carga', 'Cerrar', { duration: 3000 });
        this.volverAtras();
      }
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

    // Validar que todas las novedades estén resueltas (código 0 = Sin novedad)
    const novedadesPendientes = this.novedadesAgrupadas().filter(
      novedad => novedad.novedad.codigo !== 0 && novedad.total > 0
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
        this.cargaArchivoService.procesarCargaPetro(this.cargaArchivo!.codigo!).subscribe({
          next: () => {
            this.snackBar.open('Archivo procesado exitosamente. Los registros han sido generados en el sistema.', 'Cerrar', { duration: 5000 });
          },
          error: (err) => {
            this.archivoYaProcesado.set(false);
            const mensaje = err?.message || err?.mensaje || 'Error al procesar el archivo';
            this.snackBar.open(`Error: ${mensaje}`, 'Cerrar', { duration: 5000 });
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

  get montoDisponibleAfectacion(): number {
    const novedad = this.novedadFinancieraSeleccionada();
    if (!novedad) {
      return 0;
    }

    const montoRecibido = this.normalizarMontoPetro(novedad.montoRecibido);
    const montoDiferencia = this.normalizarMontoPetro(novedad.montoDiferencia);
    const montoEsperado = this.normalizarMontoPetro(novedad.montoEsperado);

    return montoRecibido ?? montoDiferencia ?? montoEsperado ?? 0;
  }

  get totalValorAfectarActual(): number {
    return Object.values(this.valoresAfectarEditados()).reduce((sum, valor) => sum + (Number(valor) || 0), 0);
  }

  get saldoPendienteAfectacion(): number {
    return this.redondear(this.montoDisponibleAfectacion - this.totalValorAfectarActual);
  }

  private normalizarMontoPetro(valor: number | string | null | undefined): number | null {
    if (valor === null || valor === undefined) {
      return null;
    }

    const texto = String(valor).trim();
    if (!texto) {
      return null;
    }

    const numero = Number(texto.replace(',', '.'));
    return Number.isFinite(numero) ? numero : null;
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
        getAfectacionesRegistradas: () => this.afectacionesRegistradas(),
        getValoresAfectarEditados: () => this.valoresAfectarEditados(),
        onValorAfectarChange: (detalle: DetallePrestamo, valor: string | number) => this.onValorAfectarChange(detalle, valor),
        getValorAfectarEditado: (detalleCodigo: number | undefined) => this.getValorAfectarEditado(detalleCodigo),
        getValorCuotaOriginal: (detalle: DetallePrestamo | null | undefined) => this.getValorCuotaOriginal(detalle),
        getEstadoCuotaTexto: (detalle: DetallePrestamo | null | undefined) => this.getEstadoCuotaTexto(detalle),
        getMontoDisponibleAfectacion: () => this.montoDisponibleAfectacion,
        getTotalValorAfectarActual: () => this.totalValorAfectarActual,
        getSaldoPendienteAfectacion: () => this.saldoPendienteAfectacion,
        isLoadingAfectacionFinanciera: () => this.isLoadingAfectacionFinanciera(),
        isSavingAfectacionFinanciera: () => this.isSavingAfectacionFinanciera(),
        formatearFecha: (fecha: Date | string | null) => this.formatearFecha(fecha),
        onGuardarAfectaciones: () => this.guardarAfectacionesFinancieras()
      }
    });

    dialogRef.afterOpened().subscribe(() => {
      this.cargarContextoAfectacionFinanciera(novedad);
    });

    dialogRef.afterClosed().subscribe(() => {
      this.resetAfectacionFinancieraState();
    });
  }

  private resetAfectacionFinancieraState(): void {
    this.novedadFinancieraSeleccionada.set(null);
    this.prestamosAfectables.set([]);
    this.afectacionesRegistradas.set([]);
    this.valoresAfectarEditados.set({});
    this.isLoadingAfectacionFinanciera.set(false);
    this.isSavingAfectacionFinanciera.set(false);
  }

  onValorAfectarChange(detalle: DetallePrestamo, valor: string | number): void {
    const detalleCodigo = detalle.codigo;
    const valorNumerico = this.redondear(Number(valor || 0));
    const valorCuota = this.getValorCuotaOriginal(detalle);

    if (!detalleCodigo) {
      return;
    }

    if (Number.isNaN(valorNumerico) || valorNumerico < 0) {
      this.valoresAfectarEditados.update((actual) => ({ ...actual, [detalleCodigo]: 0 }));
      return;
    }

    if (valorNumerico > valorCuota) {
      this.snackBar.open('El valor a cruzar no puede superar el valor de la cuota', 'Cerrar', { duration: 3500 });
      this.valoresAfectarEditados.update((actual) => ({ ...actual, [detalleCodigo]: valorCuota }));
      return;
    }

    const totalSinActual = Object.entries(this.valoresAfectarEditados())
      .filter(([codigo]) => Number(codigo) !== detalleCodigo)
      .reduce((sum, [, current]) => sum + (Number(current) || 0), 0);

    if (this.redondear(totalSinActual + valorNumerico) > this.montoDisponibleAfectacion) {
      this.snackBar.open('La suma de valores a cruzar no puede superar el valor recibido desde Petro', 'Cerrar', {
        duration: 4000,
      });
      return;
    }

    this.valoresAfectarEditados.update((actual) => ({
      ...actual,
      [detalleCodigo]: valorNumerico,
    }));
  }

  getValorAfectarEditado(detalleCodigo: number | undefined): number {
    if (!detalleCodigo) {
      return 0;
    }

    return Number(this.valoresAfectarEditados()[detalleCodigo] || 0);
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

    if (this.totalValorAfectarActual > this.montoDisponibleAfectacion) {
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

    if (operaciones.length === 0) {
      this.snackBar.open('No hay cambios por guardar en las afectaciones', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isSavingAfectacionFinanciera.set(true);

    forkJoin(operaciones).subscribe({
      next: () => {
        this.isSavingAfectacionFinanciera.set(false);
        this.snackBar.open('Afectaciones financieras registradas correctamente', 'Cerrar', { duration: 3500 });
        this.cargarContextoAfectacionFinanciera(novedad);
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

  getEstadoCuotaTexto(detalle: DetallePrestamo | null | undefined): string {
    const codigo = this.obtenerCodigoEstadoCuota(detalle);
    const mapa: Record<number, string> = {
      1: 'PENDIENTE',
      2: 'ACTIVA',
      3: 'EMITIDA',
      4: 'PAGADA',
      5: 'MORA',
      6: 'PARCIAL',
      7: 'CANCELADA ANT.',
      8: 'VENCIDA',
    };

    return mapa[codigo || 0] || '-';
  }

  private cargarContextoAfectacionFinanciera(novedad: NovedadParticipeCarga): void {
    const codigoPetro = novedad.participeXCargaArchivo?.codigoPetro;

    if (!codigoPetro) {
      this.snackBar.open('No se encontró el código Petro del partícipe', 'Cerrar', { duration: 3500 });
      this.prestamosAfectables.set([]);
      this.afectacionesRegistradas.set([]);
      this.valoresAfectarEditados.set({});
      return;
    }

    this.isLoadingAfectacionFinanciera.set(true);
    this.prestamosAfectables.set([]);

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

            const dbSaldo = new DatosBusqueda();
            dbSaldo.asignaUnCampoSinTrunc(TipoDatosBusqueda.DOUBLE, 'saldoTotal', '0', TipoComandosBusqueda.MAYOR);
            criteriosPrestamos.push(dbSaldo);

            const dbOrdenPrestamo = new DatosBusqueda();
            dbOrdenPrestamo.orderBy('fechaInicio');
            dbOrdenPrestamo.setTipoOrden(DatosBusqueda.ORDER_ASC);
            criteriosPrestamos.push(dbOrdenPrestamo);

            this.prestamoService.selectByCriteria(criteriosPrestamos).subscribe({
              next: (prestamosData) => {
                const prestamos = (Array.isArray(prestamosData) ? prestamosData : prestamosData ? [prestamosData] : [])
                  .filter((prestamo) => Number(prestamo?.saldoTotal || 0) > 0);

                if (prestamos.length === 0) {
                  this.isLoadingAfectacionFinanciera.set(false);
                  this.prestamosAfectables.set([]);
                  this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
                  return;
                }

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

                  return this.detallePrestamoService.selectByCriteria(criteriosDetalle).pipe(
                    map((detalleData) => {
                      const detalles = Array.isArray(detalleData) ? detalleData : detalleData ? [detalleData] : [];
                      return {
                        prestamo,
                        cuotas: detalles
                          .map((detalle) => this.normalizarDetallePrestamo(detalle))
                          .filter((detalle) => !this.esCuotaPagadaOCancelada(detalle))
                          .sort((a, b) => this.obtenerFechaOrdenCuota(a) - this.obtenerFechaOrdenCuota(b))
                          .slice(0, 5),
                      } as PrestamoAfectable;
                    }),
                    catchError(() => of({ prestamo, cuotas: [] } as PrestamoAfectable))
                  );
                });

                forkJoin(requests).subscribe({
                  next: (prestamosAfectables) => {
                    this.prestamosAfectables.set(prestamosAfectables.filter((item) => item.cuotas.length > 0));
                    this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
                    this.isLoadingAfectacionFinanciera.set(false);
                  },
                  error: () => {
                    this.prestamosAfectables.set([]);
                    this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
                    this.isLoadingAfectacionFinanciera.set(false);
                    this.snackBar.open('No se pudieron cargar las cuotas afectables', 'Cerrar', { duration: 4000 });
                  }
                });
              },
              error: () => {
                this.isLoadingAfectacionFinanciera.set(false);
                this.prestamosAfectables.set([]);
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
            this.valoresAfectarEditados.set(this.construirMapaValoresAfectados(afectaciones));
            this.snackBar.open('No se pudo consultar la entidad del partícipe', 'Cerrar', { duration: 4000 });
          }
        });
      },
      error: () => {
        this.isLoadingAfectacionFinanciera.set(false);
        this.afectacionesRegistradas.set([]);
        this.prestamosAfectables.set([]);
        this.valoresAfectarEditados.set({});
        this.snackBar.open('No se pudieron cargar las afectaciones registradas', 'Cerrar', { duration: 4000 });
      }
    });
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
    const distribucion = this.distribuirValorAfectar(valorAfectar, valorCuotaOriginal, capitalOriginal, interesOriginal, desgravamenOriginal);

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
      capitalAfectar: distribucion.capital,
      interesAfectar: distribucion.interes,
      desgravamenAfectar: distribucion.desgravamen,
      diferenciaTotal: this.redondear(valorCuotaOriginal - valorAfectar),
      diferenciaCapital: this.redondear(capitalOriginal - distribucion.capital),
      diferenciaInteres: this.redondear(interesOriginal - distribucion.interes),
      diferenciaDesgravamen: this.redondear(desgravamenOriginal - distribucion.desgravamen),
      fechaAfectacion: new Date(),
      usuarioRegistro: usuario.nombre || usuario.codigo?.toString() || '',
      fechaCreacionRegistro: existente?.fechaCreacionRegistro || new Date(),
      observaciones: `Afectación registrada para novedad ${novedad.codigo}`,
      estado: 1,
    };
  }

  private distribuirValorAfectar(
    valorAfectar: number,
    valorTotal: number,
    capitalOriginal: number,
    interesOriginal: number,
    desgravamenOriginal: number
  ): { capital: number; interes: number; desgravamen: number } {
    if (valorTotal <= 0 || valorAfectar <= 0) {
      return { capital: 0, interes: 0, desgravamen: 0 };
    }

    const factor = Math.min(1, valorAfectar / valorTotal);
    let capital = this.redondear(capitalOriginal * factor);
    const interes = this.redondear(interesOriginal * factor);
    const desgravamen = this.redondear(desgravamenOriginal * factor);
    capital = this.redondear(capital + this.redondear(valorAfectar - capital - interes - desgravamen));

    return { capital, interes, desgravamen };
  }

  private obtenerCodigoEstadoCuota(detalle: DetallePrestamo | null | undefined): number | null {
    if (!detalle) {
      return null;
    }

    if (detalle.estado !== null && detalle.estado !== undefined) {
      return Number(detalle.estado);
    }

    if (detalle.idEstado !== null && detalle.idEstado !== undefined) {
      return Number(detalle.idEstado);
    }

    return null;
  }

  private esCuotaPagadaOCancelada(detalle: DetallePrestamo | null | undefined): boolean {
    const codigoEstado = this.obtenerCodigoEstadoCuota(detalle);
    return codigoEstado === 4 || codigoEstado === 7;
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
}


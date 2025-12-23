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
import { ExportService } from '../../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { forkJoin, of } from 'rxjs';

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
    private exportService: ExportService,
    private funcionesDatos: FuncionesDatosService,
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

      return;
    }

    const catalogo: NovedadCarga[] = detalles.map(detalle => ({
      codigo: detalle.codigoAlterno,
      descripcion: detalle.descripcion || `Novedad ${detalle.codigoAlterno}`,
      tipo: detalle.codigoAlterno <= 3 ? 'PARTICIPE' : 'DESCUENTO',
      severidad: this.mapearSeveridad(detalle.codigoAlterno),
      icono: this.mapearIcono(detalle.codigoAlterno),
      colorChip: this.mapearColor(detalle.codigoAlterno)
    }));

    this.catalogoNovedades.set(catalogo);
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
    const tipo = index === 0 ? 'PARTICIPE' : 'DESCUENTO';
    this.novedadesFiltradas = this.novedadesAgrupadas().filter(n => n.novedad.tipo === tipo);
  }

  /**
   * Contar novedades por tipo
   */
  contarNovedades(tipo: 'PARTICIPE' | 'DESCUENTO'): number {
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
      8: 'priority_high'
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
        // TODO: Implementar llamada al backend para procesar archivo
        this.snackBar.open('Funcionalidad de procesamiento en construcción', 'Cerrar', { duration: 3000 });
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
   * Formatea una fecha para mostrar en template
   * Usa el servicio global FuncionesDatosService
   */
  formatearFecha(fecha: any): string {
    if (!fecha) return '-';

    // Usar el método global formatoFechaOrigenConHora que maneja el formato del backend
    // Tipo 1 = FECHA_HORA (DD-MM-YYYY / HH:mm)
    return this.funcionesDatos.formatoFechaOrigenConHora(fecha, FuncionesDatosService.FECHA_HORA) || '-';
  }
}


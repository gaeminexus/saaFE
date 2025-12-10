import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
import { forkJoin, of } from 'rxjs';

const RUBRO_ESTADOS_CARGA = 166;
const RUBRO_NOVEDADES_CARGA = 169;

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
  participes: ParticipeXCargaArchivo[];
}

@Component({
  selector: 'app-detalle-consulta-carga.component',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './detalle-consulta-carga.component.html',
  styleUrl: './detalle-consulta-carga.component.scss'
})
export class DetalleConsultaCargaComponent implements OnInit {

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
    'interesAnual', 'valorSeguro', 'totalDescontar', 'capitalDescontado',
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
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    // Generar años del 2025 al 2035
    for (let anio = 2025; anio <= 2035; anio++) {
      this.anios.push(anio);
    }
  }

  ngOnInit(): void {
    console.log('🔄 Inicializando componente DetalleConsultaCarga...');

    // Verificar si los DetalleRubros ya están cargados en memoria
    const detallesEnMemoria = this.detalleRubroService.getDetalles();
    console.log('📋 DetalleRubros en memoria:', detallesEnMemoria.length);

    if (detallesEnMemoria.length > 0) {
      // ✅ Los datos ya están cargados, usar directamente
      console.log('✅ DetalleRubros ya disponibles en caché, continuando...');
      this.inicializarComponente();
    } else {
      // ⚠️ Los datos no están cargados, cargar desde backend
      console.warn('⚠️ DetalleRubros no disponibles, cargando desde backend...');

      this.detalleRubroService.inicializar().subscribe({
        next: (detalles) => {
          console.log('✅ DetalleRubroService inicializado correctamente');
          console.log('✅ Total de detalles cargados:', detalles?.length || 0);
          this.inicializarComponente();
        },
        error: (error) => {
          console.error('❌ Error al inicializar DetalleRubroService:', error);
          this.snackBar.open('Error al cargar datos del sistema', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  /**
   * Inicializa el componente una vez que los rubros están disponibles
   */
  private inicializarComponente(): void {
    console.log('🚀 Inicializando componente con rubros disponibles...');

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
        console.error('Error al cargar carga archivo:', error);
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
        console.error('Error al cargar detalles:', error);
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
        console.error('Error al cargar partícipes:', error);
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
          participes: []
        });
      }

      const aporte = aportesMap.get(codigoAporte)!;
      aporte.participes.push(participe);
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
    console.log('📋 Catálogo de estados cargado:', detalles);
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
    console.log('🔍 Iniciando carga de catálogo de novedades...');
    const detalles = this.detalleRubroService.getDetallesByParent(RUBRO_NOVEDADES_CARGA);

    console.log('📋 DetalleRubros recuperados para código padre 169:', detalles);
    console.log('📋 Total de detalles encontrados:', detalles?.length || 0);

    if (!detalles || detalles.length === 0) {
      console.warn('⚠ No se encontraron detalles de rubro con código padre 169');

      // Intentar cargar todos los detalles para debug
      const todosLosDetalles = this.detalleRubroService.getDetalles();
      console.log('📋 Total de detalles en servicio:', todosLosDetalles.length);
      console.log('📋 Muestra de detalles:', todosLosDetalles.slice(0, 5));

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
    console.log('✅ Catálogo de novedades cargado:', catalogo);
  }

  /**
   * Procesar novedades después de cargar datos desde backend
   */
  private procesarNovedades(todosLosRegistros: ParticipeXCargaArchivo[]): void {
    console.log('📊 Procesando novedades de carga...');
    console.log('📊 Total de registros a procesar:', todosLosRegistros.length);
    console.log('📊 Primeros 3 registros:', todosLosRegistros.slice(0, 3));

    const catalogo = this.catalogoNovedades();
    console.log('📋 Catálogo de novedades disponible:', catalogo);
    console.log('📋 Total de items en catálogo:', catalogo.length);

    if (catalogo.length === 0) {
      console.warn('⚠ Catálogo de novedades no cargado aún');
      console.warn('⚠ Intentando recargar catálogo...');
      this.cargarCatalogoNovedades();

      // Verificar si se cargó
      const catalogoActualizado = this.catalogoNovedades();
      if (catalogoActualizado.length === 0) {
        console.error('❌ No se pudo cargar el catálogo de novedades');
        return;
      }
      console.log('✅ Catálogo recargado exitosamente');
    }

    const agrupadas = this.novedadCargaService.agruparPorNovedad(
      todosLosRegistros,
      this.catalogoNovedades()
    );

    console.log('📊 Novedades agrupadas resultantes:', agrupadas);
    console.log('📊 Total de grupos de novedades:', agrupadas.length);

    this.novedadesAgrupadas.set(agrupadas);
    this.onTabNovedadChange(0); // Inicializar con tab de Partícipes

    console.log('✅ Signal novedadesAgrupadas actualizado. Valor actual:', this.novedadesAgrupadas());
    console.log('✅ novedadesFiltradas:', this.novedadesFiltradas);
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

    if (novedad === 1) {
      // PARTICIPE NO ENCONTRADO - Mostrar diálogo de coincidencias
      this.mostrarCoincidencias(registro);
    } else if (novedad === 2) {
      this.corregirDuplicado(registro);
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
        console.log('✅ Entidad seleccionada:', entidadSeleccionada);
        console.log('📝 Registro original:', registro);

        // Llamar al servicio para actualizar el código Petro con la entidad seleccionada
        this.isLoading = true;
        this.serviciosAsoprepService.actualizaCodigoPetroEntidad(
          registro.codigoPetro,
          registro.codigo!,
          entidadSeleccionada.codigo
        ).subscribe({
          next: (participeActualizado: ParticipeXCargaArchivo | null) => {
            console.log('✅ Partícipe actualizado:', participeActualizado);

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
            console.error('❌ Error al actualizar partícipe:', error);
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
    console.log('🔄 Actualizando registro en novedades...');

    // Obtener todas las novedades agrupadas actuales
    const novedadesActuales = this.novedadesAgrupadas();

    // Buscar la novedad que contiene el registro
    const novedadConRegistro = novedadesActuales.find(novedad =>
      novedad.registros.some(r => r.codigo === registroOriginal.codigo)
    );

    if (!novedadConRegistro) {
      console.warn('⚠ No se encontró la novedad que contiene el registro');
      return;
    }

    console.log('📋 Novedad original:', novedadConRegistro.novedad.descripcion);
    console.log('📋 Total registros antes:', novedadConRegistro.total);

    // Remover el registro de la novedad actual
    const registrosFiltrados = novedadConRegistro.registros.filter(
      r => r.codigo !== registroOriginal.codigo
    );

    // Actualizar el total de la novedad
    novedadConRegistro.registros = registrosFiltrados;
    novedadConRegistro.total = registrosFiltrados.length;

    console.log('📋 Total registros después:', novedadConRegistro.total);

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
      console.log('✅ Registro movido a "Sin novedad"');
    }

    // Filtrar novedades vacías
    const novedadesFiltradas = novedadesActuales.filter(n => n.total > 0);

    // Actualizar el signal de novedades agrupadas
    this.novedadesAgrupadas.set(novedadesFiltradas);

    // Refrescar las novedades filtradas del tab actual
    this.onTabNovedadChange(this.tabNovedadSeleccionado);

    console.log('✅ Novedades actualizadas correctamente');
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
        console.log('🔍 Partícipes similares encontrados:', similares);

        // TODO: Abrir dialog de selección
        this.snackBar.open(
          `✓ Encontrados ${similares.length} partícipes similares`,
          'Cerrar',
          { duration: 3000 }
        );
      },
      error: (error) => {
        console.error('❌ Error al buscar similares:', error);
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
    console.log('📝 Corrigiendo duplicado:', registro);
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
}


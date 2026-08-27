import { Component, OnInit, signal, ViewChild, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

import { Entidad } from '../../../model/entidad';
import { Producto } from '../../../model/producto';
import { Prestamo } from '../../../model/prestamo';
import { DetallePrestamo } from '../../../model/detalle-prestamo';
import { ServiciosCrd } from '../../../service/ws-crd';
import { PagoPrestamo, pagoVigente } from '../../../model/pago-prestamo';

import { EntidadService } from '../../../service/entidad.service';
import { ProductoService } from '../../../service/producto.service';
import { PrestamoService } from '../../../service/prestamo.service';
import { DetallePrestamoService } from '../../../service/detalle-prestamo.service';
import { PagoPrestamoService } from '../../../service/pago-prestamo.service';
import { EstadoPrestamoService } from '../../../service/estado-prestamo.service';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';

// Enum para los niveles de navegación
enum NivelNavegacion {
  ENTIDADES = 1,
  PRESTAMOS = 2,
  DETALLE_PRESTAMOS = 3,
  PAGO_PRESTAMO = 4
}

// Interface para el breadcrumb
interface Breadcrumb {
  nivel: NivelNavegacion;
  titulo: string;
  subtitulo?: string;
  activo: boolean;
}

@Component({
  selector: 'app-navegacion-cascada',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './navegacion-cascada.component.html',
  styleUrls: ['./navegacion-cascada.component.scss']
})
export class NavegacionCascadaComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  // Señales para el estado
  nivelActual = signal<NivelNavegacion>(NivelNavegacion.ENTIDADES);
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Breadcrumbs
  breadcrumbs = signal<Breadcrumb[]>([]);

  // Datos seleccionados para navegación
  entidadSeleccionada = signal<Entidad | null>(null);
  productoSeleccionado = signal<Producto | null>(null);
  prestamoSeleccionado = signal<Prestamo | null>(null);
  detallePrestamoSeleccionado = signal<DetallePrestamo | null>(null);

  // Fuentes de datos para las tablas
  dataSourceEntidades = new MatTableDataSource<Entidad>([]);
  dataSourceProductos = new MatTableDataSource<Producto>([]);
  dataSourcePrestamos = new MatTableDataSource<Prestamo>([]);
  dataSourceDetallePrestamos = new MatTableDataSource<DetallePrestamo>([]);
  dataSourcePagos = new MatTableDataSource<PagoPrestamo>([]);

  // Columnas para cada tabla
  columnasEntidades: string[] = ['codigo', 'razonSocial', 'numeroIdentificacion', 'correoPersonal', 'movil', 'acciones'];
  columnasProductos: string[] = ['codigo', 'nombre', 'codigoSBS', 'tipoPrestamo', 'estado', 'acciones'];
  columnasPrestamosResumen: string[] = ['codigo', 'producto', 'amortizacion', 'montoSolicitado', 'estado', 'acciones'];
  columnasDetallePrestamos: string[] = ['numeroCuota', 'fechaVencimiento', 'capital', 'interes', 'mora', 'interesVencido', 'saldoCapital', 'fechaPagado', 'acciones'];
  columnasPagos: string[] = ['fecha', 'valor', 'numeroCuota', 'capitalPagado', 'interesPagado', 'moraPagada', 'idEstado'];

  // Filtros
  filtroEntidades = '';
  filtroProductos = '';
  filtroPrestamos = '';
  filtroPagos = '';

  // Paginación (basado en Exters)
  pageSizeEnt = 20;
  pageIndexEnt = 0;
  totalEntidades = signal<number>(0);
  allEntidades: Entidad[] = [];
  currentFilterEnt = '';

  // Paginación Productos
  pageSizeProd = 20;
  pageIndexProd = 0;
  totalProductos = signal<number>(0);
  allProductos: Producto[] = [];
  currentFilterProd = '';

  // Paginación Prestamos
  pageSizePrest = 20;
  pageIndexPrest = 0;
  totalPrestamos = signal<number>(0);
  allPrestamos: Prestamo[] = [];
  currentFilterPrest = '';

  // Paginación DetallePrestamo
  pageSizeDet = 20;
  pageIndexDet = 0;
  totalDetallePrestamos = signal<number>(0);
  allDetallePrestamos: DetallePrestamo[] = [];
  currentFilterDet = '';

  // Paginación Pagos
  pageSizePag = 20;
  pageIndexPag = 0;
  totalPagos = signal<number>(0);
  allPagos: PagoPrestamo[] = [];
  currentFilterPag = '';

  // Variables para selectByCriteria
  criterioConsultaArray: Array<DatosBusqueda> = [];
  criterioConsulta = new DatosBusqueda();

  constructor(
    private entidadService: EntidadService,
    private productoService: ProductoService,
    private prestamoService: PrestamoService,
    private detallePrestamoService: DetallePrestamoService,
    private pagoPrestamoService: PagoPrestamoService,
    private estadoPrestamoService: EstadoPrestamoService,
    private cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.configurarTablas();
    this.inicializarBreadcrumbs();
    this.cargarEntidades();
  }

  ngAfterViewInit(): void {
    // Configurar paginación y ordenamiento después de que la vista esté inicializada
    // Para paginación manual no enlazamos el paginator al dataSource
    this.dataSourceEntidades.sort = this.sort;

    // Configurar paginación por defecto
    if (this.paginator) {
      this.paginator.pageSize = this.pageSizeEnt; // 20 por página
      this.paginator.pageSizeOptions = [10, 20, 50, 100];
    }

    // Evitar ExpressionChangedAfterItHasBeenCheckedError en dev
    this.cd.detectChanges();
  }

  private configurarTablas(): void {
    // Configurar filtro personalizado para entidades
    this.dataSourceEntidades.filterPredicate = (data: Entidad, filter: string) => {
      const searchTerms = filter.toLowerCase();
      return (
        data.codigo?.toString().includes(searchTerms) ||
        data.razonSocial?.toLowerCase().includes(searchTerms) ||
        data.numeroIdentificacion?.toLowerCase().includes(searchTerms) ||
        data.correoPersonal?.toLowerCase().includes(searchTerms) ||
        data.nombreComercial?.toLowerCase().includes(searchTerms)
      );
    };
  }

  private inicializarBreadcrumbs(): void {
    this.breadcrumbs.set([
      {
        nivel: NivelNavegacion.ENTIDADES,
        titulo: 'Entidades',
        subtitulo: 'Selecciona una entidad',
        activo: true
      }
    ]);
  }

  // Cargar datos del nivel 1: Entidades
  cargarEntidades(): void {
    this.loading.set(true);
    this.errorMsg.set('');

    // Priorizar selectByCriteria con fallback a getAll
    this.entidadService.selectByCriteria([]).pipe(
      catchError(err => {
        console.warn('selectByCriteria falló, intentando getAll como fallback:', err);
        return this.entidadService.getAll();
      })).pipe(
      catchError(err => {
        console.error('Error cargando entidades:', err);
        const detalle = mensajeDeError(err, '') || err?.statusText || '';
        this.errorMsg.set(detalle ? `Error al cargar entidades: ${detalle}` : 'Error al cargar entidades');
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe(entidades => {
      console.log('📊 Total entidades recibidas del backend:', entidades?.length || 0);
      this.allEntidades = entidades || [];
      this.totalEntidades.set(this.allEntidades.length);
      this.pageIndexEnt = 0;
      this.updatePageEntidades();
    });
  }

  // Paginación manual basada en Exters
  updatePageEntidades(): void {
    let filtered = this.allEntidades;
    if (this.currentFilterEnt) {
      const f = this.currentFilterEnt.toLowerCase();
      filtered = this.allEntidades.filter(e =>
        e.codigo?.toString().includes(f) ||
        e.razonSocial?.toLowerCase().includes(f) ||
        e.numeroIdentificacion?.toLowerCase().includes(f) ||
        e.correoPersonal?.toLowerCase().includes(f) ||
        e.nombreComercial?.toLowerCase().includes(f)
      );
    }
    const start = this.pageIndexEnt * this.pageSizeEnt;
    const end = start + this.pageSizeEnt;
    this.dataSourceEntidades.data = filtered.slice(start, end);
    this.totalEntidades.set(filtered.length);
  }

  pageChangedEntidades(e: PageEvent): void {
    this.pageSizeEnt = e.pageSize;
    this.pageIndexEnt = e.pageIndex;
    this.updatePageEntidades();
  }

  // Seleccionar entidad y navegar a productos
  seleccionarEntidad(entidad: Entidad): void {
    this.entidadSeleccionada.set(entidad);
    // Cambiamos la lógica: ir directo a Préstamos de la entidad
    this.nivelActual.set(NivelNavegacion.PRESTAMOS);

    // Actualizar breadcrumbs: Entidades -> Préstamos
    this.breadcrumbs.set([
      {
        nivel: NivelNavegacion.ENTIDADES,
        titulo: 'Entidades',
        subtitulo: entidad.razonSocial,
        activo: false
      },
      {
        nivel: NivelNavegacion.PRESTAMOS,
        titulo: 'Préstamos',
        subtitulo: 'Listado',
        activo: true
      }
    ]);

    this.cargarPrestamos();
  }

  // Cargar productos de la entidad seleccionada
  cargarProductos(codigoEntidad: number): void {
    this.loading.set(true);
    this.errorMsg.set('');

    // Construir criterios de búsqueda para productos por entidad
    const criterios: Array<DatosBusqueda> = [];

    // Si se requiere filtrar por entidad, descomentar:
    // const criterioEntidad = new DatosBusqueda();
    // criterioEntidad.asigna3(TipoDatosBusqueda.LONG, 'entidadId', codigoEntidad.toString(), TipoComandosBusqueda.IGUAL);
    // criterios.push(criterioEntidad);

    // Priorizar selectByCriteria con fallback a getAll
    this.productoService.selectByCriteria(criterios).pipe(
      catchError(err => {
        console.warn('selectByCriteria falló para productos, intentando getAll como fallback:', err);
        return this.productoService.getAll();
      }),
      catchError(err => {
        this.errorMsg.set('Error al cargar productos: ' + mensajeDeError(err, ''));
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((productos: Producto[] | null) => {
      // Si existiese relación por entidad, aquí se podría filtrar por codigoEntidad
      this.allProductos = productos ?? [];
      this.totalProductos.set(this.allProductos.length);
      this.pageIndexProd = 0;
      this.updatePageProductos();
    });
  }

  // Navegar hacia atrás en el breadcrumb
  navegarA(nivel: NivelNavegacion): void {
    switch (nivel) {
      case NivelNavegacion.ENTIDADES:
        this.volverAEntidades();
        break;
      case NivelNavegacion.PRESTAMOS:
        if (this.entidadSeleccionada()) {
          this.seleccionarEntidad(this.entidadSeleccionada()!);
        }
        break;
      case NivelNavegacion.DETALLE_PRESTAMOS:
        // Si estamos en el detalle de un préstamo específico, volver al listado de préstamos
        if (this.prestamoSeleccionado()) {
          this.prestamoSeleccionado.set(null);
          this.nivelActual.set(NivelNavegacion.PRESTAMOS);
          const entidad = this.entidadSeleccionada();
          this.breadcrumbs.set([
            { nivel: NivelNavegacion.ENTIDADES, titulo: 'Entidades', subtitulo: entidad?.razonSocial, activo: false },
            { nivel: NivelNavegacion.PRESTAMOS, titulo: 'Préstamos', subtitulo: 'Listado', activo: true }
          ]);
          this.cargarPrestamos();
        }
        break;
    }
  }

  private volverAEntidades(): void {
    this.nivelActual.set(NivelNavegacion.ENTIDADES);
    this.entidadSeleccionada.set(null);
    this.productoSeleccionado.set(null);
    this.prestamoSeleccionado.set(null);
    this.inicializarBreadcrumbs();
  }

  // Aplicar filtros
  aplicarFiltroEntidades(valor: string): void {
    this.filtroEntidades = valor.trim().toLowerCase();
    this.currentFilterEnt = this.filtroEntidades;
    this.pageIndexEnt = 0;
    this.updatePageEntidades();

    console.log(`🔍 Filtro aplicado: "${this.filtroEntidades}"`);
    console.log(`📊 Resultados: ${this.totalEntidades()} de ${this.allEntidades.length}`);
  }

  aplicarFiltroProductos(valor: string): void {
    this.filtroProductos = valor.trim().toLowerCase();
    this.currentFilterProd = this.filtroProductos;
    this.pageIndexProd = 0;
    this.updatePageProductos();
  }

  // Getters para templates
  get mostrandoEntidades(): boolean {
    return this.nivelActual() === NivelNavegacion.ENTIDADES;
  }

  get mostrandoPrestamos(): boolean {
    return this.nivelActual() === NivelNavegacion.PRESTAMOS;
  }

  get mostrandoDetallePrestamos(): boolean {
    return this.nivelActual() === NivelNavegacion.DETALLE_PRESTAMOS;
  }

  get mostrandoPagoPrestamo(): boolean {
    return this.nivelActual() === NivelNavegacion.PAGO_PRESTAMO;
  }

  // Track functions para rendimiento
  trackEntidad(index: number, item: Entidad): number {
    return item.codigo;
  }

  trackProducto(index: number, item: Producto): number {
    return item.codigo;
  }

  trackDetallePrestamo(index: number, item: DetallePrestamo): number {
    return item.codigo;
  }

  // Productos - paginación manual
  updatePageProductos(): void {
    let filtered = this.allProductos;
    if (this.currentFilterProd) {
      const f = this.currentFilterProd.toLowerCase();
      filtered = this.allProductos.filter(p =>
        p.codigo?.toString().includes(f) ||
        p.nombre?.toLowerCase().includes(f) ||
        p.codigoSBS?.toLowerCase().includes(f)
      );
    }
    const start = this.pageIndexProd * this.pageSizeProd;
    const end = start + this.pageSizeProd;
    this.dataSourceProductos.data = filtered.slice(start, end);
    this.totalProductos.set(filtered.length);
  }

  pageChangedProductos(e: PageEvent): void {
    this.pageSizeProd = e.pageSize;
    this.pageIndexProd = e.pageIndex;
    this.updatePageProductos();
  }

  // Selección y carga de préstamos
  seleccionarProducto(producto: Producto): void {
    this.productoSeleccionado.set(producto);
    this.nivelActual.set(NivelNavegacion.DETALLE_PRESTAMOS);

    // Actualizar breadcrumbs
    const entidad = this.entidadSeleccionada();
    this.breadcrumbs.set([
      { nivel: NivelNavegacion.ENTIDADES, titulo: 'Entidades', subtitulo: entidad?.razonSocial, activo: false },
      { nivel: NivelNavegacion.PRESTAMOS, titulo: 'Préstamos', subtitulo: producto.nombre, activo: false },
      { nivel: NivelNavegacion.DETALLE_PRESTAMOS, titulo: 'Detalle Préstamos', subtitulo: 'Listado', activo: true }
    ]);

    // Filtrar préstamos por entidad (no por producto)
    this.cargarPrestamos();
  }

  // Nueva función para seleccionar un préstamo específico y navegar al detalle
  seleccionarPrestamo(prestamo: Prestamo): void {
    console.log('🎯 Seleccionando préstamo para ver detalle:', prestamo.idAsoprep);
    this.prestamoSeleccionado.set(prestamo);
    this.nivelActual.set(NivelNavegacion.DETALLE_PRESTAMOS);

    // Actualizar breadcrumbs
    const entidad = this.entidadSeleccionada();
    this.breadcrumbs.set([
      { nivel: NivelNavegacion.ENTIDADES, titulo: 'Entidades', subtitulo: entidad?.razonSocial, activo: false },
      { nivel: NivelNavegacion.PRESTAMOS, titulo: 'Préstamos', subtitulo: 'Listado', activo: false },
      { nivel: NivelNavegacion.DETALLE_PRESTAMOS, titulo: 'Detalle Préstamo', subtitulo: `ID Asoprep: ${prestamo.idAsoprep}`, activo: true }
    ]);

    // Cargar el detalle específico del préstamo
    this.cargarDetallePrestamo(prestamo.codigo);
  }

  // Navegar al nivel 4 cuando se selecciona un detalle préstamo
  seleccionarDetallePrestamo(detallePrestamo: DetallePrestamo): void {
    console.log('🎯 Seleccionando detalle préstamo para ver pagos:', detallePrestamo.codigo);
    this.detallePrestamoSeleccionado.set(detallePrestamo);
    this.nivelActual.set(NivelNavegacion.PAGO_PRESTAMO);

    // Actualizar breadcrumbs
    const entidad = this.entidadSeleccionada();
    const prestamo = this.prestamoSeleccionado();
    this.breadcrumbs.set([
      { nivel: NivelNavegacion.ENTIDADES, titulo: 'Entidades', subtitulo: entidad?.razonSocial, activo: false },
      { nivel: NivelNavegacion.PRESTAMOS, titulo: 'Préstamos', subtitulo: 'Listado', activo: false },
      { nivel: NivelNavegacion.DETALLE_PRESTAMOS, titulo: 'Detalle Préstamo', subtitulo: `Código: ${prestamo?.codigo}`, activo: false },
      { nivel: NivelNavegacion.PAGO_PRESTAMO, titulo: 'Pagos', subtitulo: `Cuota: ${detallePrestamo.numeroCuota}`, activo: true }
    ]);

    // Cargar los pagos del detalle préstamo seleccionado
    this.cargarPagoPrestamo(detallePrestamo.codigo);
  }

  cargarPrestamos(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    const codigoEntidad = this.entidadSeleccionada()?.codigo;
    console.log('🔍 Cargando préstamos para entidad:', codigoEntidad);

    if (!codigoEntidad) {
      console.warn('⚠️ No hay entidad seleccionada');
      this.loading.set(false);
      this.allPrestamos = [];
      this.updatePagePrestamos();
      return;
    }

    // Intentar con selectByCriteria si el backend lo soporta
    const criterio = { entidadCodigo: codigoEntidad } as any;
    this.criterioConsultaArray = [];

    this.criterioConsulta = new DatosBusqueda();
    this.criterioConsulta.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'entidad.codigo', codigoEntidad.toString(), TipoComandosBusqueda.IGUAL);
    this.criterioConsultaArray.push(this.criterioConsulta);

    // También agregar criterio por número de identificación de la entidad para mayor precisión
    const entidadSeleccionada = this.entidadSeleccionada();
    if (entidadSeleccionada?.numeroIdentificacion) {
      const criterioIdentificacion = new DatosBusqueda();
      criterioIdentificacion.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'entidad.numeroIdentificacion',
                                    entidadSeleccionada.numeroIdentificacion, TipoComandosBusqueda.IGUAL);
      criterioIdentificacion.setTipoOperadorLogico(TipoComandosBusqueda.OR);
      this.criterioConsultaArray.push(criterioIdentificacion);
    }

    this.criterioConsulta = new DatosBusqueda();
    // Orden por código (sin flags especiales que rompan el backend)
    this.criterioConsulta.orderBy('codigo');
    this.criterioConsultaArray.push(this.criterioConsulta);

    this.prestamoService.selectByCriteria(this.criterioConsultaArray).pipe(
      catchError(err => {
        // Fallback: intentar getAll y filtrar (no recomendado para grandes volúmenes)
        console.log('⚠️ Falling back to getAll for préstamos due to error:', err);
        return this.prestamoService.getAll().pipe(
          catchError(() => of([] as Prestamo[])),
          finalize(() => {})
        );
      }),
      finalize(() => this.loading.set(false))
    ).subscribe((prestamos: any) => {
      console.log('📦 Préstamos recibidos del backend:', prestamos);
      let lista: Prestamo[] = Array.isArray(prestamos) ? prestamos : [];

      // Filtro por entidad si fue fallback y el objeto tiene entidad
      if (lista.length && lista[0] && (lista[0] as any).entidad) {
        lista = lista.filter(p => (p as any).entidad?.codigo === codigoEntidad);
        console.log('🔍 Préstamos filtrados por entidad:', lista.length);
      }

      // Enriquecer préstamos con información completa de productos
      if (lista.length > 0) {
        this.enriquecerPrestamosConProductos(lista)
          .then((prestamosConProducto) => this.enriquecerPrestamosConEstados(prestamosConProducto))
          .then((prestamosFinales) => {
            this.allPrestamos = prestamosFinales;
            this.totalPrestamos.set(this.allPrestamos.length);
            this.pageIndexPrest = 0;
            this.updatePagePrestamos();
          });
      } else {
        this.allPrestamos = lista;
        this.totalPrestamos.set(this.allPrestamos.length);
        this.pageIndexPrest = 0;
        this.updatePagePrestamos();
      }
    });
  }

  /**
   * Enriquece los préstamos con información completa de productos usando selectByCriteria
   */
  private async enriquecerPrestamosConProductos(prestamos: Prestamo[]): Promise<Prestamo[]> {
    console.log('🔍 Enriqueciendo préstamos con información de productos...');

    try {
      // Obtener códigos únicos SOLO de productos incompletos (sin nombre o sin códigoSBS)
      const codigosProductos = [...new Set(prestamos
        .map(p => {
          const prod: any = p.producto;
          // Si ya trae nombre y códigoSBS, no hace falta enriquecer
          if (prod && (prod.nombre || prod.codigoSBS)) {
            return null;
          }
          return prod?.codigo ?? null;
        })
        .filter(codigo => codigo != null)
      )];

      if (codigosProductos.length === 0) {
        console.log('⚠️ No hay códigos de productos para enriquecer');
        return prestamos;
      }

      console.log('📋 Códigos de productos encontrados:', codigosProductos);

      // Construir criterios para buscar productos
      const criteriosProductos: any[] = [];

      // Agregar criterio para cada código de producto
      codigosProductos.forEach(codigo => {
        const criterio = new DatosBusqueda();
        criterio.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'codigo', codigo.toString(), TipoComandosBusqueda.IGUAL);
        criteriosProductos.push(criterio);
      });

      // Si hay más de un producto, usar OR entre ellos
      if (criteriosProductos.length > 1) {
        for (let i = 1; i < criteriosProductos.length; i++) {
          criteriosProductos[i].setTipoOperadorLogico(TipoComandosBusqueda.OR);
        }
      }

      // Obtener productos del backend con manejo mejorado de errores
      console.log('🔍 Consultando productos al backend...');
      let productos: Producto[] | null = null;

      try {
        const resultado = await this.productoService.selectByCriteria(criteriosProductos)
          .pipe(
            catchError(err => {
              console.warn('⚠️ selectByCriteria falló, intentando getAll y filtrar localmente...');
              // Fallback: obtener todos los productos y filtrar localmente
              return this.productoService.getAll().pipe(
                catchError(() => of([] as Producto[]))
              );
            })
          ).toPromise();

        productos = resultado || null;

        // Si obtuvimos todos los productos, filtrar por los códigos que necesitamos
        if (productos && productos.length > 0 && codigosProductos.length > 0) {
          const productosFiltrados = productos.filter(p => codigosProductos.includes(p.codigo));
          if (productosFiltrados.length > 0) {
            productos = productosFiltrados;
            console.log('🔧 Productos filtrados localmente:', productosFiltrados.length);
          }
        }
      } catch (error) {
        console.error('❌ Error total en carga de productos:', error);
        productos = [];
      }

      console.log('🎯 Productos obtenidos:', productos?.length || 0);

      // Crear mapa de productos por código para acceso rápido
      const mapaProductos = new Map<number, Producto>();
      if (productos && Array.isArray(productos)) {
        productos.forEach(producto => {
          if (producto.codigo) {
            mapaProductos.set(producto.codigo, producto);
          }
        });
      }

      // Enriquecer cada préstamo con la información completa del producto
      const prestamosEnriquecidos = prestamos.map(prestamo => {
        // Acceder al campo producto (minúscula) o Producto (mayúscula) según el backend real
        const codigoProducto = (prestamo as any).producto?.codigo || prestamo.producto?.codigo;

        // Convertir fechas que puedan venir en formato array desde el backend
        const fechaPrestamo = this.convertirFecha(prestamo.fecha);
        const fechaRegistro = this.convertirFecha(prestamo.fechaRegistro);

        if (codigoProducto) {
          const productoCompleto = mapaProductos.get(codigoProducto);
          if (productoCompleto) {
            return {
              ...prestamo,
              // Asignar el producto completo
              producto: productoCompleto,
              // Convertir fechas
              fecha: fechaPrestamo || prestamo.fecha,
              fechaRegistro: fechaRegistro || prestamo.fechaRegistro,
            };
          }
        }
        return {
          ...prestamo,
          fecha: fechaPrestamo || prestamo.fecha,
          fechaRegistro: fechaRegistro || prestamo.fechaRegistro,
        };
      });

      console.log('✅ Préstamos enriquecidos exitosamente');
      return prestamosEnriquecidos;

    } catch (error) {
      console.error('❌ Error enriqueciendo préstamos con productos:', error);
      return prestamos; // Retornar préstamos originales si hay error
    }
  }



  updatePagePrestamos(): void {
    let filtered = this.allPrestamos;
    console.log('📊 Total préstamos en allPrestamos:', this.allPrestamos.length);

    // Filtro de búsqueda adicional (basado en la estructura real del modelo Prestamo)
    if (this.currentFilterPrest) {
      const f = this.currentFilterPrest.toLowerCase();
      filtered = filtered.filter(p => {
        return (
          p.codigo?.toString().includes(f) ||
          p.entidad?.codigo?.toString().includes(f) ||
          p.entidad?.razonSocial?.toLowerCase().includes(f) ||
          p.entidad?.numeroIdentificacion?.toLowerCase().includes(f) ||
          // Buscar tanto en 'producto' (minúscula) como en 'Producto' (mayúscula)
          (p as any).producto?.nombre?.toLowerCase().includes(f) ||
          (p as any).producto?.codigoSBS?.toLowerCase().includes(f) ||
          p.producto?.nombre?.toLowerCase().includes(f) ||
          p.producto?.codigoSBS?.toLowerCase().includes(f) ||
          p.montoSolicitado?.toString().includes(f) ||
          p.plazo?.toString().includes(f) ||
          p.estadoPrestamo?.nombre?.toLowerCase().includes(f) ||
          this.getEstadoNombre(p).toLowerCase().includes(f)
        );
      });
    }
    const start = this.pageIndexPrest * this.pageSizePrest;
    const end = start + this.pageSizePrest;
    this.dataSourcePrestamos.data = filtered.slice(start, end);
    this.totalPrestamos.set(filtered.length);
    console.log('📄 Préstamos en página actual:', this.dataSourcePrestamos.data.length);
  }

  pageChangedPrestamos(e: PageEvent): void {
    this.pageSizePrest = e.pageSize;
    this.pageIndexPrest = e.pageIndex;
    this.updatePagePrestamos();
  }

  // DetallePrestamo - paginación manual
  updatePageDetallePrestamos(): void {
    console.log('🔄 INICIANDO updatePageDetallePrestamos()');
    console.log('🔄 allDetallePrestamos.length:', this.allDetallePrestamos?.length || 0);
    console.log('🔄 Muestra de datos en allDetallePrestamos:', this.allDetallePrestamos?.[0]);

    let filtered = this.allDetallePrestamos;
    console.log('📊 Total cuotas en allDetallePrestamos:', this.allDetallePrestamos.length);

    // Filtro de búsqueda adicional
    if (this.currentFilterDet) {
      const f = this.currentFilterDet.toLowerCase();
      console.log('🔍 Aplicando filtro de búsqueda:', f);
      filtered = filtered.filter(d => {
        return (
          d.numeroCuota?.toString().includes(f) ||
          d.capital?.toString().includes(f) ||
          d.interes?.toString().includes(f) ||
          d.saldoCapital?.toString().includes(f) ||
          (d.fechaVencimiento && new Date(d.fechaVencimiento).toLocaleDateString().includes(f)) ||
          (d.fechaPagado && new Date(d.fechaPagado).toLocaleDateString().includes(f))
        );
      });
      console.log('🔍 Después del filtro quedan:', filtered.length, 'cuotas');
    }

    const start = this.pageIndexDet * this.pageSizeDet;
    const end = start + this.pageSizeDet;
    console.log('📄 Paginación - start:', start, 'end:', end, 'pageSize:', this.pageSizeDet, 'pageIndex:', this.pageIndexDet);

    const paginatedData = filtered.slice(start, end);
    console.log('📄 Datos paginados (slice):', paginatedData.length, 'elementos');
    console.log('📄 Primera cuota de la página:', paginatedData[0]);

    this.dataSourceDetallePrestamos.data = paginatedData;
    this.totalDetallePrestamos.set(filtered.length);

    console.log('✅ DataSource.data asignado con', this.dataSourceDetallePrestamos.data.length, 'elementos');
    console.log('✅ totalDetallePrestamos signal actualizado a:', this.totalDetallePrestamos());
    console.log('✅ Estado final del dataSource:', {
      dataLength: this.dataSourceDetallePrestamos.data.length,
      firstItem: this.dataSourceDetallePrestamos.data[0],
      totalSignal: this.totalDetallePrestamos()
    });
  }

  pageChangedDetallePrestamos(e: PageEvent): void {
    this.pageSizeDet = e.pageSize;
    this.pageIndexDet = e.pageIndex;
    this.updatePageDetallePrestamos();
  }

  // Método para calcular total de página
  getTotalPages(): number {
    return this.pageSizeEnt > 0 ? Math.ceil(this.totalEntidades() / this.pageSizeEnt) : 0;
  }

  /**
   * Enriquece los préstamos con la información del Estado de Préstamo (nombre) consultando la tabla ESPS
   */
  private async enriquecerPrestamosConEstados(prestamos: Prestamo[]): Promise<Prestamo[]> {
    console.log('🔍 Iniciando enriquecimiento de estados...');
    console.log('📦 Muestra de préstamo para diagnóstico:', prestamos[0]);

    try {
      // Helper para obtener código de estado desde distintas formas del backend
      const getCodigoEstado = (p: any): number | null => {
        const est = p?.estadoPrestamo;

        // 1) si viene como número directo (p.ej. FK cruda)
        if (typeof est === 'number') return Number(est);
        // 2) objeto con codigo
        if (est && (est.codigo || est.Codigo)) return Number(est.codigo ?? est.Codigo);
        // 3) algunos backends envían solo idEstado en préstamo
        if (p?.idEstado != null) return Number(p.idEstado);
        // 4) variantes posibles
        if (p?.estadoPrestamoCodigo != null) return Number(p.estadoPrestamoCodigo);
        if (p?.estadoCodigo != null) return Number(p.estadoCodigo);

        return null;
      };      // Extraer códigos únicos de estado que no tengan nombre cargado
      const codigosEstados = [
        ...new Set(
          prestamos
            .map((p: any) => {
              const est = p.estadoPrestamo;
              if (est && est.nombre) return null; // ya tiene nombre
              return getCodigoEstado(p);
            })
            .filter((c) => c != null)
        ),
      ] as number[];

      if (codigosEstados.length === 0) {
        return prestamos;
      }

      // Construir criterios OR para buscar los estados por código, idEstado o codigoExterno
      const criterios: any[] = [];
      codigosEstados.forEach((codigo, idx) => {
        const c1 = new DatosBusqueda();
        c1.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'codigo', String(codigo), TipoComandosBusqueda.IGUAL);
        if (idx > 0) c1.setTipoOperadorLogico(TipoComandosBusqueda.OR);
        criterios.push(c1);

        const c2 = new DatosBusqueda();
        c2.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'idEstado', String(codigo), TipoComandosBusqueda.IGUAL);
        c2.setTipoOperadorLogico(TipoComandosBusqueda.OR);
        criterios.push(c2);

        const c3 = new DatosBusqueda();
        c3.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'codigoExterno', String(codigo), TipoComandosBusqueda.IGUAL);
        c3.setTipoOperadorLogico(TipoComandosBusqueda.OR);
        criterios.push(c3);
      });

      // Intentar selectByCriteria, fallback a getAll + filtro
      let estados = await this.estadoPrestamoService
        .selectByCriteria(criterios)
        .pipe(
          catchError(() => this.estadoPrestamoService.getAll().pipe(catchError(() => of([] as any))))
        )
        .toPromise();

      estados = estados || [];

      if (codigosEstados.length && estados.length) {
        estados = estados.filter((e: any) =>
          codigosEstados.includes(Number(e.codigo)) ||
          codigosEstados.includes(Number(e.idEstado)) ||
          codigosEstados.includes(Number(e.codigoExterno))
        );
      }

      // Mapear por: codigo, idEstado y codigoExterno para soportar distintas formas de relación
      const mapaCodigo = new Map<number, any>();
      const mapaId = new Map<number, any>();
      const mapaExterno = new Map<number, any>();
      (estados as any[]).forEach((e) => {
        if (e.codigo != null) mapaCodigo.set(Number(e.codigo), e);
        if (e.idEstado != null) mapaId.set(Number(e.idEstado), e);
        if (e.codigoExterno != null) mapaExterno.set(Number(e.codigoExterno), e);
      });      // Asignar EstadoPrestamo completo con nombre
      const resultado = prestamos.map((p: any, index: number) => {
        const est = p.estadoPrestamo;
        const codigo = typeof est === 'number' ? est as number : (est?.codigo as number | undefined);
        const id = (p?.idEstado ?? p?.estadoPrestamoCodigo) as number | undefined;
        const codExt = (typeof est === 'object' && est?.codigoExterno != null) ? Number(est.codigoExterno) : undefined;

        console.log(`🔍 Préstamo ${index + 1}:`, {
          prestamoId: p?.codigo,
          codigo,
          id,
          codExt,
          estadoOriginal: est
        });

        let estadoCompleto = undefined as any;
        if (codigo != null && mapaCodigo.has(codigo)) {
          estadoCompleto = mapaCodigo.get(codigo);
          console.log(`✅ Encontrado por código ${codigo}:`, estadoCompleto?.nombre);
        } else if (id != null && mapaId.has(id)) {
          estadoCompleto = mapaId.get(id);
          console.log(`✅ Encontrado por idEstado ${id}:`, estadoCompleto?.nombre);
        } else if (codExt != null && mapaExterno.has(codExt)) {
          estadoCompleto = mapaExterno.get(codExt);
          console.log(`✅ Encontrado por codigoExterno ${codExt}:`, estadoCompleto?.nombre);
        } else if (codigo != null && mapaExterno.has(codigo)) {
          // En algunos casos, el código del préstamo corresponde a codigoExterno del estado
          estadoCompleto = mapaExterno.get(codigo);
          console.log(`✅ Encontrado código→externo ${codigo}:`, estadoCompleto?.nombre);
        } else if (id != null && mapaCodigo.has(id)) {
          // O el idEstado del préstamo corresponde al codigo del estado
          estadoCompleto = mapaCodigo.get(id);
          console.log(`✅ Encontrado idEstado→codigo ${id}:`, estadoCompleto?.nombre);
        } else {
          console.warn(`❌ No se encontró estado para préstamo ${p?.codigo}`, { codigo, id, codExt });
        }

        if (estadoCompleto) {
          return {
            ...p,
            EstadoPrestamo: estadoCompleto,
            estadoPrestamo: estadoCompleto,
          };
        }
        return p;
      });

      return resultado as Prestamo[];
    } catch (error) {
      console.warn('⚠️ Error enriqueciendo estados de préstamo, se devuelve lista original', error);
      return prestamos;
    }
  }

  /**
   * Cargar el detalle específico de un préstamo (las cuotas) usando selectByCriteria con relación padre-hijo
   */
  cargarDetallePrestamo(codigoPrestamo: number): void {
    this.loading.set(true);
    this.errorMsg.set('');

    // Construir criterio con relación padre-hijo: Prestamo (padre) -> codigo (hijo)
    this.criterioConsultaArray = [];
    const criterio = new DatosBusqueda();

    // Usar asignaValorConCampoPadre: padre=Prestamo, hijo=codigo, valor=codigoPrestamo
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,    // tipoDato
      'prestamo',                // campo (entidad padre)
      'codigo',                  // campo1 (campo del padre)
      codigoPrestamo.toString(), // valor
      TipoComandosBusqueda.IGUAL // tipoComparacion
    );
    this.criterioConsultaArray.push(criterio);

    // Orden por número de cuota
    const criterioOrden = new DatosBusqueda();
    criterioOrden.orderBy('numeroCuota');
    this.criterioConsultaArray.push(criterioOrden);


    this.detallePrestamoService.selectByCriteria(this.criterioConsultaArray).pipe(
      catchError(err => {
        return this.detallePrestamoService.getAll().pipe(
          catchError(err2 => {
            return of([] as DetallePrestamo[]);
          })
        );
      }),
      finalize(() => {
        this.loading.set(false);
      })
    ).subscribe((resultado: any) => {

      let cuotas: DetallePrestamo[] = [];
      if (Array.isArray(resultado)) {
        cuotas = resultado;
        console.log('✅ Procesado como array, elementos:', cuotas.length);
      } else if (resultado && !Array.isArray(resultado)) {
        cuotas = [resultado];
        console.log('✅ Procesado como objeto único, convertido a array');
      } else {
        console.log('❌ Resultado vacío o nulo');
      }

      console.log('🔍 Total cuotas antes del filtro:', cuotas.length);

      // Si tenemos cuotas, mostrar algunas muestras para debug
      if (cuotas.length > 0) {
        console.log('📝 Muestra de la primera cuota:', cuotas[0]);
        console.log('📝 Campos disponibles en primera cuota:', Object.keys(cuotas[0]));
        console.log('🔢 VALORES NUMERICOS de la primera cuota:', {
          capital: cuotas[0].capital,
          interes: cuotas[0].interes,
          mora: cuotas[0].mora,
          saldoCapital: cuotas[0].saldoCapital,
          tipos: {
            capital: typeof cuotas[0].capital,
            interes: typeof cuotas[0].interes,
            mora: typeof cuotas[0].mora,
            saldoCapital: typeof cuotas[0].saldoCapital
          }
        });

        // Si tenemos cuotas, mostrar algunas muestras para debug
        if (cuotas.length > 0) {
          console.log('📝 Muestra de la primera cuota:', cuotas[0]);
          console.log('📝 Total cuotas cargadas:', cuotas.length);
        }        // Verificar si alguna cuota ya tiene el prestamo.codigo correcto
        const cuotasConCodigo = cuotas.filter(c => c.prestamo?.codigo === codigoPrestamo);
        console.log('🎯 Cuotas que YA tienen prestamo.codigo=' + codigoPrestamo + ':', cuotasConCodigo.length);

        // VERIFICAR EL CAMPO REAL: prestamoId (detectado en los logs)
        console.log('🔍 DEBUGGING: Valores reales de prestamoId en las primeras 5 cuotas:');
        cuotas.slice(0, 5).forEach((c, idx) => {
          const prestamoObj = (c as any).prestamoId;
          console.log(`   Cuota ${idx + 1}: prestamoId es objeto:`, prestamoObj);
          console.log(`   Cuota ${idx + 1}: prestamoId.codigo=${prestamoObj?.codigo}, prestamoId.id=${prestamoObj?.id}`);
          console.log(`   Cuota ${idx + 1}: codigo=${c.codigo}, numeroCuota=${c.numeroCuota}`);
        });

        // Mostrar todos los códigos de préstamo únicos para diagnóstico
        const codigosPrestamosUnicos = [...new Set(cuotas.map(c => (c as any).prestamoId?.codigo).filter(c => c != null))];
        console.log('🔍 DEBUGGING: Todos los códigos de préstamo únicos disponibles:', codigosPrestamosUnicos);        console.log('🔍 DEBUGGING: Buscando préstamo ID:', codigoPrestamo, 'tipo:', typeof codigoPrestamo);

        const cuotasConPrestamoId = cuotas.filter(c => (c as any).prestamoId === codigoPrestamo);
        console.log('🎯 Cuotas que tienen prestamoId=' + codigoPrestamo + ':', cuotasConPrestamoId.length);

        // NUEVO: Buscar por prestamoId.codigo (ya que prestamoId es un objeto)
        const cuotasConPrestamoIdCodigo = cuotas.filter(c => (c as any).prestamoId?.codigo === codigoPrestamo);
        console.log('🎯 Cuotas que tienen prestamoId.codigo=' + codigoPrestamo + ':', cuotasConPrestamoIdCodigo.length);

        // También verificar como string por si hay diferencia de tipo
        const cuotasConPrestamoIdString = cuotas.filter(c => (c as any).prestamoId?.toString() === codigoPrestamo.toString());
        console.log('🎯 Cuotas que tienen prestamoId (como string)=' + codigoPrestamo + ':', cuotasConPrestamoIdString.length);        if (cuotasConPrestamoIdCodigo.length > 0) {
          console.log('✅ ENCONTRADAS por prestamoId.codigo! Usando esas cuotas');
          cuotas = cuotasConPrestamoIdCodigo;
        } else if (cuotasConPrestamoId.length > 0) {
          console.log('✅ ENCONTRADAS por prestamoId (número exacto)! Usando esas cuotas');
          cuotas = cuotasConPrestamoId;
        } else if (cuotasConPrestamoIdString.length > 0) {
          console.log('✅ ENCONTRADAS por prestamoId (string match)! Usando esas cuotas');
          cuotas = cuotasConPrestamoIdString;
        } else if (cuotasConCodigo.length === 0) {
          console.log('🔍 FILTRADO LOCAL: Buscando cuotas por diferentes campos...');

          // Intentar diferentes campos que podrían representar el código del préstamo
          const cuotasFiltradas = cuotas.filter(c => {
            const coincide = (
              c.prestamo?.codigo === codigoPrestamo ||
              (c as any).prestamoId === codigoPrestamo ||
              (c as any).prestamoId?.codigo === codigoPrestamo ||  // NUEVO: objeto prestamo con codigo
              (c as any).prestamoId?.id === codigoPrestamo ||      // NUEVO: objeto prestamo con id
              (c as any).prestamoCodigo === codigoPrestamo ||
              (c as any).codigoPrestamoFK === codigoPrestamo ||
              (c as any).prestamo?.codigo === codigoPrestamo ||
              (c as any).prestamo?.id === codigoPrestamo
            );

            if (coincide) {
              console.log('✅ Cuota coincidente encontrada:', {
                codigo: c.codigo,
                prestamoIdObjeto: (c as any).prestamoId,
                prestamoIdCodigo: (c as any).prestamoId?.codigo,
                prestamoCodigo: c.prestamo?.codigo,
                numeroCuota: c.numeroCuota,
                prestamo: (c as any).prestamo
              });
            }

            return coincide;
          });

          console.log('🔍 Resultado del filtro local:', cuotasFiltradas.length, 'cuotas encontradas');
          cuotas = cuotasFiltradas;          if (cuotas.length === 0) {
            console.log('❌ NO SE ENCONTRARON cuotas para el préstamo:', codigoPrestamo);
            console.log('❌ Revisando estructura de datos...');
            if (cuotas.length > 0) {
              console.log('❌ Ejemplo de estructura recibida:', {
                prestamoCodigo: cuotas[0].prestamo?.codigo,
                campos: Object.keys(cuotas[0]),
                prestamo: (cuotas[0] as any).prestamo
              });
            }
          }
        } else {
          cuotas = cuotasConCodigo;
          console.log('✅ Usando cuotas que ya tenían el código correcto');
        }
      } else {
        console.log('❌ NO HAY CUOTAS para procesar');
      }

      // Ordenar por número de cuota
      cuotas.sort((a, b) => (a.numeroCuota || 0) - (b.numeroCuota || 0));


      this.allDetallePrestamos = cuotas;
      this.totalDetallePrestamos.set(this.allDetallePrestamos.length);
      this.pageIndexDet = 0;
      this.updatePageDetallePrestamos();

      console.log('✅ COMPLETADO: Cuotas cargadas y ordenadas:', cuotas.length);
      console.log('✅ DataSource actualizado, total items:', this.totalDetallePrestamos());
    });
  }  /**
   * Obtiene el nombre del Estado del préstamo intentando múltiples formas que puede traer el backend
   */
  getEstadoNombre(p: any): string {
    if (!p) return '';
    // Si el backend ya trae el nombre como string en alguna variante
    const cand = [
      p?.estadoPrestamo?.nombre,
      p?.estadoPrestamoNombre,
      p?.EstadoPrestamoNombre,
      p?.estadoNombre,
      p?.EstadoNombre,
      p?.estado,
      p?.Estado,
      p?.espsNombre
    ];
    const val = cand.find((x) => typeof x === 'string' && x.trim().length > 0);
    return (val || '').toString();
  }

  /**
   * Obtiene el nombre del Producto del préstamo de forma segura
   */
  getProductoNombre(p: any): string {
    if (!p) return 'N/A';
    // Intentar múltiples formas que puede traer el backend
    const cand = [
      p?.producto?.nombre,
      p?.ProductoNombre,
      p?.productoNombre,
      'Producto no disponible'
    ];
    const val = cand.find((x) => typeof x === 'string' && x.trim().length > 0);
    return (val || 'N/A').toString();
  }

  /**
   * Obtiene el código SBS del producto de forma segura
   */
  getProductoCodigoSBS(p: any): string {
    if (!p) return '';
    const cand = [
      p?.Producto?.codigoSBS,
      p?.producto?.codigoSBS,
      p?.ProductoCodigoSBS,
      p?.productoCodigoSBS
    ];
    const val = cand.find((x) => typeof x === 'string' && x.trim().length > 0);
    return (val || '').toString();
  }

  /**
   * Verifica si el préstamo tiene código SBS disponible
   */
  tieneCodigoSBS(p: any): boolean {
    return this.getProductoCodigoSBS(p).length > 0;
  }

  /**
   * Convierte una fecha string del backend a formato Date válido para Angular
   */
  formatearFecha(fechaString: any): Date | null {
    if (!fechaString) return null;

    try {
      // Si ya es un objeto Date, devolverlo
      if (fechaString instanceof Date) return fechaString;

      // Si es string, intentar parsear
      if (typeof fechaString === 'string') {
        // Manejar formato "2016-02-29T05:00:00Z[UTC]"
        let fechaLimpia = fechaString;

        // Remover la parte "[UTC]" si existe
        if (fechaLimpia.includes('[UTC]')) {
          fechaLimpia = fechaLimpia.replace('[UTC]', '');
        }

        // Crear objeto Date
        const fecha = new Date(fechaLimpia);

        // Verificar si es válida
        if (!isNaN(fecha.getTime())) {
          return fecha;
        }
      }

      return null;
    } catch (error) {
      console.warn('Error parseando fecha:', fechaString, error);
      return null;
    }
  }

  /**
   * Obtiene fecha formateada como string YYYY-MM-DD
   */
  getFechaFormateada(fechaString: any): string {
    const fecha = this.formatearFecha(fechaString);
    if (!fecha) return '';

    return fecha.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Verifica si una fecha existe y es válida
   */
  tieneFechaValida(fechaString: any): boolean {
    return this.formatearFecha(fechaString) !== null;
  }

  /**
   * Formatea un número para mostrar siempre con 2 decimales
   */
  formatearNumero(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '0.00';
    }

    const numero = Number(valor);
    if (isNaN(numero)) {
      return '0.00';
    }

    return numero.toFixed(2);
  }

  /**
   * Formatea un número como moneda con separadores de miles
   */
  formatearMoneda(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '0,00';
    }

    const numero = Number(valor);
    if (isNaN(numero)) {
      return '0,00';
    }

    // Mostrar decimales reales con toFixed
    const resultado = numero.toFixed(2).replace('.', ',');
    return resultado;
  }  /**
   * Función de formateo decimal simplificada
   */
  formatearDecimal(valor: any): string {
    if (valor === null || valor === undefined || valor === '') {
      return '0,00';
    }

    const numero = Number(valor);
    if (isNaN(numero)) {
      return '0,00';
    }

    return numero.toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Métodos de paginación para pagos (NIVEL 4)
  updatePagePagos(): void {
    this.totalPagos.set(this.allPagos.length);

    const start = this.pageIndexPag * this.pageSizePag;
    const end = start + this.pageSizePag;
    const paginatedData = this.allPagos.slice(start, end);

    this.dataSourcePagos.data = paginatedData;
  }

  pageChangedPagos(event: PageEvent): void {
    this.pageIndexPag = event.pageIndex;
    this.pageSizePag = event.pageSize;
    this.updatePagePagos();
  }

  // Cargar pagos del detalle préstamo seleccionado (NIVEL 4)
  cargarPagoPrestamo(codigoDetallePrestamo: number): void {
    this.loading.set(true);
    this.errorMsg.set('');

    console.log('🔍 CARGANDO PAGOS para codigoDetalle:', codigoDetallePrestamo);

    const detallePrestamo = this.detallePrestamoSeleccionado();
    console.log('📋 DETALLE PRÉSTAMO SELECCIONADO:', {
      codigo: detallePrestamo?.codigo,
      numeroCuota: detallePrestamo?.numeroCuota,
      prestamoCodigo: detallePrestamo?.prestamo?.codigo,
      fechaVencimiento: detallePrestamo?.fechaVencimiento
    });

    // Crear criterio de búsqueda
    this.criterioConsultaArray = [];

    if (!detallePrestamo?.numeroCuota) {
      console.error('❌ No se puede crear criterio: DetallePrestamo no seleccionado o sin numeroCuota');
      this.errorMsg.set('Error: No hay detalle de préstamo seleccionado');
      this.loading.set(false);
      return;
    }

    // Filtrado con lógica AND: prestamo.codigo AND codigoDetalle
    const codigoPrestamo = detallePrestamo.prestamo?.codigo;
    const codigoDetalle = detallePrestamo.codigo; // código del detalle préstamo

    // 1. Filtrar por prestamo.codigo
    if (codigoPrestamo) {
      const criterioPrestamo = new DatosBusqueda();
      criterioPrestamo.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'prestamo',
        'codigo',
        codigoPrestamo?.toString() || '',
        TipoComandosBusqueda.IGUAL
      );
      this.criterioConsultaArray.push(criterioPrestamo);
    }

    // 2. AND - Filtrar por detallePrestamo.codigo
    if (codigoDetalle) {
      const criterioCodigoDetalle = new DatosBusqueda();
      criterioCodigoDetalle.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'detallePrestamo',
        'codigo',
        codigoDetalle.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterioCodigoDetalle.setTipoOperadorLogico(TipoComandosBusqueda.AND);
      this.criterioConsultaArray.push(criterioCodigoDetalle);
    }

    console.log('🔍 CRITERIOS AND ENVIADOS:', {
      criterios: [
        codigoPrestamo ? 'prestamo.codigo = ' + codigoPrestamo : 'Sin prestamo.codigo',
        codigoDetalle ? 'AND detallePrestamo.codigo = ' + codigoDetalle : 'Sin detallePrestamo.codigo'
      ],
      totalCriterios: this.criterioConsultaArray.length,
      criterioArray: this.criterioConsultaArray
    });    this.pagoPrestamoService.selectByCriteria(this.criterioConsultaArray).pipe(
      catchError(err => {
        console.error('❌ selectByCriteria falló:', err.message || err);
        console.log('🔄 Probando con getAll() y filtro en frontend...');
        // Si selectByCriteria falla, usar getAll() y filtrar en frontend
        return this.pagoPrestamoService.getAll();
      }),
      catchError(err => {
        console.error('❌ getAll() también falló:', err);
        return of([]);
      }),
      finalize(() => {
        this.loading.set(false);
      })
    ).subscribe((resultado: any) => {
      let pagos: PagoPrestamo[] = [];

      // Manejar diferentes tipos de respuesta
      if (Array.isArray(resultado)) {
        pagos = resultado;
      } else if (resultado && !Array.isArray(resultado)) {
        pagos = [resultado];
      }

      console.log('📝 PAGOS RECIBIDOS DEL BACKEND:', {
        total: pagos.length,
        tipoRespuesta: Array.isArray(resultado) ? 'array' : 'objeto',
        respuestaOriginal: resultado
      });

      if (pagos.length > 0) {
        console.log('📝 MUESTRA PRIMER PAGO COMPLETO:', pagos[0]);
        console.log('📝 CAMPOS DISPONIBLES EN PAGO:', Object.keys(pagos[0]));
      } else {
        console.log('⚠️ NO SE RECIBIERON PAGOS DEL BACKEND');
      }

      console.log('🎯 INICIANDO FILTRADO AND:', {
        codigoPrestamoBuscado: detallePrestamo?.prestamo?.codigo,
        codigoDetalleBuscado: detallePrestamo?.codigo,
        totalPagosParaFiltrar: pagos.length
      });

      const pagosFiltrados = pagos.filter(p => {
        const pago = p as any; // Usar any para evitar problemas de tipos temporalmente

        // Los pagos anulados siguen existiendo en PGPR con `anulado = 1` (§14 de la guía de
        // servicios de pago): sin este filtro un pago ya reversado seguiría contando como válido.
        if (!pagoVigente(p)) return false;

        // Filtrado con lógica AND: prestamo.codigo AND detallePrestamo.codigo
        const codigoPrestamoDetalle = detallePrestamo?.prestamo?.codigo;
        const codigoDetalleDetalle = detallePrestamo?.codigo;

        // 1. Debe coincidir prestamo.codigo
        const matchPrestamo = pago.prestamo?.codigo === codigoPrestamoDetalle;

        // 2. AND debe coincidir detallePrestamo.codigo
        const matchCodigoDetalle = pago.detallePrestamo?.codigo === codigoDetalleDetalle;

        // Ambos criterios deben coincidir (AND lógico)
        const match = matchPrestamo && matchCodigoDetalle;

        // Log solo para los primeros 10 pagos o los que coinciden
        const shouldLog = pagos.indexOf(p) < 10 || match;
        if (shouldLog) {
          console.log(`🔍 PAGO ${pago.codigo}:`, {
            detallePrestamoObjeto: pago.detallePrestamo,
            detallePrestamoCodig: pago.detallePrestamo?.codigo,
            prestamoObjeto: pago.prestamo,
            prestamoCodigo: pago.prestamo?.codigo,
            buscado: {
              prestamoCodigo: codigoPrestamoDetalle,
              detalleCodig: codigoDetalleDetalle
            },
            matches: {
              prestamo: matchPrestamo,
              detallePrestamo: matchCodigoDetalle
            },
            coincide: match
          });
        }

        if (match) {
          console.log('✅ PAGO COINCIDE (AND):', {
            codigo: pago.codigo,
            detallePrestamoCodig: pago.detallePrestamo?.codigo,
            prestamoCodigo: pago.prestamo?.codigo,
            fecha: pago.fecha,
            criterios: 'prestamo.codigo AND detallePrestamo.codigo'
          });
        }
        return match;
      });      console.log(`🎯 PAGOS FILTRADOS: ${pagosFiltrados.length} de ${pagos.length} total`);

      if (pagosFiltrados.length > 0) {
        // Ordenar por fecha (más reciente primero)
        pagosFiltrados.sort((a, b) => {
          const fechaA = new Date(a.fecha || 0).getTime();
          const fechaB = new Date(b.fecha || 0).getTime();
          return fechaB - fechaA;
        });

        this.allPagos = pagosFiltrados;
      } else {
        this.errorMsg.set(`No se encontraron pagos para el préstamo ${detallePrestamo?.prestamo?.codigo} detalle ${detallePrestamo?.codigo}`);
        this.allPagos = [];
      }

      this.updatePagePagos();
    });
  }

  /**
   * Convierte una fecha de forma segura manejando diferentes formatos
   */
  private convertirFecha(fecha: any): Date | null {
    if (!fecha) return null;

    if (fecha instanceof Date) return fecha;

    // Si es un array (como [2023,7,31,0,0]), convertir a Date
    if (Array.isArray(fecha)) {
      // Array format: [year, month, day, hour, minute, second?, millisecond?]
      const [year, month, day, hour = 0, minute = 0, second = 0, nanoseconds = 0] = fecha;
      // Convertir nanosegundos a milisegundos
      const ms = Math.floor(nanoseconds / 1000000);
      // Nota: los meses en JavaScript Date van de 0-11, pero el backend envía 1-12
      return new Date(year, month - 1, day, hour, minute, second, ms);
    }

    if (typeof fecha === 'string') {
      // Limpiar el string de fecha quitando el timezone [UTC] si existe
      const fechaLimpia = fecha.replace(/\[.*?\]/, '');
      const fechaConvertida = new Date(fechaLimpia);

      // Verificar si la fecha es válida
      if (!isNaN(fechaConvertida.getTime())) {
        return fechaConvertida;
      }
    }

    if (typeof fecha === 'number') {
      return new Date(fecha);
    }

    return null;
  }
}

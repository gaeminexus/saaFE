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

import { Entidad } from '../../model/entidad';
import { Producto } from '../../model/producto';
import { Prestamo } from '../../model/prestamo';
import { PagoPrestamo } from '../../model/pago-prestamo';

import { EntidadService } from '../../service/entidad.service';
import { ProductoService } from '../../service/producto.service';
import { PrestamoService } from '../../service/prestamo.service';
import { PagoPrestamoService } from '../../service/pago-prestamo.service';
import { EstadoPrestamoService } from '../../service/estado-prestamo.service';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

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

  // Fuentes de datos para las tablas
  dataSourceEntidades = new MatTableDataSource<Entidad>([]);
  dataSourceProductos = new MatTableDataSource<Producto>([]);
  dataSourcePrestamos = new MatTableDataSource<Prestamo>([]);
  dataSourcePagos = new MatTableDataSource<PagoPrestamo>([]);

  // Columnas para cada tabla
  columnasEntidades: string[] = ['codigo', 'razonSocial', 'numeroIdentificacion', 'correoPersonal', 'movil', 'acciones'];
  columnasProductos: string[] = ['codigo', 'nombre', 'codigoSBS', 'tipoPrestamo', 'estado', 'acciones'];
  columnasPrestamosResumen: string[] = ['codigo', 'producto', 'montoSolicitado', 'estado', 'acciones'];
  columnasPrestamos: string[] = ['codigo', 'producto', 'amortizacion', 'fecha', 'montoSolicitado', 'plazo', 'tasa', 'estado', 'acciones'];
  columnasPagos: string[] = ['numero', 'fechaPago', 'monto', 'capital', 'interes', 'mora', 'estado'];

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

    this.entidadService.getAll().pipe(
      catchError(err => {
        console.error('Error cargando entidades:', err);
        let errorMessage = 'Error al cargar entidades';
        if (err && typeof err === 'object') {
          if (err.message) {
            errorMessage += ': ' + err.message;
          } else if (err.error && err.error.message) {
            errorMessage += ': ' + err.error.message;
          } else if (err.statusText) {
            errorMessage += ': ' + err.statusText;
          }
        } else if (typeof err === 'string') {
          errorMessage += ': ' + err;
        }
        this.errorMsg.set(errorMessage);
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe(entidades => {
      console.log('📊 Total entidades recibidas del backend:', entidades.length);
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
    this.productoService.getAll().pipe(
      catchError(err => {
        this.errorMsg.set('Error al cargar productos: ' + (typeof err === 'string' ? err : err?.message || ''));
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
        if (this.productoSeleccionado()) {
          this.seleccionarProducto(this.productoSeleccionado()!);
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
    this.criterioConsulta.asigna3(TipoDatosBusqueda.LONG, 'entidad.codigo', codigoEntidad.toString(), TipoComandosBusqueda.IGUAL);
    this.criterioConsultaArray.push(this.criterioConsulta);

    // También agregar criterio por número de identificación de la entidad para mayor precisión
    const entidadSeleccionada = this.entidadSeleccionada();
    if (entidadSeleccionada?.numeroIdentificacion) {
      const criterioIdentificacion = new DatosBusqueda();
      criterioIdentificacion.asigna3(TipoDatosBusqueda.STRING, 'entidad.numeroIdentificacion',
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

      // Filtro por entidad si fue fallback y el objeto tiene Entidad
      if (lista.length && lista[0] && (lista[0] as any).Entidad) {
        lista = lista.filter(p => (p as any).Entidad?.codigo === codigoEntidad);
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
      // Soporta tanto 'producto' (minúscula) como 'Producto' (mayúscula)
      const codigosProductos = [...new Set(prestamos
        .map(p => {
          const prod: any = (p as any).producto || (p as any).Producto;
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
        criterio.asigna3(TipoDatosBusqueda.LONG, 'codigo', codigo.toString(), TipoComandosBusqueda.IGUAL);
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
        const codigoProducto = (prestamo as any).producto?.codigo || prestamo.Producto?.codigo;
        if (codigoProducto) {
          const productoCompleto = mapaProductos.get(codigoProducto);
          if (productoCompleto) {
            return {
              ...prestamo,
              // Asignar tanto en producto (minúscula) como en Producto (mayúscula) para compatibilidad
              producto: productoCompleto,
              Producto: productoCompleto
            };
          }
        }
        return prestamo;
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
          p.Entidad?.codigo?.toString().includes(f) ||
          p.Entidad?.razonSocial?.toLowerCase().includes(f) ||
          p.Entidad?.numeroIdentificacion?.toLowerCase().includes(f) ||
          // Buscar tanto en 'producto' (minúscula) como en 'Producto' (mayúscula)
          (p as any).producto?.nombre?.toLowerCase().includes(f) ||
          (p as any).producto?.codigoSBS?.toLowerCase().includes(f) ||
          p.Producto?.nombre?.toLowerCase().includes(f) ||
          p.Producto?.codigoSBS?.toLowerCase().includes(f) ||
          p.montoSolicitado?.toString().includes(f) ||
          p.plazo?.toString().includes(f) ||
          p.EstadoPrestamo?.nombre?.toLowerCase().includes(f) ||
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
        const est = p?.EstadoPrestamo || p?.estadoPrestamo;

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
              const est = p.EstadoPrestamo || p.estadoPrestamo;
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
        c1.asigna3(TipoDatosBusqueda.LONG, 'codigo', String(codigo), TipoComandosBusqueda.IGUAL);
        if (idx > 0) c1.setTipoOperadorLogico(TipoComandosBusqueda.OR);
        criterios.push(c1);

        const c2 = new DatosBusqueda();
        c2.asigna3(TipoDatosBusqueda.LONG, 'idEstado', String(codigo), TipoComandosBusqueda.IGUAL);
        c2.setTipoOperadorLogico(TipoComandosBusqueda.OR);
        criterios.push(c2);

        const c3 = new DatosBusqueda();
        c3.asigna3(TipoDatosBusqueda.LONG, 'codigoExterno', String(codigo), TipoComandosBusqueda.IGUAL);
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
        const est = p.EstadoPrestamo || p.estadoPrestamo;
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
   * Obtiene el nombre del Estado del préstamo intentando múltiples formas que puede traer el backend
   */
  getEstadoNombre(p: any): string {
    if (!p) return '';
    // Si el backend ya trae el nombre como string en alguna variante
    const cand = [
      p?.EstadoPrestamo?.nombre,
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
}

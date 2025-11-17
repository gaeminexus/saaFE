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
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

// Enum para los niveles de navegación
enum NivelNavegacion {
  ENTIDADES = 1,
  PRODUCTOS = 2,
  PRESTAMOS = 3,
  PAGOS = 4
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
  columnasPrestamos: string[] = ['codigo', 'fecha', 'montoSolicitado', 'plazo', 'tasa', 'estado', 'acciones'];
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
    // Intento de carga desde servicio si existe método, si no usar mock temporal
    try {
      const posibleMetodo: any = (this.productoService as any).getAll;
      if (typeof posibleMetodo === 'function') {
        (posibleMetodo.call(this.productoService) as any).pipe(
          catchError(err => {
            this.errorMsg.set('Error al cargar productos: ' + (typeof err === 'string' ? err : err?.message || ''));
            return of([]);
          }),
          finalize(() => this.loading.set(false))
        ).subscribe((productos: Producto[]) => {
          // Si existiese relación por entidad, aquí se podría filtrar por codigoEntidad
          this.allProductos = productos || [];
          this.totalProductos.set(this.allProductos.length);
          this.pageIndexProd = 0;
          this.updatePageProductos();
        });
      } else {
        // Mock mínimo para continuar el flujo
        this.allProductos = [
          { codigo: 1, codigoSBS: 'SB001', nombre: 'Crédito Consumo', filial: null as any, tipoPrestamo: null as any, codigoExterno: 0, fechaRegistro: new Date(), usuarioRegistro: 'sys', ipRegistro: '', fechaModificacion: new Date(), usuarioModificacion: '', ipModificacion: '', estado: 1 },
          { codigo: 2, codigoSBS: 'SB002', nombre: 'Crédito Hipotecario', filial: null as any, tipoPrestamo: null as any, codigoExterno: 0, fechaRegistro: new Date(), usuarioRegistro: 'sys', ipRegistro: '', fechaModificacion: new Date(), usuarioModificacion: '', ipModificacion: '', estado: 1 }
        ];
        this.totalProductos.set(this.allProductos.length);
        this.pageIndexProd = 0;
        this.updatePageProductos();
        this.loading.set(false);
      }
    } catch (e) {
      this.loading.set(false);
      this.errorMsg.set('Error al cargar productos');
    }
  }

  // Navegar hacia atrás en el breadcrumb
  navegarA(nivel: NivelNavegacion): void {
    switch (nivel) {
      case NivelNavegacion.ENTIDADES:
        this.volverAEntidades();
        break;
      case NivelNavegacion.PRODUCTOS:
        if (this.entidadSeleccionada()) {
          this.seleccionarEntidad(this.entidadSeleccionada()!);
        }
        break;
      case NivelNavegacion.PRESTAMOS:
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

  get mostrandoProductos(): boolean {
    return this.nivelActual() === NivelNavegacion.PRODUCTOS;
  }

  get mostrandoPrestamos(): boolean {
    return this.nivelActual() === NivelNavegacion.PRESTAMOS;
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
    this.nivelActual.set(NivelNavegacion.PRESTAMOS);

    // Actualizar breadcrumbs
    const entidad = this.entidadSeleccionada();
    this.breadcrumbs.set([
      { nivel: NivelNavegacion.ENTIDADES, titulo: 'Entidades', subtitulo: entidad?.razonSocial, activo: false },
      { nivel: NivelNavegacion.PRODUCTOS, titulo: 'Productos', subtitulo: producto.nombre, activo: false },
      { nivel: NivelNavegacion.PRESTAMOS, titulo: 'Préstamos', subtitulo: 'Listado', activo: true }
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
    this.criterioConsulta.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'entidad', 'codigo',
                                                   codigoEntidad.toString(), TipoComandosBusqueda.IGUAL);
    this.criterioConsultaArray.push(this.criterioConsulta);

    this.criterioConsulta = new DatosBusqueda();
    this.criterioConsulta.orderBy('codigo');
    this.criterioConsultaArray.push(this.criterioConsulta);

    this.prestamoService.selectByCriteria(this.criterioConsultaArray).pipe(
      catchError(err => {
        // Fallback: intentar getAll y filtrar (no recomendado para grandes volúmenes)
        console.log('⚠️ Falling back to getAll for préstamos due to error:', err);
        return this.prestamoService.getAll().pipe(
          catchError(() => of([])),
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

      this.allPrestamos = lista;
      this.totalPrestamos.set(this.allPrestamos.length);
      this.pageIndexPrest = 0;
      this.updatePagePrestamos();
    });
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
          p.Producto?.nombre?.toLowerCase().includes(f) ||
          p.Producto?.codigoSBS?.toLowerCase().includes(f) ||
          p.montoSolicitado?.toString().includes(f) ||
          p.plazo?.toString().includes(f) ||
          p.EstadoPrestamo?.nombre?.toLowerCase().includes(f)
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
}

import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SelectionModel } from '@angular/cdk/collections';
import { catchError } from 'rxjs/operators';

import { PlanCuentaService } from '../../service/plan-cuenta.service';
import { NaturalezaCuentaService } from '../../service/naturaleza-cuenta.service';
import { PlanCuenta } from '../../model/plan-cuenta';
import { NaturalezaCuenta } from '../../model/naturaleza-cuenta';
import { ExportService } from '../../../../shared/services/export.service';
import { PlanGridFormComponent } from './plan-grid-form.component';
import { PlanArbolFormComponent } from '../plan-arbol/plan-arbol-form.component';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

@Component({
  selector: 'app-plan-grid',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCheckboxModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './plan-grid.component.html',
  styleUrls: ['./plan-grid.component.scss']
})
export class PlanGridComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('tableContainer') tableContainer!: ElementRef;

  // Datos
  planCuentas: PlanCuenta[] = [];
  naturalezas: NaturalezaCuenta[] = [];
  dataSource = new MatTableDataSource<PlanCuenta>([]);
  selection = new SelectionModel<PlanCuenta>(true, []);

  // Signals para estado reactivo
  loading = signal<boolean>(false);
  error = signal<string>('');
  totalRegistros = signal<number>(0);
  isScrolled = signal<boolean>(false);

  // Filtros
  selectedNaturaleza: number | null = null;
  selectedEstado: number | null = null;
  selectedNivel: number | null = null;

  // Configuración de la tabla
  displayedColumns: string[] = [
    'select',
    'cuentaContable',
    'nombre',
    'tipo',
    'fechaUpdate',
    'fechaInactivo',
    'estado',
    'actions'
  ];

  // Mapa de conteo de descendientes por cuenta raíz (nivel 1)
  private descendantCount: Map<string, number> = new Map();

  // Opciones de paginación
  pageSizeOptions = [10, 25, 50, 100];
  pageSize = 25;

  constructor(
    private planCuentaService: PlanCuentaService,
    private naturalezaCuentaService: NaturalezaCuentaService,
    private dialog: MatDialog,
    private exportService: ExportService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadNaturalezas();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Configurar scroll detection
    if (this.tableContainer) {
      this.setupScrollDetection();
    }

    // Configurar comparador personalizado para ordenamiento
    this.dataSource.sortingDataAccessor = (data: PlanCuenta, sortHeaderId: string) => {
      switch (sortHeaderId) {
        case 'cuentaContable':
          // Convertir número de cuenta jerárquico a formato ordenable
          return this.getAccountNumberForSorting(data.cuentaContable || '');
        case 'nombre':
          return data.nombre?.toLowerCase() || '';
        case 'tipo':
          return this.getTipoLabel(data.tipo);
        case 'fechaUpdate':
          return data.fechaUpdate ? new Date(data.fechaUpdate).getTime() : 0;
        case 'fechaInactivo':
          return data.fechaInactivo ? new Date(data.fechaInactivo).getTime() : 0;
        case 'estado':
          return data.estado || 0;
        default:
          return (data as any)[sortHeaderId] || '';
      }
    };

    // Configurar filtro personalizado
    this.dataSource.filterPredicate = (data: PlanCuenta, filter: string) => {
      const searchTerms = filter.toLowerCase().split(' ');
      const searchableText = [
        data.cuentaContable || '',
        data.nombre || '',
        this.getTipoLabel(data.tipo).toLowerCase(),
        this.formatDate(data.fechaUpdate).toLowerCase(),
        this.formatDate(data.fechaInactivo).toLowerCase(),
        this.estadoLabel(data.estado).toLowerCase()
      ].join(' ').toLowerCase();

      return searchTerms.every(term => searchableText.includes(term));
    };
  }

  setupScrollDetection(): void {
    const container = this.tableContainer.nativeElement;
    container.addEventListener('scroll', () => {
      const scrollTop = container.scrollTop;
      const scrollLeft = container.scrollLeft;
      this.isScrolled.set(scrollTop > 100 || scrollLeft > 50);
    });
  }

  scrollToTop(): void {
    if (this.tableContainer) {
      this.tableContainer.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  scrollToLeft(): void {
    if (this.tableContainer) {
      this.tableContainer.nativeElement.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }

  public loadData(): void {
    this.loading.set(true);
    this.error.set('');

    // Usar getAll directamente (igual que plan-arbol)
    this.planCuentaService.getAll().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : [];
        
        if (list.length === 0) {
          this.error.set('No se encontraron cuentas.');
          this.planCuentas = [];
          this.totalRegistros.set(0);
        } else {
          this.error.set('');
          this.planCuentas = list;
          this.totalRegistros.set(list.length);
          this.updateDataSource();
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ PlanGrid getAll error:', err);
        this.handleLoadError(err);
        console.log('📝 PlanGrid: cargando datos mock por error en backend');
        this.loadMockData();
        this.loading.set(false);
      }
    });
  }

  private loadDataFallback(): void {
    // Ya no usamos fallback separado; loadData hace directamente getAll.
    // Este método se mantiene por compatibilidad de llamadas previas.
    this.loadData();
  }

  private loadMockData(): void {
    // Datos de ejemplo para desarrollo
    const mockJerarquia = {
      codigo: 1, nombre: 'Jerarquía Demo', nivel: 1, codigoPadre: 0, descripcion: 'Jerarquía de prueba',
      ultimoNivel: 1, rubroTipoEstructuraP: 1, rubroTipoEstructuraH: 1, codigoAlterno: 1,
      rubroNivelCaracteristicaP: 1, rubroNivelCaracteristicaH: 1
    };

    const mockEmpresa = {
      codigo: 280, jerarquia: mockJerarquia, nombre: 'Empresa Demo', nivel: 1, codigoPadre: 0, ingresado: 1
    };

    const mockNaturalezaDeudora: NaturalezaCuenta = {
      codigo: 1, nombre: 'Deudora', tipo: 1, numero: 1, estado: 1, empresa: mockEmpresa, manejaCentroCosto: 0
    };

    const mockNaturalezaAcreedora: NaturalezaCuenta = {
      codigo: 2, nombre: 'Acreedora', tipo: 2, numero: 2, estado: 1, empresa: mockEmpresa, manejaCentroCosto: 0
    };

    const mockData: PlanCuenta[] = [
      { codigo: 1, cuentaContable: '1', nombre: 'ACTIVOS', tipo: 1, nivel: 1, idPadre: 0, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },
      { codigo: 2, cuentaContable: '1.1', nombre: 'ACTIVOS CORRIENTES', tipo: 1, nivel: 2, idPadre: 1, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },
      { codigo: 3, cuentaContable: '1.1.01', nombre: 'CAJA', tipo: 2, nivel: 3, idPadre: 2, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },
      { codigo: 4, cuentaContable: '1.1.02', nombre: 'BANCOS', tipo: 2, nivel: 3, idPadre: 2, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },
      { codigo: 5, cuentaContable: '1.2', nombre: 'ACTIVOS FIJOS', tipo: 1, nivel: 2, idPadre: 1, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },
      { codigo: 6, cuentaContable: '2', nombre: 'PASIVOS', tipo: 1, nivel: 1, idPadre: 0, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaAcreedora },
      { codigo: 7, cuentaContable: '2.1', nombre: 'PASIVOS CORRIENTES', tipo: 1, nivel: 2, idPadre: 6, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaAcreedora },
      { codigo: 8, cuentaContable: '3', nombre: 'PATRIMONIO', tipo: 1, nivel: 1, idPadre: 0, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaAcreedora },
    ];

    console.log('📝 Cargando datos mock para PlanGrid:', mockData);
    this.planCuentas = mockData;
    this.totalRegistros.set(mockData.length);
    this.updateDataSource();
    this.error.set('Usando datos de ejemplo - Backend no disponible');
  }

  private loadNaturalezas(): void {
    console.log('🔍 Iniciando carga de naturalezas para empresa 280...');

    const criterioConsultaArray: Array<DatosBusqueda> = [];
    const criterioEmpresa = new DatosBusqueda();
    criterioEmpresa.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'empresa', 'codigo', '280', TipoComandosBusqueda.IGUAL);
    criterioConsultaArray.push(criterioEmpresa);

    this.naturalezaCuentaService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
        if (list.length === 0) {
          this.loadNaturalezasFallback();
        } else {
          this.naturalezas = list;
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar naturalezas:', err);
        this.loadNaturalezasFallback();
      }
    });
  }

  private loadNaturalezasFallback(): void {
    this.naturalezaCuentaService.getAll().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
        this.naturalezas = list.length > 0 ? list : this.getMockNaturalezas();
      },
      error: (err) => {
        console.error('❌ Error al cargar naturalezas (fallback):', err);
        this.naturalezas = this.getMockNaturalezas();
      }
    });
  }

  private getMockNaturalezas(): NaturalezaCuenta[] {
    const mockEmpresa = { codigo: 280, jerarquia: {} as any, nombre: 'Empresa Demo', nivel: 1, codigoPadre: 0, ingresado: 1 };
    return [
      { codigo: 1, nombre: 'Deudora', tipo: 1, numero: 1, estado: 1, empresa: mockEmpresa, manejaCentroCosto: 0 },
      { codigo: 2, nombre: 'Acreedora', tipo: 2, numero: 2, estado: 1, empresa: mockEmpresa, manejaCentroCosto: 0 }
    ];
  }

  private handleLoadError(err: any): void {
    if (err.error?.message?.includes('ORA-00942')) {
      this.error.set('Error de Base de Datos: Tabla CNT.PLNN no existe. Contactar administrador.');
    } else if (err.status === 0) {
      this.error.set('Backend no disponible. Verificar que esté ejecutándose en localhost:8080');
    } else {
      this.error.set(`Error del servidor: ${err.status} - ${err.message || 'Error desconocido'}`);
    }
  }

  private updateDataSource(): void {
    // Ordenar los datos por número de cuenta antes de asignarlos
    const base = this.planCuentas.filter(p => p.cuentaContable !== '0'); // ocultar raíz técnica
    const sortedData = [...base].sort((a, b) => {
      const aNumber = this.getAccountNumberForSorting(a.cuentaContable || '');
      const bNumber = this.getAccountNumberForSorting(b.cuentaContable || '');
      return aNumber.localeCompare(bNumber);
    });

    this.dataSource.data = sortedData;
    this.totalRegistros.set(sortedData.length);
    this.recomputeDescendantCounts(sortedData);
    this.applyFilters();

    // Establecer el ordenamiento inicial en la tabla
    if (this.sort) {
      // Forzar siempre orden inicial ascendente por cuentaContable
      Promise.resolve().then(() => {
        this.sort.active = 'cuentaContable';
        this.sort.direction = 'asc';
        // Notificar a la tabla que cambió el criterio de sort
        (this.dataSource as any)._updateChangeSubscription?.();
      });
    }
  }

  // Métodos de filtrado
  public onFilterChange(): void {
    this.applyFilters();
  }

  public clearFilters(): void {
    this.selectedNaturaleza = null;
    this.selectedEstado = null;
    this.selectedNivel = null;
    this.applyFilters();
  }

  private applyFilters(): void {
    let filteredData = this.planCuentas.filter(p => p.cuentaContable !== '0');

    // Aplicar filtro de naturaleza
    if (this.selectedNaturaleza !== null) {
      filteredData = filteredData.filter(item => item.naturalezaCuenta?.codigo === this.selectedNaturaleza);
    }

    // Aplicar filtro de estado
    if (this.selectedEstado !== null) {
      filteredData = filteredData.filter(item => item.estado === this.selectedEstado);
    }

    // Aplicar filtro de nivel
    if (this.selectedNivel !== null) {
      filteredData = filteredData.filter(item => item.nivel === this.selectedNivel);
    }

    // Re-ordenar jerárquicamente: primero 1 y todos sus hijos, luego 2 y sus hijos, etc.
    filteredData.sort((a, b) => {
      const aKey = this.getAccountNumberForSorting(a.cuentaContable || '');
      const bKey = this.getAccountNumberForSorting(b.cuentaContable || '');
      return aKey.localeCompare(bKey);
    });
    this.dataSource.data = filteredData;
    this.recomputeDescendantCounts(filteredData);
  }

  // Métodos de selección
  public isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numSelected === numRows;
  }

  public toggleAllRows(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }

    this.selection.select(...this.dataSource.data);
  }

  public checkboxLabel(row?: PlanCuenta): string {
    if (!row) {
      return `${this.isAllSelected() ? 'deselect' : 'select'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.codigo}`;
  }

  // Métodos CRUD
  public onAdd(): void {
    this.onAddInternal();
  }

  // Nueva versión que permite crear raíz o subcuentas similar a Plan Árbol
  public onAddInternal(parent?: PlanCuenta) {
    // Si se llamó desde menú de fila y se pasó explícitamente el padre
    if (!parent && this.selection.selected.length === 1) {
      parent = this.selection.selected[0];
    }

    // Creación de raíz basada en naturalezas (como Plan Árbol)
    if (!parent) {
      const nextRoot = this.getNextAvailableRootNaturalezaCodigo();
      if (nextRoot === null) {
        alert('No se puede crear nueva cuenta raíz: todas las naturalezas tienen cuenta asociada.');
        return;
      }
      // Intentar ubicar nodo raíz técnico '0' si existe para idPadre
      const rootParent = this.planCuentas.find(p => p.cuentaContable === '0') || null;
      this.dialog.open(PlanArbolFormComponent, {
        width: '720px',
        disableClose: true,
        data: {
          parent: rootParent,
          naturalezas: this.naturalezas,
          presetCuenta: String(nextRoot),
          presetNivel: 1,
          maxDepth: this.getMaxDepthAllowed()
        }
      }).afterClosed().subscribe(r => { if (r) { this.loadData(); }});
      return;
    }

    // Validar límite de profundidad
    if (!this.canAddChild(parent)) {
      alert('No se puede agregar más niveles bajo este nodo: profundidad máxima alcanzada.');
      return;
    }

    const presetCuenta = this.generateNewCuentaContable(parent);
    const presetNivel = (parent.nivel || this.calculateLevel(parent.cuentaContable)) + 1;

    this.dialog.open(PlanArbolFormComponent, {
      width: '720px',
      disableClose: true,
      data: {
        parent: parent,
        naturalezas: this.naturalezas,
        presetCuenta,
        presetNivel,
        maxDepth: this.getMaxDepthAllowed()
      }
    }).afterClosed().subscribe(r => { if (r) { this.loadData(); }});
  }

  public onEdit(item: PlanCuenta): void {
    // Reusar formulario completo del árbol para permitir edición consistente
    this.dialog.open(PlanArbolFormComponent, {
      width: '720px',
      disableClose: true,
      data: { item, naturalezas: this.naturalezas }
    }).afterClosed().subscribe(r => { if (r) { this.loadData(); }});
  }

  public onDelete(item: PlanCuenta): void {
    if (confirm(`¿Está seguro de eliminar la cuenta "${item.nombre}"?`)) {
      // Aquí implementarías la lógica de eliminación
      console.log('Eliminar cuenta:', item);
    }
  }

  public onDeleteSelected(): void {
    if (this.selection.selected.length === 0) return;

    const count = this.selection.selected.length;
    if (confirm(`¿Está seguro de eliminar ${count} cuenta(s) seleccionada(s)?`)) {
      // Aquí implementarías la lógica de eliminación masiva
      console.log('Eliminar cuentas seleccionadas:', this.selection.selected);
      this.selection.clear();
    }
  }

  // Métodos de exportación
  public exportSelected(): void {
    const selectedData = this.selection.selected.length > 0
      ? this.selection.selected
      : this.dataSource.data;

    this.exportToCSV(selectedData);
  }

  public exportToCSV(data?: PlanCuenta[]): void {
    const exportData = data || this.dataSource.data;
    const headers = ['Código', 'Número', 'Descripción', 'Tipo', 'Fecha Creación', 'Fecha Desactivación', 'Estado'];
    const filename = `plan-grid-${new Date().toISOString().split('T')[0]}.csv`;

    const transformedData = exportData.map(item => ({
      codigo: item.codigo || '',
      numero: item.cuentaContable || '',
      descripcion: item.nombre || '',
      tipo: this.getTipoLabel(item.tipo),
      fechaCreacion: this.formatDate(item.fechaUpdate),
      fechaDesactivacion: this.formatDate(item.fechaInactivo),
      estado: this.estadoLabel(item.estado)
    }));

    this.exportService.exportToCSV(transformedData, filename, headers);
  }

  public exportToPDF(): void {
    const headers = ['Código', 'Número', 'Descripción', 'Tipo', 'Fecha Creación', 'Fecha Desactivación', 'Estado'];
    const dataKeys = ['codigo', 'numero', 'descripcion', 'tipo', 'fechaCreacion', 'fechaDesactivacion', 'estado'];
    const filename = `plan-grid-${new Date().toISOString().split('T')[0]}`;
    const title = 'Plan de Cuentas - Vista Grid';

    const transformedData = this.dataSource.data.map(item => ({
      codigo: item.codigo || '',
      numero: item.cuentaContable || '',
      descripcion: item.nombre || '',
      tipo: this.getTipoLabel(item.tipo),
      fechaCreacion: this.formatDate(item.fechaUpdate),
      fechaDesactivacion: this.formatDate(item.fechaInactivo),
      estado: this.estadoLabel(item.estado)
    }));

    this.exportService.exportToPDF(transformedData, filename, title, headers, dataKeys);
  }

  // Métodos auxiliares
  public getNaturalezaName(id?: number): string {
    if (!id) return '';
    const naturaleza = this.naturalezas.find(n => n.codigo === id);
    return naturaleza?.nombre || '';
  }

  public getTipoLabel(tipo?: number): string {
    switch (tipo) {
      case 1: return 'Movimiento';
      case 2: return 'Acumulación';
      case 3: return 'Orden';
      default: return 'Desconocido';
    }
  }

  public estadoLabel(valor: any): string {
    return Number(valor) === 1 ? 'Activo' : 'Inactivo';
  }

  public getNivelesUnicos(): number[] {
    const niveles = [...new Set(this.planCuentas.map(c => c.nivel).filter(n => n))];
    return niveles.sort((a, b) => (a || 0) - (b || 0));
  }

  /**
   * Convierte un número de cuenta jerárquico a un formato que se puede ordenar correctamente
   * Ejemplos:
   * "1" -> "0001"
   * "1.1" -> "0001.0001"
   * "1.1.01" -> "0001.0001.0001"
   * "2.15.123" -> "0002.0015.0123"
   */
  private getAccountNumberForSorting(accountNumber: string): string {
    if (!accountNumber) return '0000';

    // Si no tiene puntos, es un número simple
    if (!accountNumber.includes('.')) {
      const numPart = parseInt(accountNumber.trim()) || 0;
      return numPart.toString().padStart(4, '0');
    }

    // Dividir por puntos y convertir cada parte a número con padding
    const parts = accountNumber.split('.');
    const paddedParts = parts.map(part => {
      // Remover espacios y convertir a número
      const numPart = parseInt(part.trim()) || 0;
      // Agregar padding de 4 dígitos para ordenamiento correcto
      return numPart.toString().padStart(4, '0');
    });

    return paddedParts.join('.');
  }

  // ====== NUEVAS FUNCIONALIDADES DE PRESENTACIÓN ======
  private recomputeDescendantCounts(data: PlanCuenta[]): void {
    this.descendantCount.clear();
    const nivel1 = data.filter(d => (d.nivel || this.calculateLevel(d.cuentaContable)) === 1);
    for (const root of nivel1) {
      const prefix = root.cuentaContable + '.';
      const count = data.filter(d => d.cuentaContable.startsWith(prefix)).length;
      this.descendantCount.set(root.cuentaContable, count);
    }
  }

  public getDescendantCount(element: PlanCuenta): number | null {
    const lvl = element.nivel || this.calculateLevel(element.cuentaContable);
    if (lvl !== 1) return null;
    return this.descendantCount.get(element.cuentaContable) || 0;
  }

  public getIndentPx(element: PlanCuenta): number {
    const lvl = element.nivel || this.calculateLevel(element.cuentaContable);
    return Math.max(0, (lvl - 1) * 16);
  }

  public getDescTooltip(element: PlanCuenta): string | null {
    const dc = this.getDescendantCount(element);
    if (dc === null) return null;
    if (dc === 0) return 'Sin subcuentas';
    return dc === 1 ? '1 subcuenta' : `${dc} subcuentas`;
  }

  // Devuelve true si la cuenta tiene hijos directos (por cuentaContable prefijo)
  public hasChildren(element: PlanCuenta): boolean {
    const prefix = element.cuentaContable + '.';
    return this.planCuentas.some(p => p.cuentaContable.startsWith(prefix));
  }

  // Construye la ruta textual completa usando nombres ("ACTIVOS / ACTIVOS CORRIENTES / CAJA")
  public getFullPath(element: PlanCuenta): string {
    if (!element.cuentaContable) return element.nombre;
    const parts = element.cuentaContable.split('.');
    const path: string[] = [];
    let current = '';
    for (const part of parts) {
      current = current ? current + '.' + part : part;
      const match = this.planCuentas.find(p => p.cuentaContable === current);
      if (match) path.push(match.nombre);
    }
    return path.join(' / ');
  }

  /**
   * Formatea una fecha para mostrarla en la tabla usando función personalizada segura
   */
  public formatDate(date?: Date): string {
    return this.formatFecha(date);
  }

  // Función personalizada para formateo seguro de fechas
  formatFecha(fecha: string | Date | null | undefined): string {
    if (!fecha) return '-';
    
    try {
      const fechaStr = typeof fecha === 'string' ? fecha : fecha.toISOString();
      // Remover zona horaria problemática: "2024-01-15T05:00:00Z[UTC]"
      const fechaLimpia = fechaStr.split('[')[0].replace('Z', '');
      const fechaObj = new Date(fechaLimpia);
      
      if (isNaN(fechaObj.getTime())) return 'Fecha inválida';
      
      return fechaObj.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (err) {
      console.error('Error formateando fecha:', err);
      return 'Error de formato';
    }
  }

  // ====== NUEVA LÓGICA JERÁRQUICA (paridad con Plan Árbol) ======

  private calculateLevel(cuentaContable: string): number {
    if (!cuentaContable) return 0;
    if (cuentaContable === '0') return 0;
    const dots = (cuentaContable.match(/\./g) || []).length;
    return dots + 1;
  }

  private getMaxDepthAllowed(): number {
    const existingMax = Math.max(0, ...this.planCuentas.map(c => c.nivel || 0));
    const naturalezaCount = this.naturalezas.length || 1;
    return Math.max(existingMax + 1, naturalezaCount);
  }

  private canAddChild(parent: PlanCuenta): boolean {
    const lvl = parent.nivel || this.calculateLevel(parent.cuentaContable);
    return lvl < this.getMaxDepthAllowed();
  }

  private generateNewCuentaContable(parent: PlanCuenta): string {
    if (parent.cuentaContable === '0') {
      const rootChildren = this.planCuentas
        .filter(p => p.cuentaContable && !p.cuentaContable.includes('.') && p.cuentaContable !== '0')
        .map(p => parseInt(p.cuentaContable || '0', 10))
        .filter(n => !isNaN(n));
      const next = rootChildren.length === 0 ? 1 : Math.max(...rootChildren) + 1;
      return String(next);
    }
    const parentNumber = parent.cuentaContable || '';
    const children = this.planCuentas.filter(p => {
      if (!p.cuentaContable) return false;
      if (!p.cuentaContable.startsWith(parentNumber + '.')) return false;
      const parentDots = (parentNumber.match(/\./g) || []).length;
      const childDots = (p.cuentaContable.match(/\./g) || []).length;
      return childDots === parentDots + 1;
    });
    const lastSegments = children.map(c => {
      const parts = (c.cuentaContable || '').split('.');
      return parseInt(parts[parts.length - 1], 10) || 0;
    });
    const nextSegment = Math.max(0, ...lastSegments) + 1;
    return parentNumber + '.' + nextSegment;
  }

  private getNextAvailableRootNaturalezaCodigo(): number | null {
    const existingRoots = new Set(
      this.planCuentas
        .filter(p => p.cuentaContable && !p.cuentaContable.includes('.') && p.cuentaContable !== '0')
        .map(p => parseInt(p.cuentaContable || '0', 10))
    );
    const orderedNaturalezas = [...this.naturalezas].sort((a,b) => a.codigo - b.codigo);
    for (const nat of orderedNaturalezas) {
      if (!existingRoots.has(nat.codigo)) {
        return nat.codigo;
      }
    }
    return null;
  }
}

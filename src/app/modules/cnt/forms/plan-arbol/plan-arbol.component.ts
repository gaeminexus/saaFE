import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTreeModule } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatNestedTreeNode } from '@angular/material/tree';
import { MatTreeNestedDataSource } from '@angular/material/tree';
import { MatExpansionModule } from '@angular/material/expansion';
import { PageEvent, MatPaginatorModule } from '@angular/material/paginator';

import { PlanCuentaService } from '../../service/plan-cuenta.service';
import { NaturalezaCuentaService } from '../../service/naturaleza-cuenta.service';
import { PlanCuenta } from '../../model/plan-cuenta';
import { NaturalezaCuenta } from '../../model/naturaleza-cuenta';
import { ExportService } from '../../../../shared/services/export.service';
import { PlanCuentaUtilsService } from '../../../../shared/services/plan-cuenta-utils.service';
import { PlanArbolFormComponent } from './plan-arbol-form.component';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { getMockPlanCuentas, getMockNaturalezas } from '../../../../shared/mocks/plan-cuenta.mock';

interface PlanCuentaNode extends PlanCuenta {
  children?: PlanCuentaNode[];
  level?: number;
  expandable?: boolean;
  isExpanded?: boolean;
}

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc' | null;
}

@Component({
  selector: 'app-plan-arbol',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTreeModule,
    MatExpansionModule,
    MatPaginatorModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './plan-arbol.component.html',
  styleUrls: ['./plan-arbol.component.scss']
})
export class PlanArbolComponent implements OnInit, AfterViewInit {

  // ViewChild para scroll detection
  @ViewChild('treeContainer') treeContainer!: ElementRef;

  // Datos
  planCuentas: PlanCuenta[] = [];
  naturalezas: NaturalezaCuenta[] = [];
  treeData: PlanCuentaNode[] = [];
  filteredData: PlanCuentaNode[] = [];
  pagedData: PlanCuentaNode[] = [];

  // Signals para estado reactivo
  loading = signal<boolean>(false);
  error = signal<string>('');
  totalRegistros = signal<number>(0);
  isScrolled = signal<boolean>(false);

  // Vista: árbol o lista
  viewMode: 'tree' | 'list' = 'tree';

  // Filtros
  selectedNaturaleza: number | null = null;
  selectedEstado: number | null = null;

  // Paginación (solo para vista de lista)
  pageIndex = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalElements = 0;

  // Ordenamiento
  sortConfig: SortConfig = { column: '', direction: null };

  // Control del árbol
  treeControl = new NestedTreeControl<PlanCuentaNode>((node: PlanCuentaNode) => node.children);
  dataSource = new MatTreeNestedDataSource<PlanCuentaNode>();

  // Solo visualización por ahora
  showActions = true;

  // Nivel base seleccionado para creaciones desde el header (raíz o hijo del nivel)
  selectedNivelBase = 1;
  previewCuentaDestino = '';

  // Nodo seleccionado en el árbol
  selectedNode: PlanCuentaNode | null = null;

  constructor(
    private planCuentaService: PlanCuentaService,
    private naturalezaCuentaService: NaturalezaCuentaService,
    private dialog: MatDialog,
    private exportService: ExportService,
    private planUtils: PlanCuentaUtilsService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadNaturalezas();
  }

  ngAfterViewInit(): void {
    if (this.treeContainer) {
      this.setupScrollDetection();
    }
  }

  setupScrollDetection(): void {
    const container = this.treeContainer.nativeElement;
    container.addEventListener('scroll', () => {
      const scrollTop = container.scrollTop;
      const scrollLeft = container.scrollLeft;
      this.isScrolled.set(scrollTop > 100 || scrollLeft > 50);
    });
  }

  scrollToTop(): void {
    if (this.treeContainer) {
      this.treeContainer.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  scrollToLeft(): void {
    if (this.treeContainer) {
      this.treeContainer.nativeElement.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }

  // ⚠️ Debe ser público para que el template pueda llamarlo
  public loadData(): void {
    this.loading.set(true);
    this.error.set('');

    console.log('🔍 Cargando PlanArbol con getAll y filtrando por empresa 280...');

    this.planCuentaService.getAll().subscribe({
      next: (data) => {
        console.log('📡 Respuesta del backend (getAll):', data);
        const list = Array.isArray(data) ? data : (data as any)?.data ?? [];

        // Filtrar por empresa 280 en frontend
        const filtered = list.filter((it: any) => it?.empresa?.codigo === 280);
        console.log(`📋 Total: ${list.length} | Empresa 280: ${filtered.length}`);

        if (filtered.length === 0) {
          console.log('⚠️ No se encontraron cuentas para empresa 280');
          this.error.set('No se encontraron cuentas para la empresa 280.');
          // Opcional: usar mock para visualizar estructura
          this.loadMockData();
        } else {
          console.log(`✅ Se cargaron ${filtered.length} cuentas para empresa 280`);
          this.error.set('');
          this.planCuentas = filtered;
          this.totalRegistros.set(filtered.length);
          this.setDefaultSort();
          this.buildTree();
          this.applyFiltersAndPagination();
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error al cargar datos (getAll):', err);
        if (err?.error?.message?.includes('ORA-00942')) {
          this.error.set('Error de Base de Datos: Tabla CNT.PLNN no existe. Contactar administrador.');
        } else if (err?.status === 0) {
          this.error.set('Backend no disponible. Verificar que esté ejecutándose en localhost:8080');
        } else {
          this.error.set(`Error del servidor: ${err?.status} - ${err?.message || 'Error desconocido'}`);
        }
        // Mostrar mock para poder validar la UI
        this.loadMockData();
        this.loading.set(false);
      }
    });
  }

  // Método de fallback usando getAll
  private loadDataFallback(): void {
    console.log('🔍 Cargando datos sin filtro de empresa (fallback)...');
    console.log('🔗 URL del servicio fallback:', '/api/saa-backend/rest/plnn/getAll');

    this.planCuentaService.getAll().subscribe({
      next: (data) => {
        console.log('📡 Respuesta del backend (fallback getAll):', data);
        const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
        console.log('📋 Lista procesada (fallback):', list);

        if (list.length === 0) {
          console.log('⚠️ No se encontraron datos en la base de datos');
          this.error.set('No se encontraron cuentas en la base de datos. Verificar que las tablas CNT.PLNN existan.');
        } else {
          console.log(`✅ Se cargaron ${list.length} cuentas exitosamente (fallback)`);
          this.error.set(''); // Limpiar error si se cargaron datos
        }

        this.planCuentas = list;
        this.totalRegistros.set(list.length);
        this.setDefaultSort();
        this.buildTree();
        this.applyFiltersAndPagination();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error al cargar datos del backend (fallback):', err);

        // Proporcionar información específica del error
        if (err.error?.message?.includes('ORA-00942')) {
          this.error.set('Error BD: Las tablas CNT.PLNN/CNT.NTRL no existen. Ejecutar scripts de creación de BD.');
        } else if (err.status === 0) {
          this.error.set('Backend no disponible en localhost:8080. Verificar que WildFly esté ejecutándose.');
        } else {
          this.error.set(`Error del servidor: ${err.status} - ${err.message || 'Error desconocido'}`);
        }

        this.loading.set(false);

        // En caso de error, mostrar datos de ejemplo para desarrollo
        console.log('📝 Cargando datos de ejemplo para desarrollo...');
        this.loadMockData();
      }
    });
  }

  private loadMockData(): void {
    console.log('📝 Cargando datos mock desde servicio centralizado');

    const mockData = getMockPlanCuentas();

    setTimeout(() => {
      this.planCuentas = mockData;
      this.totalRegistros.set(mockData.length);
      console.log('🔄 Datos asignados, construyendo árbol...');
      this.setDefaultSort();
      this.buildTree();
      this.applyFiltersAndPagination();
      this.error.set('Usando datos de ejemplo - Backend no disponible');
      this.loading.set(false);
    }, 300);
  }

  private loadNaturalezas(): void {
    console.log('🔍 Iniciando carga de naturalezas para empresa 280...');

    // Crear criterios usando el patrón DatosBusqueda
    const criterioConsultaArray: Array<DatosBusqueda> = [];

    // Filtro por empresa (código 280)
    const criterioEmpresa = new DatosBusqueda();
    criterioEmpresa.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'empresa', 'codigo', '280', TipoComandosBusqueda.IGUAL);
    criterioConsultaArray.push(criterioEmpresa);

    // Ordenar por nombre
    const criterioOrden = new DatosBusqueda();
    criterioOrden.orderBy('nombre');
    criterioConsultaArray.push(criterioOrden);

    this.naturalezaCuentaService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (data) => {
        console.log('📡 Respuesta del backend para naturalezas empresa 280:', data);
        const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
        console.log('📋 Lista de naturalezas procesada para empresa 280:', list);

        if (list.length === 0) {
          console.log('⚠️ No se encontraron naturalezas para empresa 280, probando getAll...');
          this.loadNaturalezasFallback();
        } else {
          console.log(`✅ Se cargaron ${list.length} naturalezas para empresa 280 exitosamente`);
          this.naturalezas = list;
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar naturalezas con empresa 280:', err);
        console.log('🔄 Probando getAll como fallback...');
        this.loadNaturalezasFallback();
      }
    });
  }

  // Método de fallback para naturalezas usando getAll
  private loadNaturalezasFallback(): void {
    console.log('🔍 Cargando naturalezas sin filtro (fallback)...');

    this.naturalezaCuentaService.getAll().subscribe({
      next: (data) => {
        console.log('📡 Respuesta del backend para naturalezas (fallback):', data);
        const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
        console.log('📋 Lista de naturalezas procesada (fallback):', list);

        if (list.length === 0) {
          console.log('⚠️ No se encontraron naturalezas en la base de datos');
          this.loadMockNaturalezas();
        } else {
          console.log(`✅ Se cargaron ${list.length} naturalezas exitosamente (fallback)`);
          this.naturalezas = list;
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar naturalezas del backend (fallback):', err);
        console.log('📝 Cargando naturalezas de ejemplo...');
        this.loadMockNaturalezas();
      }
    });
  }

  private loadMockNaturalezas(): void {
    console.log('📝 Cargando naturalezas mock desde servicio centralizado');
    this.naturalezas = getMockNaturalezas();
  }

  private buildTree(): void {
    // Crear mapa de cuentas por código
    const accountMap = new Map<number, PlanCuentaNode>();

    // Convertir a nodos del árbol
    this.planCuentas.forEach(cuenta => {
      const node: PlanCuentaNode = {
        ...cuenta,
        children: [],
        level: this.planUtils.calculateLevel(cuenta.cuentaContable || ''),
        expandable: false,
        isExpanded: false
      };
      accountMap.set(cuenta.codigo!, node);
    });

    // Construir jerarquía
    const rootNodes: PlanCuentaNode[] = [];

    this.planCuentas.forEach(cuenta => {
      const node = accountMap.get(cuenta.codigo!)!;

      if (cuenta.idPadre && cuenta.idPadre !== 0 && cuenta.idPadre !== cuenta.codigo) {
        const parent = accountMap.get(cuenta.idPadre);
        if (parent) {
          parent.children!.push(node);
          parent.expandable = true;
        } else {
          // Si no encuentra el padre, lo pone como raíz
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Ordenar nodos por número de cuenta
    const sortNodes = (nodes: PlanCuentaNode[]) => {
      nodes.sort((a, b) => {
        const aNumber = this.planUtils.getAccountNumberForSorting(a.cuentaContable || '');
        const bNumber = this.planUtils.getAccountNumberForSorting(b.cuentaContable || '');
        return aNumber.localeCompare(bNumber);
      });
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(rootNodes);

    this.treeData = rootNodes;

    // Asignar datos al dataSource
    this.dataSource.data = this.treeData;

    console.log('🌲 Árbol construido:', {
      totalCuentas: this.planCuentas.length,
      nodosRaiz: rootNodes.length,
      treeData: this.treeData,
      flatData: this.treeControl.dataNodes
    });
    // No expandir automáticamente: iniciar todo colapsado
    this.updatePreviewCuentaDestino();
  }

  private flattenTree(nodes: PlanCuentaNode[]): PlanCuentaNode[] {
    const result: PlanCuentaNode[] = [];

    const flatten = (nodeList: PlanCuentaNode[]) => {
      nodeList.forEach(node => {
        result.push(node);
        if (node.children && node.children.length > 0) {
          flatten(node.children);
        }
      });
    };

    flatten(nodes);
    return result;
  }

  private calculateLevel(cuentaContable: string): number {
    return this.planUtils.calculateLevel(cuentaContable);
  }

  public toggleViewMode(): void {
    this.viewMode = this.viewMode === 'tree' ? 'list' : 'tree';
    this.applyFiltersAndPagination();
  }

  public onFilterChange(): void {
    this.applyFiltersAndPagination();
  }

  public clearFilters(): void {
    this.selectedNaturaleza = null;
    this.selectedEstado = null;
    this.applyFiltersAndPagination();
  }

  public onSort(column: string): void {
    if (this.sortConfig.column === column) {
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' :
                                  this.sortConfig.direction === 'desc' ? null : 'asc';
    } else {
      this.sortConfig.column = column;
      this.sortConfig.direction = 'asc';
    }

    if (this.sortConfig.direction === null) {
      this.sortConfig.column = '';
    }

    this.applyFiltersAndPagination();
  }

  public onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyFiltersAndPagination();
  }

  public getSortIcon(column: string): string {
    if (this.sortConfig.column !== column) return 'unfold_more';
    return this.sortConfig.direction === 'asc' ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
  }

  private applyFiltersAndPagination(): void {
    // 1. Obtener datos base según la vista
    let baseData: PlanCuentaNode[];

    if (this.viewMode === 'tree') {
      baseData = this.flattenTree(this.treeData);
    } else {
      baseData = this.planCuentas.map(cuenta => ({
        ...cuenta,
        level: this.calculateLevel(cuenta.cuentaContable || ''),
        children: [],
        expandable: false,
        isExpanded: false
      }));
    }

    // 2. Filtrar
    this.filteredData = baseData.filter(item => {
      let matches = true;

      if (this.selectedNaturaleza !== null) {
        matches = matches && item.naturalezaCuenta?.codigo === this.selectedNaturaleza;
      }

      if (this.selectedEstado !== null) {
        matches = matches && item.estado === this.selectedEstado;
      }

      return matches;
    });

    // 3. Ordenar
      if (this.sortConfig.column && this.sortConfig.direction) {
      this.filteredData.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        // Manejo especial para ordenamiento por número de cuenta
        if (this.sortConfig.column === 'cuentaContable') {
          aVal = this.planUtils.getAccountNumberForSorting(a.cuentaContable || '');
          bVal = this.planUtils.getAccountNumberForSorting(b.cuentaContable || '');
        } else if (this.sortConfig.column === 'naturalezaCuenta') {
          aVal = this.getNaturalezaName(a.naturalezaCuenta?.codigo).toLowerCase();
          bVal = this.getNaturalezaName(b.naturalezaCuenta?.codigo).toLowerCase();
        } else {
          aVal = (a as any)[this.sortConfig.column];
          bVal = (b as any)[this.sortConfig.column];
        }

        let comparison = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else {
          if (aVal > bVal) comparison = 1;
          if (aVal < bVal) comparison = -1;
        }

        return this.sortConfig.direction === 'desc' ? -comparison : comparison;
      });
    }

    // 4. Paginar (solo en vista de lista)
    this.totalElements = this.filteredData.length;

    if (this.viewMode === 'list') {
      const startIndex = this.pageIndex * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      this.pagedData = this.filteredData.slice(startIndex, endIndex);
    } else {
      this.pagedData = this.filteredData;
    }
  }

  // ---- Helpers de presentación (públicos para usarlos en el template) ----
  public getNaturalezaName(id?: number): string {
    if (!id) return '';
    const naturaleza = this.naturalezas.find(n => n.codigo === id);
    return naturaleza?.nombre || '';
  }

  public estadoLabel(valor: any): string {
    return this.planUtils.getEstadoLabel(valor);
  }

  // Función personalizada para formateo seguro de fechas
  formatFecha(fecha: string | Date | null | undefined): string {
    const formatted = this.planUtils.formatFecha(fecha);
    return formatted === '-' ? 'N/A' : formatted;
  }

  public trackByCodigo = (_: number, item: PlanCuentaNode) =>
    (item as any).codigo ?? _;

  // ---- Tree helpers ----
  hasChild = (_: number, node: PlanCuentaNode) => !!node.children && node.children.length > 0;

  public getLevel = (node: PlanCuentaNode) => node.level || 0;

  public isExpandable = (node: PlanCuentaNode) => node.expandable || false;

  // Reglas de acciones por nivel
  public canAddChild(node: PlanCuentaNode): boolean {
    const lvl = this.getLevel(node);
    const maxDepth = this.getMaxDepthAllowed();
    return this.planUtils.canAddChild(lvl, maxDepth);
  }

  public canEdit(_node: PlanCuentaNode): boolean {
    return true;
  }

  // ---- Acciones CRUD ----
  onAdd(parent?: PlanCuentaNode) {
    // Si no se pasa padre explícito y hay selección, usarla
    if (!parent && this.selectedNode) {
      parent = this.selectedNode;
    }

    // Creación de raíz basada en naturalezas disponibles
    if (!parent) {
      const nextRoot = this.getNextAvailableRootNaturalezaCodigo();
      if (nextRoot === null) {
        alert('No se puede crear nueva cuenta raíz: todas las naturalezas tienen cuenta asociada.');
        return;
      }
      // Obtener nodo raíz (cuentaContable == '0') para usar su codigo como idPadre real
      const rootParent = this.planCuentas.find(p => p.cuentaContable === '0') || null;
      const dialogRef = this.dialog.open(PlanArbolFormComponent, {
        width: '720px',
        disableClose: true,
        data: {
          parent: rootParent, // pasamos el root real para asignar idPadre correcto
          naturalezas: this.naturalezas,
          presetCuenta: String(nextRoot),
          presetNivel: 1,
          maxDepth: this.getMaxDepthAllowed()
        }
      });
      dialogRef.afterClosed().subscribe(result => { if (result) { this.loadData(); } });
      return;
    }

    if (parent && !this.canAddChild(parent)) {
      alert('No se puede agregar más niveles bajo este nodo: profundidad máxima alcanzada.');
      return;
    }

    const presetCuenta = this.generateNewCuentaContable(parent);
    const presetNivel = parent ? (parent.level || 0) + 1 : 1;

    const dialogRef = this.dialog.open(PlanArbolFormComponent, {
      width: '720px',
      disableClose: true,
      data: {
        parent: parent || null,
        naturalezas: this.naturalezas,
        presetCuenta,
        presetNivel,
        maxDepth: this.getMaxDepthAllowed()
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  onEdit(item: PlanCuentaNode) {
    const dialogRef = this.dialog.open(PlanArbolFormComponent, {
      width: '700px',
      disableClose: true,
      data: { item, naturalezas: this.naturalezas }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  // ---- Métodos de exportación ----
  public exportToCSV(): void {
    const headers = ['Código', 'Nombre', 'Número', 'Naturaleza', 'Estado', 'Nivel'];
    const dataKeys = ['codigo', 'nombre', 'numero', 'naturaleza', 'estado', 'level'];
    const filename = `planarbol-${new Date().toISOString().split('T')[0]}.csv`;

    const transformedData = this.filteredData.map(item => ({
      codigo: item.codigo || '',
      nombre: item.nombre || '',
      numero: item.cuentaContable || '',
      naturaleza: this.getNaturalezaName(item.naturalezaCuenta?.codigo),
      estado: this.estadoLabel(item.estado),
      level: item.level || 0
    }));

    this.exportService.exportToCSV(transformedData, filename, headers);
  }

  public exportToPDF(): void {
    const headers = ['Código', 'Nombre', 'Número', 'Naturaleza', 'Estado', 'Nivel'];
    const dataKeys = ['codigo', 'nombre', 'numero', 'naturaleza', 'estado', 'level'];
    const filename = `planarbol-${new Date().toISOString().split('T')[0]}`;
    const title = 'PlanArbol';

    const transformedData = this.filteredData.map(item => ({
      codigo: item.codigo || '',
      nombre: item.nombre || '',
      numero: item.cuentaContable || '',
      naturaleza: this.getNaturalezaName(item.naturalezaCuenta?.codigo),
      estado: this.estadoLabel(item.estado),
      level: item.level || 0
    }));

    this.exportService.exportToPDF(transformedData, filename, title, headers, dataKeys);
  }

  /**
   * Establece el ordenamiento por defecto por número de cuenta
   */
  private setDefaultSort(): void {
    this.sortConfig.column = 'cuentaContable';
    this.sortConfig.direction = 'asc';
  }

  // --- Nueva lógica de numeración y límites ---
  private getMaxDepthAllowed(): number {
    const existingMax = Math.max(0, ...this.planCuentas.map(c => c.nivel || 0));
    const naturalezaCount = this.naturalezas.length || 1;
    return this.planUtils.getMaxDepthAllowed(existingMax, naturalezaCount);
  }

  private generateNewCuentaContable(parent?: PlanCuentaNode): string {
    if (!parent) return '1';
    
    const existingAccounts = this.planCuentas
      .map(p => p.cuentaContable || '')
      .filter(c => c);
    
    return this.planUtils.generateNewCuentaContable(
      parent.cuentaContable || '',
      existingAccounts
    );
  }

  private findRootNodeByNumber(levelStr: string): PlanCuentaNode | undefined {
    const candidates = (this.treeData || []).filter(n => (n.cuentaContable || '') === levelStr);
    return candidates[0];
  }

  // Seleccionar nodo y ajustar nivel objetivo (hijo => nivel + 1)
  public selectNode(node: PlanCuentaNode): void {
    this.selectedNode = node;
    const lvl = this.getLevel(node);
    this.selectedNivelBase = Math.max(1, (lvl || 0) + 1);
    this.updatePreviewCuentaDestino();
  }

  private updatePreviewCuentaDestino(): void {
    if (this.selectedNode) {
      this.previewCuentaDestino = this.generateNewCuentaContable(this.selectedNode);
      return;
    }
    // Cuando no hay nodo seleccionado estamos en contexto de creación raíz.
    // La vista debe mostrar el siguiente número de cuenta raíz (máximo existente + 1)
    // filtrado por empresa (ya planCuentas viene filtrado a 280).
    const nextRoot = this.getNextRootSequentialCuenta();
    this.previewCuentaDestino = nextRoot === null ? '(SIN CUPOS)' : String(nextRoot);
  }

  // Obtener siguiente código de naturaleza sin cuenta raíz
  private getNextAvailableRootNaturalezaCodigo(): number | null {
    const existingRoots = this.planUtils.extractRootNumbers(
      this.planCuentas.map(p => p.cuentaContable || '')
    );
    const orderedCodigos = this.naturalezas
      .map(n => n.codigo)
      .sort((a, b) => a - b);
    
    return this.planUtils.getNextAvailableRootNaturalezaCodigo(
      existingRoots,
      orderedCodigos
    );
  }

  // Nuevo método: calcula el siguiente número de cuenta raíz secuencial (máx + 1)
  private getNextRootSequentialCuenta(): number | null {
    const rootNumbers = this.planUtils.extractRootNumbers(
      this.planCuentas.map(p => p.cuentaContable || '')
    );
    return this.planUtils.getNextRootSequentialCuenta(rootNumbers);
  }
}

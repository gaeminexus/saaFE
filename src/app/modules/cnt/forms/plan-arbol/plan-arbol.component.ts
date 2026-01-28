import { NestedTreeControl } from '@angular/cdk/tree';
import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTreeModule, MatTreeNestedDataSource } from '@angular/material/tree';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { ExportService } from '../../../../shared/services/export.service';
import { PlanCuentaUtilsService } from '../../../../shared/services/plan-cuenta-utils.service';
import { PlanCuentaAddEditComponent } from '../../dialog/plan-cuenta-add-edit/plan-cuenta-add-edit.component';
import { NaturalezaCuenta } from '../../model/naturaleza-cuenta';
import { PlanCuenta } from '../../model/plan-cuenta';
import { NaturalezaCuentaService } from '../../service/naturaleza-cuenta.service';
import { PlanCuentaService } from '../../service/plan-cuenta.service';

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
    MatSnackBarModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './plan-arbol.component.html',
  styleUrls: ['./plan-arbol.component.scss'],
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
  selectedTipo: number | null = null;
  numeroSearchText: string = '';
  naturalezaSearchText: string = '';
  globalSearchText: string = '';

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

  // Almacenar estado de expansión
  private expandedNodesCodes = new Set<number>();

  // Obtener empresa desde localStorage
  private get idSucursal(): number {
    return parseInt(localStorage.getItem('idSucursal') || '280', 10);
  }

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
    private planUtils: PlanCuentaUtilsService,
    private snackBar: MatSnackBar,
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
    // Guardar estado de expansión actual
    this.saveExpandedState();

    this.loading.set(true);
    this.error.set('');

    this.planCuentaService.getAll().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : ((data as any)?.data ?? []);

        // Filtrar por empresa desde localStorage
        const filtered = list.filter((it: any) => it?.empresa?.codigo === this.idSucursal);

        this.error.set('');
        this.planCuentas = filtered;
        this.totalRegistros.set(filtered.length);
        this.setDefaultSort();
        this.buildTree();
        this.applyFiltersAndPagination();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('❌ Error al cargar datos (getAll):', err);
        if (err?.error?.message?.includes('ORA-00942')) {
          this.error.set(
            'Error de Base de Datos: Tabla CNT.PLNN no existe. Contactar administrador.',
          );
        } else if (err?.status === 0) {
          this.error.set(
            'Backend no disponible. Verificar que esté ejecutándose en localhost:8080',
          );
        } else {
          this.error.set(
            `Error del servidor: ${err?.status} - ${err?.message || 'Error desconocido'}`,
          );
        }
        this.planCuentas = [];
        this.loading.set(false);
      },
    });
  }

  // Método de fallback usando getAll
  private loadDataFallback(): void {
    this.planCuentaService.getAll().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : ((data as any)?.data ?? []);

        if (list.length === 0) {
          this.error.set(
            'No se encontraron cuentas en la base de datos. Verificar que las tablas CNT.PLNN existan.',
          );
        } else {
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
          this.error.set(
            'Error BD: Las tablas CNT.PLNN/CNT.NTRL no existen. Ejecutar scripts de creación de BD.',
          );
        } else if (err.status === 0) {
          this.error.set(
            'Backend no disponible en localhost:8080. Verificar que WildFly esté ejecutándose.',
          );
        } else {
          this.error.set(
            `Error del servidor: ${err.status} - ${err.message || 'Error desconocido'}`,
          );
        }

        this.loading.set(false);

        // En caso de error
        this.planCuentas = [];
      },
    });
  }

  private loadNaturalezas(): void {
    // Crear criterios usando el patrón DatosBusqueda
    const criterioConsultaArray: Array<DatosBusqueda> = [];

    // Filtro por empresa desde localStorage
    const criterioEmpresa = new DatosBusqueda();
    criterioEmpresa.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empresa',
      'codigo',
      String(this.idSucursal),
      TipoComandosBusqueda.IGUAL,
    );
    criterioConsultaArray.push(criterioEmpresa);

    // Ordenar por nombre
    const criterioOrden = new DatosBusqueda();
    criterioOrden.orderBy('nombre');
    criterioConsultaArray.push(criterioOrden);

    this.naturalezaCuentaService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : ((data as any)?.data ?? []);

        if (list.length === 0) {
          this.loadNaturalezasFallback();
        } else {
          // Ordenar por número de cuenta de menor a mayor
          this.naturalezas = list.sort((a: any, b: any) => (a.numero || 0) - (b.numero || 0));
        }
      },
      error: (err) => {
        console.error(`❌ Error al cargar naturalezas con empresa ${this.idSucursal}:`, err);
        this.loadNaturalezasFallback();
      },
    });
  }

  // Método de fallback para naturalezas usando getAll
  private loadNaturalezasFallback(): void {
    this.naturalezaCuentaService.getAll().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : ((data as any)?.data ?? []);

        // Filtrar por empresa desde localStorage
        const filtered = list.filter((nat: any) => nat?.empresa?.codigo === this.idSucursal);

        if (filtered.length === 0) {
          this.loadMockNaturalezas();
        } else {
          // Ordenar por número de cuenta de menor a mayor
          this.naturalezas = filtered.sort((a: any, b: any) => (a.numero || 0) - (b.numero || 0));
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar naturalezas del backend (fallback):', err);
        this.loadMockNaturalezas();
      },
    });
  }

  private loadMockNaturalezas(): void {
    this.naturalezas = [];
  }

  private buildTree(): void {
    // Crear mapa de cuentas por código
    const accountMap = new Map<number, PlanCuentaNode>();

    // Convertir a nodos del árbol
    this.planCuentas.forEach((cuenta) => {
      const node: PlanCuentaNode = {
        ...cuenta,
        children: [],
        level: this.planUtils.calculateLevel(cuenta.cuentaContable || ''),
        expandable: false,
        isExpanded: false,
      };
      accountMap.set(cuenta.codigo!, node);
    });

    // Construir jerarquía
    const rootNodes: PlanCuentaNode[] = [];

    this.planCuentas.forEach((cuenta) => {
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
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          sortNodes(node.children);
        }
      });
    };

    sortNodes(rootNodes);

    this.treeData = rootNodes;

    // Asignar datos al dataSource
    this.dataSource.data = this.treeData;

    // Restaurar estado de expansión
    this.restoreExpandedState();

    // No expandir automáticamente: iniciar todo colapsado
    this.updatePreviewCuentaDestino();
  }

  private flattenTree(nodes: PlanCuentaNode[]): PlanCuentaNode[] {
    const result: PlanCuentaNode[] = [];

    const flatten = (nodeList: PlanCuentaNode[]) => {
      nodeList.forEach((node) => {
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
    this.selectedTipo = null;
    this.numeroSearchText = '';
    this.naturalezaSearchText = '';
    this.globalSearchText = '';
    this.pageIndex = 0;
    this.applyFiltersAndPagination();
  }

  public onSort(column: string): void {
    if (this.sortConfig.column === column) {
      this.sortConfig.direction =
        this.sortConfig.direction === 'asc'
          ? 'desc'
          : this.sortConfig.direction === 'desc'
            ? null
            : 'asc';
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

  public onGlobalSearchChange(value: string): void {
    this.globalSearchText = value || '';
    this.pageIndex = 0;
    this.applyFiltersAndPagination();
  }

  public onNaturalezaSearchChange(value: string): void {
    this.naturalezaSearchText = value || '';
    this.pageIndex = 0;
    this.applyFiltersAndPagination();
  }

  public onNumeroSearchChange(value: string): void {
    this.numeroSearchText = value || '';
    this.pageIndex = 0;
    this.applyFiltersAndPagination();
  }

  public getSortIcon(column: string): string {
    if (this.sortConfig.column !== column) return 'unfold_more';
    return this.sortConfig.direction === 'asc' ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
  }

  public applyFiltersAndPagination(): void {
    // 1. Obtener datos base según la vista
    let baseData: PlanCuentaNode[];

    if (this.viewMode === 'tree') {
      baseData = this.flattenTree(this.treeData);
    } else {
      baseData = this.planCuentas.map((cuenta) => ({
        ...cuenta,
        level: this.calculateLevel(cuenta.cuentaContable || ''),
        children: [],
        expandable: false,
        isExpanded: false,
      }));
    }

    // 2. Filtrar
    this.filteredData = baseData.filter((item) => {
      let matches = true;

      if (this.selectedNaturaleza !== null) {
        matches = matches && item.naturalezaCuenta?.codigo === this.selectedNaturaleza;
      }

      if (this.selectedEstado !== null) {
        matches = matches && item.estado === this.selectedEstado;
      }

      if (this.selectedTipo !== null) {
        matches = matches && item.tipo === this.selectedTipo;
      }

      // Filtro por Número de cuenta (texto: incluye/prefijo) y nombre de cuenta
      if ((this.numeroSearchText || '').trim().length > 0) {
        const q = (this.numeroSearchText || '').trim().toLowerCase();
        const num = (item.cuentaContable || '').toLowerCase();
        const nombre = (item.nombre || '').toLowerCase();
        // Coincide si incluye o si el número empieza con la consulta, o si el nombre contiene la búsqueda
        const matchesNumero = num.includes(q) || num.startsWith(q) || nombre.includes(q);
        matches = matches && matchesNumero;
      }

      // Búsqueda por Naturaleza específica (texto)
      if ((this.naturalezaSearchText || '').trim().length > 0) {
        const q = (this.naturalezaSearchText || '').trim().toLowerCase();
        const nat = this.getNaturalezaName(item.naturalezaCuenta?.codigo).toLowerCase();
        matches = matches && nat.includes(q);
      }

      // Búsqueda global de texto (número, nombre, naturaleza, tipo, estado)
      if ((this.globalSearchText || '').trim().length > 0) {
        const t = (this.globalSearchText || '').trim().toLowerCase();
        const searchableText = [
          item.cuentaContable || '',
          item.nombre || '',
          this.getNaturalezaName(item.naturalezaCuenta?.codigo).toLowerCase(),
          this.estadoLabel(item.estado).toLowerCase(),
        ]
          .join(' ')
          .toLowerCase();

        matches = matches && searchableText.includes(t);
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

    // 4. Expandir/colapsar árbol según filtros/búsquedas
    if (this.viewMode === 'tree') {
      this.updateTreeExpansionByFilters();
    }

    // 5. Paginar (solo en vista de lista)
    this.totalElements = this.filteredData.length;

    if (this.viewMode === 'list') {
      const startIndex = this.pageIndex * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      this.pagedData = this.filteredData.slice(startIndex, endIndex);
    } else {
      this.pagedData = this.filteredData;
    }
  }

  // ---- Expansión/colapso según filtros y utilidades ----
  private updateTreeExpansionByFilters(): void {
    const hasActiveExpansionFilters =
      (this.numeroSearchText || '').trim().length > 0 ||
      (this.globalSearchText || '').trim().length > 0 ||
      (this.naturalezaSearchText || '').trim().length > 0 ||
      this.selectedNaturaleza !== null ||
      this.selectedEstado !== null ||
      this.selectedTipo !== null;

    if (!hasActiveExpansionFilters) {
      // No tocar el estado de expansión si no hay filtros/búsquedas activas
      return;
    }

    const matchedCodes = new Set<number>(
      (this.filteredData || [])
        .map((n: any) => n?.codigo)
        .filter((c: any) => typeof c === 'number' && !isNaN(c)),
    );

    const visit = (node: PlanCuentaNode): boolean => {
      let selfMatch = node.codigo ? matchedCodes.has(node.codigo) : false;
      let childMatch = false;
      if (node.children && node.children.length) {
        for (const child of node.children) {
          childMatch = visit(child) || childMatch;
        }
      }

      const shouldExpand = selfMatch || childMatch;
      if (shouldExpand) {
        this.treeControl.expand(node);
      } else {
        this.treeControl.collapse(node);
      }
      return shouldExpand;
    };

    (this.treeData || []).forEach((root) => visit(root));
  }

  public expandAll(): void {
    const expandNode = (node: PlanCuentaNode) => {
      this.treeControl.expand(node);
      if (node.children) node.children.forEach(expandNode);
    };
    (this.treeData || []).forEach(expandNode);
  }

  public collapseAll(): void {
    const collapseNode = (node: PlanCuentaNode) => {
      this.treeControl.collapse(node);
      if (node.children) node.children.forEach(collapseNode);
    };
    (this.treeData || []).forEach(collapseNode);
  }

  public expandMatches(): void {
    // Forzar actualización de expansión basada en filtros actuales
    this.updateTreeExpansionByFilters();
  }

  // ---- Helpers de presentación (públicos para usarlos en el template) ----
  public getNaturalezaName(id?: number): string {
    if (!id) return '';
    const naturaleza = this.naturalezas.find((n) => n.codigo === id);
    return naturaleza?.nombre || '';
  }

  public estadoLabel(valor: any): string {
    return this.planUtils.getEstadoLabel(valor);
  }

  public getTipoLabel(tipo?: number): string {
    return this.planUtils.getTipoLabel(tipo);
  }

  // Función personalizada para formateo seguro de fechas
  formatFecha(fecha: string | Date | null | undefined): string {
    const formatted = this.planUtils.formatFecha(fecha);
    return formatted === '-' ? 'N/A' : formatted;
  }

  public trackByCodigo = (_: number, item: PlanCuentaNode) => (item as any).codigo ?? _;

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
      const rootParent = this.planCuentas.find((p) => p.cuentaContable === '0') || null;
      const dialogRef = this.dialog.open(PlanCuentaAddEditComponent, {
        width: '720px',
        disableClose: true,
        data: {
          parent: rootParent, // pasamos el root real para asignar idPadre correcto
          naturalezas: this.naturalezas,
          presetCuenta: String(nextRoot),
          presetNivel: 1,
          maxDepth: this.getMaxDepthAllowed(),
        },
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.loadData();
        }
      });
      return;
    }

    if (parent && !this.canAddChild(parent)) {
      alert('No se puede agregar más niveles bajo este nodo: profundidad máxima alcanzada.');
      return;
    }

    const presetCuenta = this.generateNewCuentaContable(parent);
    const presetNivel = parent ? (parent.level || 0) + 1 : 1;

    const dialogRef = this.dialog.open(PlanCuentaAddEditComponent, {
      width: '720px',
      disableClose: true,
      data: {
        parent: parent || null,
        naturalezas: this.naturalezas,
        presetCuenta,
        presetNivel,
        maxDepth: this.getMaxDepthAllowed(),
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData();
      }
    });
  }

  onEdit(item: PlanCuentaNode) {
    const dialogRef = this.dialog.open(PlanCuentaAddEditComponent, {
      width: '700px',
      disableClose: true,
      data: { item, naturalezas: this.naturalezas },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData();
      }
    });
  }

  onDelete(node: PlanCuentaNode) {
    // Validar que tenga código válido
    if (!node.codigo || node.codigo === 0) {
      this.snackBar.open('⚠️ No se puede eliminar: código inválido', 'Cerrar', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar'],
      });
      return;
    }

    // Verificar si tiene hijos
    if (node.children && node.children.length > 0) {
      this.snackBar.open('⚠️ No se puede eliminar: la cuenta tiene subcuentas', 'Cerrar', {
        duration: 4000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['warning-snackbar'],
      });
      return;
    }

    // Abrir diálogo de confirmación moderno
    const dialogData: ConfirmDialogData = {
      title: '¿Eliminar cuenta?',
      message:
        'Esta acción no se puede deshacer. Se eliminará permanentemente la cuenta del sistema.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      details: [
        { label: 'Código', value: String(node.codigo) },
        { label: 'Cuenta', value: node.cuentaContable },
        { label: 'Nombre', value: node.nombre },
      ],
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '500px',
      data: dialogData,
      disableClose: false,
      autoFocus: true,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      // Ejecutar eliminación
      this.planCuentaService.delete(node.codigo).subscribe({
        next: () => {
          this.snackBar.open('✓ Cuenta eliminada exitosamente', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['success-snackbar'],
          });
          this.loadData();
        },
        error: (err) => {
          console.error('Error al eliminar cuenta:', err);
          const mensaje = err?.error?.message || err?.message || 'Error al eliminar la cuenta';
          this.snackBar.open(`✗ Error: ${mensaje}`, 'Cerrar', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar'],
          });
        },
      });
    });
  }

  // ---- Métodos de exportación ----
  public exportToCSV(): void {
    const headers = ['Código', 'Nombre', 'Número', 'Naturaleza', 'Estado', 'Nivel'];
    const dataKeys = ['codigo', 'nombre', 'numero', 'naturaleza', 'estado', 'level'];
    const filename = `planarbol-${new Date().toISOString().split('T')[0]}.csv`;

    const transformedData = this.filteredData.map((item) => ({
      codigo: item.codigo || '',
      nombre: item.nombre || '',
      numero: item.cuentaContable || '',
      naturaleza: this.getNaturalezaName(item.naturalezaCuenta?.codigo),
      estado: this.estadoLabel(item.estado),
      level: item.level || 0,
    }));

    this.exportService.exportToCSV(transformedData, filename, headers, dataKeys);
  }

  public exportToPDF(): void {
    const headers = ['Código', 'Nombre', 'Número', 'Naturaleza', 'Estado', 'Nivel'];
    const dataKeys = ['codigo', 'nombre', 'numero', 'naturaleza', 'estado', 'level'];
    const filename = `planarbol-${new Date().toISOString().split('T')[0]}`;
    const title = 'PlanArbol';

    const transformedData = this.filteredData.map((item) => ({
      codigo: item.codigo || '',
      nombre: item.nombre || '',
      numero: item.cuentaContable || '',
      naturaleza: this.getNaturalezaName(item.naturalezaCuenta?.codigo),
      estado: this.estadoLabel(item.estado),
      level: item.level || 0,
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
    const existingMax = Math.max(0, ...this.planCuentas.map((c) => c.nivel || 0));
    const naturalezaCount = this.naturalezas.length || 1;
    return this.planUtils.getMaxDepthAllowed(existingMax, naturalezaCount);
  }

  private generateNewCuentaContable(parent?: PlanCuentaNode): string {
    if (!parent) return '1';

    const existingAccounts = this.planCuentas.map((p) => p.cuentaContable || '').filter((c) => c);

    return this.planUtils.generateNewCuentaContable(parent.cuentaContable || '', existingAccounts);
  }

  private findRootNodeByNumber(levelStr: string): PlanCuentaNode | undefined {
    const candidates = (this.treeData || []).filter((n) => (n.cuentaContable || '') === levelStr);
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
      this.planCuentas.map((p) => p.cuentaContable || ''),
    );
    const orderedCodigos = this.naturalezas.map((n) => n.codigo).sort((a, b) => a - b);

    return this.planUtils.getNextAvailableRootNaturalezaCodigo(existingRoots, orderedCodigos);
  }

  // Nuevo método: calcula el siguiente número de cuenta raíz secuencial (máx + 1)
  private getNextRootSequentialCuenta(): number | null {
    const rootNumbers = this.planUtils.extractRootNumbers(
      this.planCuentas.map((p) => p.cuentaContable || ''),
    );
    return this.planUtils.getNextRootSequentialCuenta(rootNumbers);
  }

  /**
   * Guarda el estado de expansión actual de todos los nodos
   */
  private saveExpandedState(): void {
    this.expandedNodesCodes.clear();

    const saveNodeState = (node: PlanCuentaNode) => {
      if (this.treeControl.isExpanded(node) && node.codigo) {
        this.expandedNodesCodes.add(node.codigo);
      }
      if (node.children) {
        node.children.forEach((child) => saveNodeState(child));
      }
    };

    this.treeData.forEach((node) => saveNodeState(node));
  }

  /**
   * Restaura el estado de expansión de los nodos que estaban expandidos
   */
  private restoreExpandedState(): void {
    if (this.expandedNodesCodes.size === 0) {
      return;
    }

    const restoreNodeState = (node: PlanCuentaNode) => {
      if (node.codigo && this.expandedNodesCodes.has(node.codigo)) {
        this.treeControl.expand(node);
      }
      if (node.children) {
        node.children.forEach((child) => restoreNodeState(child));
      }
    };

    this.treeData.forEach((node) => restoreNodeState(node));
  }
}

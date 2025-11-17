import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
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
import { PlanArbolFormComponent } from './plan-arbol-form.component';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

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
export class PlanArbolComponent implements OnInit {

  // Datos
  planCuentas: PlanCuenta[] = [];
  naturalezas: NaturalezaCuenta[] = [];
  treeData: PlanCuentaNode[] = [];
  filteredData: PlanCuentaNode[] = [];
  pagedData: PlanCuentaNode[] = [];

  loading = false;
  error: string | null = null;

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
    private exportService: ExportService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.loadNaturalezas();
  }

  // ⚠️ Debe ser público para que el template pueda llamarlo
  public loadData(): void {
    this.loading = true;
    this.error = null;

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
          this.error = 'No se encontraron cuentas para la empresa 280.';
          // Opcional: usar mock para visualizar estructura
          this.loadMockData();
        } else {
          console.log(`✅ Se cargaron ${filtered.length} cuentas para empresa 280`);
          this.error = null;
          this.planCuentas = filtered;
          this.setDefaultSort();
          this.buildTree();
          this.applyFiltersAndPagination();
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar datos (getAll):', err);
        if (err?.error?.message?.includes('ORA-00942')) {
          this.error = 'Error de Base de Datos: Tabla CNT.PLNN no existe. Contactar administrador.';
        } else if (err?.status === 0) {
          this.error = 'Backend no disponible. Verificar que esté ejecutándose en localhost:8080';
        } else {
          this.error = `Error del servidor: ${err?.status} - ${err?.message || 'Error desconocido'}`;
        }
        // Mostrar mock para poder validar la UI
        this.loadMockData();
        this.loading = false;
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
          this.error = 'No se encontraron cuentas en la base de datos. Verificar que las tablas CNT.PLNN existan.';
        } else {
          console.log(`✅ Se cargaron ${list.length} cuentas exitosamente (fallback)`);
          this.error = null; // Limpiar error si se cargaron datos
        }

        this.planCuentas = list;
        this.setDefaultSort();
        this.buildTree();
        this.applyFiltersAndPagination();
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error al cargar datos del backend (fallback):', err);

        // Proporcionar información específica del error
        if (err.error?.message?.includes('ORA-00942')) {
          this.error = 'Error BD: Las tablas CNT.PLNN/CNT.NTRL no existen. Ejecutar scripts de creación de BD.';
        } else if (err.status === 0) {
          this.error = 'Backend no disponible en localhost:8080. Verificar que WildFly esté ejecutándose.';
        } else {
          this.error = `Error del servidor: ${err.status} - ${err.message || 'Error desconocido'}`;
        }

        this.loading = false;

        // En caso de error, mostrar datos de ejemplo para desarrollo
        console.log('📝 Cargando datos de ejemplo para desarrollo...');
        this.loadMockData();
      }
    });
  }

  private loadMockData(): void {
    // Mantener datos de ejemplo como fallback
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
      // Cuenta Raíz
      { codigo: 1, cuentaContable: '0', nombre: 'PLANARBOL', tipo: 1, nivel: 0, idPadre: 0, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },

      // Nivel 1 - Cuentas principales
      { codigo: 2, cuentaContable: '1', nombre: 'ACTIVOS', tipo: 1, nivel: 1, idPadre: 1, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },
      { codigo: 3, cuentaContable: '2', nombre: 'PASIVOS', tipo: 1, nivel: 1, idPadre: 1, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaAcreedora },
      { codigo: 4, cuentaContable: '3', nombre: 'CAPITAL', tipo: 1, nivel: 1, idPadre: 1, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaAcreedora },
      { codigo: 5, cuentaContable: '4', nombre: 'INGRESOS', tipo: 1, nivel: 1, idPadre: 1, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaAcreedora },
      { codigo: 6, cuentaContable: '5', nombre: 'EGRESOS', tipo: 1, nivel: 1, idPadre: 1, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },

      // Nivel 2 - Subcuentas de ACTIVOS
      { codigo: 7, cuentaContable: '1.1', nombre: 'ACTIVOS CORRIENTES', tipo: 1, nivel: 2, idPadre: 2, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },
      { codigo: 8, cuentaContable: '1.2', nombre: 'ACTIVOS FIJOS', tipo: 1, nivel: 2, idPadre: 2, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },
      { codigo: 9, cuentaContable: '1.3', nombre: 'OTROS ACTIVOS', tipo: 1, nivel: 2, idPadre: 2, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },
      { codigo: 10, cuentaContable: '1.4', nombre: 'ACTIVO A LARGO PLAZO', tipo: 1, nivel: 2, idPadre: 2, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },

      // Nivel 3 - Subcuentas de ACTIVOS CORRIENTES (ejemplos)
      { codigo: 11, cuentaContable: '1.1.01', nombre: 'CAJA', tipo: 2, nivel: 3, idPadre: 7, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },
      { codigo: 12, cuentaContable: '1.1.02', nombre: 'BANCOS', tipo: 2, nivel: 3, idPadre: 7, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },
      { codigo: 13, cuentaContable: '1.1.03', nombre: 'CUENTAS POR COBRAR', tipo: 2, nivel: 3, idPadre: 7, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },

      // Nivel 3 - Subcuentas de ACTIVOS FIJOS (ejemplos)
      { codigo: 14, cuentaContable: '1.2.01', nombre: 'MUEBLES Y ENSERES', tipo: 2, nivel: 3, idPadre: 8, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },
      { codigo: 15, cuentaContable: '1.2.02', nombre: 'EQUIPOS DE COMPUTACION', tipo: 2, nivel: 3, idPadre: 8, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaDeudora },

      // Nivel 2 - Subcuentas de PASIVOS (ejemplos)
      { codigo: 16, cuentaContable: '2.1', nombre: 'PASIVOS CORRIENTES', tipo: 1, nivel: 2, idPadre: 3, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaAcreedora },
      { codigo: 17, cuentaContable: '2.1.01', nombre: 'CUENTAS POR PAGAR', tipo: 2, nivel: 3, idPadre: 16, estado: 1, fechaInactivo: new Date(), empresa: mockEmpresa, fechaUpdate: new Date(), naturalezaCuenta: mockNaturalezaAcreedora }
    ];

    console.log('📝 Cargando datos mock:', mockData);

    setTimeout(() => {
      this.planCuentas = mockData;
      console.log('🔄 Datos asignados, construyendo árbol...');
      this.setDefaultSort();
      this.buildTree();
      this.applyFiltersAndPagination();
      this.error = 'Usando datos de ejemplo - Backend no disponible';
      this.loading = false;
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
    // Datos de naturaleza de ejemplo como fallback
    const mockJerarquia = {
      codigo: 1, nombre: 'Jerarquía Demo', nivel: 1, codigoPadre: 0, descripcion: 'Jerarquía de prueba',
      ultimoNivel: 1, rubroTipoEstructuraP: 1, rubroTipoEstructuraH: 1, codigoAlterno: 1,
      rubroNivelCaracteristicaP: 1, rubroNivelCaracteristicaH: 1
    };

    const mockEmpresa = {
      codigo: 280, jerarquia: mockJerarquia, nombre: 'Empresa Demo', nivel: 1, codigoPadre: 0, ingresado: 1
    };

    this.naturalezas = [
      { codigo: 1, nombre: 'Deudora', tipo: 1, numero: 1, estado: 1, empresa: mockEmpresa, manejaCentroCosto: 0 },
      { codigo: 2, nombre: 'Acreedora', tipo: 2, numero: 2, estado: 1, empresa: mockEmpresa, manejaCentroCosto: 0 }
    ];
  }

  private buildTree(): void {
    // Crear mapa de cuentas por código
    const accountMap = new Map<number, PlanCuentaNode>();

    // Convertir a nodos del árbol
    this.planCuentas.forEach(cuenta => {
      const node: PlanCuentaNode = {
        ...cuenta,
        children: [],
        level: this.calculateLevel(cuenta.cuentaContable || ''),
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
        const aNumber = this.getAccountNumberForSorting(a.cuentaContable || '');
        const bNumber = this.getAccountNumberForSorting(b.cuentaContable || '');
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
    // Calcular nivel basado en los puntos en la cuenta
    // Ejemplos:
    // "0" = nivel 0 (raíz)
    // "1" = nivel 1
    // "1.1" = nivel 2
    // "1.1.01" = nivel 3
    if (!cuentaContable) return 0;

    // Cuenta especial raíz
    if (cuentaContable === '0') return 0;

    // Contar puntos para determinar el nivel
    const dots = (cuentaContable.match(/\./g) || []).length;
    return dots + 1;
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
          aVal = this.getAccountNumberForSorting(a.cuentaContable || '');
          bVal = this.getAccountNumberForSorting(b.cuentaContable || '');
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
    return Number(valor) === 1 ? 'Activo' : 'Inactivo';
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
    return lvl < maxDepth;
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

  /**
   * Establece el ordenamiento por defecto por número de cuenta
   */
  private setDefaultSort(): void {
    this.sortConfig.column = 'cuentaContable';
    this.sortConfig.direction = 'asc';
  }

  // --- Nueva lógica de numeración y límites ---
  private getMaxDepthAllowed(): number {
    // Permitimos como mínimo la profundidad actual existente para no bloquear datos existentes
    const existingMax = Math.max(0, ...this.planCuentas.map(c => c.nivel || 0));
    const naturalezaCount = this.naturalezas.length || 1;
    // Si hay pocas naturalezas, igual permitimos llegar al máximo existente + 1
    return Math.max(existingMax + 1, naturalezaCount); // flexible para datos ya cargados
  }

  private generateNewCuentaContable(parent?: PlanCuentaNode): string {
    // Para raíz ya delegamos la lógica fuera (no se llama aquí sin parent)
    if (!parent) return '1';
    // Caso especial: padre raíz '0' => hijos son cuentas de primer nivel sin prefijo '0.'
    if (parent.cuentaContable === '0') {
      const rootChildren = this.planCuentas
        .filter(p => p.cuentaContable && !p.cuentaContable.includes('.') && p.cuentaContable !== '0')
        .map(p => parseInt(p.cuentaContable || '0', 10))
        .filter(n => !isNaN(n));
      const next = rootChildren.length === 0 ? 1 : Math.max(...rootChildren) + 1;
      return String(next);
    }

    const parentNumber = parent.cuentaContable || '';
    // Buscar hijos directos del padre
    const children = this.planCuentas.filter(p => {
      if (!p.cuentaContable) return false;
      // Para hijos normales exigir prefijo parentNumber.
      if (!p.cuentaContable.startsWith(parentNumber + '.')) return false;
      // Validar que sea hijo directo (misma cantidad de puntos +1)
      const parentDots = (parentNumber.match(/\./g) || []).length;
      const childDots = (p.cuentaContable.match(/\./g) || []).length;
      return childDots === parentDots + 1;
    });

    const lastSegments = children.map(c => {
      const parts = (c.cuentaContable || '').split('.');
      return parseInt(parts[parts.length - 1], 10) || 0;
    });
    const nextSegment = (Math.max(0, ...lastSegments) + 1);
    return parentNumber + '.' + nextSegment;
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

  // Nuevo método: calcula el siguiente número de cuenta raíz secuencial (máx + 1)
  // Considera únicamente cuentas raíz (sin puntos, distinto de '0') ya filtradas por empresa 280.
  private getNextRootSequentialCuenta(): number | null {
    const rootNumbers = this.planCuentas
      .filter(p => p.cuentaContable && !p.cuentaContable.includes('.') && p.cuentaContable !== '0')
      .map(p => parseInt(p.cuentaContable || '0', 10))
      .filter(n => !isNaN(n));

    if (rootNumbers.length === 0) {
      return 1; // Primer raíz (ignora '0')
    }
    return Math.max(...rootNumbers) + 1;
  }
}

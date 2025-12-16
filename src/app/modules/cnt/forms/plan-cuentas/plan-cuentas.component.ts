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
import { PlanCuentasFormComponent } from './plan-cuentas-form.component';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { catchError } from 'rxjs/operators';

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
  selector: 'app-plan-cuentas',
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
  templateUrl: './plan-cuentas.component.html',
  styleUrls: ['./plan-cuentas.component.scss']
})
export class PlanCuentasComponent implements OnInit {

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

  // Filtros (sin buscador por texto)
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

    console.log('🔍 Iniciando carga de datos del PlanArbol para empresa 280...');
    console.log('🔗 URL del servicio:', '/api/saa-backend/rest/plnn/selectByCriteria/');

    // Crear criterios usando el patrón DatosBusqueda
    const criterioConsultaArray: Array<DatosBusqueda> = [];

    // Filtro por empresa (código 280)
    const criterioEmpresa = new DatosBusqueda();
    criterioEmpresa.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'empresa', 'codigo', '280', TipoComandosBusqueda.IGUAL);
    criterioConsultaArray.push(criterioEmpresa);

    // Ordenar por cuenta contable
    const criterioOrden = new DatosBusqueda();
    criterioOrden.orderBy('cuentaContable');
    criterioConsultaArray.push(criterioOrden);

    this.planCuentaService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (data) => {
        console.log('📡 Respuesta del backend para empresa 280:', data);
        const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
        console.log('📋 Lista procesada para empresa 280:', list);

        if (list.length === 0) {
          console.log('⚠️ No se encontraron cuentas para empresa 280, probando getAll...');
          this.loadDataFallback();
        } else {
          console.log(`✅ Se cargaron ${list.length} cuentas para empresa 280 exitosamente`);
          this.planCuentas = list;
          this.buildTree();
          this.applyFiltersAndPagination();
          this.loading = false;
        }
      },
      error: (err) => {
        console.error('❌ Error al cargar datos con empresa 280:', err);

        // Mostrar información detallada del error para debugging
        if (err.error?.message?.includes('ORA-00942')) {
          console.error('🚨 Error de BD: Tabla no existe - revisar esquema CNT vs SCP');
          this.error = 'Error de Base de Datos: Tabla CNT.PLNN no existe. Contactar administrador.';
        } else if (err.status === 0) {
          console.error('🔌 Error de conexión: Backend no disponible en localhost:8080');
          this.error = 'Backend no disponible. Verificar que esté ejecutándose en localhost:8080';
        } else {
          console.error('📋 Error HTTP:', err.status, err.message);
          this.error = `Error del servidor: ${err.status} - ${err.message || 'Error desconocido'}`;
        }

        console.log('🔄 Probando getAll como fallback...');
        this.loadDataFallback();
      }
    });
  }

  // Método de fallback usando getAll
  private loadDataFallback(): void {
    console.log('🔍 Priorizando selectByCriteria con fallback a getAll...');
    console.log('🔗 URL del servicio:', '/api/saa-backend/rest/plnn/');

    // Priorizar selectByCriteria con fallback a getAll
    this.planCuentaService.selectByCriteria([]).pipe(
      catchError(err => {
        console.warn('selectByCriteria falló, intentando getAll como fallback:', err);
        return this.planCuentaService.getAll();
      })
    ).subscribe({
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

        this.planCuentas = [];
        this.loading = false;
      }
    });
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
      codigo: 1, jerarquia: mockJerarquia, nombre: 'Empresa Demo', nivel: 1, codigoPadre: 0, ingresado: 1
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
        const numA = parseInt(a.cuentaContable || '0');
        const numB = parseInt(b.cuentaContable || '0');
        return numA - numB;
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

    // Expandir automáticamente el nodo raíz si existe
    if (rootNodes.length > 0) {
      console.log('📂 Expandiendo nodo raíz:', rootNodes[0]);
      this.treeControl.expand(rootNodes[0]);

      // Si el nodo raíz tiene hijos, expandir también el primer hijo (ACTIVOS)
      if (rootNodes[0].children && rootNodes[0].children.length > 0) {
        console.log('📂 Expandiendo primer hijo:', rootNodes[0].children[0]);
        this.treeControl.expand(rootNodes[0].children[0]);
      }
    }
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

  // Buscador eliminado

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

      // Sin filtro por texto

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
        const aVal = (a as any)[this.sortConfig.column];
        const bVal = (b as any)[this.sortConfig.column];

        let comparison = 0;
        if (aVal > bVal) comparison = 1;
        if (aVal < bVal) comparison = -1;

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

  public getActiveCuentasCount(): number {
    return this.planCuentas.filter(c => c.estado === 1).length;
  }

  public trackByCodigo = (_: number, item: PlanCuentaNode) =>
    (item as any).codigo ?? _;

  // ---- Tree helpers ----
  hasChild = (_: number, node: PlanCuentaNode) => !!node.children && node.children.length > 0;

  public getLevel = (node: PlanCuentaNode) => node.level || 0;

  public isExpandable = (node: PlanCuentaNode) => node.expandable || false;

  // ---- Acciones CRUD ----
  onAdd(parent?: PlanCuentaNode) {
    const dialogRef = this.dialog.open(PlanCuentasFormComponent, {
      width: '700px',
      disableClose: true,
      data: { parent: parent || null, naturalezas: this.naturalezas }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  onEdit(item: PlanCuentaNode) {
    const dialogRef = this.dialog.open(PlanCuentasFormComponent, {
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

    this.exportService.exportToCSV(transformedData, filename, headers, dataKeys);
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
}

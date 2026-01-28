import { SelectionModel } from '@angular/cdk/collections';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { ExportService } from '../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { PlanCuentaUtilsService } from '../../../../shared/services/plan-cuenta-utils.service';
import { PlanCuentaAddEditComponent } from '../../dialog/plan-cuenta-add-edit/plan-cuenta-add-edit.component';
import { NaturalezaCuenta } from '../../model/naturaleza-cuenta';
import { PlanCuenta } from '../../model/plan-cuenta';
import { NaturalezaCuentaService } from '../../service/naturaleza-cuenta.service';
import { PlanCuentaService } from '../../service/plan-cuenta.service';

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
    MatInputModule,
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
  styleUrls: ['./plan-grid.component.scss'],
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
  // Búsqueda global (texto libre)
  globalSearchText: string = '';
  // Búsqueda por Naturaleza (texto)
  naturalezaSearchText: string = '';

  // Filtros
  selectedNaturaleza: number | null = null;
  selectedEstado: number | null = null;
  selectedNivel: number | null = null;
  selectedTipo: number | null = null;

  // Configuración de la tabla
  displayedColumns: string[] = [
    'select',
    'cuentaContable',
    'nombre',
    'tipo',
    'fechaUpdate',
    'fechaInactivo',
    'estado',
    'actions',
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
    private exportService: ExportService,
    private planUtils: PlanCuentaUtilsService,
    private funcionesDatosService: FuncionesDatosService,
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
          return this.planUtils.getAccountNumberForSorting(data.cuentaContable || '');
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
        this.getNaturalezaName(data.naturalezaCuenta?.codigo).toLowerCase(),
        this.getTipoLabel(data.tipo).toLowerCase(),
        this.formatDate(data.fechaUpdate).toLowerCase(),
        this.formatDate(data.fechaInactivo).toLowerCase(),
        this.estadoLabel(data.estado).toLowerCase(),
      ]
        .join(' ')
        .toLowerCase();

      return searchTerms.every((term) => searchableText.includes(term));
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
        this.handleLoadError(err);
        this.planCuentas = [];
        this.loading.set(false);
      },
    });
  }

  private loadDataFallback(): void {
    // Ya no usamos fallback separado; loadData hace directamente getAll.
    // Este método se mantiene por compatibilidad de llamadas previas.
    this.loadData();
  }

  private loadNaturalezas(): void {
    const empresaCodigo = localStorage.getItem('idSucursal') || '280';

    const criterioConsultaArray: Array<DatosBusqueda> = [];
    const criterioEmpresa = new DatosBusqueda();
    criterioEmpresa.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empresa',
      'codigo',
      empresaCodigo,
      TipoComandosBusqueda.IGUAL,
    );
    criterioConsultaArray.push(criterioEmpresa);

    this.naturalezaCuentaService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : ((data as any)?.data ?? []);
        if (list.length === 0) {
          this.loadNaturalezasFallback();
        } else {
          this.naturalezas = list;
        }
      },
      error: (err) => {
        this.loadNaturalezasFallback();
      },
    });
  }

  private loadNaturalezasFallback(): void {
    this.naturalezaCuentaService.getAll().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : ((data as any)?.data ?? []);
        this.naturalezas = list;
      },
      error: (error) => {
        this.naturalezas = [];
      },
    });
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
    const base = this.planCuentas.filter((p) => p.cuentaContable !== '0'); // ocultar raíz técnica
    const sortedData = [...base].sort((a, b) => {
      const aNumber = this.planUtils.getAccountNumberForSorting(a.cuentaContable || '');
      const bNumber = this.planUtils.getAccountNumberForSorting(b.cuentaContable || '');
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
    this.selectedTipo = null;
    this.naturalezaSearchText = '';
    this.applyFilters();
  }

  private applyFilters(): void {
    let filteredData = this.planCuentas.filter((p) => p.cuentaContable !== '0');

    // Aplicar filtro de naturaleza
    if (this.selectedNaturaleza !== null) {
      filteredData = filteredData.filter(
        (item) => item.naturalezaCuenta?.codigo === this.selectedNaturaleza,
      );
    }

    // Aplicar búsqueda por Naturaleza (texto libre sobre nombre de naturaleza)
    if ((this.naturalezaSearchText || '').trim().length > 0) {
      const q = (this.naturalezaSearchText || '').trim().toLowerCase();
      filteredData = filteredData.filter((item) =>
        this.getNaturalezaName(item.naturalezaCuenta?.codigo).toLowerCase().includes(q),
      );
    }

    // Aplicar filtro de estado
    if (this.selectedEstado !== null) {
      filteredData = filteredData.filter((item) => item.estado === this.selectedEstado);
    }

    // Aplicar filtro de nivel
    if (this.selectedNivel !== null) {
      filteredData = filteredData.filter((item) => item.nivel === this.selectedNivel);
    }

    // Aplicar filtro de tipo de cuenta
    if (this.selectedTipo !== null) {
      filteredData = filteredData.filter((item) => item.tipo === this.selectedTipo);
    }

    // Re-ordenar jerárquicamente: primero 1 y todos sus hijos, luego 2 y sus hijos, etc.
    filteredData.sort((a, b) => {
      const aKey = this.planUtils.getAccountNumberForSorting(a.cuentaContable || '');
      const bKey = this.planUtils.getAccountNumberForSorting(b.cuentaContable || '');
      return aKey.localeCompare(bKey);
    });
    this.dataSource.data = filteredData;
    this.recomputeDescendantCounts(filteredData);
  }

  // Handler para búsqueda por Naturaleza
  public onNaturalezaSearchChange(value: string): void {
    this.naturalezaSearchText = value || '';
    this.applyFilters();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  public clearNaturalezaSearch(): void {
    this.naturalezaSearchText = '';
    this.applyFilters();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Métodos de selección
  public isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.length;
    return numRows > 0 && numSelected === numRows;
  }

  public toggleAllRows(): void {
    // Si todos están seleccionados, limpiar todo
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      // Si no todos están seleccionados, seleccionar todos los de la página actual
      this.selection.select(...this.dataSource.data);
    }
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
      const rootParent = this.planCuentas.find((p) => p.cuentaContable === '0') || null;
      this.dialog
        .open(PlanCuentaAddEditComponent, {
          width: '720px',
          disableClose: true,
          data: {
            parent: rootParent,
            naturalezas: this.naturalezas,
            presetCuenta: String(nextRoot),
            presetNivel: 1,
            maxDepth: this.getMaxDepthAllowed(),
          },
        })
        .afterClosed()
        .subscribe((r) => {
          if (r) {
            this.loadData();
          }
        });
      return;
    }

    // Validar límite de profundidad
    if (!this.canAddChild(parent)) {
      alert('No se puede agregar más niveles bajo este nodo: profundidad máxima alcanzada.');
      return;
    }

    const presetCuenta = this.generateNewCuentaContable(parent);
    const presetNivel = (parent.nivel || this.calculateLevel(parent.cuentaContable)) + 1;

    this.dialog
      .open(PlanCuentaAddEditComponent, {
        width: '720px',
        disableClose: true,
        data: {
          parent: parent,
          naturalezas: this.naturalezas,
          presetCuenta,
          presetNivel,
          maxDepth: this.getMaxDepthAllowed(),
        },
      })
      .afterClosed()
      .subscribe((r) => {
        if (r) {
          this.loadData();
        }
      });
  }

  public onEdit(item: PlanCuenta): void {
    // Reusar formulario completo del árbol para permitir edición consistente
    this.dialog
      .open(PlanCuentaAddEditComponent, {
        width: '720px',
        disableClose: true,
        data: { item, naturalezas: this.naturalezas },
      })
      .afterClosed()
      .subscribe((r) => {
        if (r) {
          this.loadData();
        }
      });
  }

  public onDelete(item: PlanCuenta): void {
    // Validar que no tenga hijos antes de eliminar
    if (this.hasChildren(item)) {
      alert(`No se puede eliminar la cuenta "${item.nombre}" porque tiene subcuentas asociadas.\nElimina primero las subcuentas.`);
      return;
    }

    if (!confirm(`¿Está seguro de eliminar la cuenta "${item.nombre}"?\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    this.loading.set(true);
    this.planCuentaService.delete(item.codigo).subscribe({
      next: () => {
        this.loadData();
        this.selection.deselect(item);
      },
      error: (err) => {
        this.loading.set(false);
        let errorMsg = 'No se pudo eliminar la cuenta.';

        if (err.error?.message) {
          errorMsg += `\n${err.error.message}`;
        } else if (err.status === 0) {
          errorMsg += '\nBackend no disponible.';
        } else if (err.status === 409) {
          errorMsg += '\nLa cuenta está siendo utilizada en transacciones.';
        }

        alert(errorMsg);
      }
    });
  }

  public onDeleteSelected(): void {
    if (this.selection.selected.length === 0) {
      return;
    }

    // Validar que ninguna cuenta seleccionada tenga hijos
    const conHijos = this.selection.selected.filter(item => this.hasChildren(item));

    if (conHijos.length > 0) {
      const nombres = conHijos.map(c => c.nombre).slice(0, 3).join('\n- ');
      const mas = conHijos.length > 3 ? `\n... y ${conHijos.length - 3} más` : '';
      alert(
        `No se puede eliminar porque las siguientes cuentas tienen subcuentas asociadas:\n\n- ${nombres}${mas}\n\nElimina primero las subcuentas.`
      );
      return;
    }

    const count = this.selection.selected.length;
    console.log(`✅ Todas las cuentas seleccionadas son elegibles para eliminación`);

    if (!confirm(
      `¿Está seguro de eliminar ${count} cuenta(s) seleccionada(s)?\n\nEsta acción no se puede deshacer.`
    )) {
      console.log('❌ Usuario canceló la eliminación');
      return;
    }

    this.loading.set(true);
    let eliminadas = 0;
    let errores = 0;
    const total = this.selection.selected.length;
    const cuentasAEliminar = [...this.selection.selected];

    // Eliminar una por una
    const eliminarCuenta = (index: number) => {
      if (index >= cuentasAEliminar.length) {
        // Terminó el proceso
        this.loading.set(false);
        this.selection.clear();

        if (errores === 0) {
          alert(`✅ Se eliminaron exitosamente ${eliminadas} cuenta(s).`);
        } else {
          alert(
            `Proceso completado:\n✅ Eliminadas: ${eliminadas}\n❌ Errores: ${errores}\n\nRevisa la consola para más detalles.`
          );
        }

        this.loadData();
        return;
      }

      const cuenta = cuentasAEliminar[index];
      console.log(`🔄 [${index + 1}/${total}] Eliminando cuenta: ${cuenta.nombre} (Código: ${cuenta.codigo})`);

      this.planCuentaService.delete(cuenta.codigo).subscribe({
        next: () => {
          console.log(`✅ [${index + 1}/${total}] Cuenta eliminada: ${cuenta.nombre}`);
          eliminadas++;
          eliminarCuenta(index + 1);
        },
        error: (err) => {
          errores++;
          eliminarCuenta(index + 1);
        }
      });
    };

    eliminarCuenta(0);
  }

  // Métodos de exportación
  public exportSelected(): void {
    const selectedData =
      this.selection.selected.length > 0 ? this.selection.selected : this.dataSource.data;

    this.exportToCSV(selectedData);
  }

  public exportToCSV(data?: PlanCuenta[]): void {
    const exportData = data || this.dataSource.data;
    const headers = [
      'Código',
      'Número',
      'Descripción',
      'Tipo',
      'Fecha Creación',
      'Fecha Desactivación',
      'Estado',
    ];
    const dataKeys = [
      'codigo',
      'numero',
      'descripcion',
      'tipo',
      'fechaCreacion',
      'fechaDesactivacion',
      'estado',
    ];
    const filename = `plan-grid-${new Date().toISOString().split('T')[0]}.csv`;

    const transformedData = exportData.map((item) => ({
      codigo: item.codigo || '',
      numero: item.cuentaContable || '',
      descripcion: item.nombre || '',
      tipo: this.getTipoLabel(item.tipo),
      fechaCreacion: this.formatDate(item.fechaUpdate),
      fechaDesactivacion: this.formatDate(item.fechaInactivo),
      estado: this.estadoLabel(item.estado),
    }));

    this.exportService.exportToCSV(transformedData, filename, headers, dataKeys);
  }

  public exportToPDF(): void {
    const headers = [
      'Código',
      'Número',
      'Descripción',
      'Tipo',
      'Fecha Creación',
      'Fecha Desactivación',
      'Estado',
    ];
    const dataKeys = [
      'codigo',
      'numero',
      'descripcion',
      'tipo',
      'fechaCreacion',
      'fechaDesactivacion',
      'estado',
    ];
    const filename = `plan-grid-${new Date().toISOString().split('T')[0]}`;
    const title = 'Plan de Cuentas - Vista Grid';

    const transformedData = this.dataSource.data.map((item) => ({
      codigo: item.codigo || '',
      numero: item.cuentaContable || '',
      descripcion: item.nombre || '',
      tipo: this.getTipoLabel(item.tipo),
      fechaCreacion: this.formatDate(item.fechaUpdate),
      fechaDesactivacion: this.formatDate(item.fechaInactivo),
      estado: this.estadoLabel(item.estado),
    }));

    this.exportService.exportToPDF(transformedData, filename, title, headers, dataKeys);
  }

  // Métodos auxiliares
  public getNaturalezaName(id?: number): string {
    if (!id) return '';
    const naturaleza = this.naturalezas.find((n) => n.codigo === id);
    return naturaleza?.nombre || '';
  }

  public getTipoLabel(tipo?: number): string {
    return this.planUtils.getTipoLabel(tipo);
  }

  public estadoLabel(valor: any): string {
    return this.planUtils.getEstadoLabel(valor);
  }

  public getNivelesUnicos(): number[] {
    const niveles = [...new Set(this.planCuentas.map((c) => c.nivel).filter((n) => n))];
    return niveles.sort((a, b) => (a || 0) - (b || 0));
  }

  // ====== NUEVAS FUNCIONALIDADES DE PRESENTACIÓN ======
  private recomputeDescendantCounts(data: PlanCuenta[]): void {
    this.descendantCount.clear();
    const nivel1 = data.filter((d) => (d.nivel || this.calculateLevel(d.cuentaContable)) === 1);
    for (const root of nivel1) {
      const prefix = root.cuentaContable + '.';
      const count = data.filter((d) => d.cuentaContable.startsWith(prefix)).length;
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
  // IMPORTANTE: Siempre valida contra el array completo (planCuentas), NO contra dataSource.data
  // porque puede haber hijos que no están visibles por filtros aplicados
  public hasChildren(element: PlanCuenta): boolean {
    if (!element.cuentaContable) return false;
    const prefix = element.cuentaContable + '.';
    return this.planCuentas.some((p) => p.cuentaContable && p.cuentaContable.startsWith(prefix));
  }

  // Construye la ruta textual completa usando nombres ("ACTIVOS / ACTIVOS CORRIENTES / CAJA")
  public getFullPath(element: PlanCuenta): string {
    if (!element.cuentaContable) return element.nombre;
    const parts = element.cuentaContable.split('.');
    const path: string[] = [];
    let current = '';
    for (const part of parts) {
      current = current ? current + '.' + part : part;
      const match = this.planCuentas.find((p) => p.cuentaContable === current);
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
  formatFecha(fecha: any): string {
    if (!fecha) return '-';

    try {
      // Dejar que formatoFecha maneje la conversión completa (arrays, strings, Date)
      // No pre-convertir porque formatoFecha necesita el formato original
      return this.funcionesDatosService.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
    } catch (err) {
      return 'Error de formato';
    }
  }

  // ====== NUEVA LÓGICA JERÁRQUICA (paridad con Plan Árbol) ======

  private calculateLevel(cuentaContable: string): number {
    return this.planUtils.calculateLevel(cuentaContable);
  }

  private getMaxDepthAllowed(): number {
    const existingMax = Math.max(0, ...this.planCuentas.map((c) => c.nivel || 0));
    const naturalezaCount = this.naturalezas.length || 1;
    return this.planUtils.getMaxDepthAllowed(existingMax, naturalezaCount);
  }

  private canAddChild(parent: PlanCuenta): boolean {
    const lvl = parent.nivel || this.calculateLevel(parent.cuentaContable);
    return this.planUtils.canAddChild(lvl, this.getMaxDepthAllowed());
  }

  private generateNewCuentaContable(parent: PlanCuenta): string {
    const existingAccounts = this.planCuentas.map((p) => p.cuentaContable || '').filter((c) => c);

    return this.planUtils.generateNewCuentaContable(parent.cuentaContable || '', existingAccounts);
  }

  private getNextAvailableRootNaturalezaCodigo(): number | null {
    const existingRoots = this.planUtils.extractRootNumbers(
      this.planCuentas.map((p) => p.cuentaContable || ''),
    );
    const orderedCodigos = this.naturalezas.map((n) => n.codigo).sort((a, b) => a - b);

    return this.planUtils.getNextAvailableRootNaturalezaCodigo(existingRoots, orderedCodigos);
  }
}

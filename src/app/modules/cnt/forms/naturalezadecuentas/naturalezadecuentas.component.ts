import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { NaturalezaCuentaService } from '../../service/naturaleza-cuenta.service';
import { NaturalezaCuenta } from '../../model/naturaleza-cuenta';
import { NaturalezaDeCuentasFormComponent } from './naturalezadecuentas-form.component';
import { ExportService } from '../../../../shared/services/export.service';
import { TableConfig } from '../../../../shared/basics/table/model/table-interface';
import { FieldFormat } from '../../../../shared/basics/table/model/field-format-interface';
import { FieldConfig } from '../../../../shared/basics/table/dynamic-form/model/field.interface';
import { EntidadesContabilidad } from '../../model/entidades-cnt';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

interface SortConfig {
  column: string;
  direction: 'asc' | 'desc' | null;
}

@Component({
  selector: 'app-naturalezadecuentas',
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
    MatPaginatorModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './naturalezadecuentas.component.html',
  styleUrls: ['./naturalezadecuentas.component.scss']
})
export class NaturalezaDeCuentasComponent implements OnInit {

  regConfig: FieldConfig[] = [
    {
      type: 'input',
      label: 'Nombre',
      inputType: 'text',
      name: 'nombre',
      value: null,
      validations: [
        {
          name: 'required',
          validator: Validators.required,
          message: 'Nombre requerido'
        },
        {
          name: 'pattern',
          validator: Validators.pattern('^[0-9]*$'),
          message: 'Solo puede ingresar numeros'
        }
      ]
    }
  ];

  fieldsAnios: FieldFormat[] = [
    {
      column: 'codigo',
      header: 'C\u00D3DIGO',
    },
    {
      column: 'nombre',
      header: 'NOMBRE',
    },
    {
      column: 'rubro_11_estado',
      header: 'ESTADO',
    },
  ];

  tableConfig: TableConfig = {
    fields: this.fieldsAnios,
    regConfig: this.regConfig,
    entidad: EntidadesContabilidad.NATURALEZA_CUENTA,
    tiene_hijos: false,
    es_hijo: false,
    edit: true,
    add: true,
    remove: true,
    footer: false,
  };

  naturalezaCuentas: NaturalezaCuenta[] = [];
  filteredData: NaturalezaCuenta[] = [];
  pagedData: NaturalezaCuenta[] = [];
  loading = false;
  error: string | null = null;

  // Filtros
  searchTerm = '';

  // Paginación
  pageIndex = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 25, 50];
  totalElements = 0;

  // Ordenamiento
  sortConfig: SortConfig = { column: '', direction: null };

  constructor(
    private naturalezaCuentaService: NaturalezaCuentaService,
    private dialog: MatDialog,
    private exportService: ExportService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  // ⚠️ Debe ser público para que el template pueda llamarlo
  public loadData(): void {
    this.loading = true;
    this.error = null;

    console.log('🔍 Iniciando carga de naturalezas de cuenta para empresa 280...');

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

        this.naturalezaCuentas = list;
        this.applyFiltersAndPagination();
        this.loading = false;
        this.tableConfig.registros = data;

        console.log(`✅ Se cargaron ${list.length} naturalezas para empresa 280 exitosamente`);
      },
      error: (err) => {
        console.error('❌ Error al cargar naturalezas con empresa 280:', err);

        // Fallback a getAll() si falla el filtro
        console.log('🔄 Probando getAll como fallback...');
        this.naturalezaCuentaService.getAll().subscribe({
          next: (data) => {
            console.log('📡 Respuesta fallback getAll:', data);
            const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
            this.naturalezaCuentas = list;
            this.applyFiltersAndPagination();
            this.loading = false;
            this.tableConfig.registros = data;
          },
          error: () => {
            this.error = 'Error al recuperar datos de naturaleza de cuentas';
            this.loading = false;
          }
        });
      }
    });
  }

  // Métodos para filtrado, ordenamiento y paginación
  public onSearch(): void {
    this.pageIndex = 0;
    this.applyFiltersAndPagination();
  }

  public clearSearch(): void {
    this.searchTerm = '';
    this.pageIndex = 0;
    this.applyFiltersAndPagination();
  }

  public onSort(column: string): void {
    if (this.sortConfig.column === column) {
      // Si es la misma columna, cambiar dirección
      if (this.sortConfig.direction === 'asc') {
        this.sortConfig.direction = 'desc';
      } else if (this.sortConfig.direction === 'desc') {
        this.sortConfig.direction = null;
        this.sortConfig.column = '';
      } else {
        this.sortConfig.direction = 'asc';
      }
    } else {
      // Nueva columna, empezar con ascendente
      this.sortConfig.column = column;
      this.sortConfig.direction = 'asc';
    }

    this.pageIndex = 0;
    this.applyFiltersAndPagination();
  }

  public onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.applyFiltersAndPagination();
  }

  public getSortIcon(column: string): string {
    if (this.sortConfig.column !== column) return 'unfold_more';
    if (this.sortConfig.direction === 'asc') return 'keyboard_arrow_up';
    if (this.sortConfig.direction === 'desc') return 'keyboard_arrow_down';
    return 'unfold_more';
  }

  private applyFiltersAndPagination(): void {
    // 1. Filtrar
    this.filteredData = this.naturalezaCuentas.filter(item => {
      if (!this.searchTerm) return true;

      const searchLower = this.searchTerm.toLowerCase();
      return (
        item.nombre?.toLowerCase().includes(searchLower) ||
        this.tipoLabel(item.tipo).toLowerCase().includes(searchLower) ||
        item.numero?.toString().includes(searchLower) ||
        this.manejaCentroCostoLabel(item.manejaCentroCosto).toLowerCase().includes(searchLower) ||
        this.estadoLabel(item.estado).toLowerCase().includes(searchLower)
      );
    });

    // 2. Ordenar
    if (this.sortConfig.column && this.sortConfig.direction) {
      this.filteredData.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (this.sortConfig.column) {
          case 'nombre':
            aValue = a.nombre || '';
            bValue = b.nombre || '';
            break;
          case 'tipo':
            aValue = this.tipoLabel(a.tipo);
            bValue = this.tipoLabel(b.tipo);
            break;
          case 'numero':
            aValue = Number(a.numero) || 0;
            bValue = Number(b.numero) || 0;
            break;
          case 'manejaCentroCosto':
            aValue = this.manejaCentroCostoLabel(a.manejaCentroCosto);
            bValue = this.manejaCentroCostoLabel(b.manejaCentroCosto);
            break;
          case 'estado':
            aValue = this.estadoLabel(a.estado);
            bValue = this.estadoLabel(b.estado);
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return this.sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return this.sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // 3. Actualizar totales
    this.totalElements = this.filteredData.length;

    // 4. Paginar
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.pagedData = this.filteredData.slice(startIndex, endIndex);
  }

  // ---- Helpers de presentación (públicos para usarlos en el template) ----
  public tipoLabel(valor: any): string {
    const n = Number(valor);
    if (n === 1) return 'Deudora';
    if (n === 2) return 'Acreedora';
    return String(valor ?? '');
  }

  public manejaCentroCostoLabel(valor: any): string {
    if (valor === 1 || valor === true || String(valor).toUpperCase() === '1') return 'Sí';
    return 'No';
  }

  public estadoLabel(valor: any): string {
    return Number(valor) === 1 ? 'Activo' : 'Inactivo';
  }

  public trackByCodigo = (_: number, item: NaturalezaCuenta) =>
    (item as any).codigo ?? _;

  onAdd() {
    const dialogRef = this.dialog.open(NaturalezaDeCuentasFormComponent, {
      width: '600px',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  onEdit(item: NaturalezaCuenta) {
    const dialogRef = this.dialog.open(NaturalezaDeCuentasFormComponent, {
      width: '600px',
      disableClose: true
    });

    const component = dialogRef.componentInstance;
    component.setData(item);

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadData();
      }
    });
  }

  // Métodos de exportación
  public exportToCSV(): void {
    const headers = ['Nombre', 'Tipo de Naturaleza', 'Número de Cuenta', 'Centro de Costos', 'Estado'];
    const filename = `naturaleza-cuentas-${new Date().toISOString().split('T')[0]}`;

    // Usar datos filtrados actuales
    const dataToExport = this.filteredData.length > 0 ? this.filteredData : this.naturalezaCuentas;

    this.exportService.exportToCSV(dataToExport, filename, headers);
  }

  public exportToPDF(): void {
    const headers = ['Nombre', 'Tipo', 'Número', 'C. Costos', 'Estado'];
    const dataKeys = ['nombre', 'tipo', 'numero', 'manejaCentroCosto', 'estado'];
    const filename = `naturaleza-cuentas-${new Date().toISOString().split('T')[0]}`;
    const title = 'Reporte de Naturaleza de Cuentas';

    // Usar datos filtrados actuales
    const dataToExport = this.filteredData.length > 0 ? this.filteredData : this.naturalezaCuentas;

    // Transformar los datos para el PDF con labels formateados
    const transformedData = dataToExport.map(item => ({
      nombre: item.nombre || '',
      tipo: this.tipoLabel(item.tipo),
      numero: item.numero || '',
      manejaCentroCosto: this.manejaCentroCostoLabel(item.manejaCentroCosto),
      estado: this.estadoLabel(item.estado)
    }));

    this.exportService.exportToPDF(transformedData, filename, title, headers, dataKeys);
  }
}

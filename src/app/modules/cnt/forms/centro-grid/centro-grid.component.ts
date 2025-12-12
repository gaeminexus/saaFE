import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CentroCostoUtilsService } from '../../../../shared/services/centro-costo-utils.service';
import { CentroCosto } from '../../model/centro-costo';
import { CentroCostoService } from '../../service/centro-costo.service';
import { CentroGridFormComponent } from './centro-grid-form.component';

@Component({
  selector: 'app-centro-grid',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
  ],
  templateUrl: './centro-grid.component.html',
  styleUrls: ['./centro-grid.component.scss'],
})
export class CentroGridComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Data source
  dataSource = new MatTableDataSource<CentroCosto>();
  originalData: CentroCosto[] = [];

  // Table configuration
  displayedColumns: string[] = [
    'numero',
    'nombre',
    'tipo',
    'fechaIngreso',
    'fechaInactivo',
    'actions',
  ];

  // Filters
  searchControl = new FormControl('');
  selectedTipo = new FormControl('');
  selectedEstado = new FormControl('');

  // UI State
  loading = false;
  error: string | null = null;

  // Opciones de filtro
  tipoOptions = [
    { value: '', label: 'Todos los tipos' },
    { value: 1, label: 'Movimiento' },
    { value: 2, label: 'Acumulación' },
  ];

  estadoOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 1, label: 'Activo' },
    { value: 0, label: 'Inactivo' },
  ];

  constructor(
    private centroCostoService: CentroCostoService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private centroUtils: CentroCostoUtilsService
  ) {}

  ngOnInit(): void {
    this.loadData();
    this.setupFilters();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Configurar ordenamiento personalizado para códigos jerárquicos
    this.dataSource.sortingDataAccessor = (data: CentroCosto, sortHeaderId: string) => {
      switch (sortHeaderId) {
        case 'numero':
          return data.numero;
        case 'nombre':
          return data.nombre.toLowerCase();
        case 'tipo':
          return data.tipo;
        case 'fechaIngreso':
          return data.fechaIngreso ? new Date(data.fechaIngreso).getTime() : 0;
        case 'fechaInactivo':
          return data.fechaInactivo ? new Date(data.fechaInactivo).getTime() : 0;
        default:
          return '';
      }
    };
  }

  loadData(): void {
    this.loading = true;
    this.error = null;

    // Obtener empresa del usuario logueado
    const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);

    this.centroCostoService.getAll().subscribe({
      next: (centros: CentroCosto[] | null) => {
        const lista = centros || [];
        const filtrados = lista.filter((c) => c.empresa?.codigo === empresaCodigo);
        console.log(
          `[CentroGridComponent] Centros cargados (empresa ${empresaCodigo}):`,
          filtrados.length
        );

        this.originalData = filtrados;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('[CentroGridComponent] Error loading centros:', error);
        this.error = 'Error al cargar los centros de costo desde el backend';
        this.originalData = [];
        this.loading = false;
      },
    });
  }

  setupFilters(): void {
    const combineFilters = () => {
      this.applyFilters();
    };

    this.searchControl.valueChanges.subscribe(combineFilters);
    this.selectedTipo.valueChanges.subscribe(combineFilters);
    this.selectedEstado.valueChanges.subscribe(combineFilters);
  }

  applyFilters(): void {
    let filtered = [...this.originalData];

    // Filtro de búsqueda por texto
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(
        (centro) =>
          centro.nombre.toLowerCase().includes(searchTerm) ||
          centro.numero.toString().toLowerCase().includes(searchTerm)
      );
    }

    // Filtro por tipo
    const tipoValue = this.selectedTipo.value;
    if (tipoValue !== '' && tipoValue !== null) {
      filtered = filtered.filter((centro) => centro.tipo === Number(tipoValue));
    }

    // Filtro por estado
    const estadoValue = this.selectedEstado.value;
    if (estadoValue !== '' && estadoValue !== null) {
      filtered = filtered.filter((centro) => centro.estado === Number(estadoValue));
    }

    this.dataSource.data = filtered;
  }

  // CRUD Operations
  onAdd(): void {
    this.snackBar.open(
      'Para crear nuevos centros de costo, utiliza la vista de árbol donde puedes gestionar la jerarquía completa.',
      'Entendido',
      {
        duration: 5000,
        panelClass: ['info-snackbar'],
      }
    );
  }

  onEdit(centroCosto: CentroCosto): void {
    const dialogRef = this.dialog.open(CentroGridFormComponent, {
      width: '600px',
      data: { item: centroCosto },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadData();
        this.snackBar.open('Centro de costo actualizado exitosamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar'],
        });
      }
    });
  }

  onDelete(centroCosto: CentroCosto): void {
    // Validar que el centro tenga un código válido del backend
    if (!centroCosto.codigo || centroCosto.codigo === 0) {
      this.snackBar.open('No se puede eliminar un centro sin código válido', 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
      return;
    }

    if (confirm(`¿Está seguro de eliminar el centro de costo "${centroCosto.nombre}"?`)) {
      this.centroCostoService.delete(centroCosto.codigo).subscribe({
        next: (success) => {
          if (success) {
            this.loadData();
            this.snackBar.open('Centro de costo eliminado', 'Cerrar', {
              duration: 3000,
              panelClass: ['success-snackbar'],
            });
          }
        },
        error: (error) => {
          console.error('Error deleting centro:', error);
          this.snackBar.open('Error al eliminar el centro de costo', 'Cerrar', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
        },
      });
    }
  }

  // Utility methods delegados a utils
  getTipoLabel(tipo: number): string {
    return this.centroUtils.getTipoLabel(tipo);
  }

  getTipoClass(tipo: number): string {
    return this.centroUtils.getTipoClass(tipo);
  }

  getEstadoLabel(estado: number): string {
    return this.centroUtils.getEstadoLabel(estado);
  }

  formatDate(date?: Date): string {
    return this.centroUtils.formatFecha(date);
  }

  // Actions
  clearFilters(): void {
    this.searchControl.setValue('');
    this.selectedTipo.setValue('');
    this.selectedEstado.setValue('');
  }

  exportData(): void {
    // Implementar exportación
    this.snackBar.open('Funcionalidad de exportación en desarrollo', 'Cerrar', {
      duration: 3000,
    });
  }

  refreshData(): void {
    this.loadData();
  }
}

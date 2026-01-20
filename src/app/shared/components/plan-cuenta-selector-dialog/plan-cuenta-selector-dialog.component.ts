import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NaturalezaCuenta } from '../../../modules/cnt/model/naturaleza-cuenta';
import { PlanCuenta } from '../../../modules/cnt/model/plan-cuenta';
import { NaturalezaCuentaService } from '../../../modules/cnt/service/naturaleza-cuenta.service';
import { PlanCuentaService } from '../../../modules/cnt/service/plan-cuenta.service';
import { PlanCuentaUtilsService } from '../../services/plan-cuenta-utils.service';

export interface PlanCuentaSelectorDialogData {
  cuentaPreseleccionada?: PlanCuenta;
  titulo?: string;
  mostrarSoloMovimiento?: boolean; // Por defecto true
}

@Component({
  selector: 'app-plan-cuenta-selector-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './plan-cuenta-selector-dialog.component.html',
  styleUrls: ['./plan-cuenta-selector-dialog.component.scss'],
})
export class PlanCuentaSelectorDialogComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  dataSource = new MatTableDataSource<PlanCuenta>([]);
  displayedColumns: string[] = ['cuentaContable', 'nombre', 'tipo', 'naturaleza', 'estado', 'actions'];

  // Datos
  planesCuenta: PlanCuenta[] = [];
  naturalezas: NaturalezaCuenta[] = [];

  // Filtros
  busquedaTexto = '';
  naturalezaSeleccionada: number | null = null;
  soloMovimiento = true;

  // Estado
  loading = false;
  cuentaSeleccionada: PlanCuenta | null = null;
  idSucursal = parseInt(localStorage.getItem('idSucursal') || '280', 10);

  constructor(
    public dialogRef: MatDialogRef<PlanCuentaSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PlanCuentaSelectorDialogData,
    private planCuentaService: PlanCuentaService,
    private naturalezaCuentaService: NaturalezaCuentaService,
    private planUtils: PlanCuentaUtilsService
  ) {
    this.soloMovimiento = data.mostrarSoloMovimiento !== false; // Por defecto true
    this.cuentaSeleccionada = data.cuentaPreseleccionada || null;
  }

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarNaturalezas();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Configurar comparador personalizado
    this.dataSource.sortingDataAccessor = (data: PlanCuenta, sortHeaderId: string) => {
      switch (sortHeaderId) {
        case 'cuentaContable':
          return this.planUtils.getAccountNumberForSorting(data.cuentaContable || '');
        case 'nombre':
          return data.nombre?.toLowerCase() || '';
        case 'tipo':
          return this.planUtils.getTipoLabel(data.tipo);
        default:
          return (data as any)[sortHeaderId] || '';
      }
    };

    // Configurar filtro personalizado
    this.dataSource.filterPredicate = (data: PlanCuenta, filter: string) => {
      const searchText = filter.toLowerCase();
      const cuentaText = (data.cuentaContable || '').toLowerCase();
      const nombreText = (data.nombre || '').toLowerCase();

      return cuentaText.includes(searchText) || nombreText.includes(searchText);
    };
  }

  private cargarDatos(): void {
    this.loading = true;
    this.planCuentaService.getAll().subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : [];
        this.planesCuenta = list.filter((p) => p.cuentaContable !== '0'); // Ocultar raíz técnica
        this.aplicarFiltros();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar planes de cuenta:', error);
        this.loading = false;
      },
    });
  }

  private cargarNaturalezas(): void {
    this.naturalezaCuentaService.getByEmpresa(this.idSucursal).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
        this.naturalezas = list;
      },
      error: (error) => {
        console.error('Error al cargar naturalezas:', error);
        this.naturalezas = [];
      },
    });
  }

  aplicarFiltros(): void {
    let filtrados = [...this.planesCuenta];

    // Filtro por naturaleza
    if (this.naturalezaSeleccionada !== null) {
      filtrados = filtrados.filter(
        (p) => p.naturalezaCuenta?.codigo === this.naturalezaSeleccionada
      );
    }

    // NOTA: No filtramos por tipo aquí. Mostramos todas las cuentas,
    // pero la selección está restringida por puedeSeleccionar()

    // Ordenar jerárquicamente
    filtrados.sort((a, b) => {
      const aKey = this.planUtils.getAccountNumberForSorting(a.cuentaContable || '');
      const bKey = this.planUtils.getAccountNumberForSorting(b.cuentaContable || '');
      return aKey.localeCompare(bKey);
    });

    this.dataSource.data = filtrados;

    // Aplicar filtro de búsqueda de texto
    if (this.busquedaTexto) {
      this.dataSource.filter = this.busquedaTexto.trim().toLowerCase();
    } else {
      this.dataSource.filter = '';
    }
  }

  limpiarFiltros(): void {
    this.busquedaTexto = '';
    this.naturalezaSeleccionada = null;
    this.aplicarFiltros();
  }

  seleccionarCuenta(cuenta: PlanCuenta): void {
    // Validar que se pueda seleccionar
    if (!this.puedeSeleccionar(cuenta)) {
      return;
    }
    this.cuentaSeleccionada = cuenta;
  }

  confirmarSeleccionCuenta(cuenta: PlanCuenta): void {
    // Validar que se pueda seleccionar
    if (!this.puedeSeleccionar(cuenta)) {
      return;
    }

    // Validar que sea de movimiento si está activo el filtro
    if (this.soloMovimiento && cuenta.tipo !== 2) {
      alert('Debe seleccionar una cuenta de movimiento');
      return;
    }

    // Cerrar dialog con la cuenta seleccionada
    this.dialogRef.close(cuenta);
  }

  confirmarSeleccion(): void {
    if (!this.cuentaSeleccionada) {
      return;
    }

    // Validar que sea de movimiento si está activo el filtro
    if (this.soloMovimiento && this.cuentaSeleccionada.tipo !== 2) {
      alert('Debe seleccionar una cuenta de movimiento');
      return;
    }

    this.dialogRef.close(this.cuentaSeleccionada);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  // Métodos auxiliares de presentación
  getTipoLabel(tipo?: number): string {
    return this.planUtils.getTipoLabel(tipo);
  }

  getEstadoLabel(estado?: number): string {
    return this.planUtils.getEstadoLabel(estado);
  }

  getNaturalezaName(id?: number): string {
    if (!id) return '';
    const naturaleza = this.naturalezas.find((n) => n.codigo === id);
    return naturaleza?.nombre || '';
  }

  getIndentPx(cuenta: PlanCuenta): number {
    const nivel = cuenta.nivel || this.planUtils.calculateLevel(cuenta.cuentaContable);
    return Math.max(0, (nivel - 1) * 16);
  }

  esMovimiento(cuenta: PlanCuenta): boolean {
    return cuenta.tipo === 2; // Tipo 2 = Movimiento
  }

  esCuentaSeleccionada(cuenta: PlanCuenta): boolean {
    return this.cuentaSeleccionada?.codigo === cuenta.codigo;
  }

  puedeSeleccionar(cuenta: PlanCuenta): boolean {
    if (!this.soloMovimiento) return true;
    return cuenta.tipo === 2; // Tipo 2 = Movimiento (seleccionable)
  }
}

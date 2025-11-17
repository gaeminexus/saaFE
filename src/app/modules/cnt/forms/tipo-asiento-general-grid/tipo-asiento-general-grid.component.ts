import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';

import { TipoAsientoGeneral, EstadoTipoAsiento } from '../../model/tipo-asiento';
import { TipoAsientoGeneralService } from '../../service/tipo-asiento-general.service';

@Component({
  selector: 'app-tipo-asiento-general-grid',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    MatInputModule,
    MatFormFieldModule,
    MatChipsModule,
    FormsModule
  ],
  templateUrl: './tipo-asiento-general-grid.component.html',
  styleUrls: ['./tipo-asiento-general-grid.component.scss']
})
export class TipoAsientoGeneralGridComponent implements OnInit {
  dataSource = new MatTableDataSource<TipoAsientoGeneral>();
  displayedColumns: string[] = ['nombre', 'estado', 'acciones'];
  filterValue = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private tipoAsientoGeneralService: TipoAsientoGeneralService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Carga los datos de tipos de asientos generales
   */
  loadData(): void {
    this.tipoAsientoGeneralService.getAll().subscribe({
      next: (data) => {
        this.dataSource.data = data;
      },
      error: (error) => {
        console.error('Error al cargar tipos de asientos generales:', error);
      }
    });
  }

  /**
   * Aplica filtro a la tabla
   */
  applyFilter(): void {
    this.dataSource.filter = this.filterValue.trim().toLowerCase();
  }

  /**
   * Limpia el filtro
   */
  clearFilter(): void {
    this.filterValue = '';
    this.applyFilter();
  }

  /**
   * Obtiene la clase CSS para el badge del estado
   */
  getEstadoBadgeClass(estado: EstadoTipoAsiento): string {
    switch (estado) {
      case EstadoTipoAsiento.ACTIVO:
        return 'badge-activo';
      case EstadoTipoAsiento.INACTIVO:
        return 'badge-inactivo';
      default:
        return 'badge-default';
    }
  }

  /**
   * Obtiene el texto del estado
   */
  getEstadoText(estado: EstadoTipoAsiento): string {
    switch (estado) {
      case EstadoTipoAsiento.ACTIVO:
        return 'Activo';
      case EstadoTipoAsiento.INACTIVO:
        return 'Inactivo';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Cambia el estado de un tipo de asiento
   */
  cambiarEstado(tipoAsiento: TipoAsientoGeneral): void {
    const nuevoEstado = tipoAsiento.estado === EstadoTipoAsiento.ACTIVO
      ? EstadoTipoAsiento.INACTIVO
      : EstadoTipoAsiento.ACTIVO;

    this.tipoAsientoGeneralService.cambiarEstado(tipoAsiento.id, nuevoEstado).subscribe({
      next: (success) => {
        if (success) {
          this.loadData();
        } else {
          console.error('Error al cambiar el estado');
        }
      },
      error: (error) => {
        console.error('Error al cambiar el estado:', error);
      }
    });
  }

  /**
   * Edita un tipo de asiento
   */
  editar(tipoAsiento: TipoAsientoGeneral): void {
    // TODO: Implementar navegación al formulario de edición
    console.log('Editar tipo de asiento:', tipoAsiento);
  }

  /**
   * Elimina un tipo de asiento
   */
  eliminar(tipoAsiento: TipoAsientoGeneral): void {
    if (confirm(`¿Está seguro de eliminar el tipo de asiento "${tipoAsiento.nombre}"?`)) {
      this.tipoAsientoGeneralService.delete(tipoAsiento.id).subscribe({
        next: (success) => {
          if (success) {
            this.loadData();
          } else {
            console.error('Error al eliminar el tipo de asiento');
          }
        },
        error: (error) => {
          console.error('Error al eliminar el tipo de asiento:', error);
        }
      });
    }
  }

  /**
   * Crea un nuevo tipo de asiento
   */
  nuevo(): void {
    // TODO: Implementar navegación al formulario de creación
    console.log('Crear nuevo tipo de asiento general');
  }

  /**
   * Refresca los datos
   */
  refresh(): void {
    this.loadData();
  }
}

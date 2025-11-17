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

import { TipoAsientoSistema, EstadoTipoAsiento } from '../../model/tipo-asiento';
import { TipoAsientoSistemaService } from '../../service/tipo-asiento-sistema.service';

@Component({
  selector: 'app-tipo-asiento-sistema-grid',
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
  templateUrl: './tipo-asiento-sistema-grid.component.html',
  styleUrls: ['./tipo-asiento-sistema-grid.component.scss']
})
export class TipoAsientoSistemaGridComponent implements OnInit {
  dataSource = new MatTableDataSource<TipoAsientoSistema>();
  displayedColumns: string[] = ['nombre', 'codigoAlterno', 'estado', 'acciones'];
  filterValue = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private tipoAsientoSistemaService: TipoAsientoSistemaService
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Carga los datos de tipos de asientos del sistema
   */
  loadData(): void {
    this.tipoAsientoSistemaService.getAll().subscribe({
      next: (data: TipoAsientoSistema[]) => {
        this.dataSource.data = data;
      },
      error: (error: any) => {
        console.error('Error al cargar tipos de asientos del sistema:', error);
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
  cambiarEstado(tipoAsiento: TipoAsientoSistema): void {
    const nuevoEstado = tipoAsiento.estado === EstadoTipoAsiento.ACTIVO
      ? EstadoTipoAsiento.INACTIVO
      : EstadoTipoAsiento.ACTIVO;

    this.tipoAsientoSistemaService.cambiarEstado(tipoAsiento.id, nuevoEstado).subscribe({
      next: (success: boolean) => {
        if (success) {
          this.loadData();
        } else {
          console.error('Error al cambiar el estado');
        }
      },
      error: (error: any) => {
        console.error('Error al cambiar el estado:', error);
      }
    });
  }

  /**
   * Edita un tipo de asiento
   */
  editar(tipoAsiento: TipoAsientoSistema): void {
    // TODO: Implementar navegación al formulario de edición
    console.log('Editar tipo de asiento del sistema:', tipoAsiento);
  }

  /**
   * Elimina un tipo de asiento
   */
  eliminar(tipoAsiento: TipoAsientoSistema): void {
    if (confirm(`¿Está seguro de eliminar el tipo de asiento del sistema "${tipoAsiento.nombre}"?`)) {
      this.tipoAsientoSistemaService.delete(tipoAsiento.id).subscribe({
        next: (success: boolean) => {
          if (success) {
            this.loadData();
          } else {
            console.error('Error al eliminar el tipo de asiento del sistema');
          }
        },
        error: (error: any) => {
          console.error('Error al eliminar el tipo de asiento del sistema:', error);
        }
      });
    }
  }

  /**
   * Crea un nuevo tipo de asiento del sistema
   */
  nuevo(): void {
    // TODO: Implementar navegación al formulario de creación
    console.log('Crear nuevo tipo de asiento del sistema');
  }

  /**
   * Refresca los datos
   */
  refresh(): void {
    this.loadData();
  }
}

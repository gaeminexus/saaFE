import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EstadoTipoAsiento, TipoAsiento } from '../../model/tipo-asiento';
import { TipoAsientoService } from '../../service/tipo-asiento.service';
import {
  TipoAsientoDialog,
  TipoAsientoDialogData,
} from './tipo-asiento-dialog/tipo-asiento-dialog';

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
    FormsModule,
  ],
  templateUrl: './tipo-asiento-general-grid.component.html',
  styleUrls: ['./tipo-asiento-general-grid.component.scss'],
})
export class TipoAsientoGeneralGridComponent implements OnInit {
  dataSource = new MatTableDataSource<TipoAsiento>();
  displayedColumns: string[] = ['nombre', 'estado', 'acciones'];
  filterValue = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private tipoAsientoService: TipoAsientoService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
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
    this.tipoAsientoService.getAllGenerales().subscribe({
      next: (data) => {
        this.dataSource.data = data;
      },
      error: (error) => {
        console.error('Error al cargar tipos de asientos generales:', error);
      },
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
  cambiarEstado(tipoAsiento: TipoAsiento): void {
    const nuevoEstado =
      tipoAsiento.estado === EstadoTipoAsiento.ACTIVO
        ? EstadoTipoAsiento.INACTIVO
        : EstadoTipoAsiento.ACTIVO;

    this.tipoAsientoService.cambiarEstado(tipoAsiento.codigo, nuevoEstado).subscribe({
      next: (success) => {
        if (success) {
          this.loadData();
        } else {
          console.error('Error al cambiar el estado');
        }
      },
      error: (error) => {
        console.error('Error al cambiar el estado:', error);
      },
    });
  }

  /**
   * Edita un tipo de asiento
   */
  editar(tipoAsiento: TipoAsiento): void {
    const dialogData: TipoAsientoDialogData = {
      tipoAsiento: { ...tipoAsiento },
      isEdit: true,
    };

    const dialogRef = this.dialog.open(TipoAsientoDialog, {
      width: '500px',
      data: dialogData,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: Partial<TipoAsiento> | undefined) => {
      if (result && result.codigo) {
        const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);

        const updateData: any = {
          codigo: result.codigo,
          nombre: result.nombre,
          codigoAlterno: result.codigoAlterno,
          estado: result.estado,
          sistema: 0, // Tipo de asiento general
          empresa: { codigo: empresaCodigo },
          observacion: result.observacion || '',
        };

        this.tipoAsientoService.update(updateData).subscribe({
          next: (updatedItem: TipoAsiento | null) => {
            this.snackBar.open('Tipo de asiento actualizado exitosamente', 'Cerrar', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
            });
            this.loadData();
          },
          error: (error: any) => {
            console.error('Error al actualizar el tipo de asiento:', error);
            this.snackBar.open('Error al actualizar el tipo de asiento', 'Cerrar', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['error-snackbar'],
            });
          },
        });
      }
    });
  }

  /**
   * Elimina un tipo de asiento
   */
  eliminar(tipoAsiento: TipoAsiento): void {
    if (confirm(`¿Está seguro de eliminar el tipo de asiento "${tipoAsiento.nombre}"?`)) {
      this.tipoAsientoService.delete(tipoAsiento.codigo).subscribe({
        next: (success: boolean) => {
          if (success) {
            this.snackBar.open('Tipo de asiento eliminado exitosamente', 'Cerrar', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
            });
            this.loadData();
          } else {
            this.snackBar.open('Error al eliminar el tipo de asiento', 'Cerrar', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['error-snackbar'],
            });
          }
        },
        error: (error: any) => {
          console.error('Error al eliminar el tipo de asiento:', error);
          this.snackBar.open('Error al eliminar el tipo de asiento', 'Cerrar', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar'],
          });
        },
      });
    }
  }

  /**
   * Crea un nuevo tipo de asiento
   */
  nuevo(): void {
    const dialogData: TipoAsientoDialogData = {
      isEdit: false,
    };

    const dialogRef = this.dialog.open(TipoAsientoDialog, {
      width: '500px',
      data: dialogData,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: Partial<TipoAsiento> | undefined) => {
      if (result) {
        const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);

        // Agregar campos adicionales requeridos por el backend
        const nuevoTipoAsiento: any = {
          nombre: result.nombre,
          codigoAlterno: result.codigoAlterno,
          estado: result.estado,
          sistema: 0, // Tipo de asiento general
          empresa: { codigo: empresaCodigo },
          observacion: result.observacion || '',
        };

        this.tipoAsientoService.create(nuevoTipoAsiento).subscribe({
          next: (createdItem: TipoAsiento | null) => {
            this.snackBar.open('Tipo de asiento creado exitosamente', 'Cerrar', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
            });
            this.loadData();
          },
          error: (error: any) => {
            console.error('Error al crear el tipo de asiento:', error);
            this.snackBar.open('Error al crear el tipo de asiento', 'Cerrar', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['error-snackbar'],
            });
          },
        });
      }
    });
  }

  /**
   * Refresca los datos
   */
  refresh(): void {
    this.loadData();
  }
}

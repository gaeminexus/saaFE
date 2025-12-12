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

import { EstadoTipoAsiento, TipoAsientoSistema } from '../../model/tipo-asiento';
import { TipoAsientoSistemaService } from '../../service/tipo-asiento-sistema.service';
import {
  TipoAsientoSistemaDialog,
  TipoAsientoSistemaDialogData,
} from './tipo-asiento-sistema-dialog/tipo-asiento-sistema-dialog';

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
    FormsModule,
    TipoAsientoSistemaDialog,
  ],
  templateUrl: './tipo-asiento-sistema-grid.component.html',
  styleUrls: ['./tipo-asiento-sistema-grid.component.scss'],
})
export class TipoAsientoSistemaGridComponent implements OnInit {
  dataSource = new MatTableDataSource<TipoAsientoSistema>();
  displayedColumns: string[] = ['nombre', 'codigoAlterno', 'estado', 'acciones'];
  filterValue = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private tipoAsientoSistemaService: TipoAsientoSistemaService,
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
   * Carga los datos de tipos de asientos del sistema
   */
  loadData(): void {
    this.tipoAsientoSistemaService.getAll().subscribe({
      next: (data: TipoAsientoSistema[]) => {
        this.dataSource.data = data;
      },
      error: (error: any) => {
        console.error('Error al cargar tipos de asientos del sistema:', error);
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
  cambiarEstado(tipoAsiento: TipoAsientoSistema): void {
    const nuevoEstado =
      tipoAsiento.estado === EstadoTipoAsiento.ACTIVO
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
      },
    });
  }

  /**
   * Edita un tipo de asiento
   */
  editar(tipoAsiento: TipoAsientoSistema): void {
    const dialogData: TipoAsientoSistemaDialogData = {
      tipoAsiento: { ...tipoAsiento },
      isEdit: true,
    };

    const dialogRef = this.dialog.open(TipoAsientoSistemaDialog, {
      width: '500px',
      data: dialogData,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: Partial<TipoAsientoSistema> | undefined) => {
      if (result && result.id) {
        const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);

        const updateData: any = {
          codigo: result.id,
          nombre: result.nombre,
          codigoAlterno: result.codigoAlterno,
          estado: result.estado,
          sistema: 1, // Tipo de asiento del sistema
          empresa: { codigo: empresaCodigo },
          fechaUpdate: new Date(),
          usuarioUpdate: localStorage.getItem('username') || 'sistema',
        };

        this.tipoAsientoSistemaService.update(result.id, updateData).subscribe({
          next: (updatedItem: TipoAsientoSistema) => {
            this.snackBar.open('Tipo de asiento del sistema actualizado exitosamente', 'Cerrar', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
            });
            this.loadData();
          },
          error: (error: any) => {
            console.error('Error al actualizar el tipo de asiento del sistema:', error);
            this.snackBar.open('Error al actualizar el tipo de asiento del sistema', 'Cerrar', {
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
  eliminar(tipoAsiento: TipoAsientoSistema): void {
    if (
      confirm(`¿Está seguro de eliminar el tipo de asiento del sistema "${tipoAsiento.nombre}"?`)
    ) {
      this.tipoAsientoSistemaService.delete(tipoAsiento.id).subscribe({
        next: (success: boolean) => {
          if (success) {
            this.snackBar.open('Tipo de asiento del sistema eliminado exitosamente', 'Cerrar', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
            });
            this.loadData();
          } else {
            this.snackBar.open('Error al eliminar el tipo de asiento del sistema', 'Cerrar', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
              panelClass: ['error-snackbar'],
            });
          }
        },
        error: (error: any) => {
          console.error('Error al eliminar el tipo de asiento del sistema:', error);
          this.snackBar.open('Error al eliminar el tipo de asiento del sistema', 'Cerrar', {
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
   * Crea un nuevo tipo de asiento del sistema
   */
  nuevo(): void {
    const dialogData: TipoAsientoSistemaDialogData = {
      isEdit: false,
    };

    const dialogRef = this.dialog.open(TipoAsientoSistemaDialog, {
      width: '500px',
      data: dialogData,
      disableClose: true,
    });

    dialogRef.afterClosed().subscribe((result: Partial<TipoAsientoSistema> | undefined) => {
      if (result) {
        const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);

        const createData: any = {
          nombre: result.nombre,
          codigoAlterno: result.codigoAlterno,
          estado: result.estado,
          sistema: 1, // Tipo de asiento del sistema
          empresa: { codigo: empresaCodigo },
          fechaIngreso: new Date(),
          usuarioIngreso: localStorage.getItem('username') || 'sistema',
        };

        this.tipoAsientoSistemaService.create(createData).subscribe({
          next: (newItem: TipoAsientoSistema) => {
            this.snackBar.open('Tipo de asiento del sistema creado exitosamente', 'Cerrar', {
              duration: 3000,
              horizontalPosition: 'center',
              verticalPosition: 'top',
            });
            this.loadData();
          },
          error: (error: any) => {
            console.error('Error al crear el tipo de asiento del sistema:', error);
            this.snackBar.open('Error al crear el tipo de asiento del sistema', 'Cerrar', {
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

import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { Entidad } from '../../model/entidad';
import { EntidadService } from '../../service/entidad.service';

export interface CoincidenciasDialogData {
  nombreBusqueda: string;
  registroOriginal: any;
}

@Component({
  selector: 'app-coincidencias-entidad-dialog',
  standalone: true,
  imports: [MaterialFormModule],
  templateUrl: './coincidencias-entidad-dialog.component.html',
  styleUrl: './coincidencias-entidad-dialog.component.scss'
})
export class CoincidenciasEntidadDialogComponent {
  coincidencias: Entidad[] = [];
  isLoading = true;
  entidadSeleccionada: Entidad | null = null;

  displayedColumns: string[] = ['razonSocial', 'acciones'];

  constructor(
    public dialogRef: MatDialogRef<CoincidenciasEntidadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CoincidenciasDialogData,
    private entidadService: EntidadService
  ) {
    this.cargarCoincidencias();
  }

  cargarCoincidencias(): void {
    this.isLoading = true;
    this.entidadService.getCoincidencias(this.data.nombreBusqueda).subscribe({
      next: (entidades) => {
        this.coincidencias = entidades || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error al cargar coincidencias:', error);
        this.coincidencias = [];
        this.isLoading = false;
      }
    });
  }

  seleccionarEntidad(entidad: Entidad): void {
    this.entidadSeleccionada = entidad;
  }

  confirmar(): void {
    if (this.entidadSeleccionada) {
      this.dialogRef.close(this.entidadSeleccionada);
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}

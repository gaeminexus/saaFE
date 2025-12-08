import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

export interface CambiarEstadoDialogData {
  entidad: any; // Entidad genérica (puede ser Entidad, Prestamo, Aporte, etc.)
  estadosDisponibles: any[]; // Lista de estados disponibles
  titulo?: string; // Título personalizado del diálogo
  entidadTipo?: string; // Tipo de entidad (Entidad, Préstamo, Aporte, etc.)
  campoNombre?: string; // Campo a mostrar como nombre (razonSocial, nombre, etc.)
  campoIdentificacion?: string; // Campo de identificación (numeroIdentificacion, codigo, etc.)
  campoEstadoActual?: string; // Campo del estado actual (idEstado, estadoPrestamo.codigo, etc.)
}

export interface CambiarEstadoDialogResult {
  nuevoEstado: number;
  motivo: string;
}

@Component({
  selector: 'app-auditoria-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
  ],
  templateUrl: './auditoria-dialog.component.html',
  styleUrl: './auditoria-dialog.component.scss',
})
export class AuditoriaDialogComponent {
  private fb = inject(FormBuilder);

  form: FormGroup;

  // Configuración por defecto
  titulo: string;
  entidadTipo: string;
  campoNombre: string;
  campoIdentificacion: string;
  campoEstadoActual: string;

  constructor(
    public dialogRef: MatDialogRef<AuditoriaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CambiarEstadoDialogData
  ) {
    // Valores por defecto
    this.titulo = this.data.titulo || 'Cambiar Estado';
    this.entidadTipo = this.data.entidadTipo || 'Entidad';
    this.campoNombre = this.data.campoNombre || 'razonSocial';
    this.campoIdentificacion = this.data.campoIdentificacion || 'numeroIdentificacion';
    this.campoEstadoActual = this.data.campoEstadoActual || 'idEstado';

    // Inicializar formulario vacío para que el usuario elija
    this.form = this.fb.group({
      nuevoEstado: [null, Validators.required],
      motivo: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  /**
   * Obtiene el código de la entidad
   */
  getCodigoEntidad(): string | number {
    return this.data.entidad.codigo || 'N/A';
  }

  /**
   * Obtiene la identificación de la entidad
   */
  getIdentificacionEntidad(): string {
    return this.getValorCampo(this.campoIdentificacion) || 'N/A';
  }

  /**
   * Obtiene el nombre/razón social de la entidad
   */
  getNombreEntidad(): string {
    return this.getValorCampo(this.campoNombre) || 'N/A';
  }

  /**
   * Obtiene el nombre del estado actual
   */
  getNombreEstadoActual(): string {
    const estadoActualCodigo = this.getEstadoActualCodigo();
    const estadoActual = this.data.estadosDisponibles.find((e) => e.codigo === estadoActualCodigo);
    return estadoActual?.nombre || 'Desconocido';
  }

  /**
   * Obtiene el código del estado actual desde la entidad
   * Soporta propiedades anidadas (ej: estadoPrestamo.codigo)
   */
  private getEstadoActualCodigo(): number | null {
    const valor = this.getValorCampo(this.campoEstadoActual);
    return valor ? Number(valor) : null;
  }

  /**
   * Obtiene el valor de un campo, soportando propiedades anidadas
   * Ejemplo: 'estadoPrestamo.codigo' => entidad.estadoPrestamo.codigo
   */
  private getValorCampo(campo: string): any {
    const partes = campo.split('.');
    let valor: any = this.data.entidad;

    for (const parte of partes) {
      if (valor && valor[parte] !== undefined) {
        valor = valor[parte];
      } else {
        return null;
      }
    }

    return valor;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onConfirm(): void {
    if (this.form.valid) {
      const result: CambiarEstadoDialogResult = {
        nuevoEstado: this.form.value.nuevoEstado,
        motivo: this.form.value.motivo.trim(),
      };
      this.dialogRef.close(result);
    }
  }
}

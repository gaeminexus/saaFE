import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CentroCosto } from '../../model/centro-costo';
import { CentroCostoService } from '../../service/centro-costo.service';

@Component({
  selector: 'app-centro-grid-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './centro-grid-form.component.html',
  styleUrls: ['./centro-grid-form.component.scss']
})
export class CentroGridFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = true; // Solo modo edición en el grid
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private centroCostoService: CentroCostoService,
    private dialogRef: MatDialogRef<CentroGridFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { item: CentroCosto }
  ) {}

  get dialogTitle(): string {
    return 'Editar Centro de Costo';
  }

  ngOnInit(): void {
    this.buildForm();
  }

  buildForm(): void {
    // Solo permite editar el nombre, el resto como información readonly
    this.form = this.fb.group({
      codigo: [{ value: this.data.item.codigo, disabled: true }],
      numero: [{ value: this.data.item.numero, disabled: true }],
      nombre: [this.data.item.nombre, [Validators.required, Validators.maxLength(100)]],
      tipo: [{ value: this.data.item.tipo, disabled: true }],
      nivel: [{ value: this.data.item.nivel, disabled: true }],
      estado: [{ value: this.data.item.estado, disabled: true }],
      fechaIngreso: [{ value: this.data.item.fechaIngreso, disabled: true }],
      fechaInactivo: [{ value: this.data.item.fechaInactivo, disabled: true }]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    // Solo enviar los datos originales con el nombre actualizado
    const centroCosto: CentroCosto = {
      ...this.data.item,
      nombre: this.form.get('nombre')?.value
    };

    this.centroCostoService.update(centroCosto).subscribe({
      next: (result: CentroCosto | null) => {
        this.loading = false;
        this.dialogRef.close(result);
      },
      error: (error: any) => {
        this.loading = false;
        this.error = error.message || 'Error al actualizar el centro de costo';
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getTipoLabel(tipo?: number): string {
    switch (tipo) {
      case 1: return 'Movimiento';
      case 2: return 'Acumulación';
      default: return 'Desconocido';
    }
  }

  getEstadoLabel(estado?: number): string {
    return Number(estado) === 1 ? 'Activo' : 'Inactivo';
  }

  formatDate(date?: Date): string {
    if (!date) return '-';

    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      if (isNaN(dateObj.getTime())) return '-';

      return dateObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  }
}

import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { CentroCosto } from '../../model/centro-costo';
import { CentroCostoService } from '../../service/centro-costo.service';

@Component({
  selector: 'app-centro-arbol-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './centro-arbol-form.component.html',
  styleUrls: ['./centro-arbol-form.component.scss']
})
export class CentroArbolFormComponent implements OnInit {
  form!: FormGroup;
  isEdit: boolean;
  loading = false;
  error: string | null = null;
  parentAccount: CentroCosto | null = null;

  tipoOptions = [
    { value: 1, label: 'Movimiento' },
    { value: 2, label: 'Acumulación' }
  ];

  constructor(
    private fb: FormBuilder,
    private centroCostoService: CentroCostoService,
    private dialogRef: MatDialogRef<CentroArbolFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { item: CentroCosto | null; parent: CentroCosto | null; presetNumero?: number; presetNivel?: number; maxDepth?: number }
  ) {
    this.isEdit = !!data.item;
    this.parentAccount = data.parent;
  }

  get dialogTitle(): string {
    if (this.isEdit) {
      return 'Editar Centro de Costo';
    }
    return this.parentAccount
      ? `Agregar Subcentro a: ${this.parentAccount.nombre}`
      : 'Nuevo Centro de Costo';
  }

  ngOnInit(): void {
    this.buildForm();
  }

  buildForm(): void {
    if (this.isEdit && this.data.item) {
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
    } else {
      const presetNumero = this.data.presetNumero || 0;
      const presetNivel = this.data.presetNivel || (this.parentAccount ? this.parentAccount.nivel + 1 : 1);
      this.form = this.fb.group({
        numero: [{ value: presetNumero, disabled: true }, [Validators.required]],
        nombre: ['', [Validators.required, Validators.maxLength(100)]],
        tipo: [1, Validators.required],
        nivel: [presetNivel],
        idPadre: [this.parentAccount?.codigo || null],
        estado: [1]
      });
    }
    // Auto mayúsculas nombre
    this.form.get('nombre')?.valueChanges.subscribe(val => {
      if (val && typeof val === 'string') {
        const upper = val.toUpperCase();
        if (upper !== val) {
          this.form.get('nombre')?.setValue(upper, { emitEvent: false });
        }
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    if (this.isEdit) {
      // Solo enviar los datos originales con el nombre actualizado
      const centroCosto: CentroCosto = {
        ...this.data.item!,
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
    } else {
      // Crear nuevo centro
      const raw = this.form.getRawValue();
      const centroCosto: Partial<CentroCosto> = {
        // NO enviar codigo - el backend lo genera automáticamente
        numero: raw.numero,
        nombre: raw.nombre,
        tipo: raw.tipo,
        nivel: raw.nivel,
        idPadre: raw.idPadre || 0,
        estado: raw.estado,
        empresa: {
          codigo: 280,
          nombre: 'Empresa Demo',
          nivel: 1,
          codigoPadre: 0,
          ingresado: 1,
          jerarquia: {
            codigo: 1,
            nombre: 'Principal',
            nivel: 1,
            codigoPadre: 0,
            descripcion: 'Jerarquía principal',
            ultimoNivel: 1,
            rubroTipoEstructuraP: 0,
            rubroTipoEstructuraH: 0,
            codigoAlterno: 0,
            rubroNivelCaracteristicaP: 0,
            rubroNivelCaracteristicaH: 0
          }
        },
        fechaIngreso: new Date(),
        fechaInactivo: raw.fechaInactivo || null
      };

      console.log('[CentroArbolForm] Crear centro payload:', centroCosto);
      this.centroCostoService.add(centroCosto).subscribe({
        next: (result: CentroCosto | null) => {
          this.loading = false;
          this.dialogRef.close(result);
        },
        error: (error: any) => {
          this.loading = false;
          this.error = error.message || 'Error al crear el centro de costo';
        }
      });
    }
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

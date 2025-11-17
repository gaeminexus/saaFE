import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { PlanCuenta } from '../../model/plan-cuenta';
import { NaturalezaCuenta } from '../../model/naturaleza-cuenta';
import { PlanCuentaService } from '../../service/plan-cuenta.service';

export interface PlanGridFormData {
  item?: PlanCuenta;
  parent?: PlanCuenta;
  naturalezas: NaturalezaCuenta[];
}

@Component({
  selector: 'app-plan-grid-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatCheckboxModule
  ],
  templateUrl: './plan-grid-form.component.html',
  styleUrls: ['./plan-grid-form.component.scss']
})
export class PlanGridFormComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  isEdit: boolean;
  naturalezas: NaturalezaCuenta[] = [];
  parentAccount?: PlanCuenta;

  get dialogTitle(): string {
    return this.isEdit ? 'Editar Cuenta' : 'Nueva Cuenta';
  }

  get numeroHelperText(): string {
    if (this.parentAccount) {
      const parentNumber = this.parentAccount.cuentaContable || '';
      return `Debe comenzar con "${parentNumber}" y ser más específico`;
    }
    return 'Ingrese el número de cuenta contable';
  }

  get isEditMode(): boolean {
    return this.isEdit;
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PlanGridFormComponent>,
    private planCuentaService: PlanCuentaService,
    @Inject(MAT_DIALOG_DATA) public data: PlanGridFormData
  ) {
    this.isEdit = !!data.item;
    this.naturalezas = data.naturalezas;
    this.parentAccount = data.parent;

    this.form = this.fb.group({
      codigo: [{value: data.item?.codigo || '', disabled: true}],
      nombre: [data.item?.nombre || '', [Validators.required, Validators.maxLength(100)]],
      cuentaContable: [{value: data.item?.cuentaContable || '', disabled: true}],
      nivel: [{value: data.item?.nivel || 1, disabled: true}],
      tipo: [{value: data.item?.tipo || 1, disabled: true}],
      naturalezaCuenta: [{value: data.item?.naturalezaCuenta || null, disabled: true}],
      estado: [{value: data.item?.estado ?? 1, disabled: true}],
      fechaUpdate: [{value: data.item?.fechaUpdate || null, disabled: true}],
      fechaInactivo: [{value: data.item?.fechaInactivo || null, disabled: true}]
    });
  }

  ngOnInit(): void {
    // Los campos están deshabilitados excepto el nombre
    // Solo en modo edición se permite cambiar el nombre
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.isEdit) {
      this.error = 'Solo se puede editar cuentas existentes. No se pueden crear nuevas cuentas desde esta vista.';
      return;
    }

    this.loading = true;
    this.error = null;

    // Solo enviar los datos originales con el nombre actualizado
    const cuenta: PlanCuenta = {
      ...this.data.item!,
      nombre: this.form.get('nombre')?.value
    };

    const request$ = this.isEdit
      ? this.planCuentaService.update(cuenta)
      : this.planCuentaService.add(cuenta);

    request$.subscribe({
      next: (result: PlanCuenta | null) => {
        this.loading = false;
        this.dialogRef.close(result);
      },
      error: (error: any) => {
        this.loading = false;
        this.error = error.message || 'Error al guardar la cuenta';
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
      case 3: return 'Orden';
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

  compareNaturalezas(n1: any, n2: any): boolean {
    return n1 && n2 ? n1.codigo === n2.codigo : n1 === n2;
  }

  getTipoNaturaleza(): string {
    const naturaleza = this.data.item?.naturalezaCuenta;
    if (!naturaleza) return 'No especificado';

    switch (naturaleza.tipo) {
      case 1: return 'Deudor';
      case 2: return 'Acreedor';
      default: return 'No especificado';
    }
  }

  getManejaCentroCosto(): string {
    const naturaleza = this.data.item?.naturalezaCuenta;
    return naturaleza?.manejaCentroCosto === 1 ? 'Sí' : 'No';
  }
}

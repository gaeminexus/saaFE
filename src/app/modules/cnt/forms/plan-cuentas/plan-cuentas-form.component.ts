import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

import { NaturalezaCuenta } from '../../model/naturaleza-cuenta';
import { PlanCuenta } from '../../model/plan-cuenta';
import { PlanCuentaService } from '../../service/plan-cuenta.service';

export interface PlanCuentasFormData {
  item?: PlanCuenta;
  parent?: PlanCuenta;
  naturalezas: NaturalezaCuenta[];
}

@Component({
  selector: 'app-plan-cuentas-form',
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
    MatCheckboxModule,
  ],
  templateUrl: './plan-cuentas-form.component.html',
  styleUrls: ['./plan-cuentas-form.component.scss'],
})
export class PlanCuentasFormComponent implements OnInit {
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
    return 'Ingrese el número de cuenta contable (solo números)';
  }

  get isEditMode(): boolean {
    return this.isEdit;
  }

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PlanCuentasFormComponent>,
    private planCuentaService: PlanCuentaService,
    @Inject(MAT_DIALOG_DATA) public data: PlanCuentasFormData
  ) {
    this.isEdit = !!data.item;
    this.naturalezas = data.naturalezas;
    this.parentAccount = data.parent;

    // Calcular tipo inicial según nivel
    const nivelInicial = data.item?.nivel || 1;
    const tipoInicial = nivelInicial === 1 ? 1 : 2;

    this.form = this.fb.group({
      codigo: [data.item?.codigo || '', [Validators.required]],
      nombre: [data.item?.nombre || '', [Validators.required, Validators.maxLength(100)]],
      cuentaContable: [
        data.item?.cuentaContable || '',
        [Validators.required, this.accountNumberValidator],
      ],
      nivel: [{ value: nivelInicial, disabled: true }],
      tipo: [data.item?.tipo || tipoInicial, [Validators.required]],
      naturalezaCuenta: [data.item?.naturalezaCuenta || null, [Validators.required]],
      estado: [data.item?.estado ?? 1, [Validators.required]],
    });
  }

  ngOnInit(): void {
    if (this.parentAccount && !this.isEdit) {
      const parentNumber = this.parentAccount.cuentaContable || '';
      this.form.patchValue({
        cuentaContable: parentNumber,
      });
    }

    // Actualizar el nivel y tipo automáticamente cuando cambie el número de cuenta
    this.form.get('cuentaContable')?.valueChanges.subscribe((value) => {
      const nivel = this.calculateLevel(value || '');
      const tipo = nivel === 1 ? 1 : 2;
      this.form.patchValue({ nivel, tipo }, { emitEvent: false });
    });

    // Calcular nivel y tipo inicial
    const initialCuentaContable = this.form.get('cuentaContable')?.value || '';
    const initialNivel = this.calculateLevel(initialCuentaContable);
    const initialTipo = initialNivel === 1 ? 1 : 2;
    this.form.patchValue({ nivel: initialNivel, tipo: initialTipo }, { emitEvent: false });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    const formValue = this.form.value;
    const cuenta: PlanCuenta = {
      ...formValue,
      codigo: this.data.item?.codigo,
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
      },
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getNaturalezaName(id: number): string {
    const naturaleza = this.naturalezas.find((n) => n.codigo === id);
    return naturaleza?.nombre || '';
  }

  getTipoNaturaleza(): string {
    const naturaleza = this.form.get('naturalezaCuenta')?.value;
    if (!naturaleza) return '';
    return naturaleza.tipo === 1 ? 'Deudora' : 'Acreedora';
  }

  getManejaCentroCosto(): string {
    const naturaleza = this.form.get('naturalezaCuenta')?.value;
    if (!naturaleza) return '';
    return naturaleza.manejaCentroCosto === 1 ? 'Sí' : 'No';
  }

  // Validador personalizado para el número de cuenta
  private accountNumberValidator = (control: any) => {
    const value = control.value;

    if (!value) return null;

    if (this.parentAccount) {
      const parentNumber = this.parentAccount.cuentaContable || '';

      if (!value.startsWith(parentNumber)) {
        return {
          invalidHierarchy: {
            message: `Debe comenzar con "${parentNumber}"`,
          },
        };
      }

      if (value.length <= parentNumber.length) {
        return {
          invalidHierarchy: {
            message: `Debe ser más específico que "${parentNumber}"`,
          },
        };
      }
    }

    return null;
  };

  private calculateLevel(cuentaContable: string): number {
    // Calcular nivel basado en la longitud del número de cuenta
    // Por ejemplo: 1 = nivel 1, 11 = nivel 2, 1101 = nivel 3
    if (!cuentaContable) return 0;

    if (cuentaContable.length <= 1) return 1;
    if (cuentaContable.length <= 2) return 2;
    if (cuentaContable.length <= 4) return 3;
    if (cuentaContable.length <= 6) return 4;
    return 5;
  }
}

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

export interface PlanArbolFormData {
  item?: PlanCuenta;
  parent?: PlanCuenta;
  naturalezas: NaturalezaCuenta[];
  presetCuenta?: string;
  presetNivel?: number;
  maxDepth?: number;
}

@Component({
  selector: 'app-plan-arbol-form',
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
  templateUrl: './plan-arbol-form.component.html',
  styleUrls: ['./plan-arbol-form.component.scss']
})
export class PlanArbolFormComponent implements OnInit {
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
    private dialogRef: MatDialogRef<PlanArbolFormComponent>,
    private planCuentaService: PlanCuentaService,
    @Inject(MAT_DIALOG_DATA) public data: PlanArbolFormData
  ) {
    this.isEdit = !!data.item;
    this.naturalezas = data.naturalezas;
    this.parentAccount = data.parent;

    // En modo edición, solo permitir cambiar el nombre
    if (this.isEdit) {
      this.form = this.fb.group({
        codigo: [{value: data.item?.codigo || '', disabled: true}],
        nombre: [data.item?.nombre || '', [Validators.required, Validators.maxLength(100)]],
        cuentaContable: [{value: data.item?.cuentaContable || '', disabled: true}],
        nivel: [{value: data.item?.nivel || 1, disabled: true}],
        tipo: [{value: data.item?.tipo || 1, disabled: true}],
        naturalezaCuenta: [{value: data.item?.naturalezaCuenta || null, disabled: true}],
        estado: [{value: data.item?.estado ?? 1, disabled: true}]
      });
    } else {
      // En modo creación, permitir todos los campos
      this.form = this.fb.group({
        codigo: [{value: '', disabled: true}],
        nombre: [data.item?.nombre || '', [Validators.required, Validators.maxLength(100)]],
        cuentaContable: [{value: data.presetCuenta || data.item?.cuentaContable || '', disabled: true,}, [Validators.required]],
        nivel: [{value: data.presetNivel || data.item?.nivel || 1, disabled: true}],
        tipo: [{value: data.item?.tipo || 1, disabled: true}],
        naturalezaCuenta: [data.item?.naturalezaCuenta || null, [Validators.required]],
        estado: [data.item?.estado ?? 1, [Validators.required]]
      });
    }
  }

  ngOnInit(): void {
    // Heredar tipo desde naturaleza seleccionada
    this.form.get('naturalezaCuenta')?.valueChanges.subscribe(nat => {
      if (nat && nat.tipo != null) {
        this.form.patchValue({ tipo: nat.tipo }, { emitEvent: false });
      }
    });

    // Forzar mayúsculas en el nombre mientras se escribe
    this.form.get('nombre')?.valueChanges.subscribe(val => {
      if (typeof val === 'string' && val !== val.toUpperCase()) {
        this.form.get('nombre')?.setValue(val.toUpperCase(), { emitEvent: false });
      }
    });

    // Calcular nivel inicial
    const initialCuentaContable = this.form.get('cuentaContable')?.value || '';
    const initialNivel = this.calculateLevel(initialCuentaContable);
    this.form.patchValue({ nivel: initialNivel }, { emitEvent: false });
  }

  onSubmit(): void {
    // 📌 DEBUG: Inicio de onSubmit
    console.log('[PlanArbolFormComponent.onSubmit] Disparado', {
      isEdit: this.isEdit,
      rawForm: this.form.getRawValue(),
      valid: this.form.valid
    });
    if (this.form.invalid) {
      console.warn('[PlanArbolFormComponent.onSubmit] Formulario inválido, marcando campos');
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    let cuenta: PlanCuenta;

    if (this.isEdit) {
      // En modo edición, actualizar nombre y fechaUpdate
      cuenta = {
        ...this.data.item!,
        nombre: String(this.form.get('nombre')?.value || '').trim().toUpperCase(),
        fechaUpdate: new Date()
      } as PlanCuenta;
      console.log('[PlanArbolFormComponent.onSubmit] Preparando UPDATE', cuenta);
    } else {
      // En modo creación: normalizar tipos, asignar empresa 280 e idPadre si aplica
      const formValue = this.form.getRawValue();
      // Validar profundidad
      const nivelNuevo = this.calculateLevel(String(this.form.get('cuentaContable')?.value || ''));
      if (this.data.maxDepth && nivelNuevo > this.data.maxDepth) {
        this.loading = false;
        this.error = `La profundidad máxima permitida es ${this.data.maxDepth}.`;
        console.error('[PlanArbolFormComponent.onSubmit] Exceso de profundidad', { nivelNuevo, max: this.data.maxDepth });
        return;
      }

      const naturaleza = formValue.naturalezaCuenta;
      const tipoHeradado = naturaleza?.tipo ?? 1;

      // Tomar empresa completa preferentemente desde la naturaleza o desde el padre si existe
      const empresaOrigen = naturaleza?.empresa || this.parentAccount?.empresa || { codigo: 280 } as any;
      cuenta = {
        codigo: 0, // id nuevo
        nombre: String(formValue.nombre || '').trim().toUpperCase(),
        cuentaContable: String(formValue.cuentaContable || '').trim(),
        tipo: Number(tipoHeradado),
        nivel: nivelNuevo,
        naturalezaCuenta: naturaleza,
        estado: Number(formValue.estado ?? 1),
        idPadre: this.parentAccount?.codigo ?? 0,
        empresa: empresaOrigen,
        fechaInactivo: new Date(),
        fechaUpdate: new Date()
      } as PlanCuenta;
      // Eliminar código si está vacío para forzar POST a generar id
      // Mantener codigo=0; si backend acepta null, podría adaptarse luego.
      console.log('[PlanArbolFormComponent.onSubmit] Preparando CREATE', cuenta);
    }

    const request$ = this.isEdit
      ? this.planCuentaService.update(cuenta)
      : this.planCuentaService.add(cuenta);

    console.log('[PlanArbolFormComponent.onSubmit] Ejecutando request', {
      mode: this.isEdit ? 'UPDATE' : 'CREATE',
      cuenta
    });

    request$.subscribe({
      next: (result: PlanCuenta | null) => {
        console.log('[PlanArbolFormComponent.onSubmit] Respuesta OK', result);
        this.loading = false;
        this.dialogRef.close(result);
      },
      error: (error: any) => {
        console.error('[PlanArbolFormComponent.onSubmit] Error en request', error);
        this.loading = false;
        this.error = error.message || 'Error al guardar la cuenta';
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getNaturalezaName(id: number): string {
    const naturaleza = this.naturalezas.find(n => n.codigo === id);
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

  private calculateLevel(cuentaContable: string): number {
    if (!cuentaContable) return 0;
    if (cuentaContable === '0') return 0;
    const dots = (cuentaContable.match(/\./g) || []).length;
    return dots + 1;
  }
}

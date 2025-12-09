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
    MatCheckboxModule,
  ],
  templateUrl: './plan-arbol-form.component.html',
  styleUrls: ['./plan-arbol-form.component.scss'],
})
export class PlanArbolFormComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  isEdit: boolean;
  naturalezas: NaturalezaCuenta[] = [];
  parentAccount?: PlanCuenta;

  // Prefijo para validación (niveles superiores bloqueados)
  requiredPrefix: string = '';

  // Naturalezas filtradas por nivel
  get naturalezasFiltradas(): NaturalezaCuenta[] {
    const nivel = this.form?.get('nivel')?.value;
    if (!nivel) return this.naturalezas;

    // Obtener el primer número de la cuenta para determinar la naturaleza
    const cuentaContable = this.form?.get('cuentaContable')?.value;
    const primerNivel = this.getPrimerNivel(cuentaContable);

    // Filtrar naturalezas cuyo campo 'numero' coincida con el primer nivel
    return this.naturalezas.filter((nat) => nat.numero === primerNivel);
  }

  /**
   * Obtiene el primer nivel de una cuenta contable
   * Ejemplo: "1.1.1.1.5" -> 1, "2.3.01" -> 2
   */
  private getPrimerNivel(cuentaContable: string): number {
    if (!cuentaContable) return 0;

    const partes = String(cuentaContable).split('.');
    if (partes.length === 0) return 0;

    const primerNumero = parseInt(partes[0], 10);
    return isNaN(primerNumero) ? 0 : primerNumero;
  }

  get dialogTitle(): string {
    return this.isEdit ? 'Editar Cuenta' : 'Nueva Cuenta';
  }

  get numeroHelperText(): string {
    if (this.parentAccount) {
      const parentNumber = this.parentAccount.cuentaContable || '';
      return `El prefijo "${parentNumber}." es fijo. Solo modifique el último nivel`;
    }
    return 'Ingrese el número de cuenta contable (ej: 1, 2, 3)';
  }

  get cuentaPlaceholder(): string {
    if (this.requiredPrefix) {
      return `${this.requiredPrefix}01`;
    }
    return '1';
  }

  get canEditCuentaContable(): boolean {
    // Siempre editable si no es modo edición, o si es edición y tiene prefijo bloqueado
    return !this.isEdit || (this.isEdit && this.requiredPrefix !== '');
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

    // Establecer prefijo requerido si hay padre
    if (this.parentAccount && this.parentAccount.cuentaContable) {
      this.requiredPrefix = this.parentAccount.cuentaContable + '.';
    }

    // En modo edición, solo permitir cambiar el nombre
    if (this.isEdit) {
      // Establecer prefijo bloqueado basado en la cuenta actual
      const cuentaActual = data.item?.cuentaContable || '';
      const partes = cuentaActual.split('.');
      if (partes.length > 1) {
        // Si tiene múltiples niveles, bloquear todos excepto el último
        partes.pop(); // Quitar el último nivel
        this.requiredPrefix = partes.join('.') + '.';
      }
      // Si solo tiene un nivel (ej: "1"), no hay prefijo y puede editarse libremente

      this.form = this.fb.group({
        codigo: [{ value: data.item?.codigo || '', disabled: true }],
        nombre: [data.item?.nombre || '', [Validators.required, Validators.maxLength(100)]],
        cuentaContable: [
          data.item?.cuentaContable || '',
          [Validators.required, this.cuentaContableValidator.bind(this)],
        ],
        nivel: [{ value: data.item?.nivel || 1, disabled: true }],
        tipo: [{ value: data.item?.tipo || 1, disabled: true }],
        naturalezaCuenta: [{ value: data.item?.naturalezaCuenta || null, disabled: true }],
        estado: [{ value: data.item?.estado ?? 1, disabled: true }],
      });
    } else {
      // En modo creación, permitir todos los campos
      this.form = this.fb.group({
        codigo: [{ value: '', disabled: true }],
        nombre: [data.item?.nombre || '', [Validators.required, Validators.maxLength(100)]],
        cuentaContable: [
          data.presetCuenta || data.item?.cuentaContable || '',
          [Validators.required, this.cuentaContableValidator.bind(this)],
        ],
        nivel: [{ value: data.presetNivel || data.item?.nivel || 1, disabled: true }],
        tipo: [{ value: data.item?.tipo || 1, disabled: true }],
        naturalezaCuenta: [data.item?.naturalezaCuenta || null, [Validators.required]],
        estado: [data.item?.estado ?? 1, [Validators.required]],
      });
    }
  }

  ngOnInit(): void {
    // Heredar tipo desde naturaleza seleccionada
    this.form.get('naturalezaCuenta')?.valueChanges.subscribe((nat) => {
      if (nat && nat.tipo != null) {
        this.form.patchValue({ tipo: nat.tipo }, { emitEvent: false });
      }
    });

    // Forzar mayúsculas en el nombre mientras se escribe
    this.form.get('nombre')?.valueChanges.subscribe((val) => {
      if (typeof val === 'string' && val !== val.toUpperCase()) {
        this.form.get('nombre')?.setValue(val.toUpperCase(), { emitEvent: false });
      }
    });

    // Actualizar nivel automáticamente cuando cambie cuentaContable
    this.form.get('cuentaContable')?.valueChanges.subscribe((val) => {
      if (val) {
        const nivel = this.calculateLevel(String(val));
        const nivelAnterior = this.form.get('nivel')?.value;
        const primerNivel = this.getPrimerNivel(String(val));

        // Solo actualizar si cambió el nivel
        if (nivel !== nivelAnterior) {
          this.form.patchValue({ nivel }, { emitEvent: false });
        }

        // Autoseleccionar naturaleza según el primer nivel
        this.autoSelectNaturaleza(primerNivel);
      }
    });

    // Forzar prefijo si hay padre o si está en edición con múltiples niveles
    if (this.requiredPrefix) {
      this.form.get('cuentaContable')?.valueChanges.subscribe((val) => {
        const valStr = String(val || '');

        // Si no tiene el prefijo o está vacío, restaurarlo
        if (!valStr.startsWith(this.requiredPrefix)) {
          // Solo restaurar si el usuario está escribiendo, no en el init
          const initialValue = this.isEdit
            ? this.data.item?.cuentaContable
            : this.data.presetCuenta;
          if (valStr.length > 0 && valStr !== initialValue) {
            this.form.get('cuentaContable')?.setValue(this.requiredPrefix, { emitEvent: false });
          }
        }
      });
    }

    // Calcular nivel inicial y autoseleccionar naturaleza
    const initialCuentaContable = this.form.get('cuentaContable')?.value || '';
    const initialNivel = this.calculateLevel(initialCuentaContable);
    const initialPrimerNivel = this.getPrimerNivel(initialCuentaContable);
    this.form.patchValue({ nivel: initialNivel }, { emitEvent: false });

    // Autoseleccionar naturaleza inicial si no está en modo edición
    if (!this.isEdit) {
      this.autoSelectNaturaleza(initialPrimerNivel);
    }
  }

  /**
   * Autoselecciona la naturaleza de cuenta según el primer nivel
   * @param primerNivel - El primer número de la cuenta (ej: 1 en "1.1.01")
   */
  private autoSelectNaturaleza(primerNivel: number): void {
    const naturalezasDelPrimerNivel = this.naturalezas.filter((nat) => nat.numero === primerNivel);

    if (naturalezasDelPrimerNivel.length === 1) {
      // Si hay exactamente una naturaleza para este primer nivel, seleccionarla automáticamente
      this.form.patchValue({ naturalezaCuenta: naturalezasDelPrimerNivel[0] }, { emitEvent: true });
    } else if (naturalezasDelPrimerNivel.length === 0) {
      // Si no hay naturalezas para este primer nivel, limpiar la selección
      this.form.patchValue({ naturalezaCuenta: null }, { emitEvent: false });
    }
    // Si hay múltiples naturalezas para el primer nivel, dejar que el usuario elija
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.error = null;

    let cuenta: Partial<PlanCuenta> | PlanCuenta;

    if (this.isEdit) {
      cuenta = {
        ...this.data.item!,
        nombre: String(this.form.get('nombre')?.value || '')
          .trim()
          .toUpperCase(),
        fechaUpdate: this.formatDateToLocalDate(new Date()),
      } as PlanCuenta;
    } else {
      // En modo creación: normalizar tipos, asignar empresa 280 e idPadre si aplica
      const formValue = this.form.getRawValue();
      // Validar profundidad
      const nivelNuevo = this.calculateLevel(String(this.form.get('cuentaContable')?.value || ''));
      if (this.data.maxDepth && nivelNuevo > this.data.maxDepth) {
        this.loading = false;
        this.error = `La profundidad máxima permitida es ${this.data.maxDepth}.`;
        return;
      }

      const naturaleza = formValue.naturalezaCuenta;
      const tipoHeradado = naturaleza?.tipo ?? 1;

      // Tomar empresa completa preferentemente desde la naturaleza o desde el padre si existe
      const empresaOrigen =
        naturaleza?.empresa || this.parentAccount?.empresa || ({ codigo: 280 } as any);

      cuenta = {
        // NO enviar codigo - el backend lo genera automáticamente
        nombre: String(formValue.nombre || '')
          .trim()
          .toUpperCase(),
        cuentaContable: String(formValue.cuentaContable || '').trim(),
        tipo: Number(tipoHeradado),
        nivel: nivelNuevo,
        naturalezaCuenta: naturaleza,
        estado: Number(formValue.estado ?? 1),
        idPadre: this.parentAccount?.codigo ?? 0,
        empresa: empresaOrigen,
        fechaInactivo: this.formatDateToLocalDate(new Date()),
        fechaUpdate: this.formatDateToLocalDate(new Date()),
      } as Partial<PlanCuenta>;

      if (!cuenta.naturalezaCuenta || !cuenta.naturalezaCuenta.codigo) {
        this.loading = false;
        this.error = 'Debe seleccionar una Naturaleza de Cuenta válida';
        return;
      }
    }

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

  private calculateLevel(cuentaContable: string): number {
    if (!cuentaContable) return 0;
    if (cuentaContable === '0') return 0;
    const dots = (cuentaContable.match(/\./g) || []).length;
    return dots + 1;
  }

  /**
   * Validador personalizado para cuentaContable
   * Verifica que:
   * - Solo contenga números y puntos
   * - Si hay padre o está en edición, debe comenzar con el prefijo (niveles superiores protegidos)
   * - El último nivel sea válido
   * - El formato sea válido
   */
  private cuentaContableValidator(control: any): { [key: string]: any } | null {
    const value = control.value;
    if (!value) return null;

    const valueStr = String(value).trim();

    // Validar formato: solo números y puntos
    if (!/^[0-9.]+$/.test(valueStr)) {
      return { invalidFormat: 'Solo se permiten números y puntos' };
    }

    // Validar que no termine en punto
    if (valueStr.endsWith('.')) {
      return { invalidFormat: 'No puede terminar en punto' };
    }

    // Validar que no tenga puntos consecutivos
    if (valueStr.includes('..')) {
      return { invalidFormat: 'No se permiten puntos consecutivos' };
    }

    // Si hay prefijo requerido (padre o edición multi-nivel), validarlo
    if (this.requiredPrefix) {
      if (!valueStr.startsWith(this.requiredPrefix)) {
        return {
          invalidHierarchy: `Debe comenzar con "${this.requiredPrefix}" (niveles superiores protegidos)`,
        };
      }

      // Validar que haya agregado algo después del prefijo
      const lastLevel = valueStr.substring(this.requiredPrefix.length);
      if (!lastLevel || lastLevel.trim() === '') {
        return {
          missingLastLevel: 'Debe agregar el último nivel después del prefijo',
        };
      }

      // Validar que el último nivel no contenga puntos (solo un nivel adicional)
      if (lastLevel.includes('.')) {
        return {
          multipleNewLevels:
            'Solo puede agregar un nivel a la vez. Use números sin puntos para el último nivel',
        };
      }

      // Validar que el último nivel sea numérico
      if (!/^\d+$/.test(lastLevel)) {
        return {
          invalidLastLevel: 'El último nivel debe ser solo números',
        };
      }
    }

    return null;
  }

  /**
   * Obtiene el mensaje de error para el campo cuentaContable
   */
  get cuentaContableError(): string {
    const control = this.form.get('cuentaContable');
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'El número de cuenta es requerido';
    if (control.errors['invalidFormat']) return control.errors['invalidFormat'];
    if (control.errors['invalidHierarchy']) return control.errors['invalidHierarchy'];
    if (control.errors['missingLastLevel']) return control.errors['missingLastLevel'];
    if (control.errors['multipleNewLevels']) return control.errors['multipleNewLevels'];
    if (control.errors['invalidLastLevel']) return control.errors['invalidLastLevel'];

    return 'Número de cuenta inválido';
  }

  /**
   * Convierte Date a formato YYYY-MM-DD para compatibilidad con LocalDate del backend
   */
  private formatDateToLocalDate(date: Date): any {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

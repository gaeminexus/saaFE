import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';

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
    MatProgressSpinnerModule,
  ],
  templateUrl: './centro-arbol-form.component.html',
  styleUrls: ['./centro-arbol-form.component.scss'],
})
export class CentroArbolFormComponent implements OnInit {
  form!: FormGroup;
  isEdit: boolean;
  loading = false;
  error: string | null = null;
  parentAccount: CentroCosto | null = null;

  // Propiedades para prefijo bloqueado (como plan-arbol)
  requiredPrefix = '';
  numeroPlaceholder = '';
  presetSufijoNumero = '';

  tipoOptions = [
    { value: 1, label: 'Acumulación' },
    { value: 2, label: 'Movimiento' },
  ];

  constructor(
    private fb: FormBuilder,
    private centroCostoService: CentroCostoService,
    private dialogRef: MatDialogRef<CentroArbolFormComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      item: CentroCosto | null;
      parent: CentroCosto | null;
      presetNumero?: number;
      presetNivel?: number;
      maxDepth?: number;
    }
  ) {
    this.isEdit = !!data.item;
    this.parentAccount = data.parent;

    // Calcular prefijo si hay padre
    if (this.parentAccount && !this.isEdit) {
      this.requiredPrefix = `${this.parentAccount.numero}.`;
      this.numeroPlaceholder = 'Ej: 1';
      // Sugerir siguiente número disponible
      this.presetSufijoNumero = String(data.presetNumero || 1);
    } else if (!this.isEdit) {
      this.numeroPlaceholder = 'Ej: 1, 2, 3...';
      this.presetSufijoNumero = String(data.presetNumero || 1);
    }
  }

  get dialogTitle(): string {
    if (this.isEdit) {
      return 'Editar Centro de Costo';
    }
    return this.parentAccount
      ? `Agregar Subcentro a: ${this.parentAccount.nombre}`
      : 'Nuevo Centro de Costo';
  }

  /**
   * Construye el código del padre para mostrar en la jerarquía
   */
  buildParentCode(): string {
    if (!this.parentAccount) return '';
    return String(this.parentAccount.numero || '');
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
        fechaInactivo: [{ value: this.data.item.fechaInactivo, disabled: true }],
      });
    } else {
      const presetNumero = this.data.presetNumero || 0;
      const presetNivel =
        this.data.presetNivel || (this.parentAccount ? this.parentAccount.nivel + 1 : 1);

      // Calcular tipo automático según nivel:
      // Nivel 1 = Acumulación (1)
      // Nivel > 1 y no es último = Acumulación (1)
      // Último nivel = Movimiento (2)
      // Por defecto asignamos Acumulación, el backend o validación pueden ajustar según profundidad máxima
      const maxDepth = this.data.maxDepth || 5;
      const tipoAutomatico = presetNivel >= maxDepth ? 2 : 1;

      console.log('[CentroArbolForm] buildForm - Modo CREAR:', {
        presetNumero,
        presetNivel,
        tipoAutomatico,
        parentCodigo: this.parentAccount?.codigo,
      });

      this.form = this.fb.group({
        numeroSufijo: [
          this.presetSufijoNumero,
          [Validators.required, Validators.pattern(/^[1-9]\d*$/)], // Solo enteros positivos
        ],
        nombre: ['', [Validators.required, Validators.maxLength(100)]],
        tipo: [{ value: tipoAutomatico, disabled: true }],
        nivel: [{ value: presetNivel, disabled: true }],
        idPadre: [this.parentAccount?.codigo || null],
        estado: [1],
      });
    }
    // Auto mayúsculas nombre
    this.form.get('nombre')?.valueChanges.subscribe((val) => {
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

    // MODO CREAR: Construir número completo con prefijo + sufijo
    let numeroCompleto: any;
    if (!this.isEdit) {
      const sufijo = this.form.value.numeroSufijo?.trim() || '';
      numeroCompleto = this.requiredPrefix ? `${this.requiredPrefix}${sufijo}` : sufijo;

      console.log('[CentroArbolForm] Construyendo número:', {
        prefijo: this.requiredPrefix,
        sufijo: sufijo,
        numeroCompleto: numeroCompleto,
      });
    }

    if (this.isEdit) {
      // Solo enviar los datos originales con el nombre actualizado
      const centroCosto: CentroCosto = {
        ...this.data.item!,
        nombre: this.form.get('nombre')?.value,
      };

      this.centroCostoService.update(centroCosto).subscribe({
        next: (result: CentroCosto | null) => {
          this.loading = false;
          this.dialogRef.close(result);
        },
        error: (error: any) => {
          this.loading = false;
          console.error('[CentroArbolForm] Error al actualizar:', error);
          const errorMsg = error?.error?.message || error?.message || '';
          this.error = errorMsg || 'Error al actualizar el centro de costo';
        },
      });
    } else {
      // Crear nuevo centro
      const raw = this.form.getRawValue();
      const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);

      console.log('[CentroArbolForm] Datos del formulario:', {
        raw,
        empresaCodigo,
        presetNumeroOriginal: this.data.presetNumero,
      });

      const centroCosto: Partial<CentroCosto> = {
        // NO enviar codigo - el backend lo genera automáticamente
        numero: numeroCompleto,
        nombre: raw.nombre,
        tipo: raw.tipo,
        nivel: raw.nivel,
        idPadre: raw.idPadre || 0,
        estado: raw.estado || 1,
        empresa: {
          codigo: empresaCodigo,
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
            rubroNivelCaracteristicaH: 0,
          },
        },
        fechaIngreso: new Date(),
        fechaInactivo: raw.fechaInactivo || null,
      };

      console.log('[CentroArbolForm] Crear centro payload:', centroCosto);
      this.centroCostoService.add(centroCosto).subscribe({
        next: (result: CentroCosto | null) => {
          this.loading = false;
          this.dialogRef.close(result);
        },
        error: (error: any) => {
          this.loading = false;
          console.error('[CentroArbolForm] Error al crear:', error);

          // Detectar error de duplicado
          const errorMsg = error?.error?.message || error?.message || '';
          if (errorMsg.includes('ORA-00001') || errorMsg.includes('restricción única')) {
            this.error = `El número ${raw.numero} ya existe para este nivel. Por favor, use un número diferente.`;
          } else {
            this.error = errorMsg || 'Error al crear el centro de costo';
          }
        },
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getTipoLabel(tipo?: number): string {
    switch (tipo) {
      case 1:
        return 'Acumulación';
      case 2:
        return 'Movimiento';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Validador personalizado para numero
   * Verifica que sea un número válido mayor a 0
   */
  private numeroValidator(control: any): { [key: string]: any } | null {
    const value = control.value;
    if (value === null || value === undefined) return null;

    const num = Number(value);
    if (isNaN(num) || num <= 0) {
      return { invalidNumber: 'El número debe ser mayor a 0' };
    }

    return null;
  }

  /**
   * Obtiene el mensaje de error para el campo numero
   */
  get numeroError(): string {
    const control = this.form.get('numero');
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'El número es requerido';
    if (control.errors['invalidNumber']) return control.errors['invalidNumber'];

    return 'Número inválido';
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
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  }
}

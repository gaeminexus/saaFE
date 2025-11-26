import { Component, OnInit, ViewEncapsulation, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { NaturalezaCuentaService } from '../../service/naturaleza-cuenta.service';
import { NaturalezaCuenta } from '../../model/naturaleza-cuenta';
import { EntidadesContabilidad } from '../../model/entidades-cnt';
import { FieldConfig } from '../../../../shared/basics/table/dynamic-form/model/field.interface';
import { FieldFormat } from '../../../../shared/basics/table/model/field-format-interface';
import { TableConfig } from '../../../../shared/basics/table/model/table-interface';
import { TableBasicHijosComponent } from '../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';

@Component({
  selector: 'app-naturalezadecuentas-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './naturaleza-cuentas-form.component.html',
  styleUrls: ['./naturaleza-cuentas-form.component.scss'],
  encapsulation: ViewEncapsulation.None   // 👈 permite que el SCSS alcance el overlay
})
export class NaturalezaDeCuentasFormComponent implements OnInit {


  form: FormGroup;
  loading = false;
  error: string | null = null;
  isEditMode = false;

  tiposNaturaleza = [
    { value: 1, label: 'Deudora' },
    { value: 2, label: 'Acreedora' }
  ];

  constructor(
    private fb: FormBuilder,
    private naturalezaCuentaService: NaturalezaCuentaService,
    private dialogRef: MatDialogRef<NaturalezaDeCuentasFormComponent>
  ) {
    this.form = this.fb.group({
      codigo: [null],
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      tipo: [1, [Validators.required]],
      numero: ['', [Validators.required, Validators.pattern(/^[0-9]+$/)]],
      manejaCentroCosto: [false],
      estado: [1]
    });
  }

  ngOnInit(): void {
    // Transformar automáticamente a mayúsculas los campos de texto
    const upperControls = ['nombre'];
    upperControls.forEach(ctrl => {
      this.form.get(ctrl)?.valueChanges.subscribe(val => {
        if (typeof val === 'string' && val !== val.toUpperCase()) {
          this.form.get(ctrl)?.setValue(val.toUpperCase(), { emitEvent: false });
        }
      });
    });
  }

  setData(data: NaturalezaCuenta) {
    this.isEditMode = true;
    this.form.patchValue({
      ...data,
      manejaCentroCosto: data.manejaCentroCosto === 1
    });
  }

  onSubmit() {
    if (this.form.invalid || this.loading) return;

    this.loading = true;
    this.error = null;

    const formValue = this.form.value;
    const idSucursal = parseInt(localStorage.getItem('idSucursal') || '280', 10);
    const formData: any = {
      codigo: formValue.codigo ?? null,
      nombre: String(formValue.nombre).trim(),
      tipo: Number(formValue.tipo),
      numero: Number(formValue.numero),
      manejaCentroCosto: formValue.manejaCentroCosto ? 1 : 0,
      estado: Number(formValue.estado ?? 1),
      empresa: { codigo: idSucursal }
    };

    const request = this.isEditMode
      ? this.naturalezaCuentaService.update(formData)
      : this.naturalezaCuentaService.add(formData);

    request.subscribe({
      next: (response) => {
        this.dialogRef.close(response);
      },
      error: (err) => {
        this.error = err?.message || 'Error al guardar los datos';
        this.loading = false;
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}

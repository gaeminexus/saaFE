import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EstadoTipoAsiento, TipoAsientoSistema } from '../../../model/tipo-asiento';

export interface TipoAsientoSistemaDialogData {
  tipoAsiento?: TipoAsientoSistema;
  isEdit: boolean;
}

@Component({
  selector: 'app-tipo-asiento-sistema-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './tipo-asiento-sistema-dialog.html',
  styleUrl: './tipo-asiento-sistema-dialog.scss',
})
export class TipoAsientoSistemaDialog implements OnInit {
  form!: FormGroup;
  title: string;
  estados = [
    { value: EstadoTipoAsiento.ACTIVO, label: 'Activo' },
    { value: EstadoTipoAsiento.INACTIVO, label: 'Inactivo' },
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<TipoAsientoSistemaDialog>,
    @Inject(MAT_DIALOG_DATA) public data: TipoAsientoSistemaDialogData
  ) {
    this.title = data.isEdit
      ? 'Editar Tipo de Asiento del Sistema'
      : 'Nuevo Tipo de Asiento del Sistema';
  }

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      nombre: [
        this.data.tipoAsiento?.nombre || '',
        [Validators.required, Validators.maxLength(100)],
      ],
      codigoAlterno: [
        this.data.tipoAsiento?.codigoAlterno || '',
        [Validators.required, Validators.maxLength(20)],
      ],
      estado: [this.data.tipoAsiento?.estado ?? EstadoTipoAsiento.ACTIVO, [Validators.required]],
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const result: Partial<TipoAsientoSistema> = {
      ...this.data.tipoAsiento,
      nombre: this.form.get('nombre')?.value.trim().toUpperCase(),
      codigoAlterno: this.form.get('codigoAlterno')?.value.trim().toUpperCase(),
      estado: this.form.get('estado')?.value,
    };

    this.dialogRef.close(result);
  }
}

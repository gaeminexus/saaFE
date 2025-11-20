import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlanCuenta } from '../../model/plan-cuenta';
import { DetallePlantilla, TipoMovimiento } from '../../model/detalle-plantilla-general';

export interface DetalleDialogData {
  detalle?: DetallePlantilla;
  planCuentas: PlanCuenta[];
}

@Component({
  selector: 'app-detalle-plantilla-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatTooltipModule
  ],
  template: `
  <h2 mat-dialog-title>
    <mat-icon style="vertical-align: middle; margin-right: 8px;">{{ data.detalle ? 'edit' : 'add_circle' }}</mat-icon>
    {{ data.detalle ? 'Editar Detalle de Plantilla' : 'Nuevo Detalle de Plantilla' }}
  </h2>
  <div mat-dialog-content [formGroup]="form" class="dialog-content">
    <div class="row">
      <mat-form-field appearance="outline" class="field">
        <mat-label>Plan de Cuenta *</mat-label>
        <mat-select formControlName="planCuenta" required>
          <mat-option *ngFor="let pc of data.planCuentas" [value]="pc">
            {{ pc.cuentaContable }} - {{ pc.nombre }}
          </mat-option>
        </mat-select>
        <mat-error *ngIf="form.get('planCuenta')?.hasError('required')">Requerido</mat-error>
      </mat-form-field>
      <mat-form-field appearance="outline" class="field">
        <mat-label>Descripción *</mat-label>
        <input matInput formControlName="descripcion" maxlength="200" placeholder="Descripción del movimiento">
        <mat-hint align="end">{{ form.get('descripcion')?.value?.length || 0 }}/200</mat-hint>
        <mat-error *ngIf="form.get('descripcion')?.hasError('required')">Requerido</mat-error>
      </mat-form-field>
    </div>
    <div class="row">
      <mat-form-field appearance="outline" class="field">
        <mat-label>Movimiento *</mat-label>
        <mat-select formControlName="movimiento" required>
          <mat-option [value]="TipoMovimiento.DEBE">Debe</mat-option>
          <mat-option [value]="TipoMovimiento.HABER">Haber</mat-option>
        </mat-select>
        <mat-error *ngIf="form.get('movimiento')?.hasError('required')">Requerido</mat-error>
      </mat-form-field>
      <mat-form-field appearance="outline" class="field">
        <mat-label>Estado *</mat-label>
        <mat-select formControlName="estado" required>
          <mat-option [value]="1">Activo</mat-option>
          <mat-option [value]="2">Inactivo</mat-option>
        </mat-select>
        <mat-error *ngIf="form.get('estado')?.hasError('required')">Requerido</mat-error>
      </mat-form-field>
    </div>
    <div class="row">
      <mat-form-field appearance="outline" class="field">
        <mat-label>Fecha Desde</mat-label>
        <input matInput [matDatepicker]="fd" formControlName="fechaDesde">
        <mat-datepicker-toggle matSuffix [for]="fd"></mat-datepicker-toggle>
        <mat-datepicker #fd></mat-datepicker>
      </mat-form-field>
      <mat-form-field appearance="outline" class="field">
        <mat-label>Fecha Hasta</mat-label>
        <input matInput [matDatepicker]="fh" formControlName="fechaHasta">
        <mat-datepicker-toggle matSuffix [for]="fh"></mat-datepicker-toggle>
        <mat-datepicker #fh></mat-datepicker>
      </mat-form-field>
    </div>

  </div>
  <div mat-dialog-actions class="dialog-actions">
    <button mat-button (click)="cancel()" type="button">
      <mat-icon>cancel</mat-icon>
      Cancelar
    </button>
    <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid" type="button">
      <mat-icon>{{ data.detalle ? 'save' : 'add' }}</mat-icon>
      {{ data.detalle ? 'Actualizar' : 'Agregar' }}
    </button>
  </div>
  `,
  styles: [`
    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 20px 0;
      min-width: 500px;
    }
    .row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .field {
      flex: 1;
      min-width: 200px;
    }
    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      margin-top: 10px;
    }
    h2[mat-dialog-title] {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 600;
      font-size: 1.4rem;
      margin-bottom: 0;
    }
  `]
})
export class DetallePlantillaDialogComponent {
  form: FormGroup;
  TipoMovimiento = TipoMovimiento;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DetallePlantillaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DetalleDialogData
  ) {
    this.form = this.fb.group({
      planCuenta: [data.detalle?.planCuenta || null, Validators.required],
      descripcion: [data.detalle?.descripcion || '', Validators.required],
      movimiento: [data.detalle?.movimiento || TipoMovimiento.DEBE, Validators.required],
      fechaDesde: [data.detalle?.fechaDesde || null],
      fechaHasta: [data.detalle?.fechaHasta || null],
      estado: [data.detalle?.estado || 1, Validators.required]
    });
  }

  save(): void {
    if (this.form.invalid) return;
    const result = {
      ...this.data.detalle,
      ...this.form.value
    };
    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }
}

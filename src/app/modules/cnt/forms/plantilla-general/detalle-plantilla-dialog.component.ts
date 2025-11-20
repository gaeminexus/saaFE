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
  <div class="dialog-header" mat-dialog-title>
    <div class="title-wrap">
      <mat-icon class="title-icon">{{ data.detalle ? 'edit' : 'add_circle' }}</mat-icon>
      <div class="title-text">
        <h2>{{ data.detalle ? 'Editar Detalle' : 'Nuevo Detalle' }}</h2>
        <p class="subtitle">Completa la información contable requerida.</p>
      </div>
    </div>
    <div class="plan-preview" *ngIf="form.get('planCuenta')?.value as pc">
      <mat-icon>account_balance</mat-icon>
      <span>{{ pc.cuentaContable }} · {{ pc.nombre }}</span>
    </div>
  </div>
  <div mat-dialog-content [formGroup]="form" class="dialog-content">
    <section class="section">
      <h3 class="section-title"><mat-icon>tune</mat-icon> Datos Principales</h3>
      <div class="grid">
        <mat-form-field appearance="outline" class="col-span-2">
          <mat-label>Plan de Cuenta *</mat-label>
          <mat-select formControlName="planCuenta" required panelClass="panel-cuenta">
            <mat-option *ngFor="let pc of data.planCuentas" [value]="pc">
              <div class="option-line">
                <span class="code">{{ pc.cuentaContable }}</span>
                <span class="name">{{ pc.nombre }}</span>
              </div>
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('planCuenta')?.hasError('required')">Seleccione un plan</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="col-span-2">
          <mat-label>Descripción *</mat-label>
            <textarea matInput rows="2" formControlName="descripcion" maxlength="200" placeholder="Ej: Ajuste mensual de gastos"></textarea>
            <mat-hint align="end">{{ form.get('descripcion')?.value?.length || 0 }}/200</mat-hint>
            <mat-error *ngIf="form.get('descripcion')?.hasError('required')">Ingrese una descripción</mat-error>
        </mat-form-field>
      </div>
    </section>
    <section class="section">
      <h3 class="section-title"><mat-icon>swap_horiz</mat-icon> Clasificación</h3>
      <div class="grid">
        <mat-form-field appearance="outline" class="col">
          <mat-label>Movimiento *</mat-label>
          <mat-select formControlName="movimiento" required>
            <mat-option [value]="TipoMovimiento.DEBE">
              <mat-icon class="opt-icon debe">arrow_upward</mat-icon> Debe
            </mat-option>
            <mat-option [value]="TipoMovimiento.HABER">
              <mat-icon class="opt-icon haber">arrow_downward</mat-icon> Haber
            </mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('movimiento')?.hasError('required')">Seleccione movimiento</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="col">
          <mat-label>Estado *</mat-label>
          <mat-select formControlName="estado" required>
            <mat-option [value]="1"><mat-icon class="opt-icon ok">check_circle</mat-icon> Activo</mat-option>
            <mat-option [value]="2"><mat-icon class="opt-icon off">cancel</mat-icon> Inactivo</mat-option>
          </mat-select>
          <mat-error *ngIf="form.get('estado')?.hasError('required')">Seleccione estado</mat-error>
        </mat-form-field>
      </div>
    </section>
    <section class="section">
      <h3 class="section-title"><mat-icon>event</mat-icon> Vigencia</h3>
      <div class="grid">
        <mat-form-field appearance="outline" class="col">
          <mat-label>Fecha Desde</mat-label>
          <input matInput [matDatepicker]="fd" formControlName="fechaDesde">
          <mat-datepicker-toggle matSuffix [for]="fd"></mat-datepicker-toggle>
          <mat-datepicker #fd></mat-datepicker>
        </mat-form-field>
        <mat-form-field appearance="outline" class="col">
          <mat-label>Fecha Hasta</mat-label>
          <input matInput [matDatepicker]="fh" formControlName="fechaHasta">
          <mat-datepicker-toggle matSuffix [for]="fh"></mat-datepicker-toggle>
          <mat-datepicker #fh></mat-datepicker>
        </mat-form-field>
      </div>
      <div class="hint-inline">
        <mat-icon>info</mat-icon>
        <small>Dejar vacías si el detalle no tiene una vigencia acotada.</small>
      </div>
    </section>
  </div>
  <div mat-dialog-actions class="dialog-actions">
    <button mat-button (click)="cancel()" type="button">
      <mat-icon>close</mat-icon>
      Cancelar
    </button>
    <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid" type="button">
      <mat-icon>{{ data.detalle ? 'save' : 'add' }}</mat-icon>
      {{ data.detalle ? 'Actualizar' : 'Agregar' }}
    </button>
  </div>
  `,
  styles: [`
    .dialog-header { display:flex; justify-content:space-between; align-items:flex-start; padding-bottom:8px; }
    .title-wrap { display:flex; gap:12px; align-items:center; }
    .title-icon { font-size:32px; width:32px; height:32px; color:#5b5fc7; }
    .title-text h2 { margin:0; font-size:1.25rem; font-weight:600; }
    .subtitle { margin:2px 0 0; font-size:.75rem; color:#666; }
    .plan-preview { display:flex; gap:6px; align-items:center; background:#f5f7ff; padding:6px 10px; border-radius:8px; font-size:.75rem; color:#37474f; }
    .dialog-content { display:flex; flex-direction:column; gap:20px; padding:4px 18px 16px; min-width:560px; }
    .section { display:flex; flex-direction:column; gap:14px; padding:10px 14px 12px; background:#fafafa; border:1px solid #e3e6ec; border-radius:10px; }
    .section-title { display:flex; align-items:center; gap:6px; font-size:.80rem; font-weight:600; letter-spacing:.5px; text-transform:uppercase; color:#455a64; margin:0; }
    .section-title mat-icon { font-size:18px; width:18px; height:18px; color:#5b5fc7; opacity:.85; }
    .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
    .col { grid-column:span 2; }
    .col-span-2 { grid-column:span 4; }
    textarea { resize:vertical; }
    .option-line { display:flex; flex-direction:row; gap:8px; align-items:center; }
    .option-line .code { font-weight:600; font-family:'JetBrains Mono',monospace; color:#37474f; }
    .option-line .name { flex:1; opacity:.85; }
    .opt-icon { vertical-align:middle; margin-right:6px; font-size:16px; }
    .opt-icon.debe { color:#1976D2; }
    .opt-icon.haber { color:#F57C00; }
    .opt-icon.ok { color:#2e7d32; }
    .opt-icon.off { color:#c62828; }
    .hint-inline { display:flex; align-items:center; gap:8px; font-size:.7rem; color:#607d8b; margin-top:4px; }
    .hint-inline mat-icon { font-size:16px; width:16px; height:16px; opacity:.7; }
    .dialog-actions { display:flex; justify-content:flex-end; gap:12px; padding:14px 18px 6px; border-top:1px solid #e0e0e0; margin-top:4px; }
    mat-form-field { width:100%; }
    /* Espaciado adicional interno para que el label no quede pegado */
    :host ::ng-deep .mat-mdc-form-field .mat-mdc-text-field-wrapper { padding-top:6px; }
    :host ::ng-deep .mat-mdc-form-field .mat-mdc-form-field-infix { padding-top:2px; padding-bottom:4px; }
    .dialog-content mat-form-field { margin-top:4px; }
    .grid mat-form-field { margin-top:2px; }
    @media (min-width: 961px) { .dialog-content { max-width:720px; } }
    @media (max-width: 640px) {
      .dialog-content { min-width:0; padding:4px 12px 12px; }
      .grid { grid-template-columns:repeat(2,1fr); }
      .col { grid-column:span 2; }
      .col-span-2 { grid-column:span 2; }
      .plan-preview { display:none; }
      .section { padding:10px 10px 10px; }
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

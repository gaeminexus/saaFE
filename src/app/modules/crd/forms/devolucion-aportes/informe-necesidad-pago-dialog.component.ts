import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';

export interface InformeNecesidadPagoDialogData {
  /** Año de la devolución: precarga "Fecha desde" con el 1 de enero de ese año. */
  anio: number;
}

export interface InformeNecesidadPagoDialogResultado {
  numeroInforme: string;
  observaciones: string;
  fechaDesde: Date;
}

/**
 * Pide los tres parámetros que digita el operador para el "Informe de necesidad de pago"
 * (`RPRT_INFR_DVAP`, `docs/crd/API-INFORME-NECESIDAD-PAGO.md`). El resto de los parámetros del
 * reporte los arma la pantalla que abre este diálogo.
 */
@Component({
  selector: 'app-informe-necesidad-pago-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="titulo-icono">picture_as_pdf</mat-icon>
      Informe de necesidad de pago
    </h2>

    <mat-dialog-content>
      <div class="campos">
        <mat-form-field appearance="outline" class="ancho-total">
          <mat-label>Número de informe</mat-label>
          <input matInput [(ngModel)]="numeroInforme" maxlength="100"
                 placeholder="Ej. FCPC-CRE-GR-137-2026" required />
          <mat-hint>Va en la cabecera del PDF como "INFORME No."</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Fecha desde</mat-label>
          <input matInput [matDatepicker]="pickerDesde" [(ngModel)]="fechaDesde" />
          <mat-datepicker-toggle matSuffix [for]="pickerDesde"></mat-datepicker-toggle>
          <mat-datepicker #pickerDesde></mat-datepicker>
          <mat-hint>Desde cuándo se listan los aportes aplicados a préstamos</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline" class="ancho-total">
          <mat-label>Observaciones</mat-label>
          <textarea matInput rows="3" maxlength="2000" [(ngModel)]="observaciones"
                    placeholder="Opcional — si va vacío, la sección no aparece en el PDF"></textarea>
        </mat-form-field>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="generar()" [disabled]="!puedeGenerar()">
        <mat-icon>picture_as_pdf</mat-icon> Generar informe
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display: flex; align-items: center; gap: 0.5rem; }
    .titulo-icono { color: #667eea; }

    .campos {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 0.5rem 1rem;
      .ancho-total { grid-column: 1 / -1; }
    }

    mat-dialog-actions button { min-height: 44px; border-radius: 10px; font-weight: 600; }
  `],
})
export class InformeNecesidadPagoDialogComponent {
  numeroInforme = '';
  observaciones = '';
  fechaDesde: Date;

  constructor(
    private dialogRef: MatDialogRef<InformeNecesidadPagoDialogComponent, InformeNecesidadPagoDialogResultado>,
    @Inject(MAT_DIALOG_DATA) public data: InformeNecesidadPagoDialogData
  ) {
    this.fechaDesde = new Date(data.anio, 0, 1);
  }

  puedeGenerar(): boolean {
    return (
      this.numeroInforme.trim().length > 0 &&
      !!this.fechaDesde &&
      !isNaN(this.fechaDesde.getTime())
    );
  }

  generar(): void {
    if (!this.puedeGenerar()) return;
    this.dialogRef.close({
      numeroInforme: this.numeroInforme.trim(),
      observaciones: this.observaciones.trim(),
      fechaDesde: this.fechaDesde,
    });
  }

  cancelar(): void {
    this.dialogRef.close(undefined);
  }
}

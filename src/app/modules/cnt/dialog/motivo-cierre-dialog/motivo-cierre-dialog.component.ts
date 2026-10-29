import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface MotivoCierreDialogData {
  titulo: string;
  /** Texto principal (qué va a pasar). */
  mensaje: string;
  /** Advertencias destacadas (consecuencias). */
  advertencias?: string[];
  /** Pares etiqueta / valor (período, corrida, asiento...). */
  detalles?: { etiqueta: string; valor: string }[];
  textoConfirmar: string;
  /** 'warn' para acciones que reversan; 'primary' para cerrar. */
  color?: 'warn' | 'primary';
  icono?: string;
  placeholderMotivo?: string;
  /** Pide además una fecha (p. ej. fecha del reverso). */
  pedirFecha?: boolean;
  etiquetaFecha?: string;
  ayudaFecha?: string;
  fechaSugerida?: Date | null;
}

export interface MotivoCierreDialogResult {
  motivo: string;
  fecha?: Date | null;
}

/**
 * C17 — Confirmación con motivo obligatorio (y fecha opcional) para cerrar / reabrir períodos, reabrir la
 * cartera y anular asientos de períodos cerrados. El motivo queda en la bitácora CNT.HCPR o en el asiento.
 */
@Component({
  selector: 'app-motivo-cierre-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
  ],
  template: `
    <div class="motivo-dialog">
      <div class="dialog-header">
        <div class="dialog-icon" [class.warn]="data.color !== 'primary'">
          <mat-icon>{{ data.icono || (data.color === 'primary' ? 'lock' : 'error_outline') }}</mat-icon>
        </div>
        <h2 mat-dialog-title>{{ data.titulo }}</h2>
      </div>

      <mat-dialog-content>
        <p class="dialog-message">{{ data.mensaje }}</p>

        @if (data.detalles?.length) {
          <div class="detalles">
            @for (d of data.detalles; track $index) {
              <div class="detalle"><strong>{{ d.etiqueta }}:</strong> {{ d.valor }}</div>
            }
          </div>
        }

        @if (data.advertencias?.length) {
          <ul class="advertencias">
            @for (a of data.advertencias; track $index) {
              <li><mat-icon>warning</mat-icon><span>{{ a }}</span></li>
            }
          </ul>
        }

        @if (data.pedirFecha) {
          <mat-form-field appearance="outline" class="campo">
            <mat-label>{{ data.etiquetaFecha || 'Fecha' }}</mat-label>
            <input matInput [matDatepicker]="picker" [(ngModel)]="fecha" placeholder="dd/mm/aaaa" />
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            @if (data.ayudaFecha) {
              <mat-hint>{{ data.ayudaFecha }}</mat-hint>
            }
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="campo">
          <mat-label>Motivo *</mat-label>
          <textarea
            matInput
            [(ngModel)]="motivo"
            rows="3"
            maxlength="1000"
            [placeholder]="data.placeholderMotivo || 'Explique por qué'"
            cdkFocusInitial
          ></textarea>
          <mat-hint align="end">{{ motivo.length }}/1000</mat-hint>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="cancelar()">Cancelar</button>
        <button
          mat-raised-button
          [color]="data.color === 'primary' ? 'primary' : 'warn'"
          [disabled]="!motivo.trim()"
          (click)="confirmar()"
        >
          {{ data.textoConfirmar }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .motivo-dialog { min-width: 440px; max-width: 640px; padding: 1rem; }
      .dialog-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; }
      .dialog-icon {
        display: flex; align-items: center; justify-content: center;
        width: 48px; height: 48px; border-radius: 50%;
        background: #e3f2fd; color: #1976d2;
        mat-icon { font-size: 30px; width: 30px; height: 30px; }
      }
      .dialog-icon.warn { background: #ffebee; color: #d32f2f; }
      h2 { margin: 0; font-size: 1.35rem; font-weight: 600; color: #1e293b; }
      .dialog-message { color: #475569; line-height: 1.6; margin: 0 0 0.75rem; }
      .detalles {
        background: #f8fafc; border-left: 3px solid #cbd5e1; border-radius: 4px;
        padding: 0.6rem 0.9rem; margin-bottom: 0.75rem; font-size: 0.9rem; color: #334155;
      }
      .detalle { margin: 0.15rem 0; }
      .advertencias {
        list-style: none; margin: 0 0 1rem; padding: 0.6rem 0.9rem;
        background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 4px;
        li { display: flex; gap: 0.5rem; align-items: flex-start; margin: 0.25rem 0; color: #78350f; font-size: 0.9rem; }
        mat-icon { font-size: 18px; width: 18px; height: 18px; color: #d97706; flex-shrink: 0; }
      }
      .campo { width: 100%; }
      mat-dialog-actions { padding-top: 0.75rem; gap: 0.75rem; }
    `,
  ],
})
export class MotivoCierreDialogComponent {
  motivo = '';
  fecha: Date | null;

  constructor(
    private dialogRef: MatDialogRef<MotivoCierreDialogComponent, MotivoCierreDialogResult>,
    @Inject(MAT_DIALOG_DATA) public data: MotivoCierreDialogData,
  ) {
    this.fecha = data.fechaSugerida ?? null;
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  confirmar(): void {
    const motivo = this.motivo.trim();
    if (!motivo) return;
    this.dialogRef.close({ motivo, fecha: this.data.pedirFecha ? this.fecha : undefined });
  }
}

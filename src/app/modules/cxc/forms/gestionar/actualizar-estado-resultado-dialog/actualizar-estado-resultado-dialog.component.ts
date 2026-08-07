import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

export interface ActualizarEstadoResultado {
  exito: boolean;
  estadoSRI?: string;
  numeroAutorizacion?: string;
  facturaActualizada?: boolean;
  asientoGenerado?: boolean;
  asiento?: string;
  emailEnviado?: boolean;
  emailDestinatario?: string;
  mensaje?: string;
  // Genérico para otros campos inesperados
  [key: string]: any;
}

@Component({
  selector: 'app-actualizar-estado-resultado-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule, MatChipsModule],
  template: `
    <h2 mat-dialog-title class="dialog-title">
      <mat-icon [class]="data.exito ? 'icon-ok' : 'icon-err'">
        {{ data.exito ? 'check_circle' : 'error' }}
      </mat-icon>
      Resultado de consulta SRI
    </h2>

    <mat-dialog-content class="dialog-content">

      <!-- Estado SRI -->
      @if (data.estadoSRI) {
        <div class="fila">
          <span class="etiqueta">Estado SRI</span>
          <span class="chip" [class]="estadoClass(data.estadoSRI)">{{ data.estadoSRI }}</span>
        </div>
      }

      <!-- Número de autorización -->
      @if (data.numeroAutorizacion) {
        <div class="fila">
          <span class="etiqueta">Nro. autorización</span>
          <span class="valor mono">{{ data.numeroAutorizacion }}</span>
        </div>
      }

      <mat-divider class="divisor"></mat-divider>

      <!-- Flags de resultado -->
      <div class="flags-grid">
        <div class="flag-item">
          <mat-icon [class]="data.facturaActualizada ? 'flag-ok' : 'flag-no'">
            {{ data.facturaActualizada ? 'check_circle' : 'cancel' }}
          </mat-icon>
          <span>Documento actualizado</span>
        </div>
        <div class="flag-item">
          <mat-icon [class]="data.asientoGenerado ? 'flag-ok' : 'flag-no'">
            {{ data.asientoGenerado ? 'check_circle' : 'cancel' }}
          </mat-icon>
          <span>Asiento contable</span>
          @if (data.asiento) {
            <strong class="asiento-num">{{ data.asiento }}</strong>
          }
        </div>
        <div class="flag-item">
          <mat-icon [class]="data.emailEnviado ? 'flag-ok' : 'flag-no'">
            {{ data.emailEnviado ? 'check_circle' : 'cancel' }}
          </mat-icon>
          <span>Email enviado</span>
          @if (data.emailDestinatario) {
            <span class="email-dest">{{ data.emailDestinatario }}</span>
          }
        </div>
      </div>

      <!-- Mensaje completo -->
      @if (data.mensaje) {
        <mat-divider class="divisor"></mat-divider>
        <p class="mensaje">{{ data.mensaje }}</p>
      }

    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" (click)="cerrar()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.1rem;
    }
    .icon-ok { color: #43a047; }
    .icon-err { color: #e53935; }

    .dialog-content { min-width: 420px; padding-top: 8px; }

    .fila {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
    }
    .etiqueta {
      font-size: .8rem;
      color: #757575;
      min-width: 130px;
    }
    .chip {
      font-size: .8rem;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .chip-autorizado  { background: #e8f5e9; color: #2e7d32; }
    .chip-rechazado   { background: #ffebee; color: #c62828; }
    .chip-en-proceso  { background: #fff8e1; color: #f57f17; }
    .chip-default     { background: #f5f5f5; color: #424242; }

    .valor { font-size: .9rem; }
    .mono  { font-family: monospace; word-break: break-all; font-size: .82rem; color: #37474f; }

    .divisor { margin: 12px 0; }

    .flags-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .flag-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: .9rem;
    }
    .flag-ok { color: #43a047; font-size: 18px; }
    .flag-no { color: #bdbdbd; font-size: 18px; }
    .asiento-num { font-family: monospace; margin-left: 4px; color: #1565c0; }
    .email-dest  { font-size: .8rem; color: #757575; margin-left: 4px; }

    .mensaje {
      font-size: .88rem;
      color: #546e7a;
      line-height: 1.5;
      margin: 0;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
    }
  `],
})
export class ActualizarEstadoResultadoDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: ActualizarEstadoResultado,
    private dialogRef: MatDialogRef<ActualizarEstadoResultadoDialogComponent>,
  ) {}

  estadoClass(estado: string): string {
    const s = (estado || '').toUpperCase();
    if (s.includes('AUTORIZ')) return 'chip chip-autorizado';
    if (s.includes('RECHAZ') || s.includes('CANCEL') || s.includes('ANULA')) return 'chip chip-rechazado';
    if (s.includes('PROCESO') || s.includes('PENDIENTE')) return 'chip chip-en-proceso';
    return 'chip chip-default';
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}

import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface PagoDialogData {
  tipoAporte: string;
  valorPagado: number;
  prestamoCodigo: number;
  prestamoProducto: string;
  saldoPrestamo: number;
}

export interface PagoDialogResult {
  tipoPago: 'parcial' | 'completo';
  montoPago: number;
}

@Component({
  selector: 'app-pago-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    CurrencyPipe,
  ],
  template: `
    <div class="pago-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon>payment</mat-icon>
        <span>Realizar Pago</span>
      </h2>

      <mat-dialog-content class="dialog-content">
        <!-- Información del Aporte -->
        <div class="info-section aporte-section">
          <div class="section-header">
            <mat-icon>compare_arrows</mat-icon>
            <h3>Aporte Origen</h3>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Tipo de Aporte:</span>
              <span class="value">{{ data.tipoAporte }}</span>
            </div>
            <div class="info-item">
              <span class="label">Valor Pagado:</span>
              <span class="value saldo-disponible">{{ data.valorPagado | currency }}</span>
            </div>
          </div>
        </div>

        <!-- Información del Préstamo -->
        <div class="info-section prestamo-section">
          <div class="section-header">
            <mat-icon>credit_card</mat-icon>
            <h3>Préstamo Destino</h3>
          </div>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Código Préstamo:</span>
              <span class="value">{{ data.prestamoCodigo }}</span>
            </div>
            <div class="info-item">
              <span class="label">Producto:</span>
              <span class="value">{{ data.prestamoProducto }}</span>
            </div>
            <div class="info-item">
              <span class="label">Saldo Préstamo:</span>
              <span class="value saldo-prestamo">{{ data.saldoPrestamo | currency }}</span>
            </div>
          </div>
        </div>

        <!-- Campo de Monto a Pagar -->
        <div class="monto-section">
          <div class="monto-input-group">
            <mat-form-field appearance="outline" class="monto-field">
              <mat-label>Monto a Pagar</mat-label>
              <input
                matInput
                type="number"
                [(ngModel)]="montoPago"
                [min]="0"
                [max]="montoMaximo"
                placeholder="Ingrese el monto"
              />
              <span matPrefix>$&nbsp;</span>
              <mat-icon matSuffix>attach_money</mat-icon>
              <mat-hint>Máximo: {{ montoMaximo | currency }}</mat-hint>
            </mat-form-field>
            <button
              mat-raised-button
              color="primary"
              (click)="setPagoTotal()"
              class="btn-pago-total"
            >
              <mat-icon>done_all</mat-icon>
              <span>Pago Total</span>
            </button>
          </div>

          <div class="monto-info">
            <div class="info-chip" [class.warning]="montoPago > data.valorPagado">
              <mat-icon>info</mat-icon>
              <span>
                @if (montoPago > data.valorPagado) { El monto excede el valor pagado disponible }
                @else if (montoPago > data.saldoPrestamo) { El monto excede el saldo del préstamo }
                @else { Monto válido para realizar el pago }
              </span>
            </div>
          </div>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()" class="btn-cancel">
          <mat-icon>close</mat-icon>
          <span>Cancelar</span>
        </button>

        <div class="pago-buttons">
          <button
            mat-raised-button
            color="accent"
            (click)="onPagoParcial()"
            [disabled]="!isPagoValido()"
            class="btn-parcial"
          >
            <mat-icon>payments</mat-icon>
            <span>Pago Parcial</span>
          </button>

          <button
            mat-raised-button
            color="primary"
            (click)="onPagoCompleto()"
            [disabled]="!isPagoValido()"
            class="btn-completo"
          >
            <mat-icon>done_all</mat-icon>
            <span>Pago Completo</span>
          </button>
        </div>
      </mat-dialog-actions>
    </div>
  `,
  styles: [
    `
      .pago-dialog {
        min-width: 500px;
        max-width: 600px;

        .dialog-title {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #1a202c;
          font-size: 22px;
          font-weight: 600;
          padding: 20px 24px;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;

          mat-icon {
            font-size: 28px;
            width: 28px;
            height: 28px;
          }
        }

        .dialog-content {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;

          .info-section {
            padding: 16px;
            border-radius: 12px;
            border: 2px solid #e2e8f0;

            &.aporte-section {
              background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
              border-color: #2196f3;
            }

            &.prestamo-section {
              background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
              border-color: #9c27b0;
            }

            .section-header {
              display: flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 12px;

              mat-icon {
                color: #667eea;
                font-size: 20px;
                width: 20px;
                height: 20px;
              }

              h3 {
                margin: 0;
                font-size: 16px;
                font-weight: 600;
                color: #1a202c;
              }
            }

            .info-grid {
              display: grid;
              gap: 12px;

              .info-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px;
                background: rgba(255, 255, 255, 0.7);
                border-radius: 8px;

                .label {
                  font-size: 13px;
                  color: #4a5568;
                  font-weight: 500;
                }

                .value {
                  font-size: 14px;
                  color: #1a202c;
                  font-weight: 600;
                  font-family: 'Roboto Mono', monospace;

                  &.saldo-disponible {
                    color: #2196f3;
                  }

                  &.saldo-prestamo {
                    color: #9c27b0;
                  }
                }
              }
            }
          }

          .monto-section {
            .monto-input-group {
              display: flex;
              gap: 12px;
              align-items: flex-start;

              .btn-pago-total {
                margin-top: 8px;
                display: flex;
                align-items: center;
                gap: 8px;
                white-space: nowrap;
                min-width: auto;
                padding: 0 16px;

                mat-icon {
                  font-size: 20px;
                  width: 20px;
                  height: 20px;
                }
              }
            }

            .monto-field {
              flex: 1;
              font-size: 16px;

              input {
                font-size: 18px;
                font-weight: 600;
                font-family: 'Roboto Mono', monospace;
              }
            }

            .monto-info {
              margin-top: 12px;

              .info-chip {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 12px;
                background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
                color: white;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 500;

                &.warning {
                  background: linear-gradient(135deg, #ff9800 0%, #ffa726 100%);
                }

                mat-icon {
                  font-size: 18px;
                  width: 18px;
                  height: 18px;
                }
              }
            }
          }
        }

        .dialog-actions {
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          background: #f7fafc;

          .btn-cancel {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .pago-buttons {
            display: flex;
            gap: 12px;

            button {
              display: flex;
              align-items: center;
              gap: 8px;
              padding: 0 20px;
              font-weight: 600;

              mat-icon {
                font-size: 20px;
                width: 20px;
                height: 20px;
              }
            }
          }
        }
      }

      @media (max-width: 600px) {
        .pago-dialog {
          min-width: auto;
          width: 100%;

          .dialog-actions {
            flex-direction: column;

            .pago-buttons {
              width: 100%;
              flex-direction: column;

              button {
                width: 100%;
              }
            }
          }
        }
      }
    `,
  ],
})
export class PagoDialogComponent {
  montoPago: number = 0;
  montoMaximo: number;

  constructor(
    public dialogRef: MatDialogRef<PagoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PagoDialogData
  ) {
    // El monto máximo es el menor entre el valor pagado y el saldo del préstamo
    this.montoMaximo = Math.min(data.valorPagado, data.saldoPrestamo);
    // Inicializar en 0, el usuario debe ingresar el monto o hacer clic en "Pago Total"
    this.montoPago = 0;
  }

  isPagoValido(): boolean {
    return (
      this.montoPago > 0 &&
      this.montoPago <= this.data.valorPagado &&
      this.montoPago <= this.data.saldoPrestamo
    );
  }

  /**
   * Establece el monto a pagar como el total del saldo del préstamo
   */
  setPagoTotal(): void {
    this.montoPago = this.data.saldoPrestamo;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onPagoParcial(): void {
    if (this.isPagoValido()) {
      const result: PagoDialogResult = {
        tipoPago: 'parcial',
        montoPago: this.montoPago,
      };
      this.dialogRef.close(result);
    }
  }

  onPagoCompleto(): void {
    if (this.isPagoValido()) {
      const result: PagoDialogResult = {
        tipoPago: 'completo',
        montoPago: this.montoPago,
      };
      this.dialogRef.close(result);
    }
  }
}

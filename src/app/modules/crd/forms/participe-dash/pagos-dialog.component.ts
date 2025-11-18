import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { DetallePrestamo } from '../../model/detalle-prestamo';
import { PagoPrestamo } from '../../model/pago-prestamo';

export interface DialogData {
  detalle: DetallePrestamo;
  pagos: PagoPrestamo[];
}

@Component({
  selector: 'app-pagos-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule
  ],
  template: `
    <div class="dialog-container">
      <div class="dialog-header">
        <h2 mat-dialog-title>
          <mat-icon>payments</mat-icon>
          Pagos de Cuota #{{ data.detalle.numeroCuota }}
        </h2>
        <button mat-icon-button mat-dialog-close class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content>
        <div class="detalle-info">
          <div class="info-item">
            <span class="label">Vencimiento:</span>
            <span class="value">{{ data.detalle.fechaVencimiento | date: 'dd/MM/yyyy' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Capital:</span>
            <span class="value">{{ data.detalle.capital | currency: 'USD':'symbol':'1.2-2' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Interés:</span>
            <span class="value">{{ data.detalle.interes | currency: 'USD':'symbol':'1.2-2' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Cuota:</span>
            <span class="value">{{ data.detalle.cuota | currency: 'USD':'symbol':'1.2-2' }}</span>
          </div>
          <div class="info-item">
            <span class="label">Saldo:</span>
            <span class="value">{{ data.detalle.saldo | currency: 'USD':'symbol':'1.2-2' }}</span>
          </div>
        </div>

        @if (data.pagos && data.pagos.length > 0) {
          <div class="pagos-section">
            <h3>
              <mat-icon>history</mat-icon>
              Historial de Pagos ({{ data.pagos.length }})
            </h3>
            <table mat-table [dataSource]="data.pagos" class="pagos-table">
              <!-- Fecha Column -->
              <ng-container matColumnDef="fecha">
                <th mat-header-cell *matHeaderCellDef>Fecha</th>
                <td mat-cell *matCellDef="let pago">
                  {{ pago.fecha | date: 'dd/MM/yyyy' }}
                </td>
              </ng-container>

              <!-- Capital Pagado Column -->
              <ng-container matColumnDef="capitalPagado">
                <th mat-header-cell *matHeaderCellDef>Capital Pagado</th>
                <td mat-cell *matCellDef="let pago">
                  {{ pago.capitalPagado | currency: 'USD':'symbol':'1.2-2' }}
                </td>
              </ng-container>

              <!-- Interés Pagado Column -->
              <ng-container matColumnDef="interesPagado">
                <th mat-header-cell *matHeaderCellDef>Interés Pagado</th>
                <td mat-cell *matCellDef="let pago">
                  {{ pago.interesPagado | currency: 'USD':'symbol':'1.2-2' }}
                </td>
              </ng-container>

              <!-- Mora Pagada Column -->
              <ng-container matColumnDef="moraPagada">
                <th mat-header-cell *matHeaderCellDef>Mora Pagada</th>
                <td mat-cell *matCellDef="let pago">
                  {{ pago.moraPagada | currency: 'USD':'symbol':'1.2-2' }}
                </td>
              </ng-container>

              <!-- Valor Total Column -->
              <ng-container matColumnDef="valor">
                <th mat-header-cell *matHeaderCellDef>Valor Total</th>
                <td mat-cell *matCellDef="let pago" class="total-column">
                  {{ pago.valor | currency: 'USD':'symbol':'1.2-2' }}
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>
        } @else {
          <div class="no-pagos">
            <mat-icon>info</mat-icon>
            <p>No se encontraron pagos registrados para esta cuota.</p>
          </div>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-raised-button mat-dialog-close color="primary">
          <mat-icon>check</mat-icon>
          Cerrar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      max-width: 100%;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #e0e0e0;

      h2 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0;
        color: #667eea;
        font-size: 1.5rem;
        font-weight: 600;

        mat-icon {
          font-size: 1.75rem;
          width: 1.75rem;
          height: 1.75rem;
        }
      }

      .close-button {
        color: #666;

        &:hover {
          color: #667eea;
          background-color: rgba(102, 126, 234, 0.1);
        }
      }
    }

    mat-dialog-content {
      padding: 1.5rem 0;
      max-height: 60vh;
      overflow-y: auto;
    }

    .detalle-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      padding: 1rem;
      background: linear-gradient(135deg, #f8f9ff 0%, #fff 100%);
      border-radius: 8px;
      border: 1px solid #e0e0e0;
      margin-bottom: 1.5rem;

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        .label {
          font-size: 0.875rem;
          color: #666;
          font-weight: 500;
        }

        .value {
          font-size: 1rem;
          color: #333;
          font-weight: 600;
        }
      }
    }

    .pagos-section {
      h3 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin: 0 0 1rem 0;
        color: #764ba2;
        font-size: 1.125rem;
        font-weight: 600;

        mat-icon {
          font-size: 1.25rem;
          width: 1.25rem;
          height: 1.25rem;
        }
      }
    }

    .pagos-table {
      width: 100%;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      overflow: hidden;

      th {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        font-weight: 600;
        padding: 1rem;
        font-size: 0.875rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      td {
        padding: 0.875rem 1rem;
        border-bottom: 1px solid #f0f0f0;
        color: #333;

        &.total-column {
          font-weight: 600;
          color: #667eea;
        }
      }

      tr:hover {
        background-color: rgba(102, 126, 234, 0.05);
      }

      tr:last-child td {
        border-bottom: none;
      }
    }

    .no-pagos {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      text-align: center;
      background-color: #fff8e1;
      border-radius: 8px;
      border: 1px solid #ffe082;

      mat-icon {
        font-size: 3rem;
        width: 3rem;
        height: 3rem;
        color: #f6ad55;
        margin-bottom: 1rem;
      }

      p {
        margin: 0;
        color: #666;
        font-size: 1rem;
      }
    }

    mat-dialog-actions {
      padding: 1rem 0 0 0;
      margin: 0;
      border-top: 1px solid #e0e0e0;

      button {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 500;

        mat-icon {
          font-size: 1.125rem;
          width: 1.125rem;
          height: 1.125rem;
        }
      }
    }

    /* Scrollbar personalizado */
    mat-dialog-content::-webkit-scrollbar {
      width: 8px;
    }

    mat-dialog-content::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 4px;
    }

    mat-dialog-content::-webkit-scrollbar-thumb {
      background: #667eea;
      border-radius: 4px;
    }

    mat-dialog-content::-webkit-scrollbar-thumb:hover {
      background: #764ba2;
    }
  `]
})
export class PagosDialogComponent {
  displayedColumns: string[] = ['fecha', 'capitalPagado', 'interesPagado', 'moraPagada', 'valor'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {
    console.log('PagosDialogComponent - Datos recibidos:', data);
  }
}

import { CommonModule } from '@angular/common';
import { Component, Inject, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { CuentaBancariaParticipe } from '../../model/cuenta-bancaria-participe';
import { EstadoPagoOrden } from '../../model/devolucion/catalogos-devolucion';
import { ReemisionPagoDevolucionRequest } from '../../model/devolucion/devolucion-aporte';
import { mensajeDeRespuestaDevolucion } from '../../model/devolucion/respuesta-devolucion';
import { DevolucionAporteService } from '../../service/devolucion-aporte.service';

/** Una cuenta del partícipe ya con su etiqueta formateada por la pantalla que abre el diálogo. */
export interface OpcionCuentaReemision {
  cuenta: CuentaBancariaParticipe;
  etiqueta: string;
}

export interface ReemitirPagoDialogData {
  idDevolucion: number;
  idPagoActual: number;
  /** `PGTRESTD` de la orden actual — decide si hace falta la casilla de confirmación (EN_ARCHIVO=2). */
  estadoPago: number | null;
  estadoPagoTexto: string | null;
  idEmpresa: number;
  idUsuario: number;
  opciones: OpcionCuentaReemision[];
}

export interface ReemitirPagoDialogResultado {
  mensaje: string;
}

/**
 * Diálogo de «REEMITIR PAGO» (`docs/crd/API-REEMITIR-PAGO-DEVOLUCION.md` §7).
 *
 * Llama al backend DESDE ACÁ, no desde la pantalla que lo abre — mismo patrón que
 * `AbonoCapitalDialogComponent`: si la respuesta viene con `exito: false` (por ejemplo 409
 * `PAGO_CONFIRMADO`, con el número de la orden que Tesorería tiene que reversar) el diálogo NO
 * se cierra. El mensaje se muestra adentro, con el texto seleccionable, porque el operador lo
 * necesita a la vista para copiarlo — no en un snackbar que desaparece a los segundos.
 */
@Component({
  selector: 'app-reemitir-pago-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon class="titulo-icono">sync</mat-icon>
      Reemitir pago de la devolución #{{ data.idDevolucion }}
    </h2>

    <mat-dialog-content>
      <p class="advertencia">
        <mat-icon>warning</mat-icon>
        Se anula la orden {{ data.idPagoActual }}{{ data.estadoPagoTexto ? ' (' + data.estadoPagoTexto + ')' : '' }}
        cuando corresponda y se genera una orden nueva, por aprobar en Tesorería, con la cuenta
        que elija acá. El aporte negativo y el asiento de reclasificación no se tocan.
      </p>

      @if (errorMensaje()) {
        <p class="error-envio">
          <mat-icon>error_outline</mat-icon>
          <span class="error-texto">{{ errorMensaje() }}</span>
        </p>
      }

      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Cuenta del partícipe (destino)</mat-label>
        <mat-select [(ngModel)]="cuentaSeleccionada">
          @for (op of data.opciones; track op.cuenta.codigo) {
            <mat-option [value]="op.cuenta">{{ op.etiqueta }}</mat-option>
          }
        </mat-select>
        @if (!data.opciones.length) {
          <mat-hint>El partícipe no tiene cuentas activas.</mat-hint>
        } @else {
          <mat-hint>Elija la cuenta correcta: la orden anterior rebotó con la cuenta registrada.</mat-hint>
        }
      </mat-form-field>

      <mat-form-field appearance="outline" style="width: 100%;">
        <mat-label>Motivo</mat-label>
        <textarea matInput [(ngModel)]="motivo" rows="3" maxlength="300"
                  placeholder="Por ejemplo: cuenta mal digitada, rebotó la transferencia" required></textarea>
        <mat-hint align="end">{{ motivo.length }}/300</mat-hint>
      </mat-form-field>

      @if (exigeConfirmacionRechazoBanco) {
        <mat-checkbox [(ngModel)]="confirmaRechazoBanco" color="warn">
          Confirmo que el banco rechazó esta transferencia
        </mat-checkbox>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cancelar()" [disabled]="enviando()">Cancelar</button>
      <button mat-raised-button color="primary" [disabled]="!puedeConfirmar || enviando()" (click)="confirmar()">
        @if (enviando()) {
          <mat-spinner diameter="20"></mat-spinner>
        } @else {
          <ng-container><mat-icon>sync</mat-icon> Reemitir pago</ng-container>
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2[mat-dialog-title] { display: flex; align-items: center; gap: 0.5rem; }
    .titulo-icono { color: #667eea; }

    .advertencia {
      display: flex; align-items: flex-start; gap: 0.5rem;
      background: #fff6e0; color: #92600d; border-radius: 8px;
      padding: 0.65rem 0.85rem; font-size: 0.83rem; line-height: 1.45; margin: 0 0 1rem;
      mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; }
    }

    .error-envio {
      display: flex; align-items: flex-start; gap: 0.5rem;
      background: #fef2f2; border: 1px solid #fecaca; color: #7f1d1d; border-radius: 8px;
      padding: 0.65rem 0.85rem; font-size: 0.83rem; line-height: 1.45; margin: 0 0 1rem;
      mat-icon { font-size: 20px; width: 20px; height: 20px; flex-shrink: 0; color: #dc2626; }
      .error-texto { user-select: text; }
    }

    mat-checkbox { display: block; margin-top: 4px; }
    mat-dialog-actions button { min-height: 44px; border-radius: 10px; font-weight: 600; }
  `],
})
export class ReemitirPagoDialogComponent {
  private devolucionService = inject(DevolucionAporteService);

  /**
   * Sin preseleccionar A PROPÓSITO (contrato §7.4, corregido 2026-09-15): en un rebote la cuenta
   * actual es justamente la errada. Preseleccionarla dejaría reemitir al mismo destino que
   * rebotó con un solo clic. El operador elige siempre.
   */
  cuentaSeleccionada: CuentaBancariaParticipe | null = null;
  motivo = '';
  confirmaRechazoBanco = false;
  enviando = signal(false);
  errorMensaje = signal<string | null>(null);

  readonly exigeConfirmacionRechazoBanco: boolean;

  constructor(
    private dialogRef: MatDialogRef<ReemitirPagoDialogComponent, ReemitirPagoDialogResultado | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: ReemitirPagoDialogData
  ) {
    this.exigeConfirmacionRechazoBanco = data.estadoPago === EstadoPagoOrden.EN_ARCHIVO;
  }

  get puedeConfirmar(): boolean {
    if (!this.cuentaSeleccionada) return false;
    if (!this.motivo.trim()) return false;
    if (this.exigeConfirmacionRechazoBanco && !this.confirmaRechazoBanco) return false;
    return true;
  }

  confirmar(): void {
    if (!this.puedeConfirmar || !this.cuentaSeleccionada || this.enviando()) return;
    this.errorMensaje.set(null);
    this.enviando.set(true);

    const solicitud: ReemisionPagoDevolucionRequest = {
      idCuentaBancariaParticipe: this.cuentaSeleccionada.codigo,
      motivo: this.motivo.trim(),
      confirmaRechazoBanco: this.exigeConfirmacionRechazoBanco ? true : undefined,
      idEmpresa: this.data.idEmpresa,
      idUsuario: this.data.idUsuario,
      usuario: usuarioSesion(),
    };

    this.devolucionService.reemitirPago(this.data.idDevolucion, solicitud).subscribe((resp) => {
      this.enviando.set(false);
      if (!resp.exito) {
        this.errorMensaje.set(mensajeDeRespuestaDevolucion(resp));
        return;
      }
      this.dialogRef.close({ mensaje: resp.mensaje ?? 'Pago reemitido.' });
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }
}

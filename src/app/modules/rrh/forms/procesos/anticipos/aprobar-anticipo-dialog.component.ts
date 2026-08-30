import { CommonModule } from '@angular/common';
import { Component, Inject, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { opcionesAviso } from '../../comunes/avisos';
import { AnticipoTrabajador, AprobarAnticipoRequest, ResultadoAprobarAnticipo } from '../../../model/anticipo-trabajador';
import { AnticipoTrabajadorService } from '../../../service/anticipo-trabajador.service';

export interface AprobarAnticipoDialogData {
  anticipo: AnticipoTrabajador;
}

/**
 * Aprobar un anticipo: desde 2026-08-30 esto solo autoriza el anticipo.
 * El pago lo arma tesorería al aprobarlo en su bandeja
 * (/menutesoreria/procesos/aprobacion-pagos) — este diálogo ya no captura
 * cuenta origen ni forma de pago.
 */
@Component({
  selector: 'app-aprobar-anticipo-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './aprobar-anticipo-dialog.component.html',
  styleUrls: ['./aprobar-anticipo-dialog.component.scss'],
})
export class AprobarAnticipoDialogComponent {
  private dialogRef = inject(MatDialogRef<AprobarAnticipoDialogComponent, ResultadoAprobarAnticipo | null>);
  private anticipoService = inject(AnticipoTrabajadorService);
  private appState = inject(AppStateService);
  private snackBar = inject(MatSnackBar);

  guardando = signal<boolean>(false);
  errorMsg = signal<string>('');

  empleadoNombre(): string {
    const empleado = this.data.anticipo.empleado;
    if (!empleado) return '';
    return `${empleado.apellidos ?? ''} ${empleado.nombres ?? ''}`.replace(/\s+/g, ' ').trim();
  }

  get puedeAprobar(): boolean {
    return !this.guardando();
  }

  constructor(@Inject(MAT_DIALOG_DATA) public data: AprobarAnticipoDialogData) {}

  aprobar(): void {
    if (!this.puedeAprobar) return;

    const payload: AprobarAnticipoRequest = {
      idUsuario: this.appState.getIdUsuario(),
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    this.anticipoService.aprobar(this.data.anticipo.codigo, payload).subscribe({
      next: (resultado) => {
        this.guardando.set(false);
        const mensaje = 'Anticipo aprobado. Queda pendiente de pago en tesorería.';
        this.snackBar.open(mensaje, 'Cerrar', opcionesAviso(false, mensaje));
        this.dialogRef.close(resultado);
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorMsg.set(mensajeDeError(err, 'No se pudo aprobar el anticipo'));
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}

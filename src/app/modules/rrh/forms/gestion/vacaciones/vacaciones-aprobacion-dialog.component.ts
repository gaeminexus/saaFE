import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { SolicitudVacaciones } from '../../../model/solicitud-vacaciones';

export interface VacacionesAprobacionData {
  action: 'approve' | 'reject' | 'cancel';
  item: SolicitudVacaciones;
}

@Component({
  selector: 'app-vacaciones-aprobacion-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './vacaciones-aprobacion-dialog.component.html',
  styleUrls: ['./vacaciones-aprobacion-dialog.component.scss'],
})
export class VacacionesAprobacionDialogComponent {
  observacion = signal<string>('');
  errorMsg = signal<string>('');

  constructor(
    private dialogRef: MatDialogRef<VacacionesAprobacionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VacacionesAprobacionData,
  ) {}

  onCancelar(): void {
    this.dialogRef.close(null);
  }

  onConfirmar(): void {
    const obs = this.observacion().trim();
    if ((this.data.action === 'reject' || this.data.action === 'cancel') && !obs) {
      this.errorMsg.set('Observacion es obligatoria');
      return;
    }

    this.dialogRef.close({ action: this.data.action, observacion: obs || null });
  }

  titulo(): string {
    if (this.data.action === 'approve') return 'Aprobar solicitud';
    if (this.data.action === 'reject') return 'Rechazar solicitud';
    return 'Cancelar solicitud';
  }

  descripcion(): string {
    if (this.data.action === 'approve') {
      return 'Se marcara la solicitud como aprobada.';
    }
    if (this.data.action === 'reject') {
      return 'La solicitud sera rechazada con observacion.';
    }
    return 'La solicitud sera cancelada.';
  }
}

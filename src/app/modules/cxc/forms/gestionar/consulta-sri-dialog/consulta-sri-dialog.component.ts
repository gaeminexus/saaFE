import { CommonModule } from '@angular/common';
import { Component, Inject, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { PortapapelesService } from '../../../../../shared/services/portapapeles.service';
import {
  ConsultaSriService,
  EstadoSriResponse,
  NegociableSriResponse,
} from '../../../service/consulta-sri.service';

export interface ConsultaSriDialogData {
  clave: string;
  ambiente: number;
  tipoLabel: string;
}

@Component({
  selector: 'app-consulta-sri-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule, MatDialogModule, MatProgressSpinnerModule],
  templateUrl: './consulta-sri-dialog.component.html',
  styleUrl: './consulta-sri-dialog.component.scss',
})
export class ConsultaSriDialogComponent {
  private consultaSriService = inject(ConsultaSriService);
  private snackBar = inject(MatSnackBar);
  private portapapeles = inject(PortapapelesService);
  private dialogRef = inject(MatDialogRef<ConsultaSriDialogComponent>);

  cargando = signal(false);
  estadoResp = signal<EstadoSriResponse | null>(null);
  negociableResp = signal<NegociableSriResponse | null>(null);
  errorMsg = signal('');

  constructor(@Inject(MAT_DIALOG_DATA) public data: ConsultaSriDialogData) {
    this.consultarEstado();
  }

  consultarEstado(): void {
    this.cargando.set(true);
    this.estadoResp.set(null);
    this.negociableResp.set(null);
    this.errorMsg.set('');

    this.consultaSriService.consultarEstado(this.data.clave, this.data.ambiente).subscribe({
      next: (resp) => {
        if (!resp) {
          this.errorMsg.set('No se pudo obtener respuesta del servicio de consulta SRI.');
        } else {
          this.estadoResp.set(resp);
        }
        this.cargando.set(false);
      },
    });
  }

  consultarNegociable(): void {
    this.cargando.set(true);
    this.negociableResp.set(null);
    this.errorMsg.set('');

    this.consultaSriService.consultarNegociable(this.data.clave, this.data.ambiente).subscribe({
      next: (resp) => {
        if (!resp) {
          this.errorMsg.set('No se pudo obtener respuesta del servicio de negociable SRI.');
        } else {
          this.negociableResp.set(resp);
        }
        this.cargando.set(false);
      },
    });
  }

  copiarClave(): void {
    this.portapapeles.copiar(this.data.clave).then((copiado) => {
      this.snackBar.open(
        copiado
          ? 'Clave copiada al portapapeles'
          : 'No se pudo copiar automáticamente. Seleccione la clave y use Ctrl+C.',
        'Cerrar',
        { duration: copiado ? 2000 : 6000 }
      );
    });
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  get estadoClass(): string {
    const estado = this.estadoResp()?.estadoAutorizacion?.toUpperCase() || '';
    if (estado === 'AUTORIZADO') return 'estado-autorizado';
    if (estado === 'NO AUTORIZADO') return 'estado-no-autorizado';
    return 'estado-otro';
  }
}

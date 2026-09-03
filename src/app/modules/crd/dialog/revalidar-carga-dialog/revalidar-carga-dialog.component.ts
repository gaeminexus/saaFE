import { CommonModule } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { ServiciosAsoprepService } from '../../../asoprep/service/servicios-asoprep.service';
import { ResumenRevalidacionCarga } from '../../model/revalidacion-carga';

export interface RevalidarCargaDialogData {
  idCarga: number;
}

type EstadoRevalidacion = 'CONFIRMAR' | 'REVALIDANDO' | 'RESULTADO' | 'ERROR';

/**
 * «Revalidar carga» — mismo diálogo, mismo comportamiento, en las dos pantallas (la nueva y
 * `detalle-consulta-carga`, que solo agrega el botón que lo abre — nada más se toca ahí).
 *
 * Recalcula las novedades de la carga desde los datos ya cargados. Las cuatro condiciones del
 * árbitro (2026-09-03):
 * 1. Confirmación previa, con las palabras exactas de que NO borra afectaciones ya hechas — es lo
 *    que más le preocupa al usuario (gestionó 75+ novedades en esta carga).
 * 2. Al terminar, mostrar el resumen (CUÁNTAS cambiaron, no un "listo" a secas) y recargar.
 * 3. Estado "revalidando" con todo deshabilitado mientras corre.
 * 4. Si falla, el mensaje del backend, sin dejar la pantalla en un estado ambiguo.
 *
 * `detalleConservadasPorAvpc` se muestra SIEMPRE que venga algo — es la garantía concreta (no la
 * promesa) de que las afectaciones ya hechas no se perdieron.
 */
@Component({
  selector: 'app-revalidar-carga-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './revalidar-carga-dialog.component.html',
  styleUrl: './revalidar-carga-dialog.component.scss',
})
export class RevalidarCargaDialogComponent {
  estado = signal<EstadoRevalidacion>('CONFIRMAR');
  resultado = signal<ResumenRevalidacionCarga | null>(null);
  errorMensaje = signal<string | null>(null);

  constructor(
    public dialogRef: MatDialogRef<RevalidarCargaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RevalidarCargaDialogData,
    private serviciosAsoprepService: ServiciosAsoprepService
  ) {}

  cancelar(): void {
    this.dialogRef.close(false);
  }

  /** Cierra después de ver el resultado — `true` le dice a quien abrió el diálogo que recargue. */
  cerrarConResultado(): void {
    this.dialogRef.close(this.estado() === 'RESULTADO');
  }

  confirmarRevalidacion(): void {
    this.estado.set('REVALIDANDO');
    this.serviciosAsoprepService.revalidarCarga(this.data.idCarga).subscribe({
      next: (resumen) => {
        if (resumen) {
          this.resultado.set(resumen);
          this.estado.set('RESULTADO');
        } else {
          this.errorMensaje.set('No se pudo revalidar la carga.');
          this.estado.set('ERROR');
        }
      },
      error: (err) => {
        this.errorMensaje.set(err?.mensaje || 'No se pudo revalidar la carga.');
        this.estado.set('ERROR');
      },
    });
  }
}

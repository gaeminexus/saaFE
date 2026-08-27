import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FileService } from '../../../../../shared/services/file.service';
import { PathCajaChica } from '../../../model/path-caja-chica';
import { PathCajaChicaService } from '../../../service/path-caja-chica.service';

export interface AdjuntosMovimientoDialogData {
  idMovimiento: number;
  numero?: string | number;
}

/** Ver/descargar/eliminar los adjuntos de un movimiento de caja chica. */
@Component({
  selector: 'app-adjuntos-movimiento-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>Adjuntos {{ data.numero ? '— Movimiento ' + data.numero : '' }}</h2>

    <mat-dialog-content>
      @if (cargando()) {
        <div class="estado-linea">
          <mat-spinner diameter="24"></mat-spinner>
          <span>Cargando adjuntos...</span>
        </div>
      } @else if (adjuntos().length === 0) {
        <p class="sin-adjuntos">Este movimiento no tiene adjuntos.</p>
      } @else {
        <table class="tabla-adjuntos">
          <tbody>
            @for (a of adjuntos(); track a.codigo) {
              <tr>
                <td>
                  <mat-icon>description</mat-icon>
                  {{ a.nombreDoc || a.path }}
                </td>
                <td class="col-acciones">
                  <button mat-icon-button matTooltip="Descargar" (click)="descargar(a)">
                    <mat-icon>download</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" matTooltip="Eliminar"
                          [disabled]="eliminandoId() === a.codigo" (click)="eliminar(a)">
                    @if (eliminandoId() === a.codigo) {
                      <mat-spinner diameter="18"></mat-spinner>
                    } @else {
                      <mat-icon>delete</mat-icon>
                    }
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="cerrar()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .estado-linea { display: flex; align-items: center; gap: 0.5rem; padding: 1rem 0; }
    .sin-adjuntos { color: #64748b; padding: 0.5rem 0; }
    .tabla-adjuntos { width: 100%; border-collapse: collapse; }
    .tabla-adjuntos td { padding: 0.4rem 0.25rem; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
    .tabla-adjuntos td:first-child { display: flex; align-items: center; gap: 0.4rem; }
    .col-acciones { text-align: right; white-space: nowrap; }
  `],
})
export class AdjuntosMovimientoDialogComponent implements OnInit {
  private pathService = inject(PathCajaChicaService);
  private fileService = inject(FileService);
  private snackBar = inject(MatSnackBar);
  private dialogRef = inject(MatDialogRef<AdjuntosMovimientoDialogComponent>);

  adjuntos = signal<PathCajaChica[]>([]);
  cargando = signal(false);
  eliminandoId = signal<number | null>(null);

  constructor(@Inject(MAT_DIALOG_DATA) public data: AdjuntosMovimientoDialogData) {}

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.pathService.porMovimiento(this.data.idMovimiento).subscribe({
      next: (data) => {
        this.adjuntos.set(Array.isArray(data) ? data : []);
        this.cargando.set(false);
      },
      error: () => {
        this.adjuntos.set([]);
        this.cargando.set(false);
      },
    });
  }

  descargar(adjunto: PathCajaChica): void {
    this.fileService.downloadAndSaveFile(adjunto.path, adjunto.nombreDoc || undefined);
  }

  eliminar(adjunto: PathCajaChica): void {
    if (!confirm(`¿Eliminar el adjunto "${adjunto.nombreDoc || adjunto.path}"?`)) return;

    this.eliminandoId.set(adjunto.codigo);
    this.pathService.delete(adjunto.codigo).subscribe({
      next: () => {
        this.eliminandoId.set(null);
        this.snackBar.open('Adjunto eliminado', 'Cerrar', { duration: 3000 });
        this.cargar();
      },
      error: () => {
        this.eliminandoId.set(null);
        this.snackBar.open('No se pudo eliminar el adjunto', 'Cerrar', { duration: 4000 });
      },
    });
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}

import { Component, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ImprimirAsientoService } from '../../services/imprimir-asiento.service';

/**
 * Botón «Imprimir asiento» para el aviso de éxito de cualquier pantalla que genere un asiento —
 * docs/cnt/DISENO-IMPRIMIR-ASIENTO-DESDE-ORIGEN.md. Recibe el CÓDIGO (PK) del asiento
 * (`idAsiento` de la respuesta del backend), no el número alterno. Si no llega (null/undefined),
 * no se dibuja nada y no hay error: así lo pide el contrato, porque algunas ramas del backend
 * pueden devolverlo null.
 */
@Component({
  selector: 'app-boton-imprimir-asiento',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    @if (idAsiento(); as id) {
      <button mat-stroked-button type="button" [disabled]="imprimiendo()" (click)="imprimir(id)">
        @if (imprimiendo()) {
          <mat-spinner diameter="16"></mat-spinner>
        } @else {
          <mat-icon>picture_as_pdf</mat-icon>
        }
        Imprimir asiento
      </button>
    }
  `,
})
export class BotonImprimirAsientoComponent {
  private imprimirAsientoS = inject(ImprimirAsientoService);
  private snackBar = inject(MatSnackBar);

  /** Código (PK) del asiento. Null/undefined/0 = no hay botón. */
  idAsiento = input<number | null | undefined>(null);
  /** Solo para nombrar el archivo descargado. */
  numeroAlterno = input<string | null | undefined>(null);

  imprimiendo = signal(false);

  imprimir(id: number): void {
    if (this.imprimiendo()) return;
    this.imprimiendo.set(true);
    this.imprimirAsientoS.imprimir(id, this.numeroAlterno() ?? undefined).subscribe({
      next: () => this.imprimiendo.set(false),
      error: (err: Error) => {
        this.imprimiendo.set(false);
        this.snackBar.open(err.message, 'Cerrar', { duration: 6000 });
      },
    });
  }
}

import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface AdvertenciasDialogData {
  titulo: string;
  advertencias: string[];
}

/**
 * Advertencias que devuelve el backend junto con un resultado exitoso (p. ej. el desembolso de un préstamo
 * que quedó confirmado pero con un caso para revisar a mano). No se cierra solo ni al hacer clic afuera:
 * el usuario tiene que leerlas y pulsar «Entendido».
 */
@Component({
  selector: 'app-advertencias-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title class="adv-titulo"><mat-icon>warning</mat-icon> {{ data.titulo }}</h2>
    <mat-dialog-content>
      <ul class="adv-lista">
        @for (a of data.advertencias; track $index) {
          <li>{{ a }}</li>
        }
      </ul>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" mat-dialog-close>Entendido</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .adv-titulo { display: flex; align-items: center; gap: 8px; color: #b26a00; }
      .adv-lista { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 8px; }
    `,
  ],
})
export class AdvertenciasDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: AdvertenciasDialogData) {}
}

/**
 * Junta `advertencias` (lista) y `advertencia` (texto, que el backend arma uniendo la lista con « | »)
 * sin duplicar nada. Devuelve `[]` si la respuesta no trae ninguna.
 */
export function extraerAdvertencias(resp: unknown): string[] {
  const r = (resp ?? {}) as { advertencia?: unknown; advertencias?: unknown };
  const lista = Array.isArray(r.advertencias) ? r.advertencias.filter((a): a is string => typeof a === 'string' && !!a.trim()) : [];
  if (lista.length) return lista;
  return typeof r.advertencia === 'string' && r.advertencia.trim()
    ? r.advertencia.split(' | ').map((a) => a.trim()).filter(Boolean)
    : [];
}

/** Abre el diálogo persistente si la respuesta trae advertencias. */
export function mostrarAdvertencias(dialog: MatDialog, resp: unknown, titulo = 'Revise esta advertencia'): void {
  const advertencias = extraerAdvertencias(resp);
  if (!advertencias.length) return;
  dialog.open(AdvertenciasDialogComponent, {
    width: '560px',
    disableClose: true,
    data: { titulo, advertencias } satisfies AdvertenciasDialogData,
  });
}

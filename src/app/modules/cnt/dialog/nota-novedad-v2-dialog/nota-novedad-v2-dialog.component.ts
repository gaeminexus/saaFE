import { CommonModule } from '@angular/common';
import { Component, Inject, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { FileService } from '../../../../shared/services/file.service';
import { mensajeDeError } from '../../../../shared/utils/mensaje-error.util';
import { AdjuntoEntradaV2, ResultadoAccionV2 } from '../../model/novedades-v2';
import { NovedadesV2Service } from '../../service/novedades-v2.service';

export interface NotaNovedadV2Data {
  idNovedad: number;
  codigoNovedad: string;
  /** Carpeta de subida de adjuntos (novedades/AAAA-MM/idNovedad). */
  rutaSubida: string;
}

/**
 * C34d — Respuesta escrita de ASOPREP en una novedad: texto y adjuntos, sin cuentas contables. No cambia saldos ni estados;
 * después se convierte en un hecho de crédito o en una justificación.
 */
@Component({
  selector: 'app-nota-novedad-v2-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>Respuesta de ASOPREP · {{ data.codigoNovedad }}</h2>
    <mat-dialog-content class="contenido">
      <div class="sub">
        Escriba qué pasó en realidad, con sus palabras: operación, fechas, valores y de dónde salió el dinero. No hace falta elegir
        cuentas contables. La respuesta queda en la novedad y no cambia saldos ni estados: después se registra como hecho de
        crédito o justificación.
      </div>
      <mat-form-field appearance="outline" class="ancho">
        <mat-label>Respuesta</mat-label>
        <textarea matInput rows="7" [(ngModel)]="texto"></textarea>
      </mat-form-field>
      <button mat-stroked-button type="button" (click)="archivo.click()" [disabled]="subiendo()"><mat-icon>attach_file</mat-icon> Adjuntar archivo</button>
      <input #archivo type="file" hidden [accept]="formatos" (change)="subir($event)" />
      <span class="sub"> PDF, Excel (.xls, .xlsx), Word o imagen.</span>
      @if (subiendo()) { <span class="sub"> Subiendo…</span> }
      @for (a of adjuntos(); track a.url) {
        <span class="adjunto">{{ a.nombreArchivo }} <button mat-icon-button type="button" (click)="quitar(a)"><mat-icon>close</mat-icon></button></span>
      }
      @if (error()) { <div class="error">{{ error() }}</div> }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="guardar()" [disabled]="trabajando() || subiendo()">Guardar respuesta</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .contenido { min-width: min(720px, 92vw); }
      .sub { color: #5b6573; font-size: 12.5px; margin-bottom: 8px; }
      .ancho { width: 100%; }
      .adjunto { display: inline-flex; align-items: center; margin-left: 8px; font-size: 13px; }
      .error { color: #b3261e; background: #fdecea; padding: 8px; border-radius: 4px; margin-top: 8px; }
    `,
  ],
})
export class NotaNovedadV2DialogComponent {
  ref = inject(MatDialogRef<NotaNovedadV2DialogComponent, ResultadoAccionV2>);
  private servicio = inject(NovedadesV2Service);
  private fileService = inject(FileService);
  readonly formatos = '.pdf,.xls,.xlsx,.doc,.docx,.jpg,.jpeg,.png,.txt,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  texto = '';
  adjuntos = signal<AdjuntoEntradaV2[]>([]);
  subiendo = signal(false);
  trabajando = signal(false);
  error = signal<string | null>(null);

  constructor(@Inject(MAT_DIALOG_DATA) public data: NotaNovedadV2Data) {}

  async subir(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo) return;
    this.subiendo.set(true);
    this.error.set(null);
    let hash: string | null = null;
    try {
      const digest = await crypto.subtle.digest('SHA-256', await archivo.arrayBuffer());
      hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      hash = null;
    }
    this.fileService.uploadFileCustomPath(archivo, this.data.rutaSubida).subscribe({
      next: (r) => {
        this.subiendo.set(false);
        if (!r?.filePath) {
          this.error.set(r?.message || 'El servidor no devolvió la ruta del archivo.');
          return;
        }
        this.adjuntos.set([...this.adjuntos(), { tipoDocumento: 'OTRO', nombreArchivo: archivo.name, url: r.filePath, mimeType: archivo.type || null, tamanio: archivo.size, hash }]);
      },
      error: (e) => {
        this.subiendo.set(false);
        this.error.set(mensajeDeError(e, 'No se pudo subir el archivo.'));
      },
    });
  }

  quitar(a: AdjuntoEntradaV2): void {
    this.adjuntos.set(this.adjuntos().filter((x) => x !== a));
  }

  guardar(): void {
    if (!this.texto.trim()) {
      this.error.set('Escriba la respuesta.');
      return;
    }
    this.trabajando.set(true);
    this.servicio.registrarNota(this.data.idNovedad, this.texto.trim(), this.adjuntos()).subscribe({
      next: (r) => {
        this.trabajando.set(false);
        this.ref.close(r);
      },
      error: (e) => {
        this.trabajando.set(false);
        this.error.set(String(e));
      },
    });
  }
}

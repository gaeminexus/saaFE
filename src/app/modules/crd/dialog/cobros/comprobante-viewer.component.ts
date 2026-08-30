import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { inject } from '@angular/core';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { ServiciosShare } from '../../../../shared/services/ws-share';

/**
 * Visor del comprobante digitalizado de un cobro (`rutaRespaldo`) — inline, no un diálogo aparte:
 * es lo único que contabilidad realmente necesita ver para aprobar o rechazar (§5.1 del contrato
 * de docs/crd/API-COBROS-APROBACION-CONTABILIDAD.md), así que va directo en el panel de detalle en
 * vez de exigir un clic extra para abrirlo.
 *
 * No hay capa de autenticación delante de `/file/download` (igual que el resto de comprobantes de
 * este módulo), así que la URL se arma directa para `<img>`/`<iframe>` sin pasar por un blob.
 */
@Component({
  selector: 'app-comprobante-viewer',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  template: `
    @if (!ruta()) {
      <div class="cv-vacio">
        <mat-icon>description</mat-icon>
        <span>Sin comprobante adjunto.</span>
      </div>
    } @else if (esImagen()) {
      <div class="cv-imagen">
        <img [src]="url()" [alt]="'Comprobante ' + nombreArchivo()" />
      </div>
    } @else if (esPdf()) {
      <iframe class="cv-pdf" [src]="urlSegura()" [title]="'Comprobante ' + nombreArchivo()"></iframe>
    } @else {
      <div class="cv-vacio">
        <mat-icon>insert_drive_file</mat-icon>
        <span>{{ nombreArchivo() }}</span>
      </div>
    }
    @if (ruta()) {
      <a class="cv-abrir" [href]="url()" target="_blank" rel="noopener">
        <mat-icon>open_in_new</mat-icon> Abrir en pestaña nueva
      </a>
    }
  `,
  styles: [`
    :host { display: block; }
    .cv-imagen { text-align: center; background: #f7f8fc; border-radius: 8px; padding: 0.5rem; }
    .cv-imagen img { max-width: 100%; max-height: 480px; border-radius: 4px; }
    .cv-pdf { width: 100%; height: 480px; border: 1px solid #e2e8f0; border-radius: 8px; }
    .cv-vacio {
      display: flex; align-items: center; gap: 0.5rem;
      color: #94a3b8; font-style: italic; padding: 1.5rem; justify-content: center;
      background: #f7f8fc; border-radius: 8px;
    }
    .cv-abrir {
      display: inline-flex; align-items: center; gap: 0.3rem;
      margin-top: 0.5rem; font-size: 0.82rem; color: #3949ab; text-decoration: none;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { text-decoration: underline; }
    }
  `],
})
export class ComprobanteViewerComponent {
  private sanitizer = inject(DomSanitizer);

  /** `rutaRespaldo` del cobro. `null`/vacío muestra el estado "sin comprobante". */
  ruta = input<string | null | undefined>(null);

  nombreArchivo = computed(() => {
    const r = this.ruta();
    if (!r) return '';
    const partes = r.split('/');
    return partes[partes.length - 1] || r;
  });

  private extension = computed(() => this.nombreArchivo().toLowerCase().slice(this.nombreArchivo().lastIndexOf('.')));

  esImagen = computed(() => /\.(png|jpe?g|gif)$/.test(this.extension()));
  esPdf = computed(() => this.extension() === '.pdf');

  url = computed(() => {
    const r = this.ruta();
    return r ? `${ServiciosShare.RS_FILE}/download?filePath=${encodeURIComponent(r)}` : '';
  });

  urlSegura = computed<SafeResourceUrl>(() => this.sanitizer.bypassSecurityTrustResourceUrl(this.url()));
}

import { CommonModule } from '@angular/common';
import { Component, Inject, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { FileService } from '../../../../shared/services/file.service';
import { mensajeDeError } from '../../../../shared/utils/mensaje-error.util';
import {
  AccionNovedad,
  AdjuntoEntrada,
  AREAS_ASOPREP,
  CANALES_RESPUESTA,
  TIPOS_DECIDE,
  TIPOS_DOCUMENTO_ADJUNTO,
} from '../../model/seguimiento-novedades';

/**
 * Configuración del diálogo genérico de acciones de C25. Cada acción enciende los campos que usa; el backend valida
 * igual los obligatorios y sus mensajes se muestran tal cual.
 */
export interface AccionNovedadDialogData {
  titulo: string;
  mensaje?: string;
  icono?: string;
  color?: 'primary' | 'warn' | 'accent';
  textoConfirmar: string;
  detalles?: { etiqueta: string; valor: string }[];
  advertencias?: string[];
  /** Texto libre (respuesta o decisión). */
  texto?: { etiqueta: string; obligatorio?: boolean; ayuda?: string };
  /** Opciones (ELECCION: las del requerimiento; CONFIRMACION / APROBACION: SI / NO). */
  opciones?: string[];
  canal?: boolean;
  fecha?: { etiqueta: string; conHora?: boolean };
  area?: string | null | true;
  motivo?: { etiqueta: string; obligatorio?: boolean; placeholder?: string };
  /** Asientos de ajuste (uno o varios, por código interno o número alterno). */
  asientos?: { obligatorio?: boolean };
  /** Adjuntos: se suben con /file/upload/custom a `rutaSubida`. */
  adjuntos?: { obligatorio?: boolean; rutaSubida: string; tipoSugerido?: string };
  /** Campos de la decisión (tema, quién decide, cargo, evidencia, número). */
  decision?: boolean;
  fechaLimite?: boolean;
  /** Aplicar sin asiento (motivo de por qué no hace falta ajuste). */
  sinAjuste?: boolean;
}

@Component({
  selector: 'app-accion-novedad-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title class="titulo">
      @if (data.icono) {
        <mat-icon>{{ data.icono }}</mat-icon>
      }
      {{ data.titulo }}
    </h2>
    <mat-dialog-content class="contenido">
      @if (data.mensaje) {
        <p class="mensaje">{{ data.mensaje }}</p>
      }
      @if (data.detalles?.length) {
        <dl class="detalles">
          @for (d of data.detalles; track d.etiqueta) {
            <dt>{{ d.etiqueta }}</dt>
            <dd>{{ d.valor }}</dd>
          }
        </dl>
      }
      @for (a of data.advertencias ?? []; track a) {
        <div class="advertencia"><mat-icon>warning</mat-icon><span>{{ a }}</span></div>
      }

      @if (data.decision) {
        <div class="fila">
          <mat-form-field appearance="outline" class="angosto">
            <mat-label>Número (vacío = siguiente)</mat-label>
            <input matInput [(ngModel)]="numero" placeholder="D-057" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="ancho">
            <mat-label>Quién decide</mat-label>
            <mat-select [(ngModel)]="tipoDecide">
              @for (t of tiposDecide; track t.valor) {
                <mat-option [value]="t.valor">{{ t.etiqueta }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline" class="completo">
          <mat-label>Tema</mat-label>
          <input matInput [(ngModel)]="tema" maxlength="1000" required />
        </mat-form-field>
        <div class="fila">
          <mat-form-field appearance="outline" class="ancho">
            <mat-label>Cargo de quien decide (sin nombre)</mat-label>
            <input matInput [(ngModel)]="cargo" maxlength="200" placeholder="Contador de ASOPREP" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="ancho">
            <mat-label>Evidencia</mat-label>
            <input matInput [(ngModel)]="evidencia" maxlength="1000" placeholder="Correo del 12-nov-2026 / acta n.º" />
          </mat-form-field>
        </div>
      }

      @if (data.opciones?.length) {
        <mat-form-field appearance="outline" class="completo">
          <mat-label>Opción</mat-label>
          <mat-select [(ngModel)]="opcion" required>
            @for (o of data.opciones; track o) {
              <mat-option [value]="o">{{ o }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }

      @if (data.texto) {
        <mat-form-field appearance="outline" class="completo">
          <mat-label>{{ data.texto.etiqueta }}</mat-label>
          <textarea matInput rows="5" [(ngModel)]="texto" maxlength="4000" [required]="!!data.texto.obligatorio"></textarea>
          @if (data.texto.ayuda) {
            <mat-hint>{{ data.texto.ayuda }}</mat-hint>
          }
        </mat-form-field>
      }

      @if (data.canal || data.fecha || data.area) {
        <div class="fila">
          @if (data.canal) {
            <mat-form-field appearance="outline" class="angosto">
              <mat-label>Canal</mat-label>
              <mat-select [(ngModel)]="canal">
                @for (c of canales; track c) {
                  <mat-option [value]="c">{{ c }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
          @if (data.fecha) {
            <mat-form-field appearance="outline" class="angosto">
              <mat-label>{{ data.fecha.etiqueta }}</mat-label>
              <input matInput [type]="data.fecha.conHora ? 'datetime-local' : 'date'" [(ngModel)]="fecha" />
            </mat-form-field>
          }
          @if (data.area) {
            <mat-form-field appearance="outline" class="angosto">
              <mat-label>Área que responde</mat-label>
              <mat-select [(ngModel)]="area">
                <mat-option [value]="null">—</mat-option>
                @for (a of areas; track a.valor) {
                  <mat-option [value]="a.valor">{{ a.etiqueta }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }
        </div>
      }

      @if (data.fechaLimite) {
        <mat-form-field appearance="outline" class="angosto">
          <mat-label>Responder hasta</mat-label>
          <input matInput type="date" [(ngModel)]="fechaLimite" />
        </mat-form-field>
      }

      @if (data.asientos) {
        <div class="bloque">
          <div class="bloque-titulo">Asientos manuales de ajuste (D-056)</div>
          <div class="fila">
            <mat-form-field appearance="outline" class="ancho">
              <mat-label>Código interno o número (DIA-2026-11-0005)</mat-label>
              <input matInput [(ngModel)]="asientoNuevo" (keyup.enter)="agregarAsiento()" />
            </mat-form-field>
            <button mat-stroked-button type="button" (click)="agregarAsiento()" [disabled]="!asientoNuevo.trim()">
              <mat-icon>add</mat-icon> Agregar
            </button>
          </div>
          <mat-chip-set>
            @for (a of asientos(); track a) {
              <mat-chip (removed)="quitarAsiento(a)">
                {{ a }}
                <button matChipRemove [attr.aria-label]="'Quitar ' + a"><mat-icon>cancel</mat-icon></button>
              </mat-chip>
            }
          </mat-chip-set>
          <p class="ayuda">Cada asiento se valida contra la contabilidad de la empresa (existe y está activo). Se pueden registrar varios.</p>
        </div>
      }

      @if (data.sinAjuste) {
        <mat-form-field appearance="outline" class="completo">
          <mat-label>O bien: por qué no hace falta ajuste</mat-label>
          <input matInput [(ngModel)]="sinAjusteMotivo" maxlength="1000" placeholder="La confirmación deja todo como está" />
        </mat-form-field>
      }

      @if (data.adjuntos) {
        <div class="bloque">
          <div class="bloque-titulo">Adjuntos {{ data.adjuntos.obligatorio ? '(constancia obligatoria)' : '' }}</div>
          <div class="fila">
            <mat-form-field appearance="outline" class="angosto">
              <mat-label>Tipo de documento</mat-label>
              <mat-select [(ngModel)]="tipoDocumento">
                @for (t of tiposDocumento; track t) {
                  <mat-option [value]="t">{{ t }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <input #archivo type="file" hidden (change)="subir($event)" />
            <button mat-stroked-button type="button" (click)="archivo.click()" [disabled]="subiendo()">
              <mat-icon>upload_file</mat-icon> {{ subiendo() ? 'Subiendo…' : 'Subir archivo' }}
            </button>
          </div>
          @for (a of adjuntos(); track a.url) {
            <div class="adjunto">
              <mat-icon>attach_file</mat-icon>
              <span>{{ a.tipoDocumento }} · {{ a.nombreArchivo }}</span>
              <button mat-icon-button type="button" (click)="quitarAdjunto(a)"><mat-icon>close</mat-icon></button>
            </div>
          }
          <p class="ayuda">Los documentos pueden traer datos personales: quedan en el servidor de ASOPREP y en el expediente, nunca en otro lado.</p>
        </div>
      }

      @if (data.motivo) {
        <mat-form-field appearance="outline" class="completo">
          <mat-label>{{ data.motivo.etiqueta }}</mat-label>
          <textarea matInput rows="3" [(ngModel)]="motivo" maxlength="2000" [placeholder]="data.motivo.placeholder ?? ''" [required]="!!data.motivo.obligatorio"></textarea>
        </mat-form-field>
      }

      @if (error()) {
        <div class="error"><mat-icon>error_outline</mat-icon><span>{{ error() }}</span></div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="ref.close()">Cancelar</button>
      <button mat-flat-button [color]="data.color ?? 'primary'" type="button" (click)="confirmar()" [disabled]="subiendo()">
        {{ data.textoConfirmar }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .titulo { display: flex; align-items: center; gap: 8px; }
      .contenido { display: flex; flex-direction: column; gap: 4px; min-width: 520px; }
      .mensaje { margin: 0 0 8px; color: #334155; line-height: 1.45; }
      .detalles { display: grid; grid-template-columns: max-content 1fr; gap: 2px 12px; margin: 0 0 8px; font-size: 0.85rem; }
      .detalles dt { color: #64748b; }
      .detalles dd { margin: 0; color: #0f172a; white-space: pre-wrap; }
      .advertencia, .error { display: flex; gap: 6px; align-items: flex-start; border-radius: 6px; padding: 6px 10px; font-size: 0.85rem; margin-bottom: 6px; }
      .advertencia { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }
      .error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
      .fila { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
      .completo { width: 100%; }
      .ancho { flex: 1 1 240px; }
      .angosto { flex: 0 1 200px; }
      .bloque { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px; }
      .bloque-titulo { font-weight: 600; color: #1a3d6d; margin-bottom: 6px; font-size: 0.9rem; }
      .ayuda { margin: 4px 0 0; color: #64748b; font-size: 0.78rem; }
      .adjunto { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; }
    `,
  ],
})
export class AccionNovedadDialogComponent {
  ref = inject(MatDialogRef<AccionNovedadDialogComponent, AccionNovedad>);
  private fileService = inject(FileService);

  readonly canales = CANALES_RESPUESTA;
  readonly areas = AREAS_ASOPREP;
  readonly tiposDecide = TIPOS_DECIDE;
  readonly tiposDocumento = TIPOS_DOCUMENTO_ADJUNTO;

  texto = '';
  opcion: string | null = null;
  canal = 'SAA';
  fecha = '';
  area: string | null = null;
  motivo = '';
  numero = '';
  tema = '';
  tipoDecide = 'CONTABILIDAD_ASOPREP';
  cargo = '';
  evidencia = '';
  fechaLimite = '';
  sinAjusteMotivo = '';
  asientoNuevo = '';
  tipoDocumento = 'COMPROBANTE';

  asientos = signal<string[]>([]);
  adjuntos = signal<AdjuntoEntrada[]>([]);
  subiendo = signal(false);
  error = signal<string | null>(null);

  constructor(@Inject(MAT_DIALOG_DATA) public data: AccionNovedadDialogData) {
    if (typeof data.area === 'string') this.area = data.area;
    if (data.adjuntos?.tipoSugerido) this.tipoDocumento = data.adjuntos.tipoSugerido;
    if (data.decision) this.tipoDocumento = 'ACTA';
  }

  agregarAsiento(): void {
    const v = this.asientoNuevo.trim().toUpperCase();
    if (!v) return;
    if (!this.asientos().includes(v)) this.asientos.set([...this.asientos(), v]);
    this.asientoNuevo = '';
  }

  quitarAsiento(a: string): void {
    this.asientos.set(this.asientos().filter((x) => x !== a));
  }

  quitarAdjunto(a: AdjuntoEntrada): void {
    this.adjuntos.set(this.adjuntos().filter((x) => x !== a));
  }

  async subir(evento: Event): Promise<void> {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo || !this.data.adjuntos) return;
    this.subiendo.set(true);
    this.error.set(null);
    let hash: string | null = null;
    try {
      const digest = await crypto.subtle.digest('SHA-256', await archivo.arrayBuffer());
      hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      hash = null; // sin contexto seguro (http) no hay crypto.subtle: el hash queda vacío
    }
    this.fileService.uploadFileCustomPath(archivo, this.data.adjuntos.rutaSubida).subscribe({
      next: (r) => {
        this.subiendo.set(false);
        if (!r?.filePath) {
          this.error.set(r?.message || 'El servidor no devolvió la ruta del archivo.');
          return;
        }
        this.adjuntos.set([
          ...this.adjuntos(),
          { tipoDocumento: this.tipoDocumento, nombreArchivo: archivo.name, url: r.filePath, mimeType: archivo.type || null, tamanio: archivo.size, hash },
        ]);
      },
      error: (e) => {
        this.subiendo.set(false);
        this.error.set(mensajeDeError(e, 'No se pudo subir el archivo.'));
      },
    });
  }

  confirmar(): void {
    const d = this.data;
    if (this.asientoNuevo.trim()) this.agregarAsiento();
    const faltas: string[] = [];
    if (d.texto?.obligatorio && !this.texto.trim()) faltas.push(d.texto.etiqueta);
    if (d.opciones?.length && !this.opcion) faltas.push('la opción');
    if (d.motivo?.obligatorio && !this.motivo.trim()) faltas.push(d.motivo.etiqueta);
    if (d.decision && !this.tema.trim()) faltas.push('el tema');
    if (d.adjuntos?.obligatorio && this.adjuntos().length === 0) faltas.push('al menos un adjunto de constancia');
    if (d.asientos?.obligatorio && this.asientos().length === 0 && !(d.sinAjuste && this.sinAjusteMotivo.trim())) {
      faltas.push(d.sinAjuste ? 'los asientos de ajuste o el motivo sin ajuste' : 'al menos un asiento');
    }
    if (faltas.length) {
      this.error.set('Falta: ' + faltas.join(', ') + '.');
      return;
    }
    const r: AccionNovedad = {};
    if (d.texto) r.texto = this.texto.trim() || null;
    if (d.opciones?.length) r.opcion = this.opcion;
    if (d.canal) r.canal = this.canal;
    if (d.fecha && this.fecha) r.fecha = this.fecha;
    if (d.area) r.area = this.area;
    if (d.motivo) r.motivo = this.motivo.trim() || null;
    if (d.asientos) r.asientos = this.asientos();
    if (d.adjuntos) r.adjuntos = this.adjuntos();
    if (d.fechaLimite && this.fechaLimite) r.fechaLimite = this.fechaLimite;
    if (d.sinAjuste && this.sinAjusteMotivo.trim()) r.sinAjusteMotivo = this.sinAjusteMotivo.trim();
    if (d.decision) {
      r.numero = this.numero.trim() || null;
      r.tema = this.tema.trim();
      r.tipoDecide = this.tipoDecide;
      r.cargo = this.cargo.trim() || null;
      r.evidencia = this.evidencia.trim() || null;
    }
    this.ref.close(r);
  }
}

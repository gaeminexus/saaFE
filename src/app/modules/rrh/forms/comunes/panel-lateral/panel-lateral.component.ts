import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Panel lateral de edición: sustituye al diálogo modal del formulario largo.
 *
 * **Es la pieza que responde al defecto que motivó el rediseño.** El diálogo de
 * `table-basic-hijos` medía 1205 px en un viewport de 1115, no tenía contenedor scrolleable y
 * dejaba «Guardar» 21 px fuera de pantalla: el formulario era inguardable sin que nada lo
 * dijera. Aquí el cuerpo scrollea y el pie con las acciones vive fuera de ese scroll, así que
 * **las acciones no pueden salirse de la pantalla por muchos campos que tenga el formulario**.
 *
 * El contenido se proyecta: el panel no sabe qué formulario lleva dentro.
 */
@Component({
  selector: 'app-panel-lateral',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './panel-lateral.component.html',
  styleUrls: ['./panel-lateral.component.scss'],
})
export class PanelLateralComponent {
  @Input({ required: true }) titulo!: string;
  @Input() subtitulo = '';
  @Input() abierto = false;
  @Input() guardando = false;
  /** Un panel de solo lectura no ofrece guardar. */
  @Input() soloLectura = false;
  @Input() etiquetaGuardar = 'Guardar';
  /**
   * Hay cambios sin guardar en el formulario proyectado.
   *
   * Con esto puesto, ni el fondo ni `Escape` cierran el panel: se descubrió probándolo que un
   * clic fuera bastaba para perder un formulario entero recién llenado, sin aviso. Descartar es
   * legítimo, pero tiene que ser deliberado — el botón «Cancelar» está para eso.
   */
  @Input() hayCambios = false;

  @Output() cerrar = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<void>();
  /** El usuario intentó cerrar de forma accidental teniendo cambios sin guardar. */
  @Output() cierreBloqueado = new EventEmitter<void>();

  /** Escape cierra, que es lo que espera cualquiera que abra un panel encima de la pantalla. */
  @HostListener('document:keydown.escape')
  alPulsarEscape(): void {
    if (this.abierto) this.intentarCerrar();
  }

  alPulsarFondo(): void {
    this.intentarCerrar();
  }

  private intentarCerrar(): void {
    if (this.guardando) return;
    if (this.hayCambios) {
      this.cierreBloqueado.emit();
      return;
    }
    this.cerrar.emit();
  }
}

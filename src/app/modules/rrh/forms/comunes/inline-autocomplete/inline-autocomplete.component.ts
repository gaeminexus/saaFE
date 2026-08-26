import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { coincideTexto } from '../normalizar';

/**
 * Celda de autocompletado para captura en línea: se teclea, se filtra con `normalizar()` —
 * mayúsculas y acentos no importan, D14—, se elige con flechas y Enter, sin ratón.
 *
 * Sólo acepta un valor de `opciones`: si se sale del campo sin elegir de la lista, el valor
 * vuelve a `null` y el texto se limpia. Es el mismo contrato que los combos de tabla del resto
 * del módulo — no se inventa un valor libre a partir de lo tecleado.
 */
@Component({
  selector: 'app-inline-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule, MatAutocompleteModule, MatInputModule],
  templateUrl: './inline-autocomplete.component.html',
  styleUrl: './inline-autocomplete.component.scss',
})
export class InlineAutocompleteComponent {
  @Input() id = '';
  @Input() opciones: any[] = [];
  @Input() etiqueta: (item: any) => string = (item) => String(item ?? '');
  /** Partes por las que se puede buscar; por defecto, sólo la etiqueta. */
  @Input() buscarPor: (item: any) => string[] = (item) => [this.etiqueta(item)];
  @Input() placeholder = '';
  @Input() invalido = false;
  @Input() set valor(item: any) {
    this._valor = item ?? null;
    this.texto.set(item ? this.etiqueta(item) : '');
  }
  get valor(): any {
    return this._valor;
  }
  @Output() valorChange = new EventEmitter<any>();

  @ViewChild('input') inputRef?: ElementRef<HTMLInputElement>;

  private _valor: any = null;
  texto = signal('');

  filtradas = computed(() => {
    const termino = this.texto();
    if (!termino || (this._valor && this.etiqueta(this._valor) === termino)) {
      return this.opciones.slice(0, 50);
    }
    return this.opciones
      .filter((item) => this.buscarPor(item).some((parte) => coincideTexto(parte, termino)))
      .slice(0, 50);
  });

  onTexto(valor: string): void {
    this.texto.set(valor);
    if (this._valor && this.etiqueta(this._valor) !== valor) {
      this._valor = null;
      this.valorChange.emit(null);
    }
  }

  seleccionar(evento: MatAutocompleteSelectedEvent): void {
    const item = evento.option.value;
    this._valor = item;
    this.texto.set(this.etiqueta(item));
    this.valorChange.emit(item);
  }

  /** Si se sale del campo sin haber elegido de la lista, no se inventa un valor libre. */
  onBlur(): void {
    if (this._valor && this.etiqueta(this._valor) === this.texto()) return;
    this._valor = null;
    this.texto.set('');
    this.valorChange.emit(null);
  }

  foco(): void {
    this.inputRef?.nativeElement.focus();
  }
}

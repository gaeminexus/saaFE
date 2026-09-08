import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  computed,
  effect,
  forwardRef,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  MatAutocompleteModule,
  MatAutocompleteSelectedEvent,
  MatAutocompleteTrigger,
} from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { coincideTexto } from '../normalizar';

/**
 * Autocompletado por teclado: se teclea, se filtra con `normalizar()` —mayúsculas y acentos no
 * importan, D14—, se elige con flechas y Enter, sin ratón.
 *
 * Sólo acepta un valor de `opciones`: si se sale del campo sin elegir de la lista, el valor
 * vuelve a `null` y el texto se limpia. Es el mismo contrato que los combos de tabla del resto
 * del módulo — no se inventa un valor libre a partir de lo tecleado.
 *
 * **Dos modos, un componente.** `modo="celda"` (por defecto) es la entrada desnuda que usan las
 * filas de la rejilla — sin `mat-form-field`, porque una celda de tabla no lleva etiqueta
 * flotante. `modo="campo"` se envuelve en `mat-form-field` con `mat-label`, para los combos de
 * cabecera —Ejercicio, Período— que antes eran `mat-select` y no se podían buscar. **Todo combo
 * de la pantalla se busca tecleando, sin excepción**: dos modos de un componente, no dos
 * componentes, para no repetir el filtro ni el contrato de «no se inventa un valor libre».
 */
@Component({
  selector: 'app-inline-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule],
  templateUrl: './inline-autocomplete.component.html',
  styleUrl: './inline-autocomplete.component.scss',
  // Clase en el host solo para modo="campo": un componente Angular es `display: inline` por
  // defecto, así que sin esto `<app-inline-autocomplete>` no ocupa el ancho de lo que lo
  // contiene y el `min-width`/`flex` que le ponga la pantalla que lo usa no tiene ningún efecto
  // (el defecto medido en conciliación-cierre: combos de ~180px, el desplegable partiendo
  // nombres largos en tres renglones). Acotado a `.campo` a propósito: `modo="celda"` vive
  // dentro de una celda de tabla sin `mat-form-field`, y un `display: block` general ahí podría
  // cambiar cómo se comporta — no medido, así que no se toca sin necesidad.
  host: { '[class.campo]': "modo === 'campo'" },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InlineAutocompleteComponent),
      multi: true,
    },
  ],
})
export class InlineAutocompleteComponent implements ControlValueAccessor {
  /**
   * `controlId`, no `id`. `id` es un atributo HTML global: aunque el componente declare
   * `@Input() id`, Angular NO lo retira del elemento anfitrión —lo deja puesto ahí, además de
   * pasarlo al `@Input()—, así que `<app-inline-autocomplete id="x">` deja **dos** elementos con
   * `id="x"` en el DOM: el propio `<app-inline-autocomplete>` y el `<input>` de dentro.
   * `document.getElementById('x')` devuelve el primero en el orden del documento —el anfitrión,
   * que no es enfocable—, y `.focus()` sobre él no hace nada, en silencio, sin error. Fue el bug
   * real detrás de «Nueva línea no hace nada»: el foco llevaba semanas apuntando al componente,
   * nunca al campo. `controlId` no colisiona con ningún atributo nativo, así que sólo existe una
   * vez, en el `<input>`.
   */
  @Input() controlId = '';
  @Input() modo: 'celda' | 'campo' = 'celda';
  /** Etiqueta flotante del `mat-form-field`; sólo se usa en `modo="campo"`. */
  @Input() etiquetaCampo = '';
  /**
   * `input()` de señal, no `@Input()` de decorador — a propósito. `filtradas` es un `computed()`
   * y sólo se recalcula cuando cambia una **señal** que lee. Con `@Input() opciones: any[]`, un
   * `computed()` que hace `this.opciones` no se entera de nada: si el período se abre antes de
   * que `periodos()` termine de cargar en el padre —la carrera de D17, aquí una vuelta más
   * adentro—, `filtradas()` se evalúa una vez con la lista vacía, la cachea, y el clic en el
   * campo abre un panel vacío para siempre. Escribir algo lo arregla porque `texto` sí es señal
   * y fuerza el recálculo, que entonces lee `opciones` ya lleno — de ahí que «si tecleo, sí
   * funciona» fuera la pista.
   */
  opciones = input<any[]>([]);
  @Input() etiqueta: (item: any) => string = (item) => String(item ?? '');
  /** Partes por las que se puede buscar; por defecto, sólo la etiqueta. */
  @Input() buscarPor: (item: any) => string[] = (item) => [this.etiqueta(item)];
  @Input() placeholder = '';
  @Input() invalido = false;
  /**
   * Opcional. Cuando está definido, el componente trabaja con el id escalar que usan los
   * `mat-select` de hoy (`[value]="x.codigo"`) en vez del objeto completo: `writeValue` recibe
   * el escalar y lo resuelve buscándolo en `opciones()`, y lo que se propaga hacia afuera por
   * CVA (`onChange`) es `valorPor(item)`, no el item. `[valor]`/`(valorChange)` NO cambian por
   * esto: siguen recibiendo y emitiendo el objeto siempre, tenga o no `valorPor` definido — es
   * el contrato de los consumidores existentes (marcaciones, descuentos-recurrentes,
   * novedades-nomina) y no se toca.
   */
  @Input() valorPor?: (item: any) => any;
  /**
   * Opcional. Texto de una opción de escape siempre visible, primera en la lista, sin importar
   * lo tecleado (no es un resultado de búsqueda, no se filtra contra `termino`). Elegirla
   * equivale a seleccionar `null` — mismo camino que `seleccionar()` ya usa para cualquier
   * opción, así que sale por `valorChange`/CVA igual que un `null` normal. Cada pantalla decide
   * el texto («Todos», «Todas», «Sin filtro»); cuando no está definido, no aparece ninguna
   * opción de vacío y el componente se comporta exactamente como hoy.
   */
  @Input() etiquetaVacio?: string;
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

  // ── ControlValueAccessor (aditivo — ver comentario de valorPor arriba) ──
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  disabled = false;

  /**
   * Id escalar recibido por `writeValue` en modo `valorPor` que todavía no se pudo resolver
   * contra `opciones()` (typ. porque `opciones` llega después, por HTTP). `undefined` = nada
   * pendiente; `null` = valor pendiente es "sin selección". Se reintenta en el `effect()` de
   * abajo cada vez que `opciones()` cambia — misma carrera que ya documenta `opciones` arriba,
   * un nivel más afuera: acá el que puede llegar vacío es la lista, no el término tecleado.
   */
  private idPendiente: any = undefined;

  constructor() {
    effect(() => {
      const opciones = this.opciones();
      if (this.valorPor && this.idPendiente !== undefined) {
        this.resolverIdPendiente(opciones);
      }
    });
  }

  private resolverIdPendiente(opciones: any[]): void {
    if (this.idPendiente === undefined) return;
    const id = this.idPendiente;
    if (id === null) {
      this._valor = null;
      this.texto.set('');
      this.idPendiente = undefined;
      return;
    }
    const item = opciones.find((o) => this.valorPor!(o) === id);
    if (item) {
      this._valor = item;
      this.texto.set(this.etiqueta(item));
      this.idPendiente = undefined;
    }
    // Si no aparece todavía, queda pendiente para el próximo cambio de `opciones` — nunca se
    // descarta, o el combo quedaría en blanco con un valor que en realidad sí existe.
  }

  /** Lo que se propaga por CVA: el escalar si hay `valorPor`, el item si no. `valorChange` no pasa por acá. */
  private salidaCVA(item: any): any {
    if (!this.valorPor) return item;
    return item != null ? this.valorPor(item) : null;
  }

  writeValue(value: any): void {
    if (this.valorPor) {
      this.idPendiente = value ?? null;
      this.resolverIdPendiente(this.opciones());
    } else {
      this.valor = value;
    }
  }

  registerOnChange(fn: (value: any) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  filtradas = computed(() => {
    const termino = this.texto();
    const opciones = this.opciones();
    if (!termino || (this._valor && this.etiqueta(this._valor) === termino)) {
      return opciones.slice(0, 50);
    }
    return opciones
      .filter((item) => this.buscarPor(item).some((parte) => coincideTexto(parte, termino)))
      .slice(0, 50);
  });

  onTexto(valor: string): void {
    this.texto.set(valor);
    // Tipear ES la intención del usuario, a diferencia de un blur accidental: si había un id
    // pendiente de `writeValue` sin resolver todavía, se abandona acá. Si no se descartara, el
    // `effect()` de `opciones` podría resolverlo más tarde y pisar en silencio lo que el usuario
    // ya tecleó, en vez de dejar que termine de buscar lo que quiere.
    this.idPendiente = undefined;
    if (this._valor && this.etiqueta(this._valor) !== valor) {
      this._valor = null;
      this.valorChange.emit(null);
      this.onChange(this.salidaCVA(null));
    }
  }

  seleccionar(evento: MatAutocompleteSelectedEvent): void {
    // Elegir de la lista —incluida la opción de vacío, que llega acá con item = null— es
    // intención explícita del usuario, igual que tipear: se abandona cualquier id pendiente de
    // `writeValue` sin resolver, o el `effect()` de `opciones` podría pisar esta elección más
    // tarde con el valor viejo que todavía no había llegado.
    this.idPendiente = undefined;
    const item = evento.option.value;
    this._valor = item;
    // `etiqueta` NUNCA se llama con `null`: es una función de cada pantalla, pensada para SU
    // tipo de opción, no para el `null` de la opción de vacío del componente. `item` es `null`
    // acá cuando se elige esa opción (`evento.option.value` de la `mat-option [value]="null"`)
    // — el mismo criterio que ya usa el setter de `valor` más abajo.
    this.texto.set(item != null ? this.etiqueta(item) : '');
    this.valorChange.emit(item);
    this.onChange(this.salidaCVA(item));
  }

  /**
   * Si se sale del campo sin haber elegido de la lista, no se inventa un valor libre.
   *
   * **Por qué recibe `trigger` y por qué el `setTimeout`.** En `mat-autocomplete`, hacer clic en
   * una opción del panel dispara, en este orden: `mousedown` → el input pierde el foco → `blur` →
   * `click` → recién ahí `optionSelected`. Si acá se limpia en el `blur` (como hacía antes), el
   * texto se vacía, `filtradas()` se recalcula, el panel se re-renderiza con el texto vacío, y el
   * `click` que venía en camino cae sobre una opción distinta (o sobre nada): el usuario ve que
   * su elección se borra sola apenas la toca con el mouse. Con teclado (flechas + Enter) no hay
   * `blur` de por medio, por eso el piloto no lo mostró.
   *
   * Dos guardas, las dos hacen falta:
   * 1. `trigger.panelOpen`: un `blur` con el panel todavía abierto es el `mousedown` de un clic
   *    dentro del panel (confirmado leyendo `autocomplete.mjs`: `MatAutocompleteTrigger` sólo usa
   *    `(blur)` para marcar touched, nunca para cerrar el panel — el panel se cierra por
   *    `optionSelections`, Tab o clic afuera), no una salida real del campo.
   * 2. El `setTimeout`: por si el `blur` llega con el panel ya cerrado por alguna otra vía justo
   *    antes de que la selección termine de correr, se difiere un tick y se vuelve a comprobar
   *    `_valor`/`texto` — si `seleccionar()` corrió en el medio, ya no hay nada que limpiar. No
   *    sacarlo "para simplificar": es la red de respaldo de la guarda de arriba, no un adorno.
   *
   *
   * Con Tab sobre texto que no matchea ninguna opción, el panel ya se cerró en el `keydown` del
   * propio Tab (`MatAutocompleteTrigger._handleKeydown` dispara `_keyManager.onKeydown`, que
   * cierra el panel vía `tabOut` ANTES de que el navegador mueva el foco y dispare `blur`) — así
   * que `trigger.panelOpen` ya es `false` acá y este caso limpia igual que siempre, sin quedar
   * atrapado por la guarda nueva.
   */
  onBlur(trigger: MatAutocompleteTrigger): void {
    this.onTouched();
    if (trigger.panelOpen) return;
    // Hay un id de `writeValue` que todavía no se pudo resolver porque `opciones` no llegó: esto
    // NO es que el usuario haya salido sin elegir, es que el valor real sigue en camino. Limpiar
    // acá manda `null` al form control, y cuando el `effect()` resuelva el id más tarde ya no
    // vuelve a emitir nada — el valor se pierde en silencio aunque la pantalla lo termine
    // mostrando bien. Sin esto, la pantalla parece correcta y el formulario guarda vacío.
    if (this.idPendiente !== undefined) return;
    if (this._valor && this.etiqueta(this._valor) === this.texto()) return;
    // Ya estaba vacío (nunca hubo valor, o se acaba de elegir la opción de vacío): no hay nada
    // que limpiar. Sin este corte, cada blur de un campo vacío reemitía null de nuevo —
    // inofensivo la mayoría de las veces, pero un consumidor que hace `algo.set($event);
    // buscar()` en el mismo handler dispara una consulta de más por cada blur.
    if (this._valor === null && this.texto() === '') return;
    setTimeout(() => {
      if (this._valor && this.etiqueta(this._valor) === this.texto()) return;
      if (this._valor === null && this.texto() === '') return;
      this._valor = null;
      this.texto.set('');
      this.valorChange.emit(null);
      this.onChange(this.salidaCVA(null));
    }, 0);
  }

  foco(): void {
    this.inputRef?.nativeElement.focus();
  }
}

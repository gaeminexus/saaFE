import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatAutocompleteTrigger } from '@angular/material/autocomplete';
import { InlineAutocompleteComponent } from './inline-autocomplete.component';

describe('InlineAutocompleteComponent', () => {
  let fixture: ComponentFixture<InlineAutocompleteComponent>;
  let componente: InlineAutocompleteComponent;

  const OPCIONES = [
    { codigo: 1, nombre: 'Peñafiel' },
    { codigo: 2, nombre: 'Núñez' },
    { codigo: 3, nombre: 'Torres Chávez' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InlineAutocompleteComponent, NoopAnimationsModule],
    }).compileComponents();

    fixture = TestBed.createComponent(InlineAutocompleteComponent);
    componente = fixture.componentInstance;
    fixture.componentRef.setInput('opciones', OPCIONES);
    componente.etiqueta = (item) => item?.nombre ?? '';
    fixture.detectChanges();
  });

  describe('controlId no duplica el id en el DOM (Mike, 2026-08-25: «Nueva línea no hace nada»)', () => {
    /**
     * `id` es un atributo HTML global: aunque el componente declarara `@Input() id`, Angular NO
     * lo retira del elemento anfitrión, así que `<app-inline-autocomplete id="x">` dejaba DOS
     * elementos con `id="x"` — el propio `<app-inline-autocomplete>`, no enfocable, y el
     * `<input>` de dentro. `document.getElementById('x')` devolvía el primero, y `.focus()`
     * sobre él no hacía nada, sin error: el bug real detrás de «Nueva línea no hace nada» — el
     * botón sí llamaba a `focus()`, pero sobre el elemento equivocado. `controlId` no es un
     * atributo nativo, así que no colisiona.
     */
    it('sólo el <input> real lleva el id — nada más en toda la página', () => {
      const fresco = TestBed.createComponent(InlineAutocompleteComponent);
      fresco.componentInstance.controlId = 'campo-de-prueba';
      fresco.detectChanges();

      const coincidencias = fresco.nativeElement.querySelectorAll('#campo-de-prueba');
      expect(coincidencias.length).toBe(1);
      expect(coincidencias[0].tagName).toBe('INPUT');
    });

    it('document.getElementById encuentra el <input> enfocable, no el anfitrión', () => {
      const fresco = TestBed.createComponent(InlineAutocompleteComponent);
      fresco.componentInstance.controlId = 'campo-enfocable';
      document.body.appendChild(fresco.nativeElement);
      fresco.detectChanges();

      const encontrado = document.getElementById('campo-enfocable');
      expect(encontrado?.tagName).toBe('INPUT');

      document.body.removeChild(fresco.nativeElement);
    });
  });

  /**
   * El bug que reportó Mike: al entrar a la pantalla, el clic en Período no desplegaba nada —
   * salvo que se tecleara algo primero. La causa no era el clic ni el foco: `opciones` llegaba
   * después de que `filtradas()` ya se hubiera evaluado una vez con la lista vacía —Período se
   * carga por HTTP, así que en el primer render real casi siempre está vacío—, y un `computed()`
   * que lee un `@Input()` normal no se entera cuando ese `@Input()` cambia después. Aquí se
   * reproduce la carrera sin esperar ningún HTTP: se lee `filtradas()` con la lista vacía —tal
   * como hace la plantilla en el primer render— y **después** llega `opciones`, sin tocar el
   * texto para nada.
   */
  it('si las opciones llegan después del primer render, igual se ven — sin necesidad de teclear', () => {
    const fresco = TestBed.createComponent(InlineAutocompleteComponent);
    const propio = fresco.componentInstance;
    propio.etiqueta = (item) => item?.nombre ?? '';
    fresco.detectChanges();

    // Lo que hace la plantilla en cuanto se monta: leer filtradas() con la lista aún vacía.
    expect(propio.filtradas()).toEqual([]);

    // Las opciones llegan tarde —el HTTP del período resolviendo después del primer render—.
    fresco.componentRef.setInput('opciones', OPCIONES);
    fresco.detectChanges();

    expect(propio.filtradas().map((o: any) => o.nombre)).toEqual(['Peñafiel', 'Núñez', 'Torres Chávez']);
  });

  it('filtra sin importar mayúsculas ni acentos (D14)', () => {
    componente.onTexto('nunez');
    expect(componente.filtradas().map((o) => o.nombre)).toEqual(['Núñez']);

    componente.onTexto('PEÑAFIEL');
    expect(componente.filtradas().map((o) => o.nombre)).toEqual(['Peñafiel']);
  });

  it('seleccionar una opción emite el objeto entero y fija el texto', () => {
    const emitidos: any[] = [];
    componente.valorChange.subscribe((v) => emitidos.push(v));

    componente.seleccionar({ option: { value: OPCIONES[2] } } as any);

    expect(emitidos).toEqual([OPCIONES[2]]);
    expect(componente.texto()).toBe('Torres Chávez');
  });

  it('salir del campo sin elegir de la lista limpia el valor: no se inventa uno libre', (done) => {
    const emitidos: any[] = [];
    componente.valorChange.subscribe((v) => emitidos.push(v));

    componente.onTexto('torres pero sin elegir');
    componente.onBlur({ panelOpen: false } as any);

    // La limpieza se difiere un tick (setTimeout) para que una selección en vuelo pueda ganarle —
    // ver el comentario de `onBlur`. Acá no hay ninguna en vuelo, así que igual limpia.
    setTimeout(() => {
      expect(componente.texto()).toBe('');
      expect(emitidos).toContain(null);
      done();
    }, 0);
  });

  it('salir del campo con un valor ya elegido no lo borra', () => {
    componente.seleccionar({ option: { value: OPCIONES[0] } } as any);
    const emitidos: any[] = [];
    componente.valorChange.subscribe((v) => emitidos.push(v));

    componente.onBlur({ panelOpen: false } as any);

    expect(componente.texto()).toBe('Peñafiel');
    expect(emitidos).toEqual([]);
  });

  it('un blur con el panel todavía abierto (clic en una opción) no limpia nada', (done) => {
    componente.onTexto('mano');
    componente.onBlur({ panelOpen: true } as any);

    setTimeout(() => {
      // Con el panel abierto, `onBlur` corta antes de programar cualquier limpieza — ni siquiera
      // el `setTimeout` llega a correr.
      expect(componente.texto()).toBe('mano');
      done();
    }, 0);
  });

  it('displayWith (mostrar) muestra la etiqueta del ítem y no revienta con null', () => {
    expect(componente.mostrar(OPCIONES[0])).toBe('Peñafiel');
    expect(componente.mostrar(null)).toBe('');
  });

  it('displayWith (mostrar) devuelve un string tal cual, sin pasarlo por `etiqueta`', () => {
    // `MatAutocompleteTrigger` termina llamando a `mostrar` también con el string de `texto()`
    // (ver el comentario de `mostrar`) — si esto llamara a `etiqueta` con un string, `etiqueta`
    // recibiría algo que no es su ítem esperado y devolvería vacío, autoborrando el campo.
    expect(componente.mostrar('un texto cualquiera')).toBe('un texto cualquiera');
  });

  it('asignar `valor` desde fuera precarga el texto', () => {
    componente.valor = OPCIONES[1];
    expect(componente.texto()).toBe('Núñez');
  });

  describe('el panel se abre al enfocar/pinchar, no sólo al teclear (Mike, 2026-08-25)', () => {
    /**
     * `MatAutocomplete` sólo abre el panel con un evento `input` por defecto. Un clic en el
     * campo de Período no dispara eso, así que sin abrir el panel a mano en foco/clic, la lista
     * no aparece hasta que se teclea algo — que es exactamente lo que reportó Mike.
     */
    function trigger(): MatAutocompleteTrigger {
      return fixture.debugElement.query(By.directive(MatAutocompleteTrigger)).injector.get(MatAutocompleteTrigger);
    }

    it('el foco abre el panel', () => {
      const abrir = spyOn(trigger(), 'openPanel');
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

      input.dispatchEvent(new Event('focus'));

      expect(abrir).toHaveBeenCalled();
    });

    it('el clic abre el panel', () => {
      const abrir = spyOn(trigger(), 'openPanel');
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

      input.dispatchEvent(new Event('click'));

      expect(abrir).toHaveBeenCalled();
    });
  });

  describe('modo="campo" — los combos de cabecera (Ejercicio, Período)', () => {
    it('por defecto es "celda": sin mat-form-field ni mat-label', () => {
      expect(fixture.nativeElement.querySelector('mat-form-field')).toBeNull();
    });

    it('con modo="campo" envuelve en mat-form-field con la etiqueta flotante', () => {
      componente.modo = 'campo';
      componente.etiquetaCampo = 'Ejercicio';
      fixture.detectChanges();

      const formField = fixture.nativeElement.querySelector('mat-form-field');
      expect(formField).not.toBeNull();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ejercicio');
    });

    it('sigue filtrando y emitiendo igual en modo="campo"', () => {
      componente.modo = 'campo';
      fixture.detectChanges();
      const emitidos: any[] = [];
      componente.valorChange.subscribe((v) => emitidos.push(v));

      componente.onTexto('nunez');
      expect(componente.filtradas().map((o) => o.nombre)).toEqual(['Núñez']);

      componente.seleccionar({ option: { value: OPCIONES[1] } } as any);
      expect(emitidos).toEqual([OPCIONES[1]]);
    });
  });

  describe('clic real en una opción del panel (Mike, 2026-09-08: "elige y se borra")', () => {
    /**
     * Las pruebas de arriba llaman `componente.seleccionar(...)`/`onTexto(...)` directo: nunca
     * pasan por el `<input [ngModel]="texto()">` real ni por `MatAutocompleteTrigger`, que es
     * quien de verdad controla el `value` del DOM y quien registra su propio
     * `NG_VALUE_ACCESSOR` en el mismo `<input>` (`MAT_AUTOCOMPLETE_VALUE_ACCESSOR`,
     * `autocomplete.mjs`). Como `selectValueAccessor` de `@angular/forms` prefiere el accessor
     * "custom" (el del trigger) sobre el `DefaultValueAccessor`, `[ngModel]="texto()"` en verdad
     * escribe a través de `MatAutocompleteTrigger.writeValue`, que reenvía a `displayWith` — así
     * que agregar `[displayWith]="mostrar"` podía, en teoría, romper la ruta normal si `mostrar`
     * llegara a recibir el string de `texto()` en vez del ítem. Esta prueba hace el clic real
     * sobre una opción del overlay (no una llamada directa a `seleccionar()`) para comprobar en
     * el DOM de verdad que el input queda con la etiqueta correcta y no con `[object Object]`, y
     * que después se puede seguir tecleando sin que quede corrompido.
     */
    it('clic en una opción dentro del panel: el input muestra la etiqueta, no [object Object]', fakeAsync(() => {
      componente.modo = 'campo';
      fixture.detectChanges();

      const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
      input.dispatchEvent(new Event('focus'));
      input.value = 'nunez';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      tick();

      const opcion = document.querySelector('.mat-mdc-option') as HTMLElement;
      expect(opcion).withContext('el panel debe tener la opción "Núñez" renderizada').not.toBeNull();
      opcion.click();
      fixture.detectChanges();
      tick();
      fixture.detectChanges();
      tick();

      expect(input.value).toBe('Núñez');
      expect(componente.texto()).toBe('Núñez');

      // Sigue andando después: no quedó ningún estado corrompido por el `displayWith`.
      input.value = 'torres';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      tick();

      expect(input.value).toBe('torres');
      expect(componente.texto()).toBe('torres');
      expect(componente.filtradas().map((o) => o.nombre)).toEqual(['Torres Chávez']);

      // Limpiar los timers/overlay pendientes para no filtrar el `fakeAsync`.
      document.body.click();
      tick(1000);
    }));
  });
});

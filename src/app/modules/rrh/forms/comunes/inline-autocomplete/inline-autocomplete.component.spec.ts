import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
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
    componente.opciones = OPCIONES;
    componente.etiqueta = (item) => item?.nombre ?? '';
    fixture.detectChanges();
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

  it('salir del campo sin elegir de la lista limpia el valor: no se inventa uno libre', () => {
    const emitidos: any[] = [];
    componente.valorChange.subscribe((v) => emitidos.push(v));

    componente.onTexto('torres pero sin elegir');
    componente.onBlur();

    expect(componente.texto()).toBe('');
    expect(emitidos).toContain(null);
  });

  it('salir del campo con un valor ya elegido no lo borra', () => {
    componente.seleccionar({ option: { value: OPCIONES[0] } } as any);
    const emitidos: any[] = [];
    componente.valorChange.subscribe((v) => emitidos.push(v));

    componente.onBlur();

    expect(componente.texto()).toBe('Peñafiel');
    expect(emitidos).toEqual([]);
  });

  it('asignar `valor` desde fuera precarga el texto', () => {
    componente.valor = OPCIONES[1];
    expect(componente.texto()).toBe('Núñez');
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
});

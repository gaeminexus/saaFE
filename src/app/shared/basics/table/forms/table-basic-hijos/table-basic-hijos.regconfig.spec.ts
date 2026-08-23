import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { AccionesGrid } from '../../../constantes';
import { AddTableDialogComponent } from '../../dialogs/add-table/add-table-dialog.component';
import { EditTableDialogComponent } from '../../dialogs/edit-table/edit-table-dialog.component';
import { FieldConfig } from '../../dynamic-form/model/field.interface';
import { TableConfig } from '../../model/table-interface';
import { TableBasicHijosComponent } from './table-basic-hijos.component';

/**
 * D23 · «Agregar Registro» tras «Editar» tiene que abrir limpio.
 *
 * Los dos diálogos escriben **dentro** de los `FieldConfig` (`val.value`, `val.selected`), así
 * que compartir la instancia dejaba los valores del registro editado pegados en la configuración
 * y el alta siguiente nacía precargada con ellos. La mutación es sobre el objeto, de modo que
 * reasignar el array no la deshacía: hay que separar los objetos.
 *
 * Se prueba contra lo que recibe el diálogo —el `data.regConfig` con el que se abre—, que es el
 * único sitio donde la contaminación es observable sin montar la pantalla entera.
 */
describe('TableBasicHijosComponent · regConfig por diálogo', () => {
  let fixture: ComponentFixture<TableBasicHijosComponent>;
  let componente: TableBasicHijosComponent;
  let aperturas: Array<{ tipo: any; data: any }>;

  /** Colección compartida por los combos: tiene que seguir siendo **la misma** instancia. */
  const COLECCION = [
    { codigo: 'S', descripcion: 'Sí' },
    { codigo: 'N', descripcion: 'No' },
  ];

  function configuracion(): TableConfig {
    const regConfig: FieldConfig[] = [
      { type: 'input', name: 'descripcion', label: 'Descripción', inputType: 'text' },
      { type: 'input', name: 'valor', label: 'Valor', inputType: 'number' },
      {
        type: 'select',
        name: 'aprobada',
        label: 'Aprobada para el cálculo',
        value: null,
        autocompleteType: 1,
        selectField: ['descripcion'],
        collections: COLECCION,
      },
    ];
    return {
      entidad: 1,
      titulo: 'Prueba',
      registros: [],
      fields: [{ column: 'descripcion', header: 'Descripción' }],
      regConfig,
      add: true,
      edit: true,
    } as unknown as TableConfig;
  }

  beforeEach(async () => {
    aperturas = [];

    await TestBed.configureTestingModule({
      imports: [TableBasicHijosComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TableBasicHijosComponent);
    componente = fixture.componentInstance;
    // El diálogo no se abre de verdad: sólo se retiene con qué lo abrieron.
    spyOn(componente.dialog, 'open').and.callFake((tipo: any, opciones: any) => {
      aperturas.push({ tipo, data: opciones.data });
      return { afterClosed: () => ({ subscribe: () => undefined }) } as any;
    });

    componente.configTable = configuracion();
    componente.ngOnInit();
    fixture.detectChanges();
  });

  it('el alta que sigue a una edición abre con los campos vacíos', () => {
    // 1 · Se edita una fila. `asignaValoresaForm` escribirá dentro de los FieldConfig que reciba.
    componente.edit({ codigo: 7, descripcion: 'Prestamo hipotecario IESS', valor: 490, aprobada: 'S' });
    const configEdicion = aperturas[0].data.regConfig as FieldConfig[];
    expect(aperturas[0].tipo).toBe(EditTableDialogComponent);
    expect(aperturas[0].data.accion).toBe(AccionesGrid.EDIT);

    const dialogoEdicion = new EditTableDialogComponent({} as any, aperturas[0].data);
    dialogoEdicion.asignaValoresaForm();

    // La mutación ocurre, y ocurre sobre la copia: es lo que el diálogo necesita para pintarse.
    expect(configEdicion.find((c) => c.name === 'descripcion')!.value)
      .toBe('Prestamo hipotecario IESS');

    // 2 · Se abre el alta inmediatamente después, y se deja que haga lo suyo.
    //     `asignaValoresaForm` del alta **respeta** cualquier valor que no sea nulo, así que si
    //     la contaminación llegara hasta aquí no la limpiaría: la daría por un valor por defecto.
    componente.add();
    const configAlta = aperturas[1].data.regConfig as FieldConfig[];
    expect(aperturas[1].tipo).toBe(AddTableDialogComponent);
    new AddTableDialogComponent({} as any, aperturas[1].data).asignaValoresaForm();

    // 3 · Y llega limpia: ni el texto, ni el importe, ni la aprobación del registro editado.
    expect(configAlta.find((c) => c.name === 'descripcion')!.value).toBeNull();
    expect(configAlta.find((c) => c.name === 'valor')!.value).toBeNull();
    expect(configAlta.find((c) => c.name === 'aprobada')!.value).toBeNull();
    expect(configAlta.find((c) => c.name === 'descripcion')!.selected).toBeUndefined();
  });

  it('cada apertura recibe objetos propios, no los del `configTable`', () => {
    const original = componente.configTable.regConfig!;

    componente.add();
    componente.edit({ codigo: 7 });

    const configAlta = aperturas[0].data.regConfig as FieldConfig[];
    const configEdicion = aperturas[1].data.regConfig as FieldConfig[];

    expect(configAlta).not.toBe(original);
    expect(configEdicion).not.toBe(configAlta);
    configAlta.forEach((campo, i) => {
      expect(campo).not.toBe(original[i]);
      expect(campo).not.toBe(configEdicion[i]);
    });
  });

  it('la copia es superficial: las `collections` se siguen compartiendo', () => {
    componente.add();
    const configAlta = aperturas[0].data.regConfig as FieldConfig[];

    // Copiar las listas de los combos por diálogo sería caro y no aporta nada: nadie las muta
    // por fila. Lo que se separa es exactamente lo que los diálogos escriben.
    expect(configAlta.find((c) => c.name === 'aprobada')!.collections).toBe(COLECCION);
  });

  it('la edición no contamina el `configTable` de la pantalla', () => {
    componente.edit({ codigo: 7, descripcion: 'Prestamo hipotecario IESS', valor: 490 });
    const dialogoEdicion = new EditTableDialogComponent({} as any, aperturas[0].data);
    dialogoEdicion.asignaValoresaForm();

    const original = componente.configTable.regConfig!;
    expect(original.find((c) => c.name === 'descripcion')!.value).toBeUndefined();
    expect(original.find((c) => c.name === 'valor')!.value).toBeUndefined();
  });
});

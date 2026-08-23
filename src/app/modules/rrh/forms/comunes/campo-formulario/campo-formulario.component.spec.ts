import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { APP_DATE_FORMATS, EsDateAdapter } from '../../../../../shared/providers/material.providers';
import { CampoFormularioComponent } from './campo-formulario.component';
import { CampoFormulario } from '../modelo-formulario';

/**
 * Los tres defectos que este componente arrastraba, cada uno con su comprobación.
 *
 * Se prueban contra el componente y no contra la pantalla, que es la misma disciplina que sigue
 * la réplica: el valor se lee del control, nunca de lo que se ve.
 */
describe('CampoFormularioComponent', () => {
  let fixture: ComponentFixture<CampoFormularioComponent>;
  let componente: CampoFormularioComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CampoFormularioComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
        { provide: DateAdapter, useClass: EsDateAdapter, deps: [MAT_DATE_LOCALE] },
        { provide: MAT_DATE_FORMATS, useValue: APP_DATE_FORMATS },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CampoFormularioComponent);
    componente = fixture.componentInstance;
  });

  function montar(campo: CampoFormulario, valorInicial: any = null): FormGroup {
    const formulario = new FormGroup({
      [campo.name]: new FormControl(valorInicial, campo.requerido ? Validators.required : []),
    });
    componente.campo = campo;
    componente.formulario = formulario;
    fixture.detectChanges();
    return formulario;
  }

  describe('combo de referencia', () => {
    const CONTRATOS = [
      { codigo: 1, numero: 'CT-0102030405', empleado: { codigo: 7 }, fechaInicio: [2025, 6, 25] },
      { codigo: 2, numero: 'CT-0908070605', empleado: { codigo: 9 }, fechaInicio: [2024, 1, 3] },
    ];

    const CAMPO: CampoFormulario = {
      name: 'contrato',
      label: 'Contrato',
      tipo: 'referencia',
      coleccion: CONTRATOS,
      buscarPor: ['numero', 'fechaInicio'],
    };

    // D9: acotar la colección desde el padre tiene que verse en el desplegable sin teclear nada.
    it('sirve la colección nueva en cuanto el padre la acota', () => {
      montar(CAMPO);
      expect(componente.sugerencias().length).toBe(2);

      componente.campo = { ...CAMPO, coleccion: [CONTRATOS[0]] };
      fixture.detectChanges();

      expect(componente.sugerencias().length).toBe(1);
      expect(componente.sugerencias()[0].codigo).toBe(1);
    });

    // D10: la fecha del backend llega como arreglo y se pintaba `2025,6,25`.
    it('pinta la fecha del backend como dd/MM/yyyy, no como arreglo crudo', () => {
      montar(CAMPO);
      expect(componente.etiquetaDe(CONTRATOS[0])).toBe('CT-0102030405 · 25/06/2025');
    });

    // D14: el filtro tiene que ser indiferente a mayúsculas y a acentos, en los dos sentidos.
    it('encuentra sin importar mayúsculas ni acentos', () => {
      const campo: CampoFormulario = {
        name: 'causal',
        label: 'Causal',
        tipo: 'referencia',
        coleccion: [{ codigo: 1, nombre: 'Renuncia voluntaria', articulo: 'Art. 169 num. 2' }],
        buscarPor: ['nombre', 'articulo'],
      };
      montar(campo);

      componente.alTeclear('renuncia');
      expect(componente.sugerencias().length).toBe(1);

      componente.alTeclear('RENUNCIA');
      expect(componente.sugerencias().length).toBe(1);

      componente.alTeclear('RENÚNCIA');
      expect(componente.sugerencias().length).toBe(1);
    });
  });

  describe('campo de fecha', () => {
    const CAMPO: CampoFormulario = {
      name: 'fechaSalida',
      label: 'Fecha de salida',
      tipo: 'fecha',
      requerido: true,
    };

    // D16: el control del formulario sigue guardando `yyyy-MM-dd`, que es lo que espera el
    // backend; lo único que cambia es el control con el que se teclea.
    it('siembra el datepicker desde el `yyyy-MM-dd` del formulario sin perder un día', () => {
      montar(CAMPO, '2026-01-15');

      const fecha = componente.controlFecha.value!;
      expect(fecha.getFullYear()).toBe(2026);
      expect(fecha.getMonth()).toBe(0);
      expect(fecha.getDate()).toBe(15);
    });

    it('devuelve `yyyy-MM-dd` en hora local al formulario', () => {
      const formulario = montar(CAMPO, null);

      componente.controlFecha.setValue(new Date(2026, 0, 15));

      expect(formulario.get('fechaSalida')!.value).toBe('2026-01-15');
    });

    // D15, en su forma de aquí: un texto que no llega a ser fecha deja el campo inválido, nunca
    // relleno con un valor plausible.
    it('marca el campo como ilegible cuando el texto no parsea, y no lo rellena', () => {
      const formulario = montar(CAMPO, null);
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

      input.value = '1/31/2026';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('change'));
      input.dispatchEvent(new FocusEvent('blur'));
      fixture.detectChanges();

      expect(componente.controlFecha.value).toBeNull();
      expect(componente.controlFecha.hasError('fechaIlegible')).toBeTrue();
      expect(formulario.get('fechaSalida')!.value).toBeNull();
      expect(formulario.valid).toBeFalse();
    });

    it('acepta el mismo texto leído en dd/mm/aaaa', () => {
      const formulario = montar(CAMPO, null);
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

      input.value = '31/01/2026';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('change'));
      input.dispatchEvent(new FocusEvent('blur'));
      fixture.detectChanges();

      expect(formulario.get('fechaSalida')!.value).toBe('2026-01-31');
      expect(componente.controlFecha.hasError('fechaIlegible')).toBeFalse();
    });
  });
});

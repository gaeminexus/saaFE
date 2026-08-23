import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { APP_DATE_FORMATS, EsDateAdapter } from '../../../../../providers/material.providers';
import { FormControl, FormGroup } from '@angular/forms';

import { DateComponent } from './date.component';

describe('DateComponent', () => {
  let component: DateComponent;
  let fixture: ComponentFixture<DateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateComponent, NoopAnimationsModule],
      // El spec original no los declaraba y fallaba con NG0201 antes de tocar nada:
      // `FuncionesDatosService -> DetalleRubroService -> HttpClient`.
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
        { provide: DateAdapter, useClass: EsDateAdapter, deps: [MAT_DATE_LOCALE] },
        { provide: MAT_DATE_FORMATS, useValue: APP_DATE_FORMATS },
      ],
    })
    .compileComponents();

    fixture = TestBed.createComponent(DateComponent);
    component = fixture.componentInstance;
    // El spec original tampoco los asignaba, así que `ngOnInit` reventaba en `this.group.get`.
    component.field = { type: 'date', name: 'fechaInicio', label: 'Fecha de inicio' } as any;
    component.group = new FormGroup({ fechaInicio: new FormControl<Date | null>(null) });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  /**
   * `dateChange` llega con `null` cuando el texto no parsea —el adaptador devuelve `null` y
   * Material lo propaga—. Antes se sustituía por `new Date()`, y el campo quedaba relleno con la
   * fecha de hoy sin marcar nada: un período «del 1 de enero al 21 de agosto» que se veía
   * perfectamente bien.
   */
  it('no sustituye por la fecha de hoy cuando la fecha no es válida', () => {
    component.field = { type: 'date', name: 'fechaInicio', label: 'Fecha de inicio' } as any;
    component.group = new FormGroup({ fechaInicio: new FormControl<Date | null>(null) });
    component.ngOnInit();

    component.onFechaPickerChange(null);
    expect(component.group.get('fechaInicio')!.value).toBeNull();

    component.onFechaPickerChange(new Date(NaN));
    expect(component.group.get('fechaInicio')!.value).toBeNull();
  });

  it('acepta una fecha válida', () => {
    component.field = { type: 'date', name: 'fechaInicio', label: 'Fecha de inicio' } as any;
    component.group = new FormGroup({ fechaInicio: new FormControl<Date | null>(null) });
    component.ngOnInit();

    const fecha = new Date(2026, 3, 30);
    component.onFechaPickerChange(fecha);
    expect(component.group.get('fechaInicio')!.value).toBe(fecha);
  });
});

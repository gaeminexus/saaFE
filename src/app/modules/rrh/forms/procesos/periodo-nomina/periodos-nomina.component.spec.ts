import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import { PeriodosNominaComponent } from './periodos-nomina.component';

/**
 * Períodos de nómina · D15 (la mitad que vive aquí), D20 y D21.
 */
describe('PeriodosNominaComponent', () => {
  let fixture: ComponentFixture<PeriodosNominaComponent>;
  let componente: PeriodosNominaComponent;
  let periodos$: Subject<any[]>;

  const PERIODOS = [
    { codigo: 1, anio: 2026, mes: 1, estado: 7, modo: 1, tipoPeriodo: 1, totalNeto: 16476.92 },
    { codigo: 41, anio: 2026, mes: 4, estado: 7, modo: 1, tipoPeriodo: 1, totalNeto: 16089.22 },
  ];

  beforeEach(async () => {
    periodos$ = new Subject<any[]>();

    await TestBed.configureTestingModule({
      imports: [PeriodosNominaComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PeriodoNominaService, useValue: { selectByCriteria: () => periodos$.asObservable() } },
        { provide: DetalleRubroService, useValue: { getDescripcionByParentAndAlterno: () => 'CERRADO' } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: MatSnackBar, useValue: { open: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PeriodosNominaComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
    periodos$.next(PERIODOS);
    fixture.detectChanges();
  });

  function campoDe(nombre: string): any {
    return componente.tableConfig!.regConfig!.find((c: any) => c.name === nombre);
  }

  describe('D15 · las fechas del alta', () => {
    /**
     * La guarda de `DateComponent` impide que una fecha ilegible se sustituya por la de hoy, pero
     * el adaptador devuelve `null` y un `null` es indistinguible de un campo vacío. Sin
     * `required` aquí, la fecha mal tecleada viajaría como nulo y `saveSingle` no valida nada.
     */
    it('las dos son obligatorias', () => {
      for (const nombre of ['fechaInicio', 'fechaFin']) {
        const campo = campoDe(nombre);
        expect(campo.type).toBe('date');
        expect(campo.validations?.some((v: any) => v.name === 'required'))
          .withContext(`${nombre} tiene que ser obligatorio`)
          .toBeTrue();
      }
    });

    it('dicen su patrón, que es lo que evita el rodeo de teclear primero el día 30', () => {
      expect(campoDe('fechaInicio').label).toContain('dd/mm/aaaa');
      expect(campoDe('fechaFin').label).toContain('dd/mm/aaaa');
    });
  });

  describe('D20 · el ejercicio en el diálogo', () => {
    it('la etiqueta del mes lleva el año, que no es un campo del diálogo', () => {
      expect(campoDe('mes').label).toBe(`Mes (1 a 12) del ejercicio ${componente.anio()}`);
    });

    it('y sigue al selector de la cabecera cuando cambia', () => {
      componente.onAnioChange(2025);
      periodos$.next(PERIODOS);
      fixture.detectChanges();

      expect(campoDe('mes').label).toContain('2025');
    });
  });

  describe('D21 · el código del período', () => {
    it('tiene columna propia en la rejilla', () => {
      const columnas = componente.tableConfig!.fields!.map((f: any) => f.column);
      expect(columnas).toContain('codigo');
      // Y va primero: es lo que se copia para las consultas de verificación.
      expect(columnas[0]).toBe('codigo');
    });

    it('llega con el valor de PRDNCDGO, que no es deducible del mes', () => {
      const filas = componente.tableConfig!.registros as any[];
      expect(filas.map((f) => f.codigo)).toEqual([1, 41]);
    });
  });
});

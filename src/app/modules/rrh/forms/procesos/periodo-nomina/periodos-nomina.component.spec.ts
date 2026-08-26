import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import { PeriodosNominaComponent } from './periodos-nomina.component';

/**
 * Períodos de nómina · rediseño 2026-08-26, vista de año.
 *
 * D15 (fechas obligatorias), D20 (el ejercicio no es un campo del diálogo) y D21 (el código
 * siempre a la vista) son la lógica heredada — se comprueba que sobrevivió al traslado, ahora
 * imposibles por construcción en vez de parcheados. Lo demás es nuevo: varios períodos por mes,
 * distinguidos por tipo, y el alta que no se pierde si el servidor la rechaza.
 */
describe('PeriodosNominaComponent', () => {
  let fixture: ComponentFixture<PeriodosNominaComponent>;
  let componente: PeriodosNominaComponent;
  let periodos$: Subject<any[]>;
  let periodoNominaService: { selectByCriteria: jasmine.Spy; add: jasmine.Spy };
  let router: { navigate: jasmine.Spy };

  const TIPO_MENSUAL = { codigo: 1, codigoAlterno: 1, descripcion: 'Mensual', rubro: { codigoAlterno: 212 } };
  const TIPO_DECIMO_TERCERO = { codigo: 2, codigoAlterno: 3, descripcion: 'Décimo tercero', rubro: { codigoAlterno: 212 } };
  const MODO_HISTORICO = { codigo: 1, codigoAlterno: 1, descripcion: 'Histórico sin contabilizar', rubro: { codigoAlterno: 184 } };
  const MODO_PRODUCTIVO = { codigo: 2, codigoAlterno: 2, descripcion: 'Productivo contabiliza', rubro: { codigoAlterno: 184 } };

  const PERIODO_MENSUAL_ABRIL = { codigo: 41, anio: 2026, mes: 4, estado: 7, modo: 1, tipoPeriodo: 1, totalNeto: 16089.22, numeroEmpleados: 20 };
  // El mismo mes, otro tipo — la razón de fondo del rediseño: (empresa, año, mes, tipo), no (empresa, año, mes).
  const PERIODO_DECIMO_ABRIL = { codigo: 45, anio: 2026, mes: 4, estado: 1, modo: 1, tipoPeriodo: 3, totalNeto: 0, numeroEmpleados: 0 };

  beforeEach(async () => {
    periodos$ = new Subject<any[]>();
    periodoNominaService = {
      selectByCriteria: jasmine.createSpy('selectByCriteria').and.returnValue(periodos$.asObservable()),
      add: jasmine.createSpy('add'),
    };
    router = { navigate: jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true)) };

    await TestBed.configureTestingModule({
      imports: [PeriodosNominaComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PeriodoNominaService, useValue: periodoNominaService },
        {
          provide: DetalleRubroService,
          useValue: {
            getDetallesByParent: (idPadre: number) =>
              idPadre === 212 ? [TIPO_MENSUAL, TIPO_DECIMO_TERCERO] : [MODO_HISTORICO, MODO_PRODUCTIVO],
            getDescripcionByParentAndAlterno: (idPadre: number, alterno: number) => {
              if (idPadre === 212) return alterno === 1 ? 'Mensual' : 'Décimo tercero';
              if (idPadre === 184) return alterno === 1 ? 'Histórico sin contabilizar' : 'Productivo contabiliza';
              if (idPadre === 182) return 'Cerrado';
              return '';
            },
          },
        },
        { provide: Router, useValue: router },
        { provide: MatSnackBar, useValue: { open: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PeriodosNominaComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  function cargar(periodos: any[]): void {
    periodos$.next(periodos);
    fixture.detectChanges();
  }

  describe('D21 · el código siempre a la vista', () => {
    it('cada tarjeta trae su PRDN, sin esperar a abrir el panel', () => {
      cargar([PERIODO_MENSUAL_ABRIL]);

      const codigos = componente.periodosDelMes(4).map((p) => p.codigo);
      expect(codigos).toEqual([41]);
      expect(texto()).toContain('PRDN 41');
    });
  });

  describe('D20 · el ejercicio no es un campo del alta', () => {
    it('crear un período no pide el año: sale del contexto de la pantalla', () => {
      cargar([]);
      componente.abrirCreacion(4);

      expect(Object.keys(componente.formulario!.controls)).not.toContain('anio');
      expect(Object.keys(componente.formulario!.controls)).not.toContain('mes');
    });

    it('el cuerpo que se envía sí lleva el año y el mes, tomados del contexto', () => {
      periodoNominaService.add.and.returnValue(of({ codigo: 99, anio: 2026, mes: 4, estado: 1 }));
      cargar([]);
      componente.abrirCreacion(4);
      componente.formulario!.patchValue({
        fechaInicio: new Date(2026, 3, 1),
        fechaFin: new Date(2026, 3, 30),
        tipoPeriodo: TIPO_MENSUAL,
        modo: MODO_HISTORICO,
      });

      componente.confirmarCreacion();

      const cuerpo = periodoNominaService.add.calls.mostRecent().args[0];
      expect(cuerpo.anio).toBe(2026);
      expect(cuerpo.mes).toBe(4);
    });
  });

  describe('Varios períodos por mes, con el tipo a la vista — Corrección 1', () => {
    it('un MENSUAL y un DÉCIMO TERCERO del mismo mes coexisten, cada uno con su tarjeta', () => {
      cargar([PERIODO_MENSUAL_ABRIL, PERIODO_DECIMO_ABRIL]);

      const codigos = componente.periodosDelMes(4).map((p) => p.codigo);
      expect(codigos).toEqual([41, 45]);
    });

    it('el tipo se lee en cada tarjeta, no hay que abrir nada', () => {
      cargar([PERIODO_MENSUAL_ABRIL, PERIODO_DECIMO_ABRIL]);

      expect(texto()).toContain('Mensual');
      expect(texto()).toContain('Décimo tercero');
    });
  });

  describe('Alta en línea — el formulario no se pierde si el servidor rechaza', () => {
    it('con las fechas y el tipo completos, agrega con el mes del contenedor', () => {
      periodoNominaService.add.and.returnValue(of({ codigo: 99, anio: 2026, mes: 4, estado: 1, tipoPeriodo: 1, modo: 1 }));
      cargar([]);
      componente.abrirCreacion(4);
      componente.formulario!.patchValue({
        fechaInicio: new Date(2026, 3, 1),
        fechaFin: new Date(2026, 3, 30),
        tipoPeriodo: TIPO_MENSUAL,
        modo: MODO_HISTORICO,
      });

      componente.confirmarCreacion();

      expect(periodoNominaService.add).toHaveBeenCalledTimes(1);
      expect(componente.periodos().find((p) => p.codigo === 99)).toBeTruthy();
      expect(componente.creandoEnMes()).toBeNull();
    });

    it('sin tipo elegido, no llama al servicio y marca el formulario', () => {
      cargar([]);
      componente.abrirCreacion(4);
      componente.formulario!.patchValue({
        fechaInicio: new Date(2026, 3, 1),
        fechaFin: new Date(2026, 3, 30),
      });

      componente.confirmarCreacion();

      expect(periodoNominaService.add).not.toHaveBeenCalled();
      expect(componente.formulario!.get('tipoPeriodo')?.touched).toBeTrue();
    });

    it('si el servidor rechaza, el formulario sigue abierto con lo tecleado', () => {
      periodoNominaService.add.and.returnValue(throwError(() => 'Ya existe un período de ese tipo para ese mes'));
      cargar([]);
      componente.abrirCreacion(4);
      componente.formulario!.patchValue({
        fechaInicio: new Date(2026, 3, 1),
        fechaFin: new Date(2026, 3, 30),
        tipoPeriodo: TIPO_MENSUAL,
        modo: MODO_HISTORICO,
      });

      componente.confirmarCreacion();

      expect(componente.errorCreacion()).toBe('Ya existe un período de ese tipo para ese mes');
      expect(componente.creandoEnMes()).toBe(4);
      expect(componente.formulario!.get('tipoPeriodo')?.value).toEqual(TIPO_MENSUAL);
    });
  });

  describe('El ejercicio se busca tecleando', () => {
    it('elegir un año inválido (sin seleccionar de la lista) no cambia el ejercicio actual', () => {
      const original = componente.anio();
      componente.onEjercicioSeleccionado(null);
      expect(componente.anio()).toBe(original);
    });
  });

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});

import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';

import { APP_DATE_FORMATS, EsDateAdapter } from '../../../../../shared/providers/material.providers';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { CausalTerminacionService } from '../../../service/causal-terminacion.service';
import { ContratoEmpleadoService } from '../../../service/contrato-empleado.service';
import { DetalleLiquidacionService } from '../../../service/detalle-liquidacion.service';
import { EmpleadoService } from '../../../service/empleado.service';
import { LiquidacionService } from '../../../service/liquidacion.service';
import { LiquidacionFormComponent } from './liquidacion-form.component';

/**
 * Nuevo finiquito · D11 (defecto 7) y la guarda de pertenencia de D9.
 */
describe('LiquidacionFormComponent', () => {
  let fixture: ComponentFixture<LiquidacionFormComponent>;
  let componente: LiquidacionFormComponent;
  let parametros$: BehaviorSubject<any>;
  let avisos: string[];
  let liquidacionService: any;

  const TORRES = { codigo: 45, identificacion: '1701020304', apellidos: 'TORRES CHAVEZ', nombres: 'ROSA' };
  const CASTRO = { codigo: 50, identificacion: '0602237265', apellidos: 'CASTRO ARCE', nombres: 'LUIS' };

  const CONTRATO_DE_TORRES = { codigo: 2, numero: 'CT-1701020304', empleado: TORRES, fechaInicio: [2020, 1, 1] };
  const CONTRATO_DE_CASTRO = { codigo: 8, numero: 'CT-0602237265', empleado: CASTRO, fechaInicio: [2025, 6, 25] };

  const CAUSAL = { codigo: 3, nombre: 'Renuncia voluntaria', articulo: 'Art. 169 num. 2' };

  const FINIQUITO_1 = {
    codigo: 1,
    empleado: TORRES,
    estado: 2,
    neto: 7556.41,
    fechaSalida: [2026, 1, 15],
  };

  function conRuta(codigo: string): void {
    parametros$ = new BehaviorSubject(convertToParamMap({ codigo }));
  }

  beforeEach(async () => {
    avisos = [];
    conRuta('nuevo');

    liquidacionService = {
      getById: (id: number) => of({ ...FINIQUITO_1, codigo: id }),
      simular: jasmine.createSpy('simular').and.returnValue(of({ rubros: [], neto: 0 })),
      calcular: jasmine.createSpy('calcular').and.returnValue(of({ codigo: 1 })),
    };

    await TestBed.configureTestingModule({
      imports: [LiquidacionFormComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MAT_DATE_LOCALE, useValue: 'es-EC' },
        { provide: DateAdapter, useClass: EsDateAdapter, deps: [MAT_DATE_LOCALE] },
        { provide: MAT_DATE_FORMATS, useValue: APP_DATE_FORMATS },
        { provide: ActivatedRoute, useValue: { get paramMap() { return parametros$.asObservable(); } } },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: LiquidacionService, useValue: liquidacionService },
        { provide: DetalleLiquidacionService, useValue: { selectByCriteria: () => of([]) } },
        { provide: EmpleadoService, useValue: { selectByCriteria: () => of([TORRES, CASTRO]) } },
        {
          provide: ContratoEmpleadoService,
          useValue: { selectByCriteria: () => of([CONTRATO_DE_TORRES, CONTRATO_DE_CASTRO]) },
        },
        { provide: CausalTerminacionService, useValue: { selectByCriteria: () => of([CAUSAL]) } },
        { provide: DetalleRubroService, useValue: { getDescripcionByParentAndAlterno: () => 'CALCULADA' } },
        { provide: MatSnackBar, useValue: { open: (m: string) => avisos.push(m) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LiquidacionFormComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('D11 · la vista tras «Calcular y guardar»', () => {
    /**
     * `calcular()` navega de `/liquidacion/nuevo` a `/liquidacion/1` con **el mismo componente**:
     * Angular reutiliza la instancia y `ngOnInit` no vuelve a correr. Leyendo el id del
     * `snapshot` una sola vez, la pantalla se quedaba en «Nuevo finiquito».
     */
    it('deja de ser «Nuevo finiquito» cuando la ruta cambia al id guardado', () => {
      expect(componente.esNuevo()).toBeTrue();
      expect(componente.titulo()).toBe('Nuevo finiquito');
      expect(componente.etiquetaEstado()).toBe('Sin calcular');

      parametros$.next(convertToParamMap({ codigo: '1' }));
      fixture.detectChanges();

      expect(componente.esNuevo()).toBeFalse();
      expect(componente.titulo()).toBe('Finiquito 1');
      expect(componente.liquidacion()!.codigo).toBe(1);
    });

    it('el pie deja de decir que no se ha guardado nada', () => {
      componente.formulario.patchValue({
        empleado: TORRES,
        contrato: CONTRATO_DE_TORRES,
        fechaSalida: '2026-01-15',
        causal: CAUSAL,
      });
      componente.simular();
      fixture.detectChanges();
      expect(textoDeLaPantalla()).toContain('Simulación: todavía no se ha guardado nada');

      parametros$.next(convertToParamMap({ codigo: '1' }));
      fixture.detectChanges();

      expect(componente.simulacion()).toBeNull();
      expect(textoDeLaPantalla()).not.toContain('todavía no se ha guardado nada');
    });

    it('y vuelve a «Nuevo finiquito» si se navega de vuelta', () => {
      parametros$.next(convertToParamMap({ codigo: '1' }));
      fixture.detectChanges();
      expect(componente.esNuevo()).toBeFalse();

      parametros$.next(convertToParamMap({ codigo: 'nuevo' }));
      fixture.detectChanges();

      expect(componente.esNuevo()).toBeTrue();
      expect(componente.detalle().length).toBe(0);
    });
  });

  describe('D24 · la salida ya ejecutada, en la pantalla donde está el botón', () => {
    it('la cabecera lo dice, en vez de un «Aprobada» que no distingue nada', () => {
      liquidacionService.getById = () => of({
        ...FINIQUITO_1,
        estado: 3,
        empleado: { ...TORRES, estado: 4 },
        contratoEmpleado: { ...CONTRATO_DE_TORRES, estado: 'CERRADO' },
      });

      parametros$.next(convertToParamMap({ codigo: '1' }));
      fixture.detectChanges();

      expect(componente.salidaYaEjecutada()).toBe('si');
      expect(componente.etiquetaEstado()).toBe('CALCULADA · salida ejecutada');
    });

    it('y no lo dice cuando el contrato sigue abierto', () => {
      liquidacionService.getById = () => of({
        ...FINIQUITO_1,
        estado: 3,
        empleado: { ...TORRES, estado: 1 },
        contratoEmpleado: { ...CONTRATO_DE_TORRES, estado: 'ACTIVO' },
      });

      parametros$.next(convertToParamMap({ codigo: '1' }));
      fixture.detectChanges();

      expect(componente.salidaYaEjecutada()).toBe('no');
      expect(componente.etiquetaEstado()).toBe('CALCULADA · salida pendiente');
    });
  });

  describe('D9 · el contrato tiene que ser del colaborador', () => {
    it('acota la lista de contratos al elegir colaborador', () => {
      componente.formulario.get('empleado')!.setValue(TORRES);
      fixture.detectChanges();

      const campoContrato = componente.campos().find((c) => c.name === 'contrato')!;
      expect(campoContrato.coleccion!.map((c: any) => c.numero)).toEqual(['CT-1701020304']);
    });

    it('y limpia el contrato que ya estuviera elegido', () => {
      componente.formulario.get('contrato')!.setValue(CONTRATO_DE_CASTRO);
      componente.formulario.get('empleado')!.setValue(TORRES);

      expect(componente.formulario.get('contrato')!.value).toBeNull();
    });

    /**
     * La última red. El backend recibe **sólo `idContrato`** y saca la persona de
     * `contrato.getEmpleado()`, así que un contrato ajeno no produce ningún error: liquida a
     * otro y el registro queda coherente consigo mismo.
     */
    it('corta antes de calcular si el contrato es de otra persona', () => {
      componente.formulario.patchValue({
        empleado: TORRES,
        contrato: CONTRATO_DE_CASTRO,
        fechaSalida: '2026-01-15',
        causal: CAUSAL,
      });

      componente.calcular();

      expect(liquidacionService.calcular).not.toHaveBeenCalled();
      expect(avisos.join(' ')).toContain('CASTRO ARCE');
    });

    it('y también antes de simular', () => {
      componente.formulario.patchValue({
        empleado: TORRES,
        contrato: CONTRATO_DE_CASTRO,
        fechaSalida: '2026-01-15',
        causal: CAUSAL,
      });

      componente.simular();

      expect(liquidacionService.simular).not.toHaveBeenCalled();
    });

    it('deja pasar el contrato propio', () => {
      componente.formulario.patchValue({
        empleado: TORRES,
        contrato: CONTRATO_DE_TORRES,
        fechaSalida: '2026-01-15',
        causal: CAUSAL,
      });

      componente.calcular();

      expect(liquidacionService.calcular).toHaveBeenCalledWith(2, '2026-01-15', 3, null);
    });
  });

  function textoDeLaPantalla(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});

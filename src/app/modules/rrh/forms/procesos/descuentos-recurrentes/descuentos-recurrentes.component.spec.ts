import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Subject, of, throwError } from 'rxjs';

import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { ConceptoNominaService } from '../../../service/concepto-nomina.service';
import { CuotaDescuentoService } from '../../../service/cuota-descuento.service';
import { DescuentoRecurrenteService } from '../../../service/descuento-recurrente.service';
import { EmpleadoService } from '../../../service/empleado.service';
import { DescuentosRecurrentesComponent } from './descuentos-recurrentes.component';

/**
 * Descuentos recurrentes — rediseño 2026-08-26. La idea central: la tabla de amortización se
 * genera, no se teclea. El bug real que la motivó — un descuento sin ninguna cuota, invisible
 * para el motor — es la primera cobertura de abajo.
 */
describe('DescuentosRecurrentesComponent', () => {
  let fixture: ComponentFixture<DescuentosRecurrentesComponent>;
  let componente: DescuentosRecurrentesComponent;
  let descuentoService: { selectByCriteria: jasmine.Spy; add: jasmine.Spy };
  let cuotaService: { selectByCriteria: jasmine.Spy; add: jasmine.Spy; update: jasmine.Spy; delete: jasmine.Spy };

  const EMPLEADO = { codigo: 10, identificacion: '1712345678', apellidos: 'BRAVO CAIZA', nombres: 'ANA' };
  const TIPO_ANTICIPO = { codigo: 1, codigoAlterno: 3, descripcion: 'Anticipo de sueldo', rubro: { codigoAlterno: 197 } };
  const CONCEPTO = { codigo: 5, nombre: 'Anticipo de sueldo', codigoAlterno: 40 };

  beforeEach(async () => {
    descuentoService = {
      selectByCriteria: jasmine.createSpy('selectByCriteria').and.returnValue(of([])),
      add: jasmine.createSpy('add'),
    };
    cuotaService = {
      selectByCriteria: jasmine.createSpy('selectByCriteria').and.returnValue(of([])),
      add: jasmine.createSpy('add'),
      update: jasmine.createSpy('update'),
      delete: jasmine.createSpy('delete').and.returnValue(of(null)),
    };

    await TestBed.configureTestingModule({
      imports: [DescuentosRecurrentesComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: EmpleadoService, useValue: { selectByCriteria: () => of([EMPLEADO]) } },
        { provide: ConceptoNominaService, useValue: { selectByCriteria: () => of([CONCEPTO]) } },
        { provide: DescuentoRecurrenteService, useValue: descuentoService },
        { provide: CuotaDescuentoService, useValue: cuotaService },
        {
          provide: DetalleRubroService,
          useValue: {
            getDetallesByParent: (idPadre: number) => (idPadre === 197 ? [TIPO_ANTICIPO] : []),
            getDescripcionByParentAndAlterno: () => 'Anticipo de sueldo',
          },
        },
        { provide: MatSnackBar, useValue: { open: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DescuentosRecurrentesComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  });

  function seleccionarEmpleado(): void {
    componente.onEmpleadoSeleccionado(EMPLEADO as any);
    fixture.detectChanges();
  }

  function llenarCabecera(valor: number, numeroCuotas: number): void {
    componente.abrirCreacion();
    componente.formulario!.patchValue({
      tipoDescuento: TIPO_ANTICIPO,
      conceptoNomina: CONCEPTO,
      valor,
      numeroCuotas,
      fechaInicio: new Date(2026, 0, 15),
    });
  }

  describe('Un descuento sin cuotas es invisible para el motor — el bug real', () => {
    it('la pantalla lo dice explícitamente, no lo deja pasar en silencio', () => {
      seleccionarEmpleado();
      componente.descuentoSeleccionado.set({ codigo: 1, numero: 'AN-1' } as any);
      componente.cuotas.set([]);
      fixture.detectChanges();

      expect(texto()).toContain('no tiene ninguna cuota');
      expect(texto()).toContain('no lo va a descontar nunca');
    });
  });

  describe('Generar cuotas — la cabecera propone, no se teclean a mano', () => {
    it('propone tantas filas como número de cuotas, sin pedir nada más', () => {
      seleccionarEmpleado();
      llenarCabecera(1200, 12);

      componente.generarPropuesta();

      expect(componente.cuotasPropuestas()?.length).toBe(12);
    });

    it('sin tipo, concepto, valor, cuotas o fecha, no propone nada y marca lo que falta', () => {
      seleccionarEmpleado();
      componente.abrirCreacion();

      componente.generarPropuesta();

      expect(componente.cuotasPropuestas()).toBeNull();
      expect(componente.formulario!.get('valor')?.touched).toBeTrue();
    });

    it('la suma de las cuotas propuestas da exacto el valor total', () => {
      seleccionarEmpleado();
      llenarCabecera(1000, 3); // 1000/3 no es exacto: el caso que prueba el redondeo de verdad
      componente.generarPropuesta();

      expect(componente.totalPropuesto()).toBe(1000);
    });

    it('editar el capital de una fila recalcula el saldo de esa fila y las siguientes', () => {
      seleccionarEmpleado();
      llenarCabecera(1200, 3);
      componente.generarPropuesta();

      componente.onCapitalCuota(0, 500);

      const filas = componente.cuotasPropuestas()!;
      expect(filas[0].saldo).toBe(700);
      expect(filas[1].saldo).toBe(300);
    });
  });

  describe('Confirmar — descuento y cuotas, en ese orden', () => {
    it('crea el descuento y luego una cuota por cada fila propuesta', () => {
      descuentoService.add.and.returnValue(of({ codigo: 99, numero: null }));
      cuotaService.add.and.callFake((datos: any) => of({ codigo: Math.random(), ...datos }));
      seleccionarEmpleado();
      llenarCabecera(300, 3);
      componente.generarPropuesta();

      componente.confirmarCreacion();

      expect(descuentoService.add).toHaveBeenCalledTimes(1);
      expect(cuotaService.add).toHaveBeenCalledTimes(3);
      const primeraCuota = cuotaService.add.calls.argsFor(0)[0];
      expect(primeraCuota.descuentoRecurrente).toEqual({ codigo: 99 });
      expect(primeraCuota.estado).toBe(1); // Pendiente
    });

    it('si el descuento se crea pero una cuota falla, lo dice tal cual — no lo esconde', () => {
      descuentoService.add.and.returnValue(of({ codigo: 99, numero: null }));
      cuotaService.add.and.returnValue(throwError(() => 'la cuota 2 duplica el número'));
      seleccionarEmpleado();
      llenarCabecera(300, 3);
      componente.generarPropuesta();

      componente.confirmarCreacion();

      expect(componente.errorCreacion()).toContain('El descuento se creó');
      expect(componente.errorCreacion()).toContain('Revise sus cuotas');
    });

    it('si el descuento mismo es rechazado, el formulario no se pierde', () => {
      descuentoService.add.and.returnValue(throwError(() => 'El colaborador no puede tener dos anticipos abiertos'));
      seleccionarEmpleado();
      llenarCabecera(300, 3);
      componente.generarPropuesta();

      componente.confirmarCreacion();

      expect(componente.errorCreacion()).toBe('El colaborador no puede tener dos anticipos abiertos');
      expect(componente.creando()).toBeTrue();
      expect(componente.formulario!.get('valor')?.value).toBe(300);
      expect(cuotaService.add).not.toHaveBeenCalled();
    });
  });

  describe('Los cuatro estados de cuota, con forma', () => {
    it('PENDIENTE, DESCONTADA, PARCIAL y ANULADA tienen clase e ícono propios', () => {
      const clases = new Set([
        componente.claseEstadoCuota(1),
        componente.claseEstadoCuota(2),
        componente.claseEstadoCuota(3),
        componente.claseEstadoCuota(4),
      ]);
      expect(clases.size).toBe(4);
    });

    it('PARCIAL se sabe pintar aunque el motor todavía no la escriba nunca — corrección 12', () => {
      expect(componente.etiquetaEstadoCuota(3)).toBe('Parcial');
      expect(componente.claseEstadoCuota(3)).toBe('cuota-parcial');
    });
  });

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});

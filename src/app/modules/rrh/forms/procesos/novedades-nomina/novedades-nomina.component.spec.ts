import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, Subject, of } from 'rxjs';

import { ServiceLocatorRrhService } from '../../../../../shared/basics/service-locator/service-locator-rrh.service';
import { ConceptoNominaService } from '../../../service/concepto-nomina.service';
import { ContratoEmpleadoService } from '../../../service/contrato-empleado.service';
import { EmpleadoService } from '../../../service/empleado.service';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import { NovedadesNominaComponent } from './novedades-nomina.component';

/**
 * Novedades del período · D17, D18, D19 y D22.
 *
 * Los datos van con la forma real de la réplica: febrero de 2026, con Torres Chávez y Benítez
 * Montes ya cesantes desde enero, que es el caso exacto que destapó D18.
 */
describe('NovedadesNominaComponent', () => {
  let fixture: ComponentFixture<NovedadesNominaComponent>;
  let componente: NovedadesNominaComponent;

  /** Se controlan a mano para poder dejarlos colgando y observar la carrera de D17. */
  let empleados$: Subject<any[]>;
  let conceptos$: Subject<any[]>;
  let contratos$: Subject<any[]>;
  let periodos$: Subject<any[]>;
  let novedadesDelLocator: any[];

  const PERIODO_FEBRERO = {
    codigo: 2,
    anio: 2026,
    mes: 2,
    fechaInicio: [2026, 2, 1],
    fechaFin: [2026, 2, 28],
    estado: 1,
  };
  const PERIODO_ENERO = { ...PERIODO_FEBRERO, codigo: 1, mes: 1, fechaInicio: [2026, 1, 1], fechaFin: [2026, 1, 31] };

  const ACTIVA = { codigo: 10, identificacion: '1712345678', apellidos: 'BRAVO CAIZA', nombres: 'ANA', estado: 1 };
  const TORRES = { codigo: 45, identificacion: '1701020304', apellidos: 'TORRES CHAVEZ', nombres: 'ROSA', estado: 4 };
  const BENITEZ = { codigo: 46, identificacion: '1714531405', apellidos: 'BENITEZ MONTES', nombres: 'GUILLERMINA', estado: 4 };
  /** Cesante en el maestro de hoy, pero **sin** fecha de terminación en el contrato. */
  const SIN_FECHA = { codigo: 47, identificacion: '1799887766', apellidos: 'RED DE SEGURIDAD', nombres: 'X', estado: 4 };

  const CONTRATOS = [
    { codigo: 1, empleado: ACTIVA, numero: 'CT-1712345678', fechaInicio: [2024, 3, 1], fechaFin: null, fechaTerminacion: null },
    // Los dos causaron baja el 15 y el 16 de enero: fuera de febrero, dentro de enero.
    { codigo: 2, empleado: TORRES, numero: 'CT-1701020304', fechaInicio: [2020, 1, 1], fechaFin: null, fechaTerminacion: [2026, 1, 15] },
    { codigo: 3, empleado: BENITEZ, numero: 'CT-1714531405', fechaInicio: [2020, 1, 1], fechaFin: null, fechaTerminacion: [2026, 1, 16] },
    { codigo: 4, empleado: SIN_FECHA, numero: 'CT-1799887766', fechaInicio: [2020, 1, 1], fechaFin: null, fechaTerminacion: null },
  ];

  const EMPLEADOS = [ACTIVA, TORRES, BENITEZ, SIN_FECHA];

  beforeEach(async () => {
    empleados$ = new Subject<any[]>();
    conceptos$ = new Subject<any[]>();
    contratos$ = new Subject<any[]>();
    periodos$ = new Subject<any[]>();
    novedadesDelLocator = [];

    const comoObservable = <T>(s: Subject<T>): Observable<T> => s.asObservable();

    await TestBed.configureTestingModule({
      imports: [NovedadesNominaComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PeriodoNominaService, useValue: { selectByCriteria: () => comoObservable(periodos$) } },
        { provide: EmpleadoService, useValue: { selectByCriteria: () => comoObservable(empleados$) } },
        { provide: ConceptoNominaService, useValue: { selectByCriteria: () => comoObservable(conceptos$) } },
        { provide: ContratoEmpleadoService, useValue: { selectByCriteria: () => comoObservable(contratos$) } },
        {
          provide: ServiceLocatorRrhService,
          useValue: {
            filtroPeriodo: null,
            recargarValores: () => Promise.resolve(novedadesDelLocator),
          },
        },
        { provide: MatSnackBar, useValue: { open: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NovedadesNominaComponent);
    componente = fixture.componentInstance;
  });

  /** Deja el componente con los cuatro orígenes resueltos y un período elegido. */
  async function conPeriodo(codigo: number): Promise<void> {
    fixture.detectChanges();
    periodos$.next([PERIODO_ENERO, PERIODO_FEBRERO]);
    empleados$.next(EMPLEADOS);
    empleados$.complete();
    conceptos$.next([{ codigo: 1, nombre: 'Préstamo quirografario IESS', codigoAlterno: 23 }]);
    conceptos$.complete();
    contratos$.next(CONTRATOS);
    contratos$.complete();
    componente.onPeriodoChange(codigo);
    await fixture.whenStable();
  }

  describe('D17 · el desplegable de Período', () => {
    it('se llena aunque colaboradores y conceptos sigan sin llegar', () => {
      fixture.detectChanges();

      // Los tres `getAll` del forkJoin siguen colgando a propósito: es la carrera de enero.
      periodos$.next([PERIODO_ENERO, PERIODO_FEBRERO]);

      expect(componente.periodos().length).toBe(2);
      expect(componente.cargandoPeriodos()).toBeFalse();
    });

    it('mientras cargan, la pantalla NO dice que no hay períodos creados', () => {
      fixture.detectChanges();

      expect(componente.cargandoPeriodos()).toBeTrue();
      expect(texto()).toContain('Cargando los períodos');
      expect(texto()).not.toContain('No hay períodos de nómina creados');

      periodos$.next([]);
      fixture.detectChanges();

      // Ya sí: la lista llegó vacía de verdad.
      expect(texto()).toContain('No hay períodos de nómina creados');
    });
  });

  describe('D18 · el combo de colaborador', () => {
    it('no ofrece a quien causó baja antes del período', async () => {
      await conPeriodo(2); // febrero

      const ofrecidos = collectionsDe('empleado').map((e: any) => e.apellidos);
      expect(ofrecidos).toContain('BRAVO CAIZA');
      expect(ofrecidos).not.toContain('TORRES CHAVEZ');
      expect(ofrecidos).not.toContain('BENITEZ MONTES');
    });

    /**
     * **Tampoco en el mes de la salida, y es lo correcto.**
     *
     * La primera versión de este test daba por hecho que quien se fue el 15 de enero seguía
     * ofreciéndose en enero. No: `selectActivosEnPeriodo` compara con `> :hasta`, no con
     * `>= :desde`, porque **el mes de la salida no va por nómina, lo paga el finiquito**. El
     * motor no procesa a Torres ni a Benítez en enero —está verificado en `ESTADO-RRHH.md`, que
     * enero sale con 22 y ellos no están—, así que una novedad de enero a su nombre tampoco se
     * leería nunca. El combo dice lo mismo que el motor, que es todo el punto de D18.
     */
    it('tampoco los ofrece en el mes de su salida: ese mes lo paga el finiquito', async () => {
      await conPeriodo(1); // enero: las bajas son del 15 y el 16

      const ofrecidos = collectionsDe('empleado').map((e: any) => e.apellidos);
      expect(ofrecidos).not.toContain('TORRES CHAVEZ');
      expect(ofrecidos).not.toContain('BENITEZ MONTES');
      expect(ofrecidos).toContain('BRAVO CAIZA');
    });

    it('sí ofrece a quien se va DESPUÉS del período que se está cargando', async () => {
      fixture.detectChanges();
      periodos$.next([PERIODO_ENERO, PERIODO_FEBRERO]);
      empleados$.next(EMPLEADOS);
      empleados$.complete();
      conceptos$.next([]);
      conceptos$.complete();
      // Misma persona, salida en marzo: en enero y en febrero todavía cobra por nómina.
      contratos$.next([
        { codigo: 9, empleado: TORRES, numero: 'CT-1701020304', fechaInicio: [2020, 1, 1], fechaFin: null, fechaTerminacion: [2026, 3, 6] },
      ]);
      contratos$.complete();
      componente.onPeriodoChange(2);
      await fixture.whenStable();

      expect(collectionsDe('empleado').map((e: any) => e.apellidos)).toContain('TORRES CHAVEZ');
    });

    it('respeta la red de seguridad: sin fecha de terminación manda el estado del empleado', async () => {
      await conPeriodo(1);

      // Cesante en `MPLD` y sin fecha en el contrato: fuera en todos los meses, como en el motor.
      const ofrecidos = collectionsDe('empleado').map((e: any) => e.apellidos);
      expect(ofrecidos).not.toContain('RED DE SEGURIDAD');
    });

    it('si los contratos llegan vacíos, ofrece la lista entera en vez de ninguna', async () => {
      fixture.detectChanges();
      periodos$.next([PERIODO_ENERO, PERIODO_FEBRERO]);
      empleados$.next(EMPLEADOS);
      empleados$.complete();
      conceptos$.next([]);
      conceptos$.complete();
      contratos$.next([]);
      contratos$.complete();
      componente.onPeriodoChange(2);
      await fixture.whenStable();

      // Un combo vacío se lee como «no hay nadie», que es peor que uno ancho de más.
      expect(collectionsDe('empleado').length).toBe(EMPLEADOS.length);
    });

    /**
     * Elegir el período antes de que lleguen las colecciones deja el combo vacío un instante.
     * `ngOnInit` rehace la tabla cuando el `forkJoin` aterriza, y esto lo comprueba: sin esa
     * relectura, D17 —los períodos por delante— habría creado un hueco nuevo.
     */
    it('rehace la tabla cuando las colecciones llegan después del período elegido', async () => {
      fixture.detectChanges();
      periodos$.next([PERIODO_ENERO, PERIODO_FEBRERO]);

      componente.onPeriodoChange(2);
      await fixture.whenStable();
      expect(collectionsDe('empleado').length).toBe(0);

      empleados$.next(EMPLEADOS);
      empleados$.complete();
      conceptos$.next([]);
      conceptos$.complete();
      contratos$.next(CONTRATOS);
      contratos$.complete();
      await fixture.whenStable();

      expect(collectionsDe('empleado').map((e: any) => e.apellidos)).toEqual(['BRAVO CAIZA']);
    });
  });

  describe('D19 · la rejilla dice si la novedad entra al cálculo', () => {
    beforeEach(() => {
      novedadesDelLocator = [
        { codigo: 1, aprobada: 'S', estado: 1, valor: 100, empleado: ACTIVA, conceptoNomina: { nombre: 'Quirografario' } },
        { codigo: 2, aprobada: 'N', estado: 1, valor: 200, empleado: ACTIVA, conceptoNomina: { nombre: 'Quirografario' } },
        // La peligrosa: aprobada «Sí» y estado nulo. En la rejilla vieja se veía igual que la 1.
        { codigo: 3, aprobada: 'S', estado: null, valor: 300, empleado: ACTIVA, conceptoNomina: { nombre: 'Quirografario' } },
      ];
    });

    it('distingue las dos mitades de la condición del motor', async () => {
      await conPeriodo(2);

      const filas = componente.tableConfig!.registros as any[];
      expect(filas.find((f) => f.codigo === 1).calculoLabel).toBe('Sí');
      expect(filas.find((f) => f.codigo === 2).calculoLabel).toBe('No · sin aprobar');
      expect(filas.find((f) => f.codigo === 3).calculoLabel).toBe('No · sin estado');
    });

    it('la columna existe en la rejilla', async () => {
      await conPeriodo(2);
      const columnas = componente.tableConfig!.fields!.map((f: any) => f.column);
      expect(columnas).toContain('calculoLabel');
    });

    it('el aviso cuenta las que el motor no va a mirar, no sólo las sin aprobar', async () => {
      await conPeriodo(2);

      // Dos: la sin aprobar y la del estado nulo. El contador viejo habría dicho una.
      expect(componente.fueraDelCalculo()).toBe(2);
      fixture.detectChanges();
      expect(texto()).toContain('2 novedad(es) que el cálculo NO va a mirar');
    });
  });

  describe('D22 · «Aprobada para el cálculo»', () => {
    it('nace sin valor y es obligatoria', async () => {
      await conPeriodo(2);

      const campo = campoDe('aprobada');
      expect(campo.value).toBeNull();
      expect(campo.validations?.some((v: any) => v.name === 'required')).toBeTrue();
    });
  });

  // ─── Utilidades ────────────────────────────────────────────────────────────

  function campoDe(nombre: string): any {
    return componente.tableConfig!.regConfig!.find((c: any) => c.name === nombre);
  }

  function collectionsDe(nombre: string): any[] {
    return campoDe(nombre).collections ?? [];
  }

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});

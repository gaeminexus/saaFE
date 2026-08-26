import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Observable, Subject, of, throwError } from 'rxjs';

import { ConceptoNominaService } from '../../../service/concepto-nomina.service';
import { ContratoEmpleadoService } from '../../../service/contrato-empleado.service';
import { EmpleadoService } from '../../../service/empleado.service';
import { NovedadNominaService } from '../../../service/novedad-nomina.service';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { NovedadesNominaComponent } from './novedades-nomina.component';

/**
 * Novedades del período · rediseño 2026-08-25, captura en línea.
 *
 * D17, D18 y D19 son la lógica heredada de la pantalla anterior, sin tocar — se comprueba que
 * sobrevivió al traslado. El resto es nuevo: captura sin diálogo, la fila que no se pierde si el
 * servidor la rechaza, y la aprobación en lote separada de la captura (Corrección 3).
 */
describe('NovedadesNominaComponent', () => {
  let fixture: ComponentFixture<NovedadesNominaComponent>;
  let componente: NovedadesNominaComponent;

  let empleados$: Subject<any[]>;
  let conceptos$: Subject<any[]>;
  let contratos$: Subject<any[]>;
  let periodos$: Subject<any[]>;
  let novedadNominaService: {
    selectByCriteria: jasmine.Spy;
    add: jasmine.Spy;
    update: jasmine.Spy;
    delete: jasmine.Spy;
  };

  const PERIODO_FEBRERO = {
    codigo: 2,
    anio: 2026,
    mes: 2,
    fechaInicio: [2026, 2, 1],
    fechaFin: [2026, 2, 28],
    estado: 1,
  };
  const PERIODO_ENERO = { ...PERIODO_FEBRERO, codigo: 1, mes: 1, fechaInicio: [2026, 1, 1], fechaFin: [2026, 1, 31] };

  const ACTIVA: any = { codigo: 10, identificacion: '1712345678', apellidos: 'BRAVO CAIZA', nombres: 'ANA', estado: 1 };
  const TORRES: any = { codigo: 45, identificacion: '1701020304', apellidos: 'TORRES CHAVEZ', nombres: 'ROSA', estado: 4 };
  const BENITEZ: any = { codigo: 46, identificacion: '1714531405', apellidos: 'BENITEZ MONTES', nombres: 'GUILLERMINA', estado: 4 };
  const SIN_FECHA: any = { codigo: 47, identificacion: '1799887766', apellidos: 'RED DE SEGURIDAD', nombres: 'X', estado: 4 };

  const CONTRATOS = [
    { codigo: 1, empleado: ACTIVA, numero: 'CT-1712345678', fechaInicio: [2024, 3, 1], fechaFin: null, fechaTerminacion: null },
    { codigo: 2, empleado: TORRES, numero: 'CT-1701020304', fechaInicio: [2020, 1, 1], fechaFin: null, fechaTerminacion: [2026, 1, 15] },
    { codigo: 3, empleado: BENITEZ, numero: 'CT-1714531405', fechaInicio: [2020, 1, 1], fechaFin: null, fechaTerminacion: [2026, 1, 16] },
    { codigo: 4, empleado: SIN_FECHA, numero: 'CT-1799887766', fechaInicio: [2020, 1, 1], fechaFin: null, fechaTerminacion: null },
  ];

  const EMPLEADOS = [ACTIVA, TORRES, BENITEZ, SIN_FECHA];
  const QUIROGRAFARIO: any = { codigo: 1, nombre: 'Préstamo quirografario IESS', codigoAlterno: 23, valor: null };
  const BONO_FIJO: any = { codigo: 2, nombre: 'Bono de responsabilidad', codigoAlterno: 30, valor: 50 };

  beforeEach(async () => {
    empleados$ = new Subject<any[]>();
    conceptos$ = new Subject<any[]>();
    contratos$ = new Subject<any[]>();
    periodos$ = new Subject<any[]>();

    const comoObservable = <T>(s: Subject<T>): Observable<T> => s.asObservable();

    novedadNominaService = {
      selectByCriteria: jasmine.createSpy('selectByCriteria').and.returnValue(of([])),
      add: jasmine.createSpy('add'),
      update: jasmine.createSpy('update'),
      delete: jasmine.createSpy('delete').and.returnValue(of(null)),
    };

    await TestBed.configureTestingModule({
      imports: [NovedadesNominaComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PeriodoNominaService, useValue: { selectByCriteria: () => comoObservable(periodos$) } },
        { provide: EmpleadoService, useValue: { selectByCriteria: () => comoObservable(empleados$) } },
        { provide: ConceptoNominaService, useValue: { selectByCriteria: () => comoObservable(conceptos$) } },
        { provide: ContratoEmpleadoService, useValue: { selectByCriteria: () => comoObservable(contratos$) } },
        { provide: NovedadNominaService, useValue: novedadNominaService },
        { provide: MatSnackBar, useValue: { open: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(NovedadesNominaComponent);
    componente = fixture.componentInstance;
  });

  /** Deja el componente con los cuatro orígenes resueltos y un período elegido. */
  async function conPeriodo(codigo: number, novedadesDelPeriodo: any[] = []): Promise<void> {
    novedadNominaService.selectByCriteria.and.returnValue(of(novedadesDelPeriodo));
    fixture.detectChanges();
    periodos$.next([PERIODO_ENERO, PERIODO_FEBRERO]);
    empleados$.next(EMPLEADOS);
    empleados$.complete();
    conceptos$.next([QUIROGRAFARIO, BONO_FIJO]);
    conceptos$.complete();
    contratos$.next(CONTRATOS);
    contratos$.complete();
    componente.onPeriodoChange(codigo);
    await fixture.whenStable();
    fixture.detectChanges();
  }

  describe('D17 · el desplegable de Período', () => {
    it('se llena aunque colaboradores y conceptos sigan sin llegar', () => {
      fixture.detectChanges();
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

      expect(texto()).toContain('No hay períodos de nómina creados');
    });
  });

  describe('D18 · el combo de colaborador (empleadosDelPeriodo)', () => {
    it('no ofrece a quien causó baja antes del período', async () => {
      await conPeriodo(2);

      const ofrecidos = componente.empleadosDelPeriodo().map((e: any) => e.apellidos);
      expect(ofrecidos).toContain('BRAVO CAIZA');
      expect(ofrecidos).not.toContain('TORRES CHAVEZ');
      expect(ofrecidos).not.toContain('BENITEZ MONTES');
    });

    it('tampoco los ofrece en el mes de su salida: ese mes lo paga el finiquito', async () => {
      await conPeriodo(1);

      const ofrecidos = componente.empleadosDelPeriodo().map((e: any) => e.apellidos);
      expect(ofrecidos).not.toContain('TORRES CHAVEZ');
      expect(ofrecidos).not.toContain('BENITEZ MONTES');
      expect(ofrecidos).toContain('BRAVO CAIZA');
    });

    it('respeta la red de seguridad: sin fecha de terminación manda el estado del empleado', async () => {
      await conPeriodo(1);

      expect(componente.empleadosDelPeriodo().map((e: any) => e.apellidos)).not.toContain('RED DE SEGURIDAD');
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

      expect(componente.empleadosDelPeriodo().length).toBe(EMPLEADOS.length);
    });
  });

  describe('D19 · si la novedad entra al cálculo', () => {
    const APROBADA = { codigo: 1, aprobada: 'S', estado: 1, valor: 100, empleado: ACTIVA, conceptoNomina: { nombre: 'Quirografario' } };
    const SIN_APROBAR = { codigo: 2, aprobada: 'N', estado: 1, valor: 200, empleado: ACTIVA, conceptoNomina: { nombre: 'Quirografario' } };
    // La peligrosa: aprobada «Sí» y estado nulo. Se ve igual que la buena si no se comprueban las dos.
    const SIN_ESTADO = { codigo: 3, aprobada: 'S', estado: null, valor: 300, empleado: ACTIVA, conceptoNomina: { nombre: 'Quirografario' } };

    it('distingue las dos mitades de la condición del motor', async () => {
      await conPeriodo(2, [APROBADA, SIN_APROBAR, SIN_ESTADO]);

      expect(componente.entra(APROBADA as any)).toBeTrue();
      expect(componente.calculoLabel(SIN_APROBAR as any)).toBe('No · sin aprobar');
      expect(componente.calculoLabel(SIN_ESTADO as any)).toBe('No · sin estado');
    });

    it('el contador de fuera del cálculo cuenta las dos, no sólo la sin aprobar', async () => {
      await conPeriodo(2, [APROBADA, SIN_APROBAR, SIN_ESTADO]);

      expect(componente.fueraDelCalculo()).toBe(2);
      expect(texto()).toContain('2 novedad(es) que el cálculo NO va a mirar');
    });
  });

  describe('Captura en línea — Corrección 2', () => {
    it('Enter con la fila incompleta NO llama al servicio, y marca el intento', async () => {
      await conPeriodo(2);

      componente.confirmarBorrador();

      expect(novedadNominaService.add).not.toHaveBeenCalled();
      expect(componente.intentoConfirmar()).toBeTrue();
    });

    it('con la fila completa, agrega con aprobada «N» — nunca se pregunta en captura (Corrección 3)', async () => {
      const creada = { codigo: 99, aprobada: 'N', estado: 1, valor: 45, empleado: ACTIVA, conceptoNomina: QUIROGRAFARIO };
      novedadNominaService.add.and.returnValue(of(creada));
      await conPeriodo(2);

      componente.onBorradorCampo('empleado', ACTIVA);
      componente.onBorradorConceptoChange(QUIROGRAFARIO);
      componente.onBorradorCampo('valor', 45);
      componente.confirmarBorrador();

      expect(novedadNominaService.add).toHaveBeenCalledTimes(1);
      const cuerpo = novedadNominaService.add.calls.mostRecent().args[0];
      expect(cuerpo.aprobada).toBe('N');
      expect(cuerpo.usuarioAprueba).toBeNull();
      expect(cuerpo.fechaAprobacion).toBeNull();
      expect(cuerpo.estado).toBe(1);
    });

    it('la fila que se ve es la que devolvió el servidor, no la tecleada — D11', async () => {
      // El servidor redondea o corrige algo del lado suyo: lo que se ve debe ser lo suyo.
      const creada = { codigo: 99, aprobada: 'N', estado: 1, valor: 999, empleado: { codigo: ACTIVA.codigo }, conceptoNomina: { codigo: QUIROGRAFARIO.codigo } };
      novedadNominaService.add.and.returnValue(of(creada));
      await conPeriodo(2);

      componente.onBorradorCampo('empleado', ACTIVA);
      componente.onBorradorConceptoChange(QUIROGRAFARIO);
      componente.onBorradorCampo('valor', 45);
      componente.confirmarBorrador();

      expect(componente.novedades().find((n) => n.codigo === 99)?.valor).toBe(999);
    });

    /**
     * El bug que reportó Mike en vivo: tras agregar, Colaborador y Concepto se veían vacíos. La
     * causa: `add()`/`update()` devuelven `empleado`/`conceptoNomina` como `{ codigo }` —el
     * POST/PUT no hace el mismo fetch con join que `selectByCriteria`—, y la fila se armaba
     * directo con lo que el servidor mandó. Este test falla si se revierte `hidratarRelaciones`.
     */
    it('el POST no re-hidrata empleado/conceptoNomina, pero la fila se sigue viendo completa', async () => {
      const creada = { codigo: 99, aprobada: 'N', estado: 1, valor: 45, empleado: { codigo: ACTIVA.codigo }, conceptoNomina: { codigo: QUIROGRAFARIO.codigo } };
      novedadNominaService.add.and.returnValue(of(creada));
      await conPeriodo(2);

      componente.onBorradorCampo('empleado', ACTIVA);
      componente.onBorradorConceptoChange(QUIROGRAFARIO);
      componente.onBorradorCampo('valor', 45);
      componente.confirmarBorrador();

      const fila = componente.novedades().find((n) => n.codigo === 99)!;
      expect(componente.etiquetaEmpleado(fila.empleado)).toContain('BRAVO CAIZA');
      expect(componente.nombreConcepto(fila)).toBe('Préstamo quirografario IESS');
    });

    it('si el servidor rechaza, la fila NO se pierde ni se vacía', async () => {
      novedadNominaService.add.and.returnValue(throwError(() => 'El valor excede el límite del concepto'));
      await conPeriodo(2);

      componente.onBorradorCampo('empleado', ACTIVA);
      componente.onBorradorConceptoChange(QUIROGRAFARIO);
      componente.onBorradorCampo('valor', 45);
      componente.confirmarBorrador();

      expect(componente.errorBorrador()).toBe('El valor excede el límite del concepto');
      // Lo tecleado sigue ahí: no se limpió el borrador.
      expect(componente.borrador().empleado).toEqual(ACTIVA);
      expect(componente.borrador().valor).toBe(45);
      expect(componente.novedades().length).toBe(0);
    });

    it('un concepto de valor fijo propone el valor; se puede corregir', async () => {
      await conPeriodo(2);

      componente.onBorradorConceptoChange(BONO_FIJO);
      expect(componente.borrador().valor).toBe(50);

      componente.onBorradorCampo('valor', 80);
      expect(componente.borrador().valor).toBe(80);
    });

    it('tras confirmar una fila, la siguiente propone el mismo concepto', async () => {
      const creada = { codigo: 99, aprobada: 'N', estado: 1, valor: 50, empleado: ACTIVA, conceptoNomina: BONO_FIJO };
      novedadNominaService.add.and.returnValue(of(creada));
      await conPeriodo(2);

      componente.onBorradorCampo('empleado', ACTIVA);
      componente.onBorradorConceptoChange(BONO_FIJO);
      componente.confirmarBorrador();

      expect(componente.borrador().conceptoNomina).toEqual(BONO_FIJO);
    });

    it('deshacer la última fila la elimina sin ir a buscarla', async () => {
      const creada = { codigo: 99, aprobada: 'N', estado: 1, valor: 45, empleado: ACTIVA, conceptoNomina: QUIROGRAFARIO };
      novedadNominaService.add.and.returnValue(of(creada));
      novedadNominaService.delete.and.returnValue(of(null));
      await conPeriodo(2);

      componente.onBorradorCampo('empleado', ACTIVA);
      componente.onBorradorConceptoChange(QUIROGRAFARIO);
      componente.onBorradorCampo('valor', 45);
      componente.confirmarBorrador();

      expect(componente.novedades().length).toBe(1);
      expect(componente.deshacer()?.codigo).toBe(99);

      componente.deshacerUltimaFila();

      expect(novedadNominaService.delete).toHaveBeenCalledWith(99);
      expect(componente.novedades().length).toBe(0);
    });
  });

  describe('Edición en sitio — el PUT tampoco re-hidrata empleado/conceptoNomina', () => {
    it('tras editar, la fila se sigue viendo con colaborador y concepto', async () => {
      const original = { codigo: 5, aprobada: 'N', estado: 1, valor: 100, empleado: ACTIVA, conceptoNomina: QUIROGRAFARIO, periodoNomina: { codigo: 2 } };
      const actualizada = { codigo: 5, aprobada: 'N', estado: 1, valor: 200, empleado: { codigo: ACTIVA.codigo }, conceptoNomina: { codigo: QUIROGRAFARIO.codigo } };
      novedadNominaService.update.and.returnValue(of(actualizada));
      await conPeriodo(2, [original]);

      componente.editarFila(componente.novedades()[0]);
      componente.onEdicionCampo('valor', 200);
      componente.confirmarEdicion();

      const fila = componente.novedades().find((n) => n.codigo === 5)!;
      expect(fila.valor).toBe(200); // lo que devolvió el servidor
      expect(componente.etiquetaEmpleado(fila.empleado)).toContain('BRAVO CAIZA');
      expect(componente.nombreConcepto(fila)).toBe('Préstamo quirografario IESS');
    });
  });

  describe('Todo combo se busca tecleando — cabecera (Mike, 2026-08-25)', () => {
    it('Período se busca por mes, por el nombre del mes y por el código PRDN', () => {
      const periodo = { codigo: 41, mes: 4, anio: 2026 };
      expect(componente.buscarPorPeriodo(periodo)).toEqual(
        jasmine.arrayContaining(['4', 'Abril', '41', 'PRDN 41']),
      );
    });

    it('la etiqueta del período muestra el nombre del mes y el PRDN, no sólo mes/año', () => {
      const periodo = { codigo: 41, mes: 4, anio: 2026 };
      expect(componente.etiquetaPeriodo(periodo)).toBe('Abril 2026 · PRDN 41');
    });

    it('elegir un ejercicio inválido (blur sin elegir de la lista) no rompe el año actual', () => {
      componente.onEjercicioSeleccionado(null);
      expect(componente.anio()).toBe(new Date().getFullYear());
    });

    it('elegir un ejercicio de la lista sí cambia el año y recarga períodos', () => {
      fixture.detectChanges();
      componente.onEjercicioSeleccionado(2025);
      expect(componente.anio()).toBe(2025);
    });
  });

  describe('El foco no toca el ratón (Mike, 2026-08-25)', () => {
    /**
     * `document.activeElement` no sirve aquí: Karma corre en una ventana de Chrome sin foco de
     * sistema operativo, y ahí `HTMLElement.focus()` no mueve `activeElement` aunque funcione
     * perfectamente en un navegador real. Se espía `focus()` sobre el elemento exacto en vez de
     * preguntarle al DOM quién quedó activo.
     */
    function espiarFocoDeColaborador(): jasmine.Spy {
      const elemento = document.getElementById('borrador-empleado') as HTMLElement;
      expect(elemento).not.toBeNull();
      // No basta con que exista: tiene que ser el <input> de verdad. El bug real era que
      // getElementById encontraba <app-inline-autocomplete>, no enfocable, porque `id` —a
      // diferencia de `controlId`— se duplicaba en el anfitrión y en el input de dentro.
      expect(elemento.tagName).toBe('INPUT');
      return spyOn(elemento, 'focus');
    }

    it('al elegir un período, el foco salta solo a Colaborador', async () => {
      // Se llega con un período ya elegido para que exista el elemento a espiar; luego se elige
      // de nuevo, que es la acción que el encargo pide comprobar.
      await conPeriodo(2);
      const foco = espiarFocoDeColaborador();

      componente.onPeriodoChange(2);
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(foco).toHaveBeenCalled();
    });

    it('el botón «Nueva línea» lleva el foco a Colaborador', async () => {
      await conPeriodo(2);
      const foco = espiarFocoDeColaborador();

      componente.nuevaFila();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(foco).toHaveBeenCalled();
    });

    it('tras confirmar una fila, el foco vuelve a Colaborador de la siguiente', async () => {
      const creada = { codigo: 99, aprobada: 'N', estado: 1, valor: 45, empleado: ACTIVA, conceptoNomina: QUIROGRAFARIO };
      novedadNominaService.add.and.returnValue(of(creada));
      await conPeriodo(2);
      const foco = espiarFocoDeColaborador();

      componente.onBorradorCampo('empleado', ACTIVA);
      componente.onBorradorConceptoChange(QUIROGRAFARIO);
      componente.onBorradorCampo('valor', 45);
      componente.confirmarBorrador();
      fixture.detectChanges();
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(foco).toHaveBeenCalled();
    });
  });

  describe('Aprobación en lote — Corrección 3', () => {
    const SIN_APROBAR_1 = { codigo: 1, aprobada: 'N', estado: 1, valor: 100, empleado: ACTIVA, conceptoNomina: QUIROGRAFARIO, periodoNomina: { codigo: 2 } };
    const SIN_APROBAR_2 = { codigo: 2, aprobada: 'N', estado: 1, valor: 200, empleado: ACTIVA, conceptoNomina: QUIROGRAFARIO, periodoNomina: { codigo: 2 } };
    const YA_APROBADA = { codigo: 3, aprobada: 'S', estado: 1, valor: 300, empleado: ACTIVA, conceptoNomina: QUIROGRAFARIO, periodoNomina: { codigo: 2 } };

    it('pendientesAprobar sólo trae lo que no está aprobado', async () => {
      await conPeriodo(2, [SIN_APROBAR_1, SIN_APROBAR_2, YA_APROBADA]);

      expect(componente.pendientesAprobar().map((n) => n.codigo)).toEqual([1, 2]);
    });

    it('aprobar seleccionadas escribe aprobada, usuario y fecha de aprobación de verdad', async () => {
      novedadNominaService.update.and.callFake((datos: any) => of({ ...datos, codigo: datos.codigo }));
      await conPeriodo(2, [SIN_APROBAR_1, SIN_APROBAR_2, YA_APROBADA]);

      componente.alternarSeleccion(1);
      componente.aprobarSeleccionadas();

      expect(novedadNominaService.update).toHaveBeenCalledTimes(1);
      const cuerpo = novedadNominaService.update.calls.mostRecent().args[0];
      expect(cuerpo.codigo).toBe(1);
      expect(cuerpo.aprobada).toBe('S');
      expect(cuerpo.usuarioAprueba).toBe(usuarioSesion());
      expect(cuerpo.fechaAprobacion instanceof Date).toBeTrue();
    });

    it('no toca las filas no seleccionadas', async () => {
      novedadNominaService.update.and.callFake((datos: any) => of({ ...datos, codigo: datos.codigo }));
      await conPeriodo(2, [SIN_APROBAR_1, SIN_APROBAR_2, YA_APROBADA]);

      componente.alternarSeleccion(1);
      componente.aprobarSeleccionadas();

      expect(componente.novedades().find((n) => n.codigo === 2)?.aprobada).toBe('N');
    });

    it('tras aprobar, la fila se sigue viendo con colaborador y concepto — el PUT tampoco los re-hidrata', async () => {
      // El fake echoa la petición, que ya manda empleado/conceptoNomina como {codigo} —igual que
      // el backend real—: es la misma condición que reportó Mike en "Por aprobar".
      novedadNominaService.update.and.callFake((datos: any) => of({ ...datos, codigo: datos.codigo }));
      await conPeriodo(2, [SIN_APROBAR_1, SIN_APROBAR_2, YA_APROBADA]);

      componente.alternarSeleccion(1);
      componente.aprobarSeleccionadas();

      const fila = componente.novedades().find((n) => n.codigo === 1)!;
      expect(componente.etiquetaEmpleado(fila.empleado)).toContain('BRAVO CAIZA');
      expect(componente.nombreConcepto(fila)).toBe('Préstamo quirografario IESS');
    });

    it('seleccionar todas las pendientes no incluye la ya aprobada', async () => {
      await conPeriodo(2, [SIN_APROBAR_1, SIN_APROBAR_2, YA_APROBADA]);

      componente.seleccionarTodasPendientes();

      expect(Array.from(componente.seleccionAprobar())).toEqual([1, 2]);
    });
  });

  // ─── Utilidades ────────────────────────────────────────────────────────────

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});

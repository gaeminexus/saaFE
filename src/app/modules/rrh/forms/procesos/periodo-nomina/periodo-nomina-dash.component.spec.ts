import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';

import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { NovedadNominaService } from '../../../service/novedad-nomina.service';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import { PeriodoNominaDashComponent } from './periodo-nomina-dash.component';

/**
 * Panel del período — dos añadidos del rediseño de Novedades/Períodos (2026-08-26), aditivos
 * sobre lo que ya había:
 *
 * - `motivo(accion)`: el texto junto a cada botón deshabilitado — «Requiere el período
 *   Calculado» en vez de un botón gris y mudo.
 * - `novedadesSinAprobar`: el aviso antes de Calcular, sobre el hueco que abrió la aprobación en
 *   lote de Novedades.
 *
 * No repite la cobertura de la máquina de estados en sí (`accionesDisponibles`, sin tocar).
 */
describe('PeriodoNominaDashComponent · motivo() y el aviso antes de Calcular', () => {
  let fixture: ComponentFixture<PeriodoNominaDashComponent>;
  let componente: PeriodoNominaDashComponent;
  let novedadNominaService: { selectByCriteria: jasmine.Spy };

  const PERIODO_ABIERTO = { codigo: 41, anio: 2026, mes: 4, estado: 1, modo: 1, numeroEmpleados: 20 };
  const PERIODO_CALCULADO = { codigo: 41, anio: 2026, mes: 4, estado: 3, modo: 1, numeroEmpleados: 20 };

  async function montar(periodo: any): Promise<void> {
    novedadNominaService = {
      selectByCriteria: jasmine.createSpy('selectByCriteria').and.returnValue(of([])),
    };

    await TestBed.configureTestingModule({
      imports: [PeriodoNominaDashComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PeriodoNominaService, useValue: { getById: () => of(periodo) } },
        { provide: NovedadNominaService, useValue: novedadNominaService },
        { provide: DetalleRubroService, useValue: { getDescripcionByParentAndAlterno: () => 'Rubro' } },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ codigo: String(periodo.codigo) }) } },
        },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(null) }) } },
        { provide: MatSnackBar, useValue: { open: () => undefined } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PeriodoNominaDashComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  }

  describe('motivo() — el porqué junto al botón gris', () => {
    it('una acción disponible no lleva motivo', async () => {
      await montar(PERIODO_ABIERTO);
      expect(componente.motivo('validar')).toBeNull();
    });

    it('Aprobar sobre un período Abierto explica que hace falta Calcularlo primero', async () => {
      await montar(PERIODO_ABIERTO);
      expect(componente.motivo('aprobar')).toBe('Requiere el período Calculado.');
    });

    it('Reabrir con asiento del rol ya emitido explica por qué, y no genérico', async () => {
      await montar({ ...PERIODO_CALCULADO, estado: 7, asientoRol: { codigo: 900 } });
      expect(componente.motivo('reabrir')).toContain('asiento del rol');
    });

    it('Reabrir sobre un período Pagado da el motivo específico, no el genérico de asiento', async () => {
      await montar({ ...PERIODO_ABIERTO, estado: 6 });
      expect(componente.motivo('reabrir')).toContain('Pagado');
    });
  });

  describe('novedadesSinAprobar — el aviso antes de Calcular', () => {
    it('cuenta sólo las que no están aprobadas', async () => {
      novedadNominaService = {
        selectByCriteria: jasmine.createSpy('selectByCriteria').and.returnValue(
          of([
            { codigo: 1, aprobada: 'S' },
            { codigo: 2, aprobada: 'N' },
            { codigo: 3, aprobada: 'N' },
          ]),
        ),
      };
      await TestBed.configureTestingModule({
        imports: [PeriodoNominaDashComponent, NoopAnimationsModule],
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          { provide: PeriodoNominaService, useValue: { getById: () => of(PERIODO_ABIERTO) } },
          { provide: NovedadNominaService, useValue: novedadNominaService },
          { provide: DetalleRubroService, useValue: { getDescripcionByParentAndAlterno: () => 'Rubro' } },
          {
            provide: ActivatedRoute,
            useValue: { snapshot: { paramMap: convertToParamMap({ codigo: '41' }) } },
          },
          { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
          { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(null) }) } },
          { provide: MatSnackBar, useValue: { open: () => undefined } },
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(PeriodoNominaDashComponent);
      componente = fixture.componentInstance;
      fixture.detectChanges();

      expect(componente.novedadesSinAprobar()).toBe(2);
      expect(texto()).toContain('2 novedad(es) sin aprobar');
    });

    it('en cero, no se pinta el aviso', async () => {
      await montar(PERIODO_ABIERTO);
      expect(componente.novedadesSinAprobar()).toBe(0);
      expect(texto()).not.toContain('sin aprobar');
    });
  });

  function texto(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});

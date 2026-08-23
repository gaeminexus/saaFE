import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { of } from 'rxjs';

import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { EstadoLiquidacion } from '../../../model/estados-liquidacion';
import { LiquidacionService } from '../../../service/liquidacion.service';
import { textoConfirmacionSalida } from './liquidacion.acciones';
import { LiquidacionListComponent } from './liquidacion-list.component';

/**
 * D24 · Aprobada, ejecutada y contabilizada eran el mismo 3.
 *
 * `ejecutarSalida` exige `APROBADA` de entrada y **no mueve el estado al terminar**, así que en
 * `LQDC` los tres momentos son indistinguibles. Los cuatro finiquitos de producción —1 Torres,
 * 2 Benítez, 21 Castro y 22 Cevallos— están en `LQDCESTD` 3 con la salida ya ejecutada, y la
 * pantalla los enseñaba como si les faltara ese paso.
 *
 * Se deduce de los efectos, que sí quedan escritos: contrato `CERRADO` y empleado en CESANTE.
 */
describe('LiquidacionListComponent · D24', () => {
  let fixture: ComponentFixture<LiquidacionListComponent>;
  let componente: LiquidacionListComponent;
  let finiquitos: any[];

  const CERRADO = { codigo: 2, numero: 'CT-1701020304', estado: 'CERRADO' };
  const ACTIVO = { codigo: 3, numero: 'CT-1712345678', estado: 'ACTIVO' };
  const CESANTE = { codigo: 45, apellidos: 'TORRES CHAVEZ', nombres: 'ROSA', identificacion: '1701020304', estado: 4 };
  const EN_PLANTILLA = { codigo: 10, apellidos: 'BRAVO CAIZA', nombres: 'ANA', identificacion: '1712345678', estado: 1 };

  /** Los cuatro de producción: aprobados y con la salida hecha. */
  const YA_EJECUTADA = {
    codigo: 1,
    estado: EstadoLiquidacion.APROBADA,
    neto: 7556.41,
    fechaSalida: [2026, 1, 15],
    empleado: CESANTE,
    contratoEmpleado: CERRADO,
  };

  /** Aprobado y esperando: es el único sobre el que el botón irreversible hace algo. */
  const PENDIENTE = {
    codigo: 2,
    estado: EstadoLiquidacion.APROBADA,
    neto: 493.64,
    fechaSalida: [2026, 1, 16],
    empleado: EN_PLANTILLA,
    contratoEmpleado: ACTIVO,
  };

  beforeEach(async () => {
    finiquitos = [YA_EJECUTADA, PENDIENTE];

    await TestBed.configureTestingModule({
      imports: [LiquidacionListComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: LiquidacionService, useValue: { getAll: () => of(finiquitos) } },
        {
          provide: DetalleRubroService,
          useValue: {
            getDescripcionByParentAndAlterno: (_r: number, alterno: number) =>
              ({ 3: 'Aprobada', 5: 'Pagada', 6: 'Anulada' } as any)[alterno] ?? 'Calculada',
          },
        },
        { provide: Router, useValue: { navigate: () => Promise.resolve(true) } },
        { provide: MatSnackBar, useValue: { open: () => undefined } },
      ],
    }).compileComponents();
  });

  function montar(): void {
    fixture = TestBed.createComponent(LiquidacionListComponent);
    componente = fixture.componentInstance;
    fixture.detectChanges();
  }

  function fila(codigo: number): any {
    return componente.filas().find((f) => f.codigo === codigo);
  }

  /** La pastilla no es pública; se pide por la misma vía que usa la plantilla. */
  function tono(codigo: number): string | null {
    const columna = componente.columnas.find((c) => c.campo === 'estadoLabel')!;
    return columna.pastilla!(fila(codigo));
  }

  it('distingue la salida ejecutada de la que todavía está pendiente', () => {
    montar();

    expect(fila(1).estadoLabel).toBe('Aprobada · salida ejecutada');
    expect(fila(2).estadoLabel).toBe('Aprobada · salida pendiente');
  });

  /**
   * El color va con el trabajo pendiente, no con el avance. Mientras los tres momentos eran el
   * mismo naranja, la pastilla decía «te falta algo» sobre cuatro finiquitos completos.
   */
  it('reserva el aviso para el finiquito sobre el que el botón todavía hace algo', () => {
    montar();

    expect(tono(1)).toBe('neutro');
    expect(tono(2)).toBe('aviso');
  });

  it('no afirma nada cuando falta el contrato en la respuesta', () => {
    finiquitos = [{ ...YA_EJECUTADA, contratoEmpleado: null }];
    montar();

    // Decir «pendiente» por no tener el dato sería exactamente la lectura que invita a pulsar.
    expect(fila(1).estadoLabel).toBe('Aprobada');
    expect(tono(1)).toBe('aviso');
  });

  it('tampoco cuando las dos señales se contradicen', () => {
    // Contrato cerrado pero el colaborador sigue activo: de ahí no se concluye una salida.
    finiquitos = [{ ...YA_EJECUTADA, empleado: EN_PLANTILLA }];
    montar();

    expect(fila(1).estadoLabel).toBe('Aprobada');
  });

  it('deja intactos los estados que el rubro ya desambigua', () => {
    finiquitos = [
      { ...YA_EJECUTADA, codigo: 8, estado: EstadoLiquidacion.PAGADA },
      { ...YA_EJECUTADA, codigo: 9, estado: EstadoLiquidacion.ANULADA },
    ];
    montar();

    // Añadirles el matiz sería ruido: ahí el estado ya dice lo que hay.
    expect(fila(8).estadoLabel).toBe('Pagada');
    expect(fila(9).estadoLabel).toBe('Anulada');
    expect(tono(8)).toBe('ok');
    expect(tono(9)).toBe('error');
  });
});

/**
 * El aviso del último momento, cuando el dedo ya está sobre el botón irreversible.
 *
 * `generarAvisoSalida` **no es idempotente**: un segundo clic no reescribe la novedad del IESS,
 * genera otra. El arreglo de fondo es del motor —punto 21— y esto es lo que se puede decir desde
 * la pantalla mientras tanto.
 */
describe('textoConfirmacionSalida · D24', () => {
  it('avisa de la duplicación cuando la salida ya parece ejecutada', () => {
    const texto = textoConfirmacionSalida('TORRES CHAVEZ ROSA', 'si');

    expect(texto).toContain('EJECUTADA YA');
    expect(texto).toContain('DUPLICA el aviso de salida al IESS');
    // Y sin perder lo que ya decía.
    expect(texto).toContain('no se puede deshacer');
  });

  it('no lo añade cuando la salida está pendiente', () => {
    expect(textoConfirmacionSalida('BRAVO CAIZA ANA', 'no')).not.toContain('EJECUTADA YA');
  });

  it('ni cuando no se sabe, que es su valor por defecto', () => {
    expect(textoConfirmacionSalida('BRAVO CAIZA ANA')).not.toContain('EJECUTADA YA');
    expect(textoConfirmacionSalida('BRAVO CAIZA ANA', 'desconocido')).not.toContain('EJECUTADA YA');
  });
});

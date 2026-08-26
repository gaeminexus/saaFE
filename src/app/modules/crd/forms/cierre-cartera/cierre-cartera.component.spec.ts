import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { UsuarioService } from '../../../../shared/services/usuario.service';
import { CierreCarteraComponent } from './cierre-cartera.component';

describe('CierreCarteraComponent', () => {
  let component: CierreCarteraComponent;
  let fixture: ComponentFixture<CierreCarteraComponent>;
  let httpMock: HttpTestingController;

  const usuarioServiceMock: Partial<UsuarioService> = {
    getEmpresaLog: () => ({ codigo: 1236, nombre: 'ASOPREP' } as any),
    getUsuarioLog: () => ({ codigo: 1, nombre: 'TEST' } as any),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CierreCarteraComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UsuarioService, useValue: usuarioServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CierreCarteraComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  it('debe crearse y resolver la empresa de la sesión', () => {
    expect(component).toBeTruthy();
    expect(component.idEmpresa).toBe(1236);
  });

  it('formatoFechaArray formatea [y,m,d] como dd/MM/yyyy', () => {
    expect(component.formatoFechaArray([2026, 8, 31])).toBe('31/08/2026');
    expect(component.formatoFechaArray(null)).toBe('—');
  });

  it('cuadra() usa tolerancia sobre debe vs haber', () => {
    expect(component.cuadra({ totalDebe: 100, totalHaber: 100 } as any)).toBeTrue();
    expect(component.cuadra({ totalDebe: 100, totalHaber: 100.5 } as any)).toBeFalse();
  });

  it('previsualizar llama al endpoint y guarda el resultado como previsualización', () => {
    component.anio = 2026;
    component.mes = 8;
    component.previsualizar();

    const req = httpMock.expectOne((r) => r.url.endsWith('/cierrecartera/previsualizar'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(
      jasmine.objectContaining({ idEmpresa: 1236, anio: 2026, mes: 8 }),
    );
    req.flush({
      idCorrida: null,
      idEmpresa: 1236,
      anio: 2026,
      mes: 8,
      fechaCorte: [2026, 8, 31],
      fechaProceso: [2026, 9, 1],
      fechaCorteApertura: [2026, 9, 30],
      idEstado: null,
      nombreEstado: null,
      capitalTotal: 17130466.19,
      totalDesviacion: 0,
      subProcesos: [],
      snapshot: [],
      desviaciones: [],
      advertencias: [],
    });

    expect(component.origen()).toBe('previsualizacion');
    expect(component.resultado()?.capitalTotal).toBe(17130466.19);
    expect(component.puedeEjecutar).toBeTrue();
  });

  it('extrae el mensaje del error 500 JSON en consultar', (done) => {
    component.consultar();
    const req = httpMock.expectOne((r) => r.url.includes('/cierrecartera/consultar'));
    req.flush(
      { mensaje: 'Error al consultar el cierre de cartera: El periodo 2026-08 no tiene una corrida' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    setTimeout(() => {
      expect(component.error()).toBe(
        'Error al consultar el cierre de cartera: El periodo 2026-08 no tiene una corrida',
      );
      done();
    });
  });
});

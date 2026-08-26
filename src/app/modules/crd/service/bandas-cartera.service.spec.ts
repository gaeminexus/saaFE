import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BandasCarteraService } from './bandas-cartera.service';

describe('BandasCarteraService (manejo de errores)', () => {
  let service: BandasCarteraService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BandasCarteraService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('extrae `mensaje` cuando el error 500 es JSON (forma real del backend)', (done) => {
    service.clasificar(21, 1236, 1, 45).subscribe({
      next: () => fail('debería fallar'),
      error: (mensaje) => {
        expect(typeof mensaje).toBe('string');
        expect(mensaje).toBe(
          'Error al clasificar la banda: No hay configuracion de bandas vigente',
        );
        done();
      },
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/cbpr/clasificar'));
    req.flush(
      { mensaje: 'Error al clasificar la banda: No hay configuracion de bandas vigente' },
      { status: 500, statusText: 'Internal Server Error' },
    );
  });

  it('mantiene el texto plano cuando el error 500 es texto (forma del contrato)', (done) => {
    service.getListado(1236).subscribe({
      next: () => fail('debería fallar'),
      error: (mensaje) => {
        expect(mensaje).toBe('Error al obtener el listado: La empresa es obligatoria');
        done();
      },
    });

    const req = httpMock.expectOne((r) => r.url.endsWith('/cbpr/listado'));
    req.flush('Error al obtener el listado: La empresa es obligatoria', {
      status: 500,
      statusText: 'Internal Server Error',
    });
  });
});

import { HttpHeaders, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { ReportesDelMesComponent } from './reportes-del-mes.component';

/**
 * C36 — el B17 se entrega con los bytes que manda `/esrp/archivo` (latin1, TAB, CRLF): ni se lee como texto ni
 * se recodifica. Y el estado preliminar / disponible sale de la respuesta del backend.
 */
describe('ReportesDelMesComponent (C36)', () => {
  let http: HttpTestingController;

  /** Bytes de prueba con lo que rompería una recodificación: Ñ en latin1 (0xD1), TAB y CRLF, sin salto final. */
  const BYTES = new Uint8Array([0x42, 0x31, 0x37, 0x09, 0x33, 0x39, 0x36, 0x38, 0x0d, 0x0a, 0xd1, 0x09, 0x30]);

  function crear(mes: number, anio: number) {
    const fixture = TestBed.createComponent(ReportesDelMesComponent);
    fixture.componentRef.setInput('mes', mes);
    fixture.componentRef.setInput('anio', anio);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  /** Responde con error a todo lo que no es el B17 (flujo y estados oficiales). */
  function cerrarOtros(): void {
    http.match((r) => !r.body?.codigoEstructura || r.body.codigoEstructura !== 'B17').forEach((r) =>
      r.flush({ mensaje: 'no aplica en la prueba' }, { status: 400, statusText: 'Bad Request' }),
    );
  }

  function resultadoB17(nombreArchivo: string, preliminar: boolean) {
    return { codigoEstructura: 'B17', nombre: 'B17', titulo: 'B17', lineas: [], sumaControl: 1, advertencias: [], nombreArchivo, contenidoArchivo: 'x', preliminar };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ReportesDelMesComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: AppStateService, useValue: { getEmpresa: () => ({ codigo: 1236 }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  it('mes sin cerrar: B17 preliminar y el Blob descargado es el mismo, byte a byte, con el nombre del backend', async () => {
    const c = crear(6, 2025);
    c.revisar();

    const definitivo = http.expectOne((r) => r.url.endsWith('/esrp/generar') && r.body.codigoEstructura === 'B17');
    expect(definitivo.request.body).toEqual(jasmine.objectContaining({ empresa: 1236, fechaCorte: '2025-06-30', preliminar: false }));
    cerrarOtros();
    definitivo.flush({ mensaje: 'REPORTE_MES_NO_CERRADO: junio 2025 está ABIERTO' }, { status: 400, statusText: 'Bad Request' });

    const preliminar = http.expectOne((r) => r.url.endsWith('/esrp/generar') && r.body.preliminar === true);
    preliminar.flush(resultadoB17('B17M396830062025_PRELIMINAR.txt', true));

    const fila = c.filas().find((f) => f.clave === 'B17')!;
    expect(fila.estado).toBe('preliminar');

    const urls: Blob[] = [];
    const nombres: string[] = [];
    spyOn(URL, 'createObjectURL').and.callFake((b: Blob | MediaSource) => { urls.push(b as Blob); return 'blob:prueba'; });
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) { nombres.push(this.download); });

    c.descargar(fila, fila.descargas[0]);
    const archivo = http.expectOne((r) => r.url.endsWith('/esrp/archivo'));
    expect(archivo.request.responseType).toBe('blob');
    expect(archivo.request.body).toEqual(jasmine.objectContaining({ codigoEstructura: 'B17', fechaCorte: '2025-06-30', preliminar: true }));
    const enviado = new Blob([BYTES], { type: 'text/plain; charset=ISO-8859-1' });
    archivo.flush(enviado, { headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="B17M396830062025_PRELIMINAR.txt"' }) });

    await new Promise((r) => setTimeout(r, 10));
    expect(urls.length).toBe(1);
    expect(urls[0]).toBe(enviado);
    expect(new Uint8Array(await urls[0].arrayBuffer())).toEqual(BYTES);
    expect(nombres).toEqual(['B17M396830062025_PRELIMINAR.txt']);
    http.verify();
  });

  it('mes cerrado: B17 disponible y, sin Content-Disposition, el nombre de la Super B17M3968ddMMaaaa.txt', async () => {
    const c = crear(6, 2025);
    c.revisar();
    const definitivo = http.expectOne((r) => r.url.endsWith('/esrp/generar') && r.body.codigoEstructura === 'B17');
    cerrarOtros();
    definitivo.flush(resultadoB17('B17M396830062025.txt', false));
    const fila = c.filas().find((f) => f.clave === 'B17')!;
    expect(fila.estado).toBe('disponible');

    const nombres: string[] = [];
    spyOn(URL, 'createObjectURL').and.returnValue('blob:prueba');
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) { nombres.push(this.download); });

    c.descargar(fila, fila.descargas[0]);
    const archivo = http.expectOne((r) => r.url.endsWith('/esrp/archivo'));
    expect(archivo.request.body.preliminar).toBe(false);
    archivo.flush(new Blob([BYTES]));
    await new Promise((r) => setTimeout(r, 10));
    expect(nombres).toEqual(['B17M396830062025.txt']);
    http.verify();
  });

  it('las filas sin generador en el SAA quedan como no disponibles con su motivo', () => {
    const c = crear(1, 2026);
    for (const clave of ['FLE', 'Q01']) {
      const f = c.filas().find((x) => x.clave === clave)!;
      expect(f.estado).toBe('no-disponible');
      expect(f.motivo).toContain('C36-REPORTES-SUPER-EN-PANTALLA.md');
      expect(f.descargas.length).toBe(0);
    }
  });
});

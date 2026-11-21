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
    const f = c.filas().find((x) => x.clave === 'Q01')!;
    expect(f.estado).toBe('no-disponible');
    expect(f.motivo).toContain('C36-REPORTES-SUPER-EN-PANTALLA.md');
    expect(f.descargas.length).toBe(0);
  });

  // ─────────────────────────────────────────────────────────────── C38: /flef

  function resultadoFlujo(preliminar: boolean) {
    const l = (codigo: string, valor: number) => ({ codigo, fila: 0, nivel: 1, concepto: codigo, formula: null, codigos: null, valor });
    return {
      anio: 2025, mes: 12, periodo: 'MES', fechaBase: '2025-11-30', fechaInicio: '2025-12-01', fechaCorte: '2025-12-31', preliminar,
      leyenda: preliminar ? 'PRELIMINAR' : 'DEFINITIVO', advertencias: [], notas: [], nombreArchivo: 'FLUJO_EFECTIVO_2025-12_MES',
      lineas: [l('FE50', 35814836.19), l('FE48', -11521635.25), l('FE51', 24293200.94)],
      controles: [{ grupo: 'INDIRECTO', nombre: 'caja', valor: 0, esperado: 0, diferencia: 0, estado: 'OK', detalle: '' }],
      flujoCaja: [{ anio: 2025, mes: 12, saldoInicial: 0, totalIngresos: 0, totalEgresos: 0, saldoFinal: 0, lineas: [],
        controles: [{ grupo: 'DIRECTO', nombre: 'x', valor: 1, esperado: 0, diferencia: 1, estado: 'ADVERTENCIA', detalle: '' }] }],
    };
  }

  /** Responde con error a todo lo que no es /flef (B17 y estados oficiales). */
  function cerrarNoFlef(): void {
    http.match((r) => !r.url.includes('/flef/')).forEach((r) =>
      r.flush({ mensaje: 'no aplica en la prueba' }, { status: 400, statusText: 'Bad Request' }),
    );
  }

  it('C38: flujo de efectivo del mes cerrado disponible; el Excel acumulado y el comparativo salen de /flef', async () => {
    const c = crear(12, 2025);
    c.revisar();
    const generar = http.expectOne((r) => r.url.endsWith('/flef/generar'));
    expect(generar.request.body).toEqual(
      jasmine.objectContaining({ empresa: 1236, anio: 2025, mes: 12, periodo: 'MES', preliminar: false, incluirDirecto: true }),
    );
    cerrarNoFlef();
    generar.flush(resultadoFlujo(false));

    const fle = c.filas().find((f) => f.clave === 'FLE')!;
    const flc = c.filas().find((f) => f.clave === 'FLC')!;
    expect(fle.estado).toBe('disponible');
    expect(flc.estado).toBe('disponible');
    expect(fle.motivo).toContain('24.293.200,94');
    expect(flc.motivo).toContain('1 advertencia');

    const nombres: string[] = [];
    spyOn(URL, 'createObjectURL').and.returnValue('blob:prueba');
    spyOn(URL, 'revokeObjectURL');
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) { nombres.push(this.download); });

    c.descargar(fle, fle.descargas.find((d) => d.etiqueta === 'Excel acumulado')!);
    const excel = http.expectOne((r) => r.url.endsWith('/flef/excel'));
    expect(excel.request.responseType).toBe('blob');
    expect(excel.request.body).toEqual(jasmine.objectContaining({ periodo: 'ACUMULADO', reporte: 'INDIRECTO', preliminar: false }));
    excel.flush(new Blob(['x']), { headers: new HttpHeaders({ 'Content-Disposition': 'attachment; filename="FLUJO_EFECTIVO_2025-12_ACUMULADO.xlsx"' }) });

    c.descargar(flc, flc.descargas[0]);
    const caja = http.expectOne((r) => r.url.endsWith('/flef/excel'));
    expect(caja.request.body).toEqual(jasmine.objectContaining({ periodo: 'ACUMULADO', reporte: 'DIRECTO', incluirDirecto: true }));
    caja.flush(new Blob(['x']));

    const cmp = c.filas().find((f) => f.clave === 'CMP')!;
    expect(cmp.descargas[0].etiqueta).toBe('Excel formato');
    const s = (cmp.descargas[0] as any).obtener();
    s.subscribe();
    const comp = http.expectOne((r) => r.url.endsWith('/flef/comparativoExcel'));
    expect(comp.request.body).toEqual(jasmine.objectContaining({ anio: 2025, mes: 12, preliminar: false }));
    comp.flush(new Blob(['x']));

    await new Promise((r) => setTimeout(r, 1000));
    expect(nombres).toEqual(['FLUJO_EFECTIVO_2025-12_ACUMULADO.xlsx', 'FLUJO_CAJA_2025-12_ACUMULADO.xlsx']);
    http.verify();
  });

  it('C38: mes sin cerrar: /flef se pide preliminar y el Excel sale preliminar', () => {
    const c = crear(11, 2026);
    c.revisar();
    const definitivo = http.expectOne((r) => r.url.endsWith('/flef/generar'));
    cerrarNoFlef();
    definitivo.flush({ mensaje: 'REPORTE_MES_NO_CERRADO: B17 definitivo solo se genera para meses cerrados' }, { status: 400, statusText: 'Bad Request' });
    const preliminar = http.expectOne((r) => r.url.endsWith('/flef/generar') && r.body.preliminar === true);
    preliminar.flush(resultadoFlujo(true));
    const fle = c.filas().find((f) => f.clave === 'FLE')!;
    expect(fle.estado).toBe('preliminar');
    expect(fle.motivo).toContain('PRELIMINAR');
    (fle.descargas[0] as any).obtener().subscribe();
    const excel = http.expectOne((r) => r.url.endsWith('/flef/excel'));
    expect(excel.request.body).toEqual(jasmine.objectContaining({ periodo: 'MES', preliminar: true }));
    excel.flush(new Blob(['x']));
    http.verify();
  });
});

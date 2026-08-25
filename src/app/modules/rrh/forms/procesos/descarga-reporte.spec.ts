import { fakeAsync, tick } from '@angular/core/testing';

import { guardarArchivo, mensajeReporteFallido, ReportesNomina } from './descarga-reporte';

/**
 * La entrega del PDF al navegador.
 *
 * Se prueba el mecanismo y no el resultado: que el archivo acabe en la carpeta de descargas no lo
 * puede comprobar un test. Lo que sí se puede comprobar es lo que rompía la entrega — revocar la
 * URL antes de que el navegador la lea, y pulsar un enlace que nunca estuvo en el documento—,
 * porque las dos cosas son observables desde aquí.
 */
describe('guardarArchivo', () => {
  let creadas: string[];
  let revocadas: string[];
  let enElDocumentoAlPulsar: boolean | null;

  beforeEach(() => {
    creadas = [];
    revocadas = [];
    enElDocumentoAlPulsar = null;

    spyOn(URL, 'createObjectURL').and.callFake(() => {
      const url = `blob:prueba-${creadas.length}`;
      creadas.push(url);
      return url;
    });
    spyOn(URL, 'revokeObjectURL').and.callFake((url: string) => { revocadas.push(url); });

    // El clic real abriría una descarga del navegador; se intercepta y se anota el estado del DOM.
    spyOn(HTMLAnchorElement.prototype, 'click').and.callFake(function (this: HTMLAnchorElement) {
      enElDocumentoAlPulsar = document.body.contains(this);
    });
  });

  it('no revoca la URL en el mismo tick que el clic', fakeAsync(() => {
    guardarArchivo(new Blob(['%PDF-1.4']), 'rol-consolidado-2026-04.pdf');

    // Aquí es donde se perdía el reporte: 200, sin error, sin aviso y sin archivo.
    expect(revocadas).toEqual([]);

    tick(2000);
    expect(revocadas).toEqual(creadas);
  }));

  it('el enlace está en el documento cuando se pulsa', fakeAsync(() => {
    guardarArchivo(new Blob(['%PDF-1.4']), 'rol-consolidado-2026-04.pdf');
    tick(2000);

    expect(enElDocumentoAlPulsar).toBeTrue();
  }));

  it('y no deja el enlace colgando en el documento', fakeAsync(() => {
    const antes = document.body.querySelectorAll('a').length;

    guardarArchivo(new Blob(['%PDF-1.4']), 'rol-consolidado-2026-04.pdf');
    tick(2000);

    expect(document.body.querySelectorAll('a').length).toBe(antes);
  }));

  it('lleva el nombre de archivo pedido', fakeAsync(() => {
    let nombre: string | null | undefined;
    (HTMLAnchorElement.prototype.click as jasmine.Spy).and.callFake(function (this: HTMLAnchorElement) {
      nombre = this.getAttribute('download');
    });

    guardarArchivo(new Blob(['%PDF-1.4']), 'provisiones-2026-04.pdf');
    tick(2000);

    expect(nombre).toBe('provisiones-2026-04.pdf');
  }));
});

/**
 * El servidor explica el fallo en el cuerpo, no en el código HTTP: una plantilla que no existe
 * devuelve 500 con el motivo dentro. Y el cuerpo llega como `Blob` porque la petición pide
 * `responseType: 'blob'` para recibir el PDF.
 */
describe('mensajeReporteFallido', () => {
  it('saca el mensaje del cuerpo aunque venga como Blob', async () => {
    const cuerpo = new Blob([
      JSON.stringify({ exito: false, mensaje: 'No se encontró el reporte: /rep/rhh/X.jrxml' }),
    ]);

    await expectAsync(mensajeReporteFallido({ error: cuerpo }))
      .toBeResolvedTo('No se encontró el reporte: /rep/rhh/X.jrxml');
  });

  it('cae al genérico cuando el cuerpo no es JSON', async () => {
    await expectAsync(mensajeReporteFallido({ error: new Blob(['<html>Error 405</html>']) }))
      .toBeResolvedTo('No se pudo generar el reporte.');
  });

  it('y cuando no hay cuerpo ninguno', async () => {
    await expectAsync(mensajeReporteFallido(null)).toBeResolvedTo('No se pudo generar el reporte.');
  });
});

describe('ReportesNomina', () => {
  /**
   * Tienen que coincidir carácter por carácter con los `.jrxml` del servidor: un nombre
   * equivocado no falla al compilar, devuelve el error en tiempo de ejecución.
   */
  it('conserva los nombres de plantilla confirmados contra los entregados', () => {
    expect(ReportesNomina.ROL_INDIVIDUAL).toBe('RPRT_ROLL_INDV');
    expect(ReportesNomina.ROL_CONSOLIDADO).toBe('RPRT_ROLL_CNSL');
    expect(ReportesNomina.PROVISIONES).toBe('RPRT_PRVS_PRDO');
    expect(ReportesNomina.RESUMEN_APORTES).toBe('RPRT_APRT_RSMN');
  });
});

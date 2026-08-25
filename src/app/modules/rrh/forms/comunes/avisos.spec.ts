import { duracionError, opcionesAviso } from './avisos';

/**
 * D26 · El aviso que se dibujaba detrás del header.
 *
 * Tres cosas que había que comprobar y no suponer: que se ve, que se ve **entero**, y que el
 * arreglo no se lleva por delante los avisos de éxito, que usan el mismo camino.
 */
describe('opcionesAviso · D26', () => {
  /** Un mensaje de Jasper real, de los que motivaron el defecto. */
  const MENSAJE_LARGO =
    'Error al generar reporte: net.sf.jasperreports.engine.JRException: ' +
    'No se encontró el reporte: /rep/rhh/RPRT_ROLL_INDV.jrxml';

  describe('dónde se dibuja', () => {
    it('abajo y centrado, no arriba a la derecha', () => {
      const o = opcionesAviso(true, 'algo falló');

      expect(o.verticalPosition).toBe('bottom');
      expect(o.horizontalPosition).toBe('center');
    });

    it('en el mismo sitio para el éxito que para el error', () => {
      const error = opcionesAviso(true, 'x');
      const exito = opcionesAviso(false, 'x');

      // Si la posición dependiera del tono, la mitad de los avisos volvería a esconderse.
      expect(exito.verticalPosition).toBe(error.verticalPosition);
      expect(exito.horizontalPosition).toBe(error.horizontalPosition);
    });
  });

  describe('cuánto tiempo permanece', () => {
    /**
     * Un error que se va antes de leerse es tan invisible como uno que no se muestra: las dos
     * cosas se leen como «el botón no hace nada».
     */
    it('un error largo permanece más que uno corto', () => {
      expect(duracionError(MENSAJE_LARGO)).toBeGreaterThan(duracionError('No se pudo.'));
    });

    it('ningún error baja de 8 segundos, por corto que sea', () => {
      expect(duracionError('')).toBeGreaterThanOrEqual(8000);
      expect(duracionError('No.')).toBeGreaterThanOrEqual(8000);
      expect(opcionesAviso(true, 'No.').duration).toBeGreaterThanOrEqual(8000);
    });

    /**
     * Este caso es el que corrigió a la implementación, no al revés.
     *
     * Con la fórmula original —18 ms por carácter y sin tiempo base— hacían falta 444 caracteres
     * para superar el suelo de 8 s. Ningún mensaje real llega a eso, así que el escalado no se
     * activaba nunca y la fórmula sólo parecía hacer algo. Que este mensaje concreto —el de
     * Jasper, el que motivó D26— quede **por encima** del suelo es la prueba de que el escalado
     * sirve para algo.
     */
    it('el mensaje de Jasper que motivó el defecto supera el suelo, no se queda en él', () => {
      expect(MENSAJE_LARGO.length).toBeGreaterThan(100);
      expect(duracionError(MENSAJE_LARGO)).toBeGreaterThan(8000);
    });

    it('y ninguno se queda clavado: hay techo', () => {
      const enorme = 'x'.repeat(10_000);

      expect(duracionError(enorme)).toBeLessThanOrEqual(20000);
      expect(duracionError(enorme)).toBeGreaterThan(duracionError('corto'));
    });

    it('el éxito sigue siendo breve, no hereda la duración del error', () => {
      expect(opcionesAviso(false, MENSAJE_LARGO).duration).toBe(4000);
    });
  });

  describe('no rompe los avisos de éxito', () => {
    it('el éxito conserva su clase verde y el error la roja', () => {
      expect(opcionesAviso(false, 'Guardado').panelClass).toEqual(['snackbar-success']);
      expect(opcionesAviso(true, 'Falló').panelClass).toEqual(['snackbar-error']);
    });

    it('las dos clases son de las que existen en la hoja compilada', () => {
      // `styles/styles.scss` define .snackbar-success y .snackbar-error. Una clase inventada
      // daría un aviso sin color, que es otra forma de no verse.
      const clases = [
        ...(opcionesAviso(false, 'a').panelClass as string[]),
        ...(opcionesAviso(true, 'b').panelClass as string[]),
      ];
      for (const c of clases) {
        expect(['snackbar-success', 'snackbar-error']).toContain(c);
      }
    });
  });
});

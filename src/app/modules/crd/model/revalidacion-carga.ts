/**
 * `POST /rest/asgn/revalidarCarga/{idCargaArchivo}` (publicado por el backend, commit `ec048e2`).
 * Recalcula las novedades de la carga a partir de los datos YA cargados — no vuelve a leer el
 * archivo, no aplica pagos, no genera asientos.
 *
 * ⛔ NO borra afectaciones ya guardadas. Cuando una novedad ya no corresponde pero tiene
 * afectaciones (`AfectacionValoresParticipeCarga`) colgando, el backend la CONSERVA en vez de
 * desactivarla — `detalleConservadasPorAvpc` es la lista exacta de esos casos, y hay que
 * mostrarla: es la garantía concreta (no una promesa) de que el trabajo ya hecho no se pierde.
 *
 * Cuando una novedad ya no corresponde y NO tiene afectaciones, el backend la DESACTIVA
 * (`estado = 0`) en vez de borrarla — ver la nota sobre `estado` en `NovedadParticipeCarga`.
 *
 * ⚠️ Forma de la respuesta asumida a partir de la descripción del árbitro, no de un ejemplo JSON
 * confirmado — los nombres de campo pueden diferir del contrato real. Aislado acá y en
 * `ServiciosAsoprepService.revalidarCarga` para que corregirlo sea un cambio de un solo lugar.
 */
export interface ResumenRevalidacionCarga {
  idCarga: number;
  novedadesActualizadas: number;
  novedadesCreadas: number;
  novedadesSinCambios: number;
  /** Ya no corresponderían, pero se conservan porque tienen afectaciones colgando — mostrar SIEMPRE que venga algo acá. */
  detalleConservadasPorAvpc: NovedadConservadaPorAvpc[];
}

export interface NovedadConservadaPorAvpc {
  codigo: number;
  descripcion?: string;
  codigoPetro?: number;
  participe?: string;
}

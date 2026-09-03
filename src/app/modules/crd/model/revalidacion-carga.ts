/**
 * `POST /rest/asgn/revalidarCarga/{idCargaArchivo}` (backend, `docs/logica-negocio/petro/
 * VALIDACION-TOPE-AFECTACION-MANUAL.md` §16, commit `ec048e2`). Recalcula las novedades de la
 * carga a partir de los datos YA cargados (DTCA/PXCA que ya están en la base) — no vuelve a leer
 * el archivo, no aplica pagos, no genera asientos. 409 si la carga ya está procesada (estado 3).
 *
 * ⛔ NO borra afectaciones ya guardadas. Cuando una novedad ya no corresponde pero tiene
 * afectaciones (`AfectacionValoresParticipeCarga`) colgando, el backend la CONSERVA en vez de
 * desactivarla — `detalleConservadasPorAvpc` es la lista exacta de esos casos, y hay que
 * mostrarla: es la garantía concreta (no una promesa) de que el trabajo ya hecho no se pierde.
 *
 * Cuando una novedad ya no corresponde y NO tiene afectaciones, el backend la DESACTIVA
 * (`estado = 0`) en vez de borrarla.
 *
 * ⚠️ **Límite conocido del backend, declarado a propósito (§16):** ningún endpoint que devuelve
 * `NovedadParticipeCarga` filtra por `estado` todavía — una novedad desactivada sigue apareciendo
 * en cualquier listado (`GET /nvpc/getByCargaArchivo`, `selectByCriteria`, etc.) sin ninguna marca.
 * El backend deja este filtrado explícitamente para el frontend.
 */
export interface ResumenRevalidacionCarga {
  idCarga: number;
  participesRevisados: number;
  novedadesCreadas: number;
  novedadesActualizadas: number;
  novedadesDesactivadas: number;
  novedadesConservadasPorAvpc: number;
  /** Ya no corresponderían, pero se conservan porque tienen afectaciones colgando — mostrar SIEMPRE que venga algo acá. */
  detalleConservadasPorAvpc: NovedadConservadaPorAvpc[];
  /** Mensajes de partícipes que fallaron al revalidar (no frenan al resto) — texto libre del backend. */
  errores: string[];
}

/** Campos exactos confirmados leyendo `CargaArchivoPetroServiceImpl.revalidarCarga` (backend). */
export interface NovedadConservadaPorAvpc {
  codigoPetro: number;
  participe: string;
  /** Código de la novedad (`NovedadParticipeCarga.codigo`) que se conservó. */
  novedad: number;
  tipoNovedad: number;
  /** Cuántas filas AVPC tiene colgando — el motivo por el que no se desactivó. */
  avpc: number;
}

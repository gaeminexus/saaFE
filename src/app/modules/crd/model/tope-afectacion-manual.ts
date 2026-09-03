/**
 * `GET /rest/asgn/topeAfectacion` (`saaBE/docs/logica-negocio/petro/VALIDACION-TOPE-AFECTACION-
 * MANUAL.md` §8). Solo lectura, informa — NO valida ni bloquea: la validación real que impide
 * procesar sigue siendo la del backend al aplicar. Es la MISMA fórmula que usa
 * `validarTopeAfectacionManualPorParticipe` para bloquear (`excesoYRestante`, compartida) — la
 * pantalla no reimplementa la regla, solo la consulta.
 */
export interface TopeAfectacionManual {
  codigoPetro: number;
  /** `SUM(PXCA.PXCADSDO)` del partícipe en esta carga, todos los productos. */
  disponible: number;
  /** `SUM(AVPC.AVPCVAFA)` de TODAS las novedades del partícipe en esta carga, no solo la abierta. */
  afectado: number;
  /** `max(0, afectado - disponible)`. Mayor a cero: el partícipe ya se pasó. */
  exceso: number;
  /** `max(0, disponible - afectado)`. Es el tope que se muestra al operador. */
  restante: number;
}

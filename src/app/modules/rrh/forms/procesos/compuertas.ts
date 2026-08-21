/**
 * Compuertas de funcionalidad que el frontend ya construyó y el backend todavía no sirve.
 *
 * Son constantes, no configuración: se ponen en `true` cuando llega el aviso de que el endpoint
 * correspondiente está desplegado, y entonces la pantalla funciona sin más cambios. La compuerta
 * hermana de los campos de asistencia vive en `forms/asistencia/utiles-asistencia.ts`
 * (`CAMPOS_ASISTENCIA_PERSISTEN`), porque allí gobierna además el formateo.
 */

/**
 * `POST /rest/hrex/aprobar`, el proceso de aprobación en lote de la bandeja de horas extra.
 *
 * **Abierta el 2026-08-19** con la publicación de la fase 7: `HoraExtraRest` ya declara el
 * método y lee `usuarioRegistro`. Antes la ruta no existía y el CRUD la capturaba con su
 * `@Path("/{id}")`, devolviendo un 405 que despistaba —parecía un método mal usado y era un
 * endpoint ausente—.
 */
export const APROBACION_HORAS_EXTRA_DISPONIBLE = true;

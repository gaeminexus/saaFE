/**
 * Extrae el mensaje legible de un error HTTP del backend. Única implementación
 * del proyecto — `modules/rrh/forms/comunes/mensajes.ts` reexporta esta misma
 * función para no romper a sus llamadores existentes.
 *
 * Dos formas de error conviven en el proyecto:
 * - `MensajeErrorJsonFilter` envuelve los errores REST como `{"mensaje": "..."}`
 *   ya parseado en `error.error`.
 * - Algunos endpoints responden `entity("<texto plano>")` anunciado como JSON:
 *   `HttpClient` intenta parsearlo, falla, y entrega
 *   `{ error: SyntaxError, text: '<el mensaje real>' }`, con `message` puesto a
 *   su propio genérico ("Http failure during parsing..."). Por eso `text` se
 *   mira antes que `message`.
 * - Con el backend caído (status 0), un 502 con HTML, o una respuesta blob,
 *   Angular rellena `HttpErrorResponse.message` con un genérico del tipo
 *   "Http failure response for <URL interna>: 0 Unknown Error" — nunca vacío,
 *   así que sin guardarlo aparte `porDefecto` queda inalcanzable. `esQuejaDelParser`
 *   descarta cualquier candidato con ese prefijo y sigue probando el resto de
 *   la cadena antes de rendirse a `porDefecto`.
 */
export function mensajeDeError(error: any, porDefecto = 'Error desconocido'): string {
  if (!error) return porDefecto;

  const directo = limpiar(error);
  if (directo) return directo;

  const cuerpo = error?.error ?? error;

  const candidatos = [
    cuerpo,
    cuerpo?.mensaje,
    error?.mensaje,
    cuerpo?.text,
    error?.text,
    cuerpo?.message,
    error?.message,
    cuerpo?.error,
  ];

  for (const candidato of candidatos) {
    const texto = limpiar(candidato);
    if (texto) return texto;
  }

  return porDefecto;
}

/** "Http failure response for ..." / "Http failure during parsing ...": la queja del transporte, no del negocio. */
function esQuejaDelParser(mensaje: string): boolean {
  return mensaje.startsWith('Http failure');
}

/** Solo strings no vacíos y que no sean la queja genérica de Angular sobreviven como mensaje candidato. */
function limpiar(texto: unknown): string | null {
  if (typeof texto !== 'string') return null;
  const limpio = texto.trim();
  if (!limpio || esQuejaDelParser(limpio)) return null;
  return limpio;
}

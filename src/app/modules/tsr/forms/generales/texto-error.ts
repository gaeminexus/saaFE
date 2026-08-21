/**
 * Texto legible de un error del backend, tolerante a las dos formas que conviven.
 *
 * Desde que se publicó el filtro de errores, la respuesta de error es `{"mensaje": "..."}`.
 * Conviven dos formas de recibirlo y **las dos estaban rotas**:
 *
 * - las llamadas con `responseType: 'text'` reciben ese JSON **sin parsear**, y la
 *   interpolación anterior lo pintaba con las llaves a la vista;
 * - las que esperan JSON reciben el objeto **ya parseado**, y `error?.error || error?.message
 *   || error` caía en `${error}` sobre un objeto: **`[object Object]`**.
 *
 * El barrido inicial buscó `responseType: 'text'` y por eso solo vio las primeras. El criterio
 * era demasiado estrecho: lo que determina el defecto no es cómo se pide la respuesta, sino que
 * el mensaje del backend ya no es una cadena suelta.
 *
 * Aquí se intenta interpretar el cuerpo como JSON y quedarse con `mensaje`; si no parsea —un
 * backend todavía sin el filtro, o un error de red— se muestra el texto crudo.
 */
export function textoDeError(error: any, generico = 'No se pudo completar la operación'): string {
  return extraeMensaje(error) ?? generico;
}

function extraeMensaje(error: any): string | null {
  if (error === null || error === undefined) return null;

  if (typeof error === 'string') {
    const limpio = error.trim();
    if (!limpio) return null;

    if (limpio.startsWith('{') || limpio.startsWith('[')) {
      try {
        const mensaje = extraeMensaje(JSON.parse(limpio));
        if (mensaje) return mensaje;
      } catch {
        // No era JSON: el texto crudo es lo mejor que hay
      }
    }
    return limpio;
  }

  if (typeof error === 'object') {
    for (const candidato of [error.mensaje, error.message, error.error]) {
      const mensaje = extraeMensaje(candidato);
      if (mensaje) return mensaje;
    }
  }

  return null;
}

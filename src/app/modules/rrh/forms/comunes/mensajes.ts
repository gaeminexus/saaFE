/**
 * Extracción del mensaje de error del backend.
 *
 * **Por qué existe.** Las clases `ws/rest` responden los errores con `entity("<texto plano>")`
 * y `type(APPLICATION_JSON)`: el cuerpo no es JSON válido —le faltan las comillas— pero viaja
 * anunciado como tal. `HttpClient` intenta parsearlo, falla, y entrega
 * `{ error: SyntaxError, text: '<el mensaje real>' }`, con `message` puesto a su propio
 * «Http failure during parsing». Un `error?.mensaje || error?.message` se queda con el genérico
 * y **el mensaje del backend se pierde**, que es como se perdía el del colaborador sin cuenta
 * bancaria — la única guarda que detiene una corrida de pago entera.
 *
 * Por eso `text` se mira **antes** que `message`: el primero es el mensaje de negocio y el
 * segundo, la queja del parser.
 */
export function mensajeDeError(error: any, generico: string): string {
  return textoDelError(error) ?? generico;
}

function textoDelError(error: any): string | null {
  if (error === null || error === undefined) return null;
  if (typeof error === 'string') return limpiar(error);

  // Orden deliberado: primero el cuerpo JSON ya estructurado, después el texto crudo.
  // Cuando el filtro de respuesta del backend envuelva el error en {"mensaje": ...}, el
  // primer candidato pasará a ser el bueno sin tocar nada aquí; hasta entonces gana `text`.
  const candidatos = [error.mensaje, error.error?.mensaje, error.text, error.error?.text, error.error];
  for (const candidato of candidatos) {
    if (typeof candidato === 'string') {
      const texto = limpiar(candidato);
      if (texto) return texto;
    }
  }

  // `message` va al final: cuando el parseo falló es el aviso del parser, no el del negocio
  if (typeof error.message === 'string' && !esQuejaDelParser(error.message)) {
    return limpiar(error.message);
  }
  return null;
}

function esQuejaDelParser(mensaje: string): boolean {
  return mensaje.startsWith('Http failure');
}

function limpiar(texto: string): string | null {
  const limpio = texto.trim();
  return limpio.length > 0 ? limpio : null;
}

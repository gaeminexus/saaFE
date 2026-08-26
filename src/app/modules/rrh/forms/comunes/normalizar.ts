/**
 * Texto comparable: sin mayúsculas, sin acentos y sin espacios de sobra.
 *
 * Sin quitar los diacríticos, teclear `Nunez` no encuentra `Núñez` y `Peñafiel` obliga a saber
 * dónde está la eñe en el teclado. Los dos lados de cualquier `includes` deben pasar por aquí —
 * D14 era, en el fondo, que solo pasaba uno.
 *
 * Extraída de `campo-formulario.component.ts` (D14) para que el filtro en línea de Novedades use
 * la misma función y no una copia que se desincronice.
 */
export function normalizar(texto: string | null | undefined): string {
  return (texto ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** `true` si `texto` contiene `termino`, comparando los dos ya normalizados. */
export function coincideTexto(texto: string | null | undefined, termino: string): boolean {
  return normalizar(texto).includes(normalizar(termino));
}

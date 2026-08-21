/**
 * El primer ejercicio que ofrecen los selectores de año del módulo.
 *
 * Antes era un `2025` fijo. No es un valor normativo —no lo cambia ninguna ley— pero envejece
 * igual de mal: en 2030 seguiría ofreciendo 2025 en todos los combos, y en una instalación nueva
 * ofrecería años en los que esa empresa no existía.
 *
 * Ahora **se aprende del dato**: el ejercicio más antiguo que el módulo ha visto, que en la
 * práctica es el `anio` mínimo de los períodos de nómina. Las pantallas que cargan datos con año
 * lo registran al recibirlos; mientras nadie haya registrado nada, el piso es una ventana móvil
 * respecto del año en curso, nunca una fecha escrita a mano.
 *
 * Vive en memoria y no se persiste: es una preferencia de presentación derivada, no un dato.
 */

/** Años hacia atrás que se ofrecen mientras no se conozca ningún ejercicio real. */
const VENTANA_POR_DEFECTO = 1;

let primerAnioConocido: number | null = null;

/**
 * Registra los ejercicios que trae una colección ya cargada y baja el piso si hace falta.
 *
 * Se le puede pasar cualquier lista cuyas filas tengan `anio`: períodos, acumulados, parámetros.
 * Solo baja el piso, nunca lo sube, para que abrir una pantalla filtrada por un año reciente no
 * recorte los combos de las demás.
 */
export function registrarEjercicios(filas: Array<{ anio?: number | null }> | null | undefined): void {
  for (const fila of filas ?? []) {
    const anio = Number(fila?.anio);
    if (!Number.isFinite(anio) || anio <= 0) continue;
    if (primerAnioConocido === null || anio < primerAnioConocido) primerAnioConocido = anio;
  }
}

/** Primer ejercicio ofrecido: el más antiguo conocido, o la ventana móvil si no hay ninguno. */
export function primerEjercicio(): number {
  return primerAnioConocido ?? new Date().getFullYear() - VENTANA_POR_DEFECTO;
}

/** Solo para las pruebas: olvida lo aprendido. */
export function olvidarEjercicios(): void {
  primerAnioConocido = null;
}

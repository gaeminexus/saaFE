import { NovedadIess } from './novedad-iess';

/**
 * Estados y tipos de la novedad al IESS, y las reglas de plazo que la pantalla necesita.
 *
 * **El plazo no se calcula aquí.** El backend lo resuelve al crear la novedad y lo deja en
 * `fechaLimite` —cada tipo tiene el suyo en `PDTRVLRN` del rubro 204—, así que esta pantalla
 * solo compara fechas. Meter los días de plazo en el frontend duplicaría normativa en un sitio
 * donde nadie la mantendría: la regla vive en `NORMATIVA-IESS-NOVEDADES.md` §3 y en el rubro.
 */

/** Rubro 205 · estado de la novedad (`NVISESTD`). */
export class EstadoNovedadIess {
  public static readonly PENDIENTE = 1;
  public static readonly ENVIADA = 2;
  public static readonly ACEPTADA = 3;
  public static readonly RECHAZADA = 4;
  public static readonly ANULADA = 5;
}

/**
 * Rubro 204 · tipo de novedad (`NVISTPNV`).
 *
 * Del 1 al 5 existen desde el script 05. **Del 6 al 11 los crea `sql/41`, que a 2026-08-21 está
 * escrito y sin ejecutar**: mientras no corra, ningún registro los usa y el combo no los ofrece
 * porque se alimenta del rubro, no de esta clase. Se declaran igualmente para que el día que
 * aparezcan no haya que tocar la pantalla, y porque `TIPOS_DEL_BATCH` los necesita nombrados.
 * El catálogo y su correspondencia con la normativa están en `NORMATIVA-IESS-NOVEDADES.md` §5.1.
 */
export class TipoNovedadIess {
  public static readonly AVISO_DE_ENTRADA = 1;
  public static readonly AVISO_DE_SALIDA = 2;
  public static readonly MODIFICACION_DE_SUELDO = 3;
  public static readonly NOVEDAD_FONDOS_DE_RESERVA = 4;
  public static readonly CAMBIO_DE_MODALIDAD = 5;
  public static readonly VARIACION_POR_EXTRAS = 6;
  public static readonly CAMBIO_RELACION_TRABAJO = 7;
  public static readonly LICENCIA_SIN_REMUNERACION = 8;
  public static readonly REINTEGRO_ANTICIPADO = 9;
  public static readonly CAMBIO_DE_JORNADA = 10;
  public static readonly RETROACTIVOS_CONTRATO_COLECTIVO = 11;
}

/**
 * Estados en los que la novedad todavía le debe algo al IESS.
 *
 * Es la lista que gobierna el bloqueo de cierre del período: **el backend se niega a cerrar
 * mientras quede una novedad aquí dentro** (`NORMATIVA-IESS-NOVEDADES.md` §5.4.1, la regla que
 * habría evitado marzo). La pantalla usa la misma lista para contar lo que falta, de modo que
 * lo que enseña y lo que el backend exige no puedan separarse.
 *
 * `RECHAZADA` cuenta como pendiente **a propósito**: el IESS la devolvió y sigue sin estar
 * declarada. Dejarla fuera daría por cerrado un mes con una novedad que nadie corrigió.
 */
export const ESTADOS_PENDIENTES_ANTE_EL_IESS = [
  EstadoNovedadIess.PENDIENTE,
  EstadoNovedadIess.RECHAZADA,
];

/** Una novedad anulada no se envía ni cuenta: es la vía para descartar sin borrar. */
export const ESTADOS_CERRADOS = [EstadoNovedadIess.ACEPTADA, EstadoNovedadIess.ANULADA];

export type AccionNovedad = 'marcarEnviada' | 'marcarAceptada' | 'marcarRechazada' | 'anular';

/**
 * Qué admite una novedad en su estado actual.
 *
 * Listas nombradas y no rangos `>=`, igual que en el período y en el finiquito: hoy los estados
 * del rubro 205 son consecutivos, pero uno intercalado rompería un rango sin que nada avisara.
 */
export function accionesDisponibles(novedad: NovedadIess | null): Set<AccionNovedad> {
  const acciones = new Set<AccionNovedad>();
  if (!novedad) return acciones;

  const estado = Number(novedad.estado);

  // Se envía lo que está pendiente, y se reenvía lo que el IESS devolvió.
  if (estado === EstadoNovedadIess.PENDIENTE || estado === EstadoNovedadIess.RECHAZADA) {
    acciones.add('marcarEnviada');
  }
  // La respuesta del IESS solo llega sobre algo enviado.
  if (estado === EstadoNovedadIess.ENVIADA) {
    acciones.add('marcarAceptada');
    acciones.add('marcarRechazada');
  }
  // Anular es la salida de lo que no debió existir. Una aceptada ya está declarada: no se anula
  // aquí, se corrige con otra novedad ante el IESS.
  if (estado !== EstadoNovedadIess.ACEPTADA && estado !== EstadoNovedadIess.ANULADA) {
    acciones.add('anular');
  }

  return acciones;
}

/** Por qué no se ofrece una acción, para decirlo al pasar el ratón. */
export function motivoNoDisponible(accion: AccionNovedad, novedad: NovedadIess | null): string {
  if (!novedad) return 'Seleccione una novedad de la lista.';

  switch (accion) {
    case 'marcarEnviada':
      return 'Solo se envía una novedad pendiente o rechazada.';
    case 'marcarAceptada':
    case 'marcarRechazada':
      return 'La respuesta del IESS se registra sobre una novedad ya enviada.';
    case 'anular':
      return Number(novedad.estado) === EstadoNovedadIess.ACEPTADA
        ? 'Ya está aceptada por el IESS: se corrige con otra novedad, no anulando esta.'
        : 'Ya está anulada.';
  }
}

/**
 * Días que faltan para la fecha límite. Negativo si ya pasó, `null` si no hay límite.
 *
 * Se compara **a medianoche**: si no, una novedad que vence hoy sale con −0 o +0 según la hora a
 * la que se mire la pantalla, y «vence hoy» es justo el caso que hay que ver bien.
 */
export function diasRestantes(fechaLimite: Date | null, hoy: Date = new Date()): number | null {
  if (!(fechaLimite instanceof Date) || Number.isNaN(fechaLimite.getTime())) return null;

  const limite = Date.UTC(fechaLimite.getFullYear(), fechaLimite.getMonth(), fechaLimite.getDate());
  const referencia = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  return Math.round((limite - referencia) / 86400000);
}

/**
 * Si la novedad incumplió el plazo legal.
 *
 * Dos lecturas distintas, y la diferencia importa:
 *   - Mientras se le debe al IESS —pendiente o rechazada—, se mide contra **hoy**: el plazo corre.
 *   - Una vez enviada, se mide contra la **fecha de reporte**, no contra hoy. Una novedad enviada
 *     a tiempo no empeora porque pase el tiempo; y una enviada tarde quedó tarde para siempre,
 *     que es lo que hay que poder ver al revisar el mes.
 *
 * Sin `fechaLimite` no se afirma nada: `false`, no «vencida por si acaso».
 */
export function estaVencida(novedad: NovedadIess, hoy: Date = new Date()): boolean {
  const limite = novedad.fechaLimite;
  if (!(limite instanceof Date) || Number.isNaN(limite.getTime())) return false;

  const estado = Number(novedad.estado);
  if (estado === EstadoNovedadIess.ANULADA) return false;

  const seDebeTodavia = ESTADOS_PENDIENTES_ANTE_EL_IESS.includes(estado);
  const referencia = seDebeTodavia ? hoy : novedad.fechaReporte;
  if (!(referencia instanceof Date) || Number.isNaN(referencia.getTime())) {
    // Enviada sin fecha de reporte: no hay con qué juzgar el plazo, y no se inventa.
    return false;
  }

  return (diasRestantes(limite, referencia) ?? 0) < 0;
}

/** Si la novedad sigue debiéndose al IESS, y por tanto bloquea el cierre del período. */
export function bloqueaCierre(novedad: NovedadIess): boolean {
  return ESTADOS_PENDIENTES_ANTE_EL_IESS.includes(Number(novedad.estado));
}

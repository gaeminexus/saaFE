import { Liquidacion } from './Liquidacion';

/**
 * Rubro 196 · estado del finiquito (`LQDCESTD`, `NUMBER` desde el script 05).
 *
 * Igual que en el período de nómina, los estados se comparan contra **listas nombradas** y no
 * contra rangos `>=`: hoy son consecutivos, pero un estado intercalado en el rubro rompería un
 * rango sin que nada avisara.
 */
export class EstadoLiquidacion {
  public static readonly BORRADOR = 1;
  public static readonly CALCULADA = 2;
  public static readonly APROBADA = 3;
  public static readonly REGISTRADA_EN_SUT = 4;
  public static readonly PAGADA = 5;
  public static readonly ANULADA = 6;
}

export type AccionLiquidacion = 'aprobar' | 'ejecutarSalida' | 'contabilizar';

/** Aprobar solo tiene sentido sobre un finiquito ya calculado. */
export const ESTADOS_APRUEBA = [EstadoLiquidacion.CALCULADA];

/**
 * Ejecutar la salida exige la liquidación **aprobada** — lo comprueba el backend y aquí se
 * replica igual, sin ampliarlo por comodidad: es el paso que cierra el contrato, pasa al
 * colaborador a CESANTE y caduca sus saldos de vacaciones. No se deshace.
 */
export const ESTADOS_EJECUTA_SALIDA = [EstadoLiquidacion.APROBADA];

/** Contabilizar, desde que está aprobada y mientras no se haya anulado. */
export const ESTADOS_CONTABILIZA = [
  EstadoLiquidacion.APROBADA,
  EstadoLiquidacion.REGISTRADA_EN_SUT,
  EstadoLiquidacion.PAGADA,
];

/**
 * Estados en los que el finiquito ya es un hecho y no un borrador en curso.
 *
 * Es lo que puede anunciarse fuera de la pantalla de liquidaciones —en la ficha del colaborador,
 * por ejemplo—. Un finiquito calculado y sin aprobar todavía es un cálculo que se puede rehacer,
 * y anunciarlo como «liquidado» convierte una simulación en un hecho consumado a los ojos de
 * quien consulta la ficha. La anulada queda fuera por lo mismo, en el sentido contrario.
 */
export const ESTADOS_EN_FIRME = [
  EstadoLiquidacion.APROBADA,
  EstadoLiquidacion.REGISTRADA_EN_SUT,
  EstadoLiquidacion.PAGADA,
];

export function estadoEn(liquidacion: Liquidacion | null, estados: number[]): boolean {
  if (!liquidacion) return false;
  return estados.includes(Number(liquidacion.estado));
}

// ─── Si la salida ya se ejecutó ──────────────────────────────────────────────

/** `CNTEESTD` con el que `ejecutarSalida` cierra el contrato. */
export const CONTRATO_CERRADO = 'CERRADO';

/** `MPLDESTD` 4: la situación a la que `ejecutarSalida` pasa al colaborador. */
export const EMPLEADO_CESANTE = 4;

/**
 * Tres respuestas, no dos: la tercera es no saberlo.
 *
 * Se deduce de los efectos, no del estado, y una deducción puede quedarse sin datos. Decir «no
 * ejecutada» cuando lo que pasa es que no llegó el contrato sería peor que no decir nada, porque
 * es justo la lectura que invita a pulsar el botón.
 */
export type SalidaEjecutada = 'si' | 'no' | 'desconocido';

/**
 * Si la salida de un finiquito ya se ejecutó, mirando lo que el proceso deja hecho.
 *
 * **En `LQDC` no se puede distinguir.** `ejecutarSalida` exige `APROBADA` de entrada y **no mueve
 * el estado al terminar**, así que aprobada, ejecutada y contabilizada son el mismo 3: los cuatro
 * finiquitos de producción están en `LQDCESTD` 3 y los cuatro tienen la salida hecha. Lo que sí
 * cambia son los efectos —`LiquidacionHaberesServiceImpl` cierra el contrato y pasa al empleado a
 * CESANTE—, y los dos viajan en el mismo `getAll` porque son `@ManyToOne`.
 *
 * **Se exigen las dos señales.** Un contrato cerrado sin el empleado cesante, o al revés, no es
 * una salida a medias que se pueda afirmar: es un dato del que no se puede concluir, y se
 * responde `desconocido`.
 *
 * El arreglo de fondo es del motor —que `ejecutarSalida` deje su propio estado— y no de aquí.
 * Esto es lo que se puede hacer desde la pantalla mientras tanto.
 */
export function salidaEjecutada(liquidacion: any): SalidaEjecutada {
  const contrato = liquidacion?.contratoEmpleado;
  const empleado = liquidacion?.empleado;

  const estadoContrato = contrato?.estado;
  const estadoEmpleado = empleado?.estado;
  if (estadoContrato == null || estadoEmpleado == null) return 'desconocido';

  const cerrado = String(estadoContrato).trim().toUpperCase() === CONTRATO_CERRADO;
  const cesante = Number(estadoEmpleado) === EMPLEADO_CESANTE;

  if (cerrado && cesante) return 'si';
  if (!cerrado && !cesante) return 'no';
  return 'desconocido';
}

/**
 * La etiqueta del estado, desambiguada cuando el rubro no basta.
 *
 * Sólo se añade el matiz sobre `APROBADA`, que es donde los tres momentos se confunden. En los
 * demás estados el rubro ya dice lo que hay y añadirle texto sería ruido.
 */
export function etiquetaEstadoLiquidacion(liquidacion: any, etiquetaRubro: string): string {
  if (Number(liquidacion?.estado) !== EstadoLiquidacion.APROBADA) return etiquetaRubro;

  switch (salidaEjecutada(liquidacion)) {
    case 'si':
      return `${etiquetaRubro} · salida ejecutada`;
    case 'no':
      return `${etiquetaRubro} · salida pendiente`;
    default:
      return etiquetaRubro;
  }
}

/** Qué acciones admite el finiquito en su estado actual. */
export function accionesDisponibles(liquidacion: Liquidacion | null): Set<AccionLiquidacion> {
  const acciones = new Set<AccionLiquidacion>();
  if (!liquidacion) return acciones;

  if (estadoEn(liquidacion, ESTADOS_APRUEBA)) acciones.add('aprobar');
  if (estadoEn(liquidacion, ESTADOS_EJECUTA_SALIDA)) acciones.add('ejecutarSalida');
  // Un finiquito ya contabilizado no se vuelve a contabilizar
  if (estadoEn(liquidacion, ESTADOS_CONTABILIZA) && !liquidacion.asiento) {
    acciones.add('contabilizar');
  }

  return acciones;
}

/** Por qué está deshabilitada una acción, para decirlo al pasar el ratón. */
export function motivoNoDisponible(
  accion: AccionLiquidacion,
  liquidacion: Liquidacion | null,
): string {
  if (!liquidacion) return 'Primero calcule el finiquito.';

  switch (accion) {
    case 'aprobar':
      return 'Solo se aprueba un finiquito recién calculado.';
    case 'ejecutarSalida':
      return 'La salida se ejecuta sobre un finiquito aprobado.';
    case 'contabilizar':
      return liquidacion.asiento
        ? `Ya se contabilizó con el asiento ${liquidacion.asiento}.`
        : 'Se contabiliza a partir de la aprobación.';
  }
}

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

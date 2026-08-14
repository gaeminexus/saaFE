import { Prestamo } from '../../model/prestamo';
import {
  ResultadoAbonoCapital,
  ResultadoAnulacion,
  ResultadoPrecancelacion,
} from '../../model/pagos/operaciones-pago';

/**
 * Datos mínimos del préstamo que necesitan los diálogos de operaciones de pago. Las pantallas lo
 * arman con `contextoDesdePrestamo()` para no tener que pasar la entidad completa.
 */
export interface ContextoPrestamo {
  idPrestamo: number;
  /** Encabezado legible, p. ej. "Préstamo #8523 · Crédito Ordinario". */
  titulo: string;
  /** Código del partícipe (ENTD.ENTDCDGO); necesario para consultar saldos de aportes. */
  idEntidad?: number | null;
  participante?: string | null;
  /** Estado operativo (PRST.idEstado). Ojo: NO es `estadoPrestamo`. */
  idEstado?: number | null;
  saldoTotal?: number | null;
  saldoCapital?: number | null;
  valorCuota?: number | null;
  plazo?: number | null;
  /**
   * Monto que el usuario ya tecleó en la pantalla que abre el diálogo ("Monto del pago"). Los
   * diálogos lo precargan en su campo de valor para no obligar a escribirlo dos veces; el usuario
   * puede cambiarlo dentro del diálogo.
   */
  valorSugerido?: number | null;
}

export function contextoDesdePrestamo(prestamo: Prestamo, participante?: string | null): ContextoPrestamo {
  const producto = prestamo.producto?.nombre?.trim();
  return {
    idPrestamo: prestamo.codigo,
    titulo: `Préstamo #${prestamo.idAsoprep ?? prestamo.codigo}${producto ? ' · ' + producto : ''}`,
    idEntidad: prestamo.entidad?.codigo ?? null,
    participante: participante ?? prestamo.entidad?.razonSocial ?? null,
    idEstado: prestamo.idEstado ?? null,
    saldoTotal: prestamo.saldoTotal ?? null,
    saldoCapital: prestamo.saldoCapital ?? null,
    valorCuota: prestamo.valorCuota ?? null,
    plazo: prestamo.plazo ?? null,
  };
}

/**
 * Resultado que devuelven los diálogos al cerrarse. `ir-a-pagar` e `ir-a-precancelar` son las
 * derivaciones que sugiere la guía cuando el backend rechaza la operación (PRESTAMO_NO_AL_DIA,
 * ABONO_CUBRE_CAPITAL, VALOR_EXCEDE_DEUDA, SIN_CUOTAS_FUTURAS): el diálogo se cierra y la pantalla
 * abre el flujo correcto sin que el usuario tenga que volver a buscar el préstamo.
 */
export type SalidaDialogoPago =
  | { accion: 'aplicado'; recargarTabla: boolean; abono?: ResultadoAbonoCapital; precancelacion?: ResultadoPrecancelacion }
  | { accion: 'anulado'; recargarTabla: boolean; anulacion: ResultadoAnulacion }
  | { accion: 'ir-a-pagar' }
  | { accion: 'ir-a-precancelar' }
  | { accion: 'ir-a-abonar' };

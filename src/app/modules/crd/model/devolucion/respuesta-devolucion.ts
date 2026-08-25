/**
 * Sobre de respuesta de los endpoints de devolución de aportes
 * (§6 de `docs/crd/PLAN-DEVOLUCION-APORTES.md`, idéntico al de los servicios de pago de
 * préstamos descrito en §1 de `GUIA-FRONTEND-SERVICIOS-PAGO-PRESTAMOS.md`).
 *
 * En fallo el backend responde con el MISMO sobre pero `exito: false` y el código estable en
 * `error`. La lógica de pantalla siempre ramifica por `error`, nunca parseando `mensaje`.
 */
export interface RespuestaDevolucion<T = unknown> {
  exito: boolean;
  etapa?: EtapaDevolucion;
  mensaje?: string;
  /** Código de error estable. Presente solo cuando `exito === false`. */
  error?: CodigoErrorDevolucion | string;
  resultado?: T;
  /** Código HTTP de la respuesta; lo agrega el servicio del frontend, no el backend. */
  httpStatus?: number;
}

export type EtapaDevolucion = 'VALIDACION' | 'APLICACION';

/** Códigos de error estables del backend (tabla de la §6 del plan). */
export type CodigoErrorDevolucion =
  | 'PARAMETRO_INVALIDO'
  | 'ENTIDAD_NO_ENCONTRADA'
  | 'DEVOLUCION_NO_ENCONTRADA'
  | 'CUENTA_NO_ENCONTRADA'
  | 'ESTADO_NO_PERMITE'
  | 'DEVOLUCION_YA_PAGADA'
  | 'DEVOLUCION_YA_ANULADA'
  | 'VALOR_INVALIDO'
  | 'FECHA_INVALIDA'
  | 'SALDO_INSUFICIENTE'
  | 'TIPO_APORTE_NO_VIGENTE'
  | 'TIPO_APORTE_SIN_PRODUCTO'
  | 'TIPO_DUPLICADO'
  | 'SIN_CUENTA_BANCARIA'
  | 'ERROR_ORDEN_PAGO'
  | 'ERROR_INTERNO';

/**
 * Texto de respaldo por código. El `mensaje` del backend es más específico (trae el nombre del
 * tipo de aporte, el monto pedido y el disponible), así que la pantalla lo muestra cuando existe
 * y usa esto solo si no vino.
 */
export const MENSAJE_ERROR_DEVOLUCION: Record<string, string> = {
  PARAMETRO_INVALIDO: 'Faltan datos obligatorios o vienen con un formato inválido.',
  ENTIDAD_NO_ENCONTRADA: 'El partícipe ya no existe. Vuelva a buscarlo.',
  DEVOLUCION_NO_ENCONTRADA: 'La devolución ya no existe. Actualice el historial.',
  CUENTA_NO_ENCONTRADA: 'La cuenta bancaria seleccionada ya no existe. Vuelva a elegirla.',
  ESTADO_NO_PERMITE: 'El estado actual de la devolución no permite esta operación.',
  DEVOLUCION_YA_PAGADA:
    'La devolución ya fue pagada; reverse el pago desde Cuentas por Pagar y vuelva a intentar.',
  DEVOLUCION_YA_ANULADA: 'La devolución ya había sido anulada. Actualice el historial.',
  VALOR_INVALIDO: 'Los montos a devolver deben ser mayores a cero.',
  FECHA_INVALIDA: 'La fecha no puede ser posterior a hoy.',
  SALDO_INSUFICIENTE: 'El saldo de aportes no alcanza para el monto solicitado.',
  TIPO_APORTE_NO_VIGENTE: 'Un tipo de aporte seleccionado ya no está vigente. Actualice los saldos.',
  TIPO_APORTE_SIN_PRODUCTO:
    'Un tipo de aporte no tiene configurado su producto de pago. Parametrícelo antes de devolver ese tipo.',
  TIPO_DUPLICADO: 'Hay un tipo de aporte repetido en el desglose.',
  SIN_CUENTA_BANCARIA:
    'El partícipe no tiene una cuenta bancaria activa registrada. Cárguela antes de devolver.',
  ERROR_ORDEN_PAGO:
    'No se pudo generar la orden de pago en Cuentas por Pagar; no se registró nada. Intente nuevamente.',
  ERROR_INTERNO: 'Ocurrió un error inesperado en el servidor. Intente nuevamente.',
};

/** Mensaje a mostrar: el del backend si vino, si no el genérico del código. */
export function mensajeDeRespuestaDevolucion(
  resp: RespuestaDevolucion<unknown> | null | undefined
): string {
  if (!resp) return 'No se pudo contactar al servidor. Verifique su conexión e intente nuevamente.';
  if (resp.mensaje) return resp.mensaje;
  return MENSAJE_ERROR_DEVOLUCION[resp.error ?? ''] ?? 'Ocurrió un error inesperado.';
}

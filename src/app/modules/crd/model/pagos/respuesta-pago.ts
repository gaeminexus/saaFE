/**
 * Sobre de respuesta común a todos los endpoints de pago de préstamos
 * (§1 de docs/crd/GUIA-FRONTEND-SERVICIOS-PAGO-PRESTAMOS.md).
 *
 * En fallo el backend responde con el mismo sobre pero `exito: false` y el código estable en
 * `error`. La lógica de pantalla SIEMPRE debe ramificar por `error`, nunca parseando `mensaje`.
 */
export interface RespuestaPago<T = unknown> {
  exito: boolean;
  etapa?: EtapaPago;
  mensaje?: string;
  /** Código de error estable. Presente solo cuando `exito === false`. */
  error?: CodigoErrorPago | string;
  resultado?: T;
  /**
   * Movimientos negativos creados en CRD.APRT. Viaja FUERA de `resultado`, al mismo nivel,
   * en `pagarConAportes`. (En `precancelar` viaja dentro de `resultado`.)
   */
  movimientosAporte?: MovimientoAporte[];
  /**
   * Solo en el fallo `MONTO_NO_COINCIDE` de `precancelar`: el valor correcto recalculado por el
   * backend, para refrescar la pantalla y pedir una nueva confirmación.
   */
  valorTotalPrecancelacion?: number;
  /** Código HTTP de la respuesta; lo agrega el servicio del frontend, no el backend. */
  httpStatus?: number;
}

export type EtapaPago = 'VALIDACION' | 'SIMULACION' | 'APLICACION';

/** Fila negativa creada en CRD.APRT al consumir saldo de aportes. */
export interface MovimientoAporte {
  idAporte: number;
  idTipoAporte: number;
  valor: number;
  idPagoAporte: number;
}

/** Renglón del desglose "de qué tipo de aporte se toma cuánto". */
export interface DesgloseAporte {
  idTipoAporte: number;
  valor: number;
}

/** Códigos de error estables del backend (§12 de la guía). */
export type CodigoErrorPago =
  | 'PARAMETRO_INVALIDO'
  | 'ENTIDAD_NO_ENCONTRADA'
  | 'PRESTAMO_NO_ENCONTRADO'
  | 'EVENTO_NO_ENCONTRADO'
  | 'ESTADO_NO_PERMITE'
  | 'EVENTO_YA_ANULADO'
  | 'EVENTO_POSTERIOR_VIGENTE'
  | 'PAGOS_SOBRE_TABLA_RECALCULADA'
  | 'VALOR_INVALIDO'
  | 'FECHA_INVALIDA'
  | 'VALOR_EXCEDE_DEUDA'
  | 'SIN_CUOTAS_PENDIENTES'
  | 'SIN_CUOTAS_FUTURAS'
  | 'MONTO_NO_COINCIDE'
  | 'DESGLOSE_INVALIDO'
  | 'TIPO_APORTE_NO_VIGENTE'
  | 'SALDO_APORTES_INSUFICIENTE'
  | 'MODALIDAD_INVALIDA'
  | 'PRESTAMO_NO_AL_DIA'
  | 'ABONO_CUBRE_CAPITAL'
  | 'CUOTA_NO_CUBRE_INTERES'
  | 'ERROR_INTERNO';

/**
 * Texto orientado al usuario para cada código, con la acción sugerida por la guía. El `mensaje`
 * del backend es más específico (incluye montos y números de cuota) así que las pantallas lo
 * muestran cuando existe y usan esto como respaldo.
 */
export const MENSAJE_ERROR_PAGO: Record<string, string> = {
  PARAMETRO_INVALIDO: 'Faltan datos obligatorios o vienen con un formato inválido.',
  ENTIDAD_NO_ENCONTRADA: 'El partícipe ya no existe. Vuelva a buscarlo.',
  PRESTAMO_NO_ENCONTRADO: 'El préstamo ya no existe. Vuelva al listado y busque de nuevo.',
  EVENTO_NO_ENCONTRADO: 'La operación ya no existe. Actualice el historial.',
  ESTADO_NO_PERMITE: 'El préstamo está cancelado y no admite más operaciones de pago.',
  EVENTO_YA_ANULADO: 'Esta operación ya había sido anulada. Actualice el historial.',
  EVENTO_POSTERIOR_VIGENTE: 'Existen operaciones más recientes: debe anularlas primero (de la más nueva a la más antigua).',
  PAGOS_SOBRE_TABLA_RECALCULADA: 'Hay pagos aplicados sobre la tabla generada por este abono. Anule esos pagos antes.',
  VALOR_INVALIDO: 'El monto debe ser mayor a cero.',
  FECHA_INVALIDA: 'La fecha no puede ser posterior a hoy.',
  VALOR_EXCEDE_DEUDA: 'El valor supera la deuda total del préstamo.',
  SIN_CUOTAS_PENDIENTES: 'El préstamo no tiene cuotas con saldo pendiente.',
  SIN_CUOTAS_FUTURAS: 'No hay cuotas futuras que precancelar: la deuda es solo exigible, use el pago de cuota.',
  MONTO_NO_COINCIDE: 'El monto no coincide con el valor de precancelación vigente.',
  DESGLOSE_INVALIDO: 'El desglose de aportes es inválido: revise que haya un solo renglón por tipo y montos mayores a cero.',
  TIPO_APORTE_NO_VIGENTE: 'Un tipo de aporte seleccionado ya no está vigente. Actualice los saldos.',
  SALDO_APORTES_INSUFICIENTE: 'El saldo de aportes no alcanza para el monto solicitado.',
  MODALIDAD_INVALIDA: 'Seleccione una modalidad de recálculo válida.',
  PRESTAMO_NO_AL_DIA: 'El préstamo tiene cuotas vencidas o parciales: regularícelas antes de abonar a capital.',
  ABONO_CUBRE_CAPITAL: 'El abono cubre todo el capital pendiente. Corresponde una precancelación.',
  CUOTA_NO_CUBRE_INTERES: 'Con esa modalidad la cuota no alcanza a cubrir el interés. Pruebe reduciendo el valor de la cuota.',
  ERROR_INTERNO: 'Ocurrió un error inesperado en el servidor. Intente nuevamente.',
};

/** Mensaje a mostrar: el del backend si vino, si no el genérico del código. */
export function mensajeDeRespuesta(resp: RespuestaPago<unknown> | null | undefined): string {
  if (!resp) return 'No se pudo contactar al servidor. Verifique su conexión e intente nuevamente.';
  if (resp.mensaje) return resp.mensaje;
  return MENSAJE_ERROR_PAGO[resp.error ?? ''] ?? 'Ocurrió un error inesperado.';
}

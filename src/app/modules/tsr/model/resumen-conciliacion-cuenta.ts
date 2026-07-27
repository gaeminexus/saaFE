import { CuentaBancaria } from './cuenta-bancaria';

/**
 * Fila del resumen por cuenta bancaria de la pantalla de Conciliación
 * Contable: para un período dado, ¿esta cuenta ya está verificada, tiene
 * diferencias, o todavía no se ha tocado? idConciliacionContable/estadoRevision
 * vienen null cuando esa cuenta/período nunca se ha abierto todavía.
 *
 * extractoCargado distingue "0 pendientes porque nunca se cargó el extracto"
 * de "0 pendientes porque ya se concilió todo" - antes de este campo ambos
 * casos se veían igual en la pantalla (badge "Sin movimientos").
 */
export interface ResumenConciliacionCuenta {
  cuentaBancaria: CuentaBancaria;
  idConciliacionContable: number | null;
  estadoRevision: number | null;
  totalPendientesExtracto: number;
  totalPendientesAsiento: number;
  usuarioVerifica: string | null;
  fechaVerificacion: string | null;
  extractoCargado: boolean;
}

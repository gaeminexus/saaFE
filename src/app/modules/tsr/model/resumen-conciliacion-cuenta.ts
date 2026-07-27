import { CuentaBancaria } from './cuenta-bancaria';

/**
 * Fila del resumen por cuenta bancaria de la pantalla de Conciliación
 * Contable: para un período dado, ¿esta cuenta ya está verificada, tiene
 * diferencias, o todavía no se ha tocado? idConciliacionContable/estadoRevision
 * vienen null cuando esa cuenta/período nunca se ha abierto todavía.
 */
export interface ResumenConciliacionCuenta {
  cuentaBancaria: CuentaBancaria;
  idConciliacionContable: number | null;
  estadoRevision: number | null;
  totalPendientesExtracto: number;
  totalPendientesAsiento: number;
  usuarioVerifica: string | null;
  fechaVerificacion: string | null;
}

import { CuentaBancaria } from './cuenta-bancaria';

/**
 * Fila del drill-down por cuenta bancaria del tablero de cumplimiento -
 * ¿esta cuenta ya cargó su extracto este período? ¿ya está conciliada?
 */
export interface DetalleCumplimientoCuenta {
  cuentaBancaria: CuentaBancaria;
  cargada: boolean;
  conciliada: boolean;
}

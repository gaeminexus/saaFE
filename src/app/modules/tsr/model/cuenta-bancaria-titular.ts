import { Titular } from './titular';
import { BancoExterno } from './banco-externo.model';

/**
 * Entidad: CuentaBancariaTitular (CTBN)
 * Representa las cuentas bancarias registradas para un titular.
 *
 * Campos de BD:
 *   CTBNCDGO - PK autoincrementable
 *   TTLRCDGO - FK a Titular
 *   BEXTCDGO - FK a BancoExterno
 *   CTBNTPCT - Tipo de cuenta (rubro codigoAlterno 23): 1=Corriente, 2=Ahorros
 *   CTBNNMCT - Número de cuenta (50 chars)
 *   CTBNOBSR - Observaciones (500 chars)
 *   CTBNSTDO - Estado (1=Activo, 0=Inactivo)
 *   CTBNFCRG - Fecha de creación
 *   CTBNUSAR - Usuario de creación (50 chars)
 */
export interface CuentaBancariaTitular {
  codigo: number;
  titular: Titular | { codigo: number };
  banco: BancoExterno | { codigo: number };
  tipoCuenta: number;       // rubro codigoAlterno 23: 1=Corriente, 2=Ahorros
  numeroCuenta: string;
  observaciones?: string;
  estado: number;           // 1=Activo, 0=Inactivo
  fechaCreacion?: string;
  usuarioCreacion?: string;
}

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
 *   CTBNTPID - Tipo de identificación de la cuenta (rubro codigoAlterno 36), NULL
 *   CTBNIDNT - Identificación con la que se abrió la cuenta (20 chars), NULL
 */
export interface CuentaBancariaTitular {
  codigo: number;
  titular: Titular | { codigo: number };
  banco: BancoExterno | { codigo: number };
  tipoCuenta: number;       // rubro codigoAlterno 23: 1=Ahorros, 2=Corriente (verificado contra la base el 2026-09-07)
  numeroCuenta: string;
  observaciones?: string;
  estado: number;           // 1=Activo, 0=Inactivo
  fechaCreacion?: string;
  usuarioCreacion?: string;
  /**
   * Tipo de identificación con la que se abrió la cuenta (rubro 36, codigoAlterno del detalle):
   * 1=Cédula, 2=RUC, 3=Pasaporte. NUNCA 4 (exterior) — ningún formateador bancario lo admite.
   * `null` = la cuenta usa la identificación del titular (docs/tsr/API-IDENTIFICACION-CUENTA-BANCARIA.md).
   * Los dos o ninguno (CK_CTBN_IDENTIFICACION).
   */
  tipoIdentificacion?: number | null;
  /** Identificación con la que se abrió la cuenta (máx. 20). `null` = usa la del titular. */
  identificacion?: string | null;
  /**
   * Nombre de la persona a cuyo nombre está la cuenta (CTBNNMBR, máx. 200).
   * `null`/vacío = la cuenta es del propio titular (docs/tsr/API-IDENTIFICACION-CUENTA-BANCARIA.md §6).
   */
  nombreTitularCuenta?: string | null;
}

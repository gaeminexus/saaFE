import { Nomina } from './nomina';

/**
 * Rol de pago individual. Tabla `RHH.RLPG`.
 *
 * El script 05 le añade los totales para que el rol valga por sí mismo y no haya que recalcular
 * la nómina cada vez que se consulta, más el `hash` que permite detectar si el PDF entregado
 * corresponde a los valores actuales.
 *
 * **`estado` sigue siendo `String` aquí**, a diferencia de `PRDN` y `NMNA`, que el script 05
 * migró a rubro. No se unifica desde el cliente.
 */
export interface RolPago {
  codigo: number; // RLPGCDGO
  nomina: Nomina; // NMNACDGO
  numero: string; // RLPGNMRO
  fechaEmision: Date; // RLPGFCEM
  rutaPdf: string | null; // RLPGPDFO
  estado: string; // RLPGESTD - String, no rubro
  totalIngresos?: number; // RLPGTTIN
  totalDescuentos?: number; // RLPGTTDS
  neto?: number; // RLPGNETO
  hash?: string | null; // RLPGHASH
  fechaEnvio?: Date | null; // RLPGFCEN
  recibido?: string | null; // RLPGRCBD - 'S' / 'N'
  fechaRegistro?: Date; // RLPGFCHR
  usuarioRegistro?: string; // RLPGUSRR
}

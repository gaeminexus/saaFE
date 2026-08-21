import { Empleado } from './empleado';

/**
 * Acumulado mensual del colaborador. Tabla `RHH.ACMN`.
 *
 * Un registro por empleado, año, mes y tipo de base. De aquí salen las bases de los décimos, de
 * los fondos de reserva y de la proyección del impuesto a la renta, así que es la tabla contra
 * la que se verifica que el corte de apertura quedó bien cargado.
 *
 * Los escribe `cerrarPeriodo`, no el cálculo: así un recálculo no los duplica. `aperturaMigracion`
 * distingue los que vinieron de la migración de los que generó la operación.
 */
export interface AcumuladoNomina {
  codigo: number; // ACMNCDGO
  empleado: Empleado | { codigo: number } | null; // MPLDCDGO
  periodoNomina: { codigo: number } | null; // PRDNCDGO - nulo en saldos de apertura
  anio: number; // ACMNANOO
  mes: number; // ACMNMSEE
  tipoAcumulado: number; // ACMNTPAC - rubro 202
  valor: number; // ACMNVLOR
  dias: number; // ACMNDIAS - días trabajados del mes
  aperturaMigracion: string; // ACMNAPRT - 'S' / 'N'
  estado: number; // ACMNESTD
  fechaRegistro?: Date; // ACMNFCHR
  usuarioRegistro?: string; // ACMNUSRR
}

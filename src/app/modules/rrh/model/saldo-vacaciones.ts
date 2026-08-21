import { Empleado } from './empleado';

/**
 * Saldo anual de vacaciones. Tabla `RHH.SLDV`.
 *
 * El script 05 le añade el período al que corresponde el saldo, los días adicionales por
 * antigüedad —15 por año más uno por cada año a partir del quinto—, los arrastrados del período
 * anterior y la marca de caducidad, que aplica a los tres años según el art. 75 del Código del
 * Trabajo.
 */
export interface SaldoVacaciones {
  codigo: number; // SLDVCDGO
  empleado: Empleado; // MPLDCDGO
  anio: number; // SLDVANOO
  diasAsignados: number; // SLDVASGN
  diasUsados: number; // SLDVUSDO
  diasPendientes: number; // SLDVPNDE
  fechaInicio?: Date | null; // SLDVFCHI - inicio del período de vacaciones
  fechaFin?: Date | null; // SLDVFCHF - fin del período de vacaciones
  diasAdicionales?: number; // SLDVDIAD - por antigüedad
  diasArrastrados?: number; // SLDVDIAR - del período anterior
  diasPagados?: number; // SLDVDIPG - liquidados en dinero
  valorDia?: number | null; // SLDVVLDI
  caducado?: string; // SLDVCDCD - 'S' / 'N'
  aperturaMigracion?: string; // SLDVAPRT - 'S' / 'N'
  estado?: number; // SLDVESTD
  fechaRegistro: Date; // SLDVFCHR
  usuarioRegistro: string; // SLDVUSRR
}

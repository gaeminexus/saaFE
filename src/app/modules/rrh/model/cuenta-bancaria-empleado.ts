import { Empleado } from './empleado';

/**
 * Cuenta de acreditación del sueldo. Tabla `RHH.CBEM`.
 *
 * Un empleado puede repartir su neto entre varias cuentas: `porcentaje` indica qué parte va a
 * cada una y la suma de las cuentas activas debe dar 100. Sin al menos una cuenta no se puede
 * generar el archivo bancario del período.
 */
export interface CuentaBancariaEmpleado {
  codigo: number; // CBEMCDGO
  empleado: Empleado | { codigo: number } | null; // MPLDCDGO
  banco: { codigo: number; nombre?: string } | null; // BNCOCDGO - FK a TSR.BNCO
  tipoCuenta: number; // CBEMTPCT - rubro 199
  numeroCuenta: string; // CBEMNMCT
  titular: string | null; // CBEMTTLR - si difiere del empleado
  identificacionTitular: string | null; // CBEMIDTT
  principal: string; // CBEMPRCP - 'S' / 'N'
  porcentaje: number | null; // CBEMPRCN - parte del neto a acreditar aquí
  estado: number; // CBEMESTD
  fechaRegistro?: Date; // CBEMFCHR
  usuarioRegistro?: string; // CBEMUSRR
}

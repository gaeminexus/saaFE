import { Empleado } from './empleado';

/**
 * Proyección anual de gastos personales. Tabla `RHH.GSPR`.
 *
 * Es lo que el empleado declara en su anexo al inicio del ejercicio. La rebaja del impuesto se
 * calcula sobre el menor entre lo declarado y el tope de `RHH.TPGP` según sus cargas familiares.
 * `vigente` permite conservar las versiones anteriores cuando el empleado rectifica.
 */
export interface GastoPersonalProyectado {
  codigo: number; // GSPRCDGO
  empleado: Empleado | { codigo: number } | null; // MPLDCDGO
  anio: number; // GSPRANOO
  tipoGasto: number; // GSPRTPGP - rubro 201
  valor: number; // GSPRVLOR
  fechaPresentacion: Date | null; // GSPRFCPR
  vigente: string; // GSPRVGNT - 'S' / 'N'
  estado: number; // GSPRESTD
  fechaRegistro?: Date; // GSPRFCHR
  usuarioRegistro?: string; // GSPRUSRR
}

import { Empleado } from './empleado';

/**
 * Carga familiar del colaborador. Tabla `RHH.CRGF`.
 *
 * `calificaIr` es el campo que determina el tope de gastos personales deducibles del empleado,
 * y `calificaUtilidades` el reparto del 5 % por cargas. Son banderas distintas a propósito: los
 * criterios del SRI y del Código del Trabajo no coinciden.
 */
export interface CargaFamiliar {
  codigo: number; // CRGFCDGO
  empleado: Empleado | { codigo: number } | null; // MPLDCDGO
  parentesco: number; // CRGFPRNT - rubro 200
  identificacion: string | null; // CRGFIDNT
  apellidos: string; // CRGFAPLL
  nombres: string; // CRGFNMBR
  fechaNacimiento: Date | null; // CRGFFCHN
  discapacidad: string; // CRGFDSCP - 'S' / 'N'
  porcentajeDiscapacidad: number | null; // CRGFPRDS
  calificaIr: string; // CRGFIRRB - 'S' / 'N'
  calificaUtilidades: string; // CRGFUTIL - 'S' / 'N'
  dependeEconomicamente: string; // CRGFDPEC - 'S' / 'N'
  fechaInicio: Date | null; // CRGFFCIN
  fechaFin: Date | null; // CRGFFCFN
  estado: number; // CRGFESTD
  fechaRegistro?: Date; // CRGFFCHR
  usuarioRegistro?: string; // CRGFUSRR
}

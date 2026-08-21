import { ConceptoNomina } from './concepto-nomina';
import { ContratoEmpleado } from './contrato-empleado';
import { Empleado } from './empleado';

/**
 * Concepto de nómina fijo de un empleado. Tabla `RHH.CPXM`.
 *
 * Son los conceptos que se repiten mes a mes para una persona concreta —bono de
 * responsabilidad, movilización, alimentación— con su vigencia. El cálculo del período los
 * recoge junto a los conceptos obligatorios y a las novedades puntuales.
 */
export interface ConceptoFijoEmpleado {
  codigo: number; // CPXMCDGO
  empleado: Empleado | { codigo: number } | null; // MPLDCDGO
  contrato: ContratoEmpleado | { codigo: number } | null; // CNTECDGO
  concepto: ConceptoNomina | { codigo: number } | null; // CPNMCDGO
  valor: number | null; // CPXMVLRR
  porcentaje: number | null; // CPXMPRCN
  cantidad: number | null; // CPXMCANT
  fechaInicio: Date; // CPXMFCHI - vigente desde
  fechaFin: Date | null; // CPXMFCHF - nulo significa indefinido
  observacion: string | null; // CPXMOBSR
  estado: number; // CPXMESTD
  fechaRegistro?: Date; // CPXMFCHR
  usuarioRegistro?: string; // CPXMUSRR
}

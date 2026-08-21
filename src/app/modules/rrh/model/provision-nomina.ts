import { ConceptoNomina } from './concepto-nomina';
import { Empleado } from './empleado';
import { PeriodoNomina } from './periodo-nomina';

/**
 * Provisión mensual de beneficios sociales. Tabla `RHH.PVNM`.
 *
 * Se genera para los beneficios en modalidad acumulada: décimos, vacaciones, fondos de reserva,
 * aporte patronal y —si la empresa los tiene activados— jubilación patronal y desahucio.
 * A diferencia de los renglones, no afecta al neto del colaborador: alimenta el asiento de
 * provisiones.
 */
export interface ProvisionNomina {
  codigo: number; // PVNMCDGO
  periodoNomina: PeriodoNomina | { codigo: number } | null; // PRDNCDGO
  empleado: Empleado | { codigo: number } | null; // MPLDCDGO
  conceptoNomina: ConceptoNomina | { codigo: number } | null; // CPNMCDGO
  tipoProvision: number; // PVNMTPPR - rubro 206
  baseCalculo: number | null; // PVNMBSCL
  valor: number; // PVNMVLOR
  estado: number; // PVNMESTD
  fechaRegistro?: Date; // PVNMFCHR
  usuarioRegistro?: string; // PVNMUSRR
}

import { ContratoEmpleado } from './contrato-empleado';
import { Empleado } from './empleado';
import { PeriodoNomina } from './periodo-nomina';

/**
 * Nómina de un colaborador en un período. Tabla `RHH.NMNA`.
 *
 * El script 05 le añade el desglose tipificado que antes no existía: las bases imponibles, los
 * aportes y la retención del mes. Sin ese desglose no se puede armar el asiento del rol ni
 * cuadrar contra la planilla del IESS.
 *
 * `estado` es un `Long` del rubro 183 desde el script 05.
 */
export interface Nomina {
  codigo: number; // NMNACDGO
  periodoNomina: PeriodoNomina; // PRDNCDGO
  empleado: Empleado; // MPLDCDGO
  contratoEmpleado: ContratoEmpleado; // CNTECDGO
  salarioBase: number; // NMNASLRB
  totalIngresos: number; // NMNATING
  totalDescuentos: number; // NMNATDSC
  netoPagar: number; // NMNANETO
  estado: number; // NMNAESTD - rubro 183

  // Días y horas efectivos
  diasTrabajados?: number; // NMNADITR
  horasTrabajadas?: number; // NMNAHRTR

  // Bases de cálculo
  baseIess?: number; // NMNABSIE
  baseImpuestoRenta?: number; // NMNABSIR
  baseFondosReserva?: number; // NMNABSFR
  baseDecimoTercero?: number; // NMNABSDT
  baseDecimoCuarto?: number; // NMNABSDC

  // Aportes y retenciones del mes
  aportePersonal?: number; // NMNAAPPR
  aportePatronal?: number; // NMNAAPPT
  aporteIeceSecap?: number; // NMNAIESC
  fondosReserva?: number; // NMNAFNRS
  retencionImpuestoRenta?: number; // NMNARTIR
  totalPatronal?: number; // NMNATTPT

  observacion?: string | null; // NMNAOBSR
  fechaRegistro: Date; // NMNAFCHR
  usuarioRegistro: string; // NMNAUSRR
}

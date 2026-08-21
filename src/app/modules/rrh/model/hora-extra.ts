import { Empleado } from './empleado';
import { PeriodoNomina } from './periodo-nomina';

/**
 * Hora extra tipificada. Tabla `RHH.HREX`.
 *
 * El tipo distingue las suplementarias del 50 %, las extraordinarias del 100 % y el recargo
 * nocturno del 25 %, que no es una hora extra sino un recargo sobre la hora ordinaria.
 *
 * `excedeTope` la marca el backend cuando supera el máximo legal de horas por día o por semana
 * —parametrizado en `RHH.PRNM`, no en código—; esas requieren aprobación excepcional.
 * Solo las que tienen `aprobada = 'S'` entran en el cálculo del período.
 */
export interface HoraExtra {
  codigo: number; // HREXCDGO
  empleado: Empleado | { codigo: number } | null; // MPLDCDGO
  resumenNomina: { codigo: number } | null; // RSMNCDGO - resumen diario que la originó
  periodoNomina: PeriodoNomina | { codigo: number } | null; // PRDNCDGO - período en que se pagó
  tipoHoraExtra: number; // HREXTPHR - rubro 191
  fecha: Date; // HREXFCHA
  horas: number; // HREXHORS
  valorHora: number | null; // HREXVLHR - valor de la hora ordinaria
  recargo: number | null; // HREXRCRG - % de recargo aplicado
  valor: number | null; // HREXVLOR
  aprobada: string; // HREXAPRB - 'S' / 'N'
  usuarioAprueba: string | null; // HREXUSAP
  fechaAprobacion: Date | null; // HREXFCAP
  excedeTope: string; // HREXEXCP - 'S' / 'N'
  observacion: string | null; // HREXOBSR
  estado: number; // HREXESTD
  fechaRegistro?: Date; // HREXFCHR
  usuarioRegistro?: string; // HREXUSRR
}

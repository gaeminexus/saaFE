import { Empresa } from '../../../shared/model/empresa';

/**
 * Período de nómina. Tabla `RHH.PRDN`.
 *
 * `modo` es el interruptor del cronograma: en HISTORICO_SIN_CONTABILIZAR el período recorre toda
 * su máquina de estados pero no genera asiento ni valida cuentas contables, que es lo que
 * permite cargar enero–julio de 2026 sin plan de cuentas.
 *
 * Ojo con `estado`: desde el script 05 es un `Long` que apunta al rubro 182, no el `String` que
 * era antes.
 */
export interface PeriodoNomina {
  codigo: number; // PRDNCDGO
  empresa?: Empresa | { codigo: number } | null; // PJRQCDGO
  anio: number; // PRDNANOO
  mes: number; // PRDNMSEE
  fechaInicio: Date; // PRDNFCHI
  fechaFin: Date; // PRDNFCHF
  estado: number; // PRDNESTD - rubro 182
  modo?: number | null; // PRDNMODO - rubro 184
  tipoPeriodo?: number | null; // PRDNTPNM - rubro 212
  fechaContable?: Date | null; // PRDNFCCN

  // Asientos generados
  asientoRol?: { codigo: number } | null; // PRDNASNT
  asientoProvisiones?: { codigo: number } | null; // PRDNASPR
  asientoPago?: { codigo: number } | null; // PRDNASPG

  // Trazabilidad de la máquina de estados
  fechaAprobacion?: Date | null; // PRDNFCAP
  usuarioAprueba?: string | null; // PRDNUSAP
  fechaCierre?: Date | null; // PRDNFCCR
  usuarioCierra?: string | null; // PRDNUSCR

  // Totales del período
  totalIngresos?: number; // PRDNTTIN
  totalDescuentos?: number; // PRDNTTDS
  totalNeto?: number; // PRDNTTNT
  totalPatronal?: number; // PRDNTTPT
  numeroEmpleados?: number; // PRDNNMEM
  observaciones?: string | null; // PRDNOBSR

  fechaRegistro?: Date; // PRDNFCHR
  usuarioRegistro?: string; // PRDNUSRR
}

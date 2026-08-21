import { ConceptoNomina } from './concepto-nomina';
import { Empleado } from './empleado';
import { PeriodoNomina } from './periodo-nomina';

/**
 * Novedad puntual del período. Tabla `RHH.NVNM`.
 *
 * Ingresos y descuentos que no son fijos ni obligatorios: un bono del mes, un descuento
 * puntual, horas cargadas a mano. Es además la vía de carga de la nómina histórica de
 * enero–julio de 2026, donde los días trabajados y las horas extra se ingresan aquí en lugar de
 * salir del biométrico.
 *
 * Solo las novedades con `aprobada = 'S'` entran en el cálculo del período.
 */
export interface NovedadNomina {
  codigo: number; // NVNMCDGO
  periodoNomina: PeriodoNomina | { codigo: number } | null; // PRDNCDGO
  empleado: Empleado | { codigo: number } | null; // MPLDCDGO
  conceptoNomina: ConceptoNomina | { codigo: number } | null; // CPNMCDGO
  cantidad: number | null; // NVNMCANT - horas, días o unidades
  valor: number; // NVNMVLRR
  descripcion: string | null; // NVNMDSCR
  aprobada: string; // NVNMAPRB - 'S' / 'N'
  usuarioAprueba: string | null; // NVNMUSAP
  fechaAprobacion: Date | null; // NVNMFCAP
  estado: number; // NVNMESTD
  fechaRegistro?: Date; // NVNMFCHR
  usuarioRegistro?: string; // NVNMUSRR
}

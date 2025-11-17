import { Plantilla } from './plantilla-general';
import { PlanCuenta } from './plan-cuenta';

/**
 * Modelo para Detalles de Plantillas (coincide con backend DTPL)
 */
export interface DetallePlantilla {
  codigo: number;  // DTPLCDGO - Primary key
  plantilla: Plantilla;  // PLNSCDGO
  planCuenta: PlanCuenta;  // PLNNCDGO
  descripcion?: string;  // DTPLDSCR
  movimiento: number;  // DTPLMVMN (1=Debe, 2=Haber)
  fechaDesde?: Date;  // DTPLFCIN
  fechaHasta?: Date;  // DTPLFCFN
  auxiliar1?: number;  // DTPLAXL1
  auxiliar2?: number;  // DTPLAXL2
  auxiliar3?: number;  // DTPLAXL3
  auxiliar4?: number;  // DTPLAXL4
  auxiliar5?: number;  // DTPLAXL5
  estado?: number;  // DTPLESTD
  fechaInactivo?: Date;  // DTPLFCDS
}

/**
 * Tipos de movimiento contable (según backend)
 */
export enum TipoMovimiento {
  DEBE = 1,
  HABER = 2
}

/**
 * Interface para crear/editar detalle de plantilla
 */
export interface DetallePlantillaForm {
  planCuenta: PlanCuenta;
  descripcion?: string;
  movimiento: TipoMovimiento;
  fechaDesde?: Date;
  fechaHasta?: Date;
  auxiliar1?: number;
  auxiliar2?: number;
  auxiliar3?: number;
  auxiliar4?: number;
  auxiliar5?: number;
}

/**
 * Interface para validación de detalles
 */
export interface ValidacionDetalle {
  esValido: boolean;
  errores: string[];
}

/**
 * Interface para resumen de plantilla
 */
export interface ResumenPlantilla {
  totalLineas: number;
  totalDebe: number;
  totalHaber: number;
  diferencia: number;
  balanceado: boolean;
}

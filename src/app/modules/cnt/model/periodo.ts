import { Empresa } from '../../../shared/model/empresa';

/**
 * Modelo para Períodos Contables (coincide con backend PRDO)
 */
export interface Periodo {
  codigo: number;  // PRDOCDGO - Primary key
  empresa: Empresa;  // PJRQCDGO
  mes: number;  // PRDOMSSS (1-12)
  anio: number;  // PRDOANNN
  nombre: string;  // PRDONMBR
  estado: EstadoPeriodo;  // PRDOESTD
  idMayorizacion?: number;  // PRDOMYRZ
  idDesmayorizacion?: number;  // PRDODSMY
  idMayorizacionCierre?: number;  // PRDOMYCR
  idDesmayorizacionCierre?: number;  // PRDODMCR
  periodoCierre?: number;  // PRDOCRRE
  primerDia: Date;  // PRDOINCO
  ultimoDia: Date;  // PRDOFNN
}

/**
 * Estados del período contable
 */
export enum EstadoPeriodo {
  ABIERTO = 1,      // Período abierto para registros
  MAYORIZADO = 2,   // Período mayorizado (cerrado para edición)
  DESMAYORIZADO = 3 // Período desmayorizado (reabierto)
}

/**
 * Interface para filtros de período
 */
export interface FiltrosPeriodo {
  anio?: number;
  mes?: number;
  estado?: EstadoPeriodo;
  empresa?: number;
  nombre?: string;
}

/**
 * Datos para crear un nuevo período
 */
export interface CrearPeriodo {
  mes: number;
  anio: number;
  nombre?: string;
}

/**
 * Información resumida del período
 */
export interface ResumenPeriodo {
  totalAsientos?: number;
  totalDebitos?: number;
  totalCreditos?: number;
  estaBalanceado?: boolean;
  fechaMayorizacion?: Date;
  fechaDesmayorizacion?: Date;
}

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
  /** C17 — cierre contable bloqueante (PRDOCNCR): 1 = CERRADO; 0 o nulo = abierto. Independiente de `estado`. */
  cerradoContable?: number | null;
  /** C17 — fecha y hora del cierre contable vigente (PRDOFCCN). Llega como arreglo o texto según el serializador. */
  fechaCierreContable?: any;
  /** C17 — usuario que cerró el período (PRDOUSCN). */
  usuarioCierreContable?: string | null;
}

/**
 * C17 — `GET /prdo/estado/{idEmpresa}/{anio}/{mes}` (saaBE `EstadoPeriodo`): estado contable (decide
 * DEFINITIVO / PRELIMINAR) y de cartera de un mes. docs/logica-negocio/cnt/CIERRES-BLOQUEANTES.md §4.
 */
export interface EstadoCierrePeriodo {
  idEmpresa: number;
  anio: number;
  mes: number;
  /** ABIERTO | CERRADO (contable). */
  estado: 'ABIERTO' | 'CERRADO' | string;
  existePeriodo: boolean;
  idPeriodo?: number | null;
  /** Rubro 22: 1 activo, 2 mayorizado, 3 desmayorizado. */
  estadoMayorizacion?: number | null;
  fechaCierre?: any;
  usuarioCierre?: string | null;
  /** ABIERTO | CERRADO (corrida de cierre de cartera EJECUTADA vigente). */
  estadoCartera: 'ABIERTO' | 'CERRADO' | string;
  idCorridaCartera?: number | null;
  fechaCierreCartera?: any;
  usuarioCierreCartera?: string | null;
  definitivo: boolean;
  /** DEFINITIVO | PRELIMINAR - PERIODO CONTABLE ABIERTO */
  leyenda: string;
}

/** C17 — fila de la bitácora `CNT.HCPR` (`GET /prdo/bitacora/{idEmpresa}`). */
export interface HistorialCierrePeriodo {
  codigo: number;
  idEmpresa: number;
  anio: number;
  mes: number;
  /** CONTABLE | CARTERA */
  tipo: string;
  /** CIERRE | REAPERTURA */
  accion: string;
  fecha: any;
  usuario: string;
  ip?: string | null;
  motivo?: string | null;
  idPeriodo?: number | null;
  idCorrida?: number | null;
  /** 1 si se hizo fuera de orden con el parámetro de re-proceso. */
  fueraDeOrden?: number | null;
}

/**
 * Estados del período contable
 */
export enum EstadoPeriodo {
  ABIERTO = 1,      // Período abierto para registros
  MAYORIZADO = 2,   // Período mayorizado (cerrado para edición)
  DESMAYORIZADO = 3, // Período desmayorizado (reabierto)
  CERRADO = 4       // Período cerrado (rubro EstadoPeriodos.CERRADO) - sin edición posible
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

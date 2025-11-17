import { Empresa } from '../../../shared/model/empresa';

/**
 * Modelo para Plantillas Contables (coincide con backend PLNS)
 */
export interface Plantilla {
  codigo: number;  // PLNSCDGO - Primary key (Long en backend)
  nombre: string;  // PLNSNMBR
  codigoAlterno?: number;  // PLNSCDAL
  estado: number;  // PLNSESTD (1=activo, 2=inactivo)
  empresa: Empresa;  // PJRQCDGO
  observacion?: string;  // PLNSOBSR
  fechaInactivo?: Date;  // PLNSFCDS
  fechaCreacion?: Date;  // Fecha de creación
  fechaUpdate?: Date;   // Fecha de actualización
  usuarioCreacion?: string;  // Usuario que creó
  usuarioUpdate?: string;    // Usuario que actualizó
}

/**
 * Estados posibles para una plantilla (según backend)
 */
export enum EstadoPlantilla {
  ACTIVO = 1,
  INACTIVO = 2
}

/**
 * Interface para crear/editar plantilla
 */
export interface PlantillaForm {
  nombre: string;
  codigoAlterno?: number;
  estado: EstadoPlantilla;
  observacion?: string;
}

/**
 * Interface para búsqueda de plantillas
 */
export interface PlantillaFiltros {
  nombre?: string;
  codigoAlterno?: number;
  estado?: EstadoPlantilla;
  fechaDesde?: Date;
  fechaHasta?: Date;
}

import { Empresa } from '../../../shared/model/empresa';

/**
 * @deprecated Use interface Plantilla from plantilla-general.ts instead
 * This interface is kept only for backward compatibility
 */
export interface PlantillaLegacy {
  codigo: number;
  nombre: string;
  alterno?: number;
  estado: number;
  empresa: Empresa;
  observacion: string;
  fechaInactivo?: Date;
  sistema: number;
}

// Re-export the main interface from plantilla-general
export { EstadoPlantilla } from './plantilla-general';
export type { Plantilla } from './plantilla-general';

import { GeneracionArchivoPetro } from './generacion-archivo-petro';

export interface DetalleGeneracionArchivo {
  codigo?: number;
  generacionArchivoPetro?: GeneracionArchivoPetro;
  codigoProductoPetro: string;
  totalRegistros?: number;
  totalMonto?: number;
  descripcionProducto?: string;
  usuarioIngreso?: string;
  fechaIngreso?: string;
  usuarioModificacion?: string;
  fechaModificacion?: string;
}

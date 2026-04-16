import { Entidad } from './entidad';
import { Prestamo } from './prestamo';
import { DetalleGeneracionArchivo } from './detalle-generacion-archivo';

export interface ParticipeGeneracionArchivo {
  codigo?: number;
  detalleGeneracionArchivo?: DetalleGeneracionArchivo;
  entidad?: Entidad;
  prestamo?: Prestamo;
  rolPetrocomercial?: number;
  codigoProductoPetro?: string;
  montoEnviado?: number;
  numeroLinea?: number;
  observaciones?: string;
  estado?: number;
  montoDescontado?: number;
  fechaDescuento?: string;
  usuarioIngreso?: string;
  fechaIngreso?: string;
  usuarioModificacion?: string;
  fechaModificacion?: string;
}

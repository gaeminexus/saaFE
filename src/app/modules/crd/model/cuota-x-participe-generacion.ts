import { ParticipeGeneracionArchivo } from './participe-generacion-archivo';
import { Prestamo } from './prestamo';
import { TipoAporte } from './tipo-aporte';

export interface CuotaXParticipeGeneracion {
  codigo?: number;
  participeDetalleGeneracion?: ParticipeGeneracionArchivo;
  prestamo?: Prestamo;
  tipoAporte?: TipoAporte;
  numeroCuota?: number;
  valorCuota?: number;
  usuarioIngreso?: string;
  fechaIngreso?: string | number[];
  usuarioModificacion?: string;
  fechaModificacion?: string | number[];
}

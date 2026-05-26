import { DetalleEjecucionReporte } from './detalle-ejecucion-reporte';

export interface ParticipeActivoG41 {
  codigo: number;
  detalleEjecucion: DetalleEjecucionReporte;
  tipoIdentificacion: string;
  identificacion: string;
  genero: string;
  estadoCivil: string;
  fechaNacimiento: any;
  fechaIngreso: any;
  estadoParticipe: string;
  tipoSistema: string;
  baseCalculoAportacion: number;
  tipoRelacionLaboral: string;
  estadoRegistro: string;
  fechaActualizacionEstado: any;
}

import { DetalleEjecucionReporte } from './detalle-ejecucion-reporte';

export interface NuevoParticipeG45 {
  codigo: number;
  detalleEjecucion: DetalleEjecucionReporte;
  tipoIdentificacion: string;
  identificacion: string;
  tipoParticipe: string;
  actividadEconomica: string;
  patrimonio: number;
  provincia: string;
  canton: string;
  parroquia: string;
  genero: string;
  estadoCivil: string;
  fechaNacimiento: any;
  profesion: string;
  cargasFamiliares: number;
  origenIngresos: string;
}

import { Filial } from './filial';

export interface GeneracionArchivoPetro {
  codigo?: number;
  mesPeriodo: number;
  anioPeriodo: number;
  fechaGeneracion?: string | number[];
  usuarioGeneracion?: string;
  totalRegistros?: number;
  totalMontoEnviado?: number;
  estado?: number;
  rutaArchivo?: string;
  nombreArchivo?: string;
  fechaEnvio?: string;
  fechaProcesamiento?: string;
  observaciones?: string;
  filial?: Filial;
  usuarioIngreso?: string;
  fechaIngreso?: string;
  usuarioModificacion?: string;
  fechaModificacion?: string;
}

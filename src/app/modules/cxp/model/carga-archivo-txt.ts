import { Empresa } from '../../../shared/model/empresa';
import { Usuario } from '../../../shared/model/usuario';

// Cabecera de una carga de archivo TXT del SRI — endpoint: /crtx
export interface CargaArchivoTxt {
  id: number;
  empresa: Empresa;
  usuario: Usuario;
  fechaCarga: string; // ISO LocalDateTime
  nombreArchivo: string;
  totalRegistros: number;
  registrosNuevos: number;
  registrosDuplicados: number;
  registrosNovedad: number;
  estado: number; // 1=PROCESADO 2=ERROR_PARCIAL
  observacion: string;
}

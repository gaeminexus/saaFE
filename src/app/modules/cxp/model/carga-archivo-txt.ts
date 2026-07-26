import { Empresa } from '../../../shared/model/empresa';
import { Usuario } from '../../../shared/model/usuario';
import { Periodo } from '../../cnt/model/periodo';

// Cabecera de una carga de archivo TXT del SRI — endpoint: /crtx
export interface CargaArchivoTxt {
  id: number;
  empresa: Empresa;
  periodoContable: Periodo;          // FK a periodo contable
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

import { Empresa } from '../../../shared/model/empresa';
import { Titular } from '../../tsr/model/titular';
import { Usuario } from '../../../shared/model/usuario';

// Retención de compra emitida por la empresa — endpoint: /rtcm
export interface RetencionCompra {
  id: number;
  tipoComprobante: string;
  empresa: Empresa;
  proveedor: Titular; // titular (proveedor retenido)
  tipoDoc: string;
  periodoFiscal: string; // formato mm/aaaa
  numero: string;
  numEstablecimiento: string;
  numPtoEmision: string;
  secuencial: string;
  ambiente: number;
  clave: string;
  fecha: string; // ISO LocalDateTime
  observacion: string;
  total: number;
  ptoEmision: number;
  usuario: Usuario;
  pathGen: string;
  autorizacion: string;
  fechaAutorizacion: string; // ISO LocalDateTime
  estado: number;
  estadoEmision: number;
}

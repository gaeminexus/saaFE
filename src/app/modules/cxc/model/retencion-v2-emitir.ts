import { Facturador } from './facturador';
import { Usuario } from '../../../shared/model/usuario';
import { PuntoEmision } from './puntos-emision';
import { Titular } from '../../tsr/model/titular';

export interface RetencionV2Emitir {
  id: number;
  tipoComprobante: string;
  facturador: Facturador;
  titular: Titular;
  tipoDoc: string;
  periodoFiscal: string;
  numero: string;
  numEstablecimiento: string;
  numPtoEmision: string;
  secuencial: string;
  ambiente: number;
  clave: string;
  fecha: Date;
  observacion: string;
  total: number;
  ptoEmision: PuntoEmision;
  usuario: Usuario;
  pathGen: string;
  autorizacion: string;
  fechaAutorizacion: string;
  estado: number;
  estadoEmision: number;
}

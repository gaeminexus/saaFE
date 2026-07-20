import { Empresa } from '../../../shared/model/empresa';
import { Titular } from '../../tsr/model/titular';
import { Usuario } from '../../../shared/model/usuario';

// Nota de débito recibida de proveedor — endpoint: /ntdc
export interface NotaDebitoCompra {
  id: number;
  tipoComprobante: string;
  empresa: Empresa;
  titular: Titular;
  tipoDoc: string;
  numero: string;
  numEstablecimiento: string;
  numPtoEmision: string;
  secuencial: string;
  ambiente: number;
  clave: string;
  fecha: string; // ISO LocalDateTime
  tipoDocModificado: string;
  numDocModificado: string;
  fechaEmisionDM: string; // ISO LocalDateTime
  observacion: string;
  subtotal: number;
  subcero: number;
  pIVA: number;
  vIVA: number;
  vICE: number;
  vIRBPNR: number;
  descuento: number;
  porDescuento: number;
  propina: number;
  subsidio: number;
  total: number;
  ptoEmision: number;
  usuario: Usuario;
  pathGen: string;
  autorizacion: string;
  fechaAutorizacion: string; // ISO LocalDateTime
  estado: number;
  estadoEmision: number;
}

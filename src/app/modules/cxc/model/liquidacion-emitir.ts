import { Facturador } from './facturador';
import { Titular } from '../../tsr/model/titular';
import { Usuario } from '../../../shared/model/usuario';
import { PuntoEmision } from './puntos-emision';

export interface LiquidacionEmitir {
  id: number;
  tipoComprobante: string;
  facturador: Facturador;
  titular: Titular;
  tipoDoc: string;
  numero: string;
  numEstablecimiento: string;
  numPtoEmision: string;
  secuencial: string;
  ambiente: number;
  clave: string;
  fecha: Date;
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
  totalSinSub: number;
  ahorroSub: number;
  total: number;
  ptoEmision: PuntoEmision;
  usuario: Usuario;
  pathGen: string;
  autorizacion: string;
  fechaAutorizacion: string;
  estado: number;
  estadoEmision: number;
  /** 1 Pendiente, 2 Pagada parcial, 3 Pagada total. Lo recalcula el backend desde CBR.APLC. */
  estadoPago?: number | null;
  asiento?: { codigo: number; numeroAlterno?: string } | null;
  /**
   * Documento CXP (PGS.LQCC) creado al autorizarse por el SRI — ahí viven la
   * cuenta por pagar y el asiento de recepción. Null hasta que
   * `crearDocumentoCxp` corre (dentro de `procesarCompleta`, o a mano si
   * quedó pendiente). Determina si el botón "Crear documento CXP" se muestra.
   */
  documentoCxp?: { id: number } | null;
}

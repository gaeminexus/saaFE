import { Empresa } from '../../../shared/model/empresa';
import { Titular } from '../../tsr/model/titular';
import { Usuario } from '../../../shared/model/usuario';

// Factura de compra recibida de proveedor — endpoint: /fctc
export interface FacturaCompra {
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
  observacion: string;
  subtotal: number;
  subcero: number;
  subtotal5: number;
  subtotal8: number;
  pIVA: number;
  vIVA: number;
  vIVA5: number;
  vIVA8: number;
  vICE: number;
  vIRBPNR: number;
  descuento: number;
  porDescuento: number;
  propina: number;
  subsidio: number;
  totalSinSub: number;
  ahorroSub: number;
  total: number;
  ptoEmision: number;
  usuario: Usuario;
  pathGen: string;
  autorizacion: string;
  fechaAutorizacion: string; // ISO LocalDateTime
  formaPago: number;
  estado: number;
  estadoEmision: number;
  /** Estado de pago (1=Pendiente, 2=Parcial, 3=Pagada). Lo informa el flujo de abonos (/aplp). */
  estadoPago?: number;
  motivoAnulacion?: string | null;
  fechaAnulacion?: string | null;
  usuarioAnulacion?: string | null;
  /** Reembolso de gastos: 0=No 1=Sí (SRI codDoc 41 / bloque <reembolsos>) */
  esReembolso?: number;
  codDocReembolso?: string;
  totalComprobantesReembolso?: number;
  totalBaseImponibleReembolso?: number;
  totalImpuestoReembolso?: number;
}

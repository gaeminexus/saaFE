import { RetencionCompraV2 } from './retencion-compra-v2';

// Línea de detalle de RetencionCompraV2 (PGS.DRC2) — endpoint: /drc2
export interface DetalleRetencionCompraV2 {
  id: number;
  retencionCompraV2: RetencionCompraV2;
  tipoDocReten: string;
  numDocReten: string;
  fechaEmiDoc: string; // YYYY-MM-DD (LocalDate)
  fechaReg: string;    // YYYY-MM-DD (LocalDate)
  // Datos del documento de sustento (la factura de venta que se retiene)
  docResAutorizacion: string;
  docResTotalSinImpuestos: number;
  docResIvaCero: number;
  docResPorIva: number;
  docResTotalIva: number;
  docResTotal: number;
  docResForPago: string;
  // Retención propiamente dicha
  codImpuesto: string;
  codRetencion: string;
  baseImponible: number;
  porcentajeReten: number;
  valorReten: number;
  estado: number;
}

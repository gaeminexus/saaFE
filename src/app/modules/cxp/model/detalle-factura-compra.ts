import { FacturaCompra } from './factura-compra';

// Línea de detalle de FacturaCompra — endpoint: /dfcc
export interface DetalleFacturaCompra {
  id: number;
  factura: FacturaCompra;
  descripcion: string;
  cantidad: number;
  valor: number;
  subTotal: number;
  descuento: number;
  baseImponible: number;
  porcentajeIVA: number;
  valorIVA: number;
  porcentajeICE: number;
  valorICE: number;
  subsidio: number;
  precioSinSub: number;
  total: number;
  producto: number;
  codigoIVASRI: number;
  estado: number;
}

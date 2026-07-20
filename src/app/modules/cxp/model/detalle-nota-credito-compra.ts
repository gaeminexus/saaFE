import { NotaCreditoCompra } from './nota-credito-compra';

// Línea de detalle de NotaCreditoCompra — endpoint: /dtcc
export interface DetalleNotaCreditoCompra {
  id: number;
  notaCredito: NotaCreditoCompra;
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
  total: number;
  producto: number;
  estado: number;
}

import { NotaDebitoCompra } from './nota-debito-compra';

// Línea de detalle de NotaDebitoCompra — endpoint: /dtdc
export interface DetalleNotaDebitoCompra {
  id: number;
  notaDebito: NotaDebitoCompra;
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
  estado: number;
}

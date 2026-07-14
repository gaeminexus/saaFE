import { NotaCreditoEmitir } from './nota-credito-emitir';
import { ProductoCobro } from './producto-cobro';

export interface DetalleNotaCreditoEmitir {
  id: number;
  notaCredito: NotaCreditoEmitir;
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
  producto: ProductoCobro;
  estado: number;
}

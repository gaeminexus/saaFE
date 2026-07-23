import { NotaDebitoEmitir } from './nota-debito-emitir';
import { ProductoCobro } from './producto-cobro';

export interface DetalleNotaDebitoEmitir {
  id: number;
  notaDebito: NotaDebitoEmitir;
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

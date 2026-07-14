import { LiquidacionEmitir } from './liquidacion-emitir';
import { ProductoCobro } from './producto-cobro';

export interface DetalleLiquidacionEmitir {
  id: number;
  liquidacion: LiquidacionEmitir;
  descripcion: string;
  cantidad: number;
  valor: number;
  subTotal: number;
  porcentajeIVA: number;
  valorIVA: number;
  porcentajeICE: number;
  valorICE: number;
  subsidio: number;
  precioSinSub: number;
  descuento: number;
  total: number;
  producto: ProductoCobro;
  estado: number;
}

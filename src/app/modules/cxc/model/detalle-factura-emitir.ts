import { FacturaEmitir } from './factura-emitir';
import { ProductoCobro } from './producto-cobro';

export interface DetalleFacturaEmitir {
  id: number;
  factura: FacturaEmitir;
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
  producto: ProductoCobro;
  codigoIVASRI: number;
  estado: number;
}

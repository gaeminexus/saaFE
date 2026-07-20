import { LiquidacionCompraCompra } from './liquidacion-compra-compra';

// Línea de detalle de LiquidacionCompraCompra — endpoint: /dlcm
export interface DetalleLiquidacionCompraCompra {
  id: number;
  liquidacion: LiquidacionCompraCompra;
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
  producto: number;
  estado: number;
}

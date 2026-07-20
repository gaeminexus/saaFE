import { LiquidacionCompraCompra } from './liquidacion-compra-compra';

// Forma de pago registrada en LiquidacionCompraCompra — endpoint: /fplm
export interface FormaPagoLiquidacionCompraCompra {
  id: number;
  liquidacion: LiquidacionCompraCompra;
  formaPago: string;
  valor: number;
  plazo: number;
  unidadTiempo: string;
}

import { LiquidacionEmitir } from './liquidacion-emitir';

/**
 * FormaPagoLiquidacion — CBR.FPLC. Forma(s) de pago de una liquidación de
 * compra, necesarias para generar su XML según el SRI. Espejo de
 * FormaPagoFactura (CBR.FORMA_PAGO_FACTURA) para el mismo propósito en Factura.
 */
export interface FormaPagoLiquidacion {
  id?: number;
  liquidacion?: LiquidacionEmitir;
  /** Código de forma de pago según tabla SRI 24. */
  formaPago: string;
  valor: number;
  /** Plazo en días/meses/años. */
  plazo: number;
  /** 'dias' | 'meses' | 'anios'. */
  unidadTiempo: string;
  estado?: number;
}

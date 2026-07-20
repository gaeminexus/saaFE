import { FacturaCompra } from './factura-compra';

// Forma de pago registrada en FacturaCompra — endpoint: /fpfm
export interface FormaPagoFacturaCompra {
  id: number;
  factura: FacturaCompra;
  formaPago: string;
  valor: number;
  plazo: number;
  unidadTiempo: string;
}

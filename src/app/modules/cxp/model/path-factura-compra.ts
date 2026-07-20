import { FacturaCompra } from './factura-compra';

// Ruta del documento generado para FacturaCompra — endpoint: /pfcc
export interface PathFacturaCompra {
  id: number;
  factura: FacturaCompra;
  path: string;
  alterno: number;
}

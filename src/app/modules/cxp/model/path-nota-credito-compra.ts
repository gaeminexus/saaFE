import { NotaCreditoCompra } from './nota-credito-compra';

// Ruta del documento generado para NotaCreditoCompra — endpoint: /ptcv
export interface PathNotaCreditoCompra {
  id: number;
  notaCredito: NotaCreditoCompra;
  path: string;
  alterno: number;
}

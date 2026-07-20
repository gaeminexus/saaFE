import { NotaDebitoCompra } from './nota-debito-compra';

// Ruta del documento generado para NotaDebitoCompra — endpoint: /ptdc
export interface PathNotaDebitoCompra {
  id: number;
  notaDebito: NotaDebitoCompra;
  path: string;
  alterno: number;
}

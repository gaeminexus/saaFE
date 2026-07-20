import { RetencionCompra } from './retencion-compra';

// Ruta del documento generado para RetencionCompra — endpoint: /prcm
export interface PathRetencionCompra {
  id: number;
  retencion: RetencionCompra;
  path: string;
  alterno: number;
}

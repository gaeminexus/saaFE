import { RetencionCompra } from './retencion-compra';

// Línea de detalle de RetencionCompra — endpoint: /drcm
export interface DetalleRetencionCompra {
  id: number;
  retencion: RetencionCompra;
  tipoDocReten: string;
  numDocReten: string;
  fechaEmiDoc: string; // YYYY-MM-DD (LocalDate)
  codImpuesto: string;
  codRetencion: string;
  baseImponible: number;
  porcentajeReten: number;
  valorReten: number;
  estado: number;
}

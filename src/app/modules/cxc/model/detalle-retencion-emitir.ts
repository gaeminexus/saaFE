import { RetencionEmitir } from './retencion-emitir';

export interface DetalleRetencionEmitir {
  id: number;
  retencion: RetencionEmitir;
  tipoDocReten: string;
  numDocReten: string;
  fechaEmiDoc: Date;
  codImpuesto: string;
  codRetencion: string;
  baseImponible: number;
  porcentajeReten: number;
  valorReten: number;
  estado: number;
}

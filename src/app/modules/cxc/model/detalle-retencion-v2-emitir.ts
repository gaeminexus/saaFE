import { RetencionV2Emitir } from './retencion-v2-emitir';

export interface DetalleRetencionV2Emitir {
  id: number;
  retencionv2: RetencionV2Emitir;
  tipoDocReten: string;
  numDocReten: string;
  fechaEmiDoc: Date;
  fechaReg: Date | null;
  docResAutorizacion: string | null;
  docResTSinImpuestos: number;
  docResIVACero: number;
  docResPorIVA: number;
  docResTotalIVA: number;
  docResTotal: number;
  docResForPago: string;
  codImpuesto: string;
  codRetencion: string;
  baseImponible: number;
  porcentajeReten: number;
  valorReten: number;
  estado: number;
}

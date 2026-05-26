import { DetalleEjecucionReporte } from './detalle-ejecucion-reporte';

export interface GarantiaRealG51 {
  codigo: number;
  detalleEjecucion: DetalleEjecucionReporte;
  tipoIdentificacion: string;
  identificacion: string;
  numeroOperacion: string;
  numeroGarantia: string;
  tipoGarantia: string;
  descripcionGarantia: string;
  valorAvaluo: number;
  fechaAvaluo: any;
  numeroRegistroGarantia: string;
  fechaContabilizacion: any;
  porcentajeCubre: number;
  estadoRegistro: string;
}

import { DetalleEjecucionReporte } from './detalle-ejecucion-reporte';

export interface CancelacionG49 {
  codigo: number;
  detalleEjecucion: DetalleEjecucionReporte;
  tipoIdentificacion: string;
  identificacion: string;
  numeroOperacion: string;
  fechaCancelacion: any;
  formaCancelacion: string;
}

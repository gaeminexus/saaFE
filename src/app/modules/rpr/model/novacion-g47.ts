import { DetalleEjecucionReporte } from './detalle-ejecucion-reporte';

export interface NovacionG47 {
  codigo: number;
  detalleEjecucion: DetalleEjecucionReporte;
  tipoIdentificacion: string;
  identificacion: string;
  numeroOperacion: string;
  numeroOperacionAnterior: string;
  fechaNovacion: any;
}

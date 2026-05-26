import { DetalleEjecucionReporte } from './detalle-ejecucion-reporte';

export interface GaranteG50 {
  codigo: number;
  detalleEjecucion: DetalleEjecucionReporte;
  tipoIdentificacion: string;
  identificacion: string;
  numeroOperacion: string;
  tipoIdentificacionGarante: string;
  identificacionGarante: string;
  tipoGarante: string;
  fechaEliminacion: any;
  causaEliminacion: string;
}

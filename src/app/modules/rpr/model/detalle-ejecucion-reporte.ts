import { EjecucionReporte } from './ejecucion-reporte';

export interface DetalleEjecucionReporte {
  codigo: number | null;
  ejecucionReporte: EjecucionReporte;
  tipoReporte: string;       // G40, G41, ..., G51
  estado: number;            // 1=OK / 2=Con novedades / 3=Pendiente
  fechaGeneracion: any;
  cantidadRegistros: number | null;
  novedades: string;
  detalleOriginal: DetalleEjecucionReporte | null; // FK → EJRD original si es corrección
}

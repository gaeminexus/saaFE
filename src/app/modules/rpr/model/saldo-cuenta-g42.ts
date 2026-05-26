import { DetalleEjecucionReporte } from './detalle-ejecucion-reporte';

export interface SaldoCuentaG42 {
  codigo: number;
  detalleEjecucion: DetalleEjecucionReporte;
  tipoIdentificacion: string;
  identificacion: string;
  tipoPrestacion: string;
  aportePatronal: number;
  aportePersonal: number;
  aporteVoluntario: number;
  saldoAportePatronal: number;
  saldoAportePersonal: number;
  saldoAporteVoluntario: number;
  rendimiento: number;
}

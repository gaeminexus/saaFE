import { DetalleEjecucionReporte } from './detalle-ejecucion-reporte';

export interface ParticipeJubiladoG44 {
  codigo: number;
  detalleEjecucion: DetalleEjecucionReporte;
  tipoIdentificacion: string;
  identificacion: string;
  tipoJubilacion: string;
  fechaJubilacion: any;
  imposicionesAcumuladas: number;
  valorPension: number;
  valorNetoRecibir: number;
  saldoCuenta: number;
  valoresCompensados: number;
  jubilacionIess: string;
}

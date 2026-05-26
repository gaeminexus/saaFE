import { DetalleEjecucionReporte } from './detalle-ejecucion-reporte';

export interface ParticipeCesanteG43 {
  codigo: number;
  detalleEjecucion: DetalleEjecucionReporte;
  tipoIdentificacion: string;
  identificacion: string;
  fechaTerminoRelacionLaboral: any;
  numeroImposicionesPersonales: number;
  numeroImposicionesPatronales: number;
  fechaLiquidacion: any;
  saldoCuentaIndividual: number;
  valoresCompensados: number;
  valoresPagados: number;
}

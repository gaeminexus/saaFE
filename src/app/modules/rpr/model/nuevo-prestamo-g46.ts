import { DetalleEjecucionReporte } from './detalle-ejecucion-reporte';

export interface NuevoPrestamoG46 {
  codigo: number;
  detalleEjecucion: DetalleEjecucionReporte;
  tipoIdentificacion: string;
  identificacion: string;
  numeroOperacion: string;
  tipoCredito: string;
  estadoOperacion: string;
  situacionOperacion: string;
  destinoProvincia: string;
  destinoCanton: string;
  destinoParroquia: string;
  fechaConcesion: any;
  fechaVencimiento: any;
  valorOperacion: number;
  tasaInteresNominal: number;
  periodicidadPago: string;
  frecuenciaRevision: string;
  garantias: string;
}

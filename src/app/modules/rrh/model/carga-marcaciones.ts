import { Empresa } from '../../../shared/model/empresa';
import { FormatoMarcacion } from './formato-marcacion';

/**
 * Lote de marcaciones importado del reloj biométrico. Tabla `RHH.CRMR`.
 *
 * Es la trazabilidad de cada archivo cargado: cuántas líneas traía, cuántas entraron y por qué
 * fallaron las demás. `hash` permite reconocer un archivo ya subido antes de reprocesarlo.
 *
 * Los contadores coinciden uno a uno con `ResultadoImportacionMarcaciones`, el DTO que devuelven
 * `previsualizar` y `confirmar`, así que la pantalla usa el mismo modelo para el resultado de la
 * carga y para el historial.
 */
export interface CargaMarcaciones {
  codigo: number; // CRMRCDGO
  empresa: Empresa | { codigo: number } | null; // PJRQCDGO
  formato: FormatoMarcacion | { codigo: number } | null; // FMRCCDGO
  nombreArchivo: string; // CRMRNMAR
  hash: string | null; // CRMRHASH
  fechaCarga: Date; // CRMRFCCR
  fechaDesde: Date | null; // CRMRFCDS - primera marcación del archivo
  fechaHasta: Date | null; // CRMRFCHS - última marcación del archivo
  lineasTotales: number; // CRMRLNTT
  lineasOk: number; // CRMRLNOK
  lineasError: number; // CRMRLNER
  lineasDuplicadas: number; // CRMRLNDP
  log: string | null; // CRMRLGGO - detalle línea a línea de lo que falló
  estado?: number; // CRMRESTD - rubro 194
  fechaRegistro?: Date;
  usuarioRegistro?: string;
}

/**
 * Resultado de previsualizar o confirmar una importación.
 *
 * `previsualizar` no persiste nada: sirve para ver qué entraría antes de comprometerlo. En la
 * previsualización `idCarga` viene en nulo, porque todavía no existe el lote.
 */
export interface ResultadoImportacionMarcaciones {
  idCarga: number | null;
  nombreArchivo: string;
  lineasTotales: number;
  lineasOk: number;
  lineasError: number;
  lineasDuplicadas: number;
  errores: string[];
  fechaDesde: Date | null;
  fechaHasta: Date | null;
}

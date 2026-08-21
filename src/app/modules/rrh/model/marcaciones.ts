import { Empleado } from './empleado';

/**
 * Marcación de reloj. Tabla `RHH.MRCC`.
 *
 * Cada fila es un evento suelto —una entrada, una salida—, no un día. La consolidación diaria
 * vive en `RHH.RSMN`, y `procesado` marca las marcaciones que ya se consolidaron para que un
 * recálculo no las cuente dos veces.
 *
 * `cargaMarcaciones`, `dispositivo` y `lineaArchivo` los llena el importador del biométrico, que
 * todavía no existe: en el registro manual quedan en nulo.
 */
export interface Marcaciones {
  codigo: number; // MRCCCDGO
  empleado: Empleado | { codigo: number } | null; // MPLDCDGO
  fechaHora: Date; // MRCCFCHR (fecha y hora del evento)
  tipo: number; // MRCCTPOO - rubro 192
  origen: number; // MRCCORGN - rubro 193
  observacion: string | null; // MRCCOBSR
  procesado?: string; // MRCCPRCS - 'S' / 'N', ya consolidado en un resumen diario

  // Trazabilidad del lote importado; sin uso hasta que exista el importador
  cargaMarcaciones?: { codigo: number } | null; // CRMRCDGO
  dispositivo?: string | null; // MRCCDSPS
  lineaArchivo?: number | null; // MRCCLNAR

  fechaRegistro?: Date;
  usuarioRegistro?: string;
}

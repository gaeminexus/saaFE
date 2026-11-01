import { Prestamo } from './prestamo';
import { TipoAporte } from './tipo-aporte';

/** DSSBTPDS — docs/crd/API-DESTINO-SOBRANTE.md §1 */
export const DESTINO_SOBRANTE = {
  SIGUIENTE_CUOTA: 1,
  APORTE: 2,
  DEVOLUCION: 3,
} as const;

/** TPAPCDGO admitidos con destino APORTE: 9 jubilación, 11 cesantía. */
export const TIPO_APORTE_JUBILACION = 9;
export const TIPO_APORTE_CESANTIA = 11;

/**
 * Tabla CRD.DSSB: el destino que el operador elige para el SOBRANTE de un partícipe en una carga
 * Petro/ARCH. Una fila activa por (carga, partícipe). Los nombres de campo salen de
 * `DestinoSobrante.java` del backend.
 */
export interface DestinoSobrante {
  codigo?: number;                                  // DSSBCDGO
  cargaArchivo: { codigo: number };                 // CRARCDGO
  entidad: { codigo: number; rolPetroComercial?: number; razonSocial?: string }; // ENTDCDGO
  tipoDestino: number;                              // DSSBTPDS - 1 siguiente cuota, 2 aporte, 3 devolución
  prestamo?: Pick<Prestamo, 'codigo'> | null;       // PRSTCDGO - solo destino 1 (null = cuota pendiente más antigua)
  tipoAporte?: Pick<TipoAporte, 'codigo'> | null;   // TPAPCDGO - solo destino 2 (9 u 11)
  /** Lo que el proceso aplicó por aportes / por préstamos; nulos antes de procesar. */
  valorAplicadoAportes?: number | null;
  valorAplicadoPrestamos?: number | null;
  idPagoProgramado?: number | null;                 // DSSBPGTR - solo destino 3, después de procesar
  idAsiento?: number | null;                        // DSSBASNT
  estado?: number;                                  // DSSBESTD - 1 activo, 0 anulado
  observacion?: string | null;                      // DSSBOBSR
  usuarioRegistro?: string;
}

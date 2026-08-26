import { ParametrosAmortizacion } from './simulador-credito-nuevo';
import { ParametrosReestructuracion } from './simulador-prestamo-existente';

/**
 * Contrato de `POST /rest/prst/simulacion/reporte` (§7 de
 * `docs/crd/PLAN-SIMULADORES-PRESTAMOS.md`, fase 3 — en curso al escribir esto: los 3 `.jasper`
 * todavía no están compilados, §11.11.4 del plan). El backend **recalcula** desde estos
 * parámetros —nunca recibe la tabla que se mostró en pantalla— así que el PDF no puede diferir
 * de lo que vio el operador ni ser manipulado desde el cliente.
 *
 * Verificado por el árbitro contra `ejb/crd/service/dto/SolicitudReporteSimulacion.java` (§7.2
 * del plan): los nombres de campo de acá son los reales, no una inferencia.
 */
export type TipoReporteSimulacion = 'CREDITO_NUEVO' | 'ABONO_CAPITAL' | 'REESTRUCTURACION';

export interface SolicitudReporteSimulacion {
  tipo: TipoReporteSimulacion;
  /**
   * Cabecera del PDF (nombre e identificación del socio). El backend NO los busca en base
   * —`CalculadoraAmortizacionService` es deliberadamente ajena a `Entidad`— así que si no vienen
   * la cabecera sale en blanco; no es un error (§11.11.5.4 del plan).
   */
  nombreSocio?: string | null;
  identificacionSocio?: string | null;

  /** Solo cuando `tipo === 'CREDITO_NUEVO'`: los mismos parámetros de `simularCreditoNuevo`. */
  creditoNuevo?: ParametrosAmortizacion;

  /**
   * Solo cuando `tipo === 'ABONO_CAPITAL'`: los mismos parámetros de
   * `GET /prst/simularAbonoCapital/{id}?valor&modalidad`, sueltos (no anidados bajo un objeto
   * `abono`, a diferencia de los otros dos tipos).
   */
  idPrestamo?: number;
  valorAbono?: number;
  modalidadAbono?: number;

  /** Solo cuando `tipo === 'REESTRUCTURACION'`: los mismos parámetros de `simularReestructuracion`. */
  reestructuracion?: ParametrosReestructuracion;
}

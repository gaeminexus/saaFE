import { CuentaBancaria } from '../../tsr/model/cuenta-bancaria';
import { Entidad } from './entidad';
import { TipoAporte } from './tipo-aporte';

/**
 * Recepción de valores de seguro (sepelio) — `CRD.RVSG`.
 * Contrato: docs/crd/API-RECEPCION-VALORES-SEGURO.md §3.
 *
 * `idEmpresa` NO viaja: el servidor deriva la empresa contable de la cuenta bancaria.
 *
 * ⚠️ No agregar campos a `SolicitudRegistroRecepcion` que no estén en el contrato: el backend rechaza
 * las claves que no conoce con HTTP 400.
 */

export const RVSG_REGISTRADO = 1;
export const RVSG_APROBADO = 2;
export const RVSG_RECHAZADO = 3;
export const RVSG_ANULADO = 4;

/** Cuerpo de `POST /rvsg/registrar`. `fecha` es `LocalDate` `yyyy-MM-dd`. */
export interface SolicitudRegistroRecepcion {
  idEntidad: number;
  idTipoAporte: number;
  valor: number;
  fecha: string;
  idCuentaBancaria: number;
  referencia: string;
  rutaRespaldo: string;
  observacion: string | null;
  usuario: string;
}

/** Cuerpo de `POST /rvsg/{id}/aprobar`. */
export interface SolicitudAprobacionRecepcion {
  usuario: string;
}

/** Cuerpo de `POST /rvsg/{id}/rechazar`. */
export interface SolicitudRechazoRecepcion {
  usuario: string;
  motivo: string;
}

/** Fila de `CRD.RVSG` (§1 del contrato). Solo se declaran los campos que la pantalla lee. */
export interface RecepcionValorSeguro {
  codigo: number;
  entidad?: Entidad | null;
  tipoAporte?: TipoAporte | null;
  estado: number;
  cuentaBancaria?: CuentaBancaria | null;
  referencia?: string | null;
  rutaRespaldo?: string | null;
  valor: number;
  /** `LocalDate`: `yyyy-MM-dd` o arreglo `[y,m,d]`. Normalizar con `FuncionesDatosService`. */
  fecha: string | number[] | Date;
  observacion?: string | null;
  usuarioRegistro?: string | null;
  fechaRegistro?: string | number[] | Date | null;
}

/** Cuerpo de `POST /rvsg/{id}/anular` (solo desde APROBADO). `motivo` obligatorio. */
export type SolicitudAnulacionRecepcion = SolicitudRechazoRecepcion;

export function nombreEstadoRecepcion(estado: number): string {
  switch (estado) {
    case RVSG_REGISTRADO: return 'Pendiente de aprobación';
    case RVSG_APROBADO: return 'Aprobada';
    case RVSG_RECHAZADO: return 'Rechazada';
    case RVSG_ANULADO: return 'Anulada';
    default: return `Estado ${estado}`;
  }
}

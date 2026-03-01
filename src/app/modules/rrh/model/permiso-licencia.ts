import { Empleado } from './empleado';

/**
 * NOTA TEMPORAL: Este modelo representa Permisos/Licencias en el frontend,
 * pero el backend usa la entidad SolicitudVacaciones que tiene menos propiedades.
 *
 * Propiedades que el backend NO reconoce (se omiten en el servicio):
 * - tipoPermiso
 * - horaInicio, horaFin, horas
 * - conGoce
 * - numeroDocumento
 *
 * Cuando el backend implemente la entidad PermisoLicencia completa, se podrá
 * cambiar el endpoint de RS_PMLS (actualmente apunta a 'slct') a '/pmls'.
 */

export interface TipoPermiso {
  codigo: number;
  nombre: string;
  modalidad: string; // 'D' = días, 'H' = horas
  requiereDocumento: boolean;
  conGocePorDefecto: boolean;
  estado: string;
  fechaRegistro: Date;
  usuarioRegistro: string;
}

export interface PermisoLicencia {
  codigo: number;
  empleado: Empleado;
  tipoPermiso: TipoPermiso;
  fechaInicio: Date;
  fechaFin: Date;
  horaInicio: string | null; // HH:mm si aplica
  horaFin: string | null; // HH:mm si aplica
  dias: number | null;
  horas: number | null;
  conGoce: boolean;
  numeroDocumento: string | null;
  observacion: string | null;
  estado: string; // SOLICITADA, APROBADA, RECHAZADA, ANULADA (string como en backend)
  fechaAprobacion: Date | null;
  usuarioAprobacion: string | null;
  fechaRegistro: Date;
  usuarioRegistro: string;
}

// Enums para facilitar el manejo
export enum EstadoPermisoLicencia {
  PENDIENTE = 'SOLICITADA',
  APROBADO = 'APROBADA',
  RECHAZADO = 'RECHAZADA',
  CANCELADO = 'ANULADA',
}

export enum ModalidadPermiso {
  DIAS = 'D',
  HORAS = 'H',
}

import { Catalogo } from './catalogo';
import { Empleado } from './empleado';

/**
 * Modelo de pantalla de Permisos y Licencias.
 *
 * Respaldo real en el backend: RHH.PTCN (`Peticiones`) para la solicitud y RHH.CTLG
 * (`Catalogo`) para el tipo de permiso. Los comentarios indican el campo equivalente de la
 * entidad del backend; la traducción vive en `permiso-licencia.service.ts`.
 */

/** Tipo de permiso. Es la tabla RHH.CTLG (`Catalogo`), con su nombre de dominio. */
export type TipoPermiso = Catalogo;

/**
 * Solicitud de permiso o licencia. Tabla RHH.PTCN (`Peticiones`).
 *
 * PTCN lleva rango de fechas y, opcionalmente, horas: no tiene columna de modalidad, ni de
 * hora de inicio y fin, ni de días, ni de fecha de aprobación. Los campos marcados como
 * "solo cliente" se derivan en pantalla y no se envían al backend.
 */
export interface PermisoLicencia {
  codigo: number; // PTCN.codigo
  empleado: Empleado; // PTCN.empleado
  tipoPermiso: TipoPermiso; // PTCN.catalogo
  fechaInicio: Date; // PTCN.fechaDesde
  fechaFin: Date; // PTCN.fechaHasta
  horaInicio: string | null; // solo cliente
  horaFin: string | null; // solo cliente
  dias: number | null; // solo cliente, derivado de fechaInicio/fechaFin
  horas: number | null; // PTCN.horas
  conGoce: boolean; // derivado de TipoPermiso.conGoce
  numeroDocumento: string | null; // PTCN.documento
  motivo: string | null; // PTCN.motivo
  observacion: string | null; // PTCN.observacion
  estado: string; // PTCN.estado - SOLICITADA, APROBADA, RECHAZADA, ANULADA
  fechaAprobacion: Date | null; // solo cliente
  usuarioAprobacion: string | null; // PTCN.usuarioAprobador
  fechaRegistro: Date; // PTCN.fechaRegistro
  usuarioRegistro: string; // PTCN.usuarioRegistro
}

// Enums para facilitar el manejo
export enum EstadoPermisoLicencia {
  PENDIENTE = 'SOLICITADA',
  APROBADO = 'APROBADA',
  RECHAZADO = 'RECHAZADA',
  CANCELADO = 'ANULADA',
}

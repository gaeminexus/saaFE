import { Empleado } from './empleado';

/**
 * Modelo para registro de Asistencia de empleados
 * Incluye marcaciones, ausencias, tardanzas, permisos, vacaciones y licencias
 */
export interface Asistencia {
  codigo: number;
  empleadoCodigo: number;
  empleado?: Empleado;
  turnoCodigo: number;
  fecha: Date | string;

  horaEntrada: string | null; // HH:mm
  horaSalida: string | null; // HH:mm
  minutosAtraso: number | null;

  /**
   * Tipo de registro:
   * M = Marcación
   * F = Falta
   * T = Tardanza
   * P = Permiso
   * V = Vacación
   * L = Licencia
   */
  tipoRegistro: string;
  observacion: string | null;

  estado: number; // 1 = Activo, 2 = Inactivo
  fechaRegistro?: Date | string;
  usuarioRegistro?: string;
}

/**
 * Tipos de registro de asistencia
 */
export enum TipoRegistroAsistencia {
  MARCACION = 'M',
  FALTA = 'F',
  TARDANZA = 'T',
  PERMISO = 'P',
  VACACION = 'V',
  LICENCIA = 'L',
}

/**
 * Estados de asistencia
 */
export enum EstadoAsistencia {
  ACTIVO = 1,
  INACTIVO = 2,
}

/**
 * Resumen de asistencia para períodos
 */
export interface ResumenAsistencia {
  totalAsistencias: number;
  totalFaltas: number;
  totalAtrasos: number;
  totalMinutosAtraso: number;
  totalPermisos: number;
  totalVacaciones: number;
  totalLicencias: number;
}

import { Empleado } from './empleado';

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
  estado: number; // 1 = Pendiente, 2 = Aprobado, 3 = Rechazado, 4 = Cancelado
  fechaAprobacion: Date | null;
  usuarioAprobacion: string | null;
  fechaRegistro: Date;
  usuarioRegistro: string;
}

// Enums para facilitar el manejo
export enum EstadoPermisoLicencia {
  PENDIENTE = 1,
  APROBADO = 2,
  RECHAZADO = 3,
  CANCELADO = 4,
}

export enum ModalidadPermiso {
  DIAS = 'D',
  HORAS = 'H',
}

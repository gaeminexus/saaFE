import { Empleado } from './empleado';

export interface SolicitudVacaciones {
  codigo: number;
  empleado: Empleado;
  fechaDesde: Date;
  fechaHasta: Date;
  diasSolicitados: number;
  estado: string;
  usuarioAprobacion: string | null;
  observacion: string | null;
  fechaAprobacion: Date;
  fechaRegistro: Date;
  usuarioRegistro: string;
}

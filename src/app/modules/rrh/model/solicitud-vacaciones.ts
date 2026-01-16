import { Empleado } from "./empleado";

export interface SolicitudVacaciones {

  codigo: number;
  empleado: Empleado;
  fechaDesde: Date;
  fechaHasta: Date;
  diasSolicitados: number;
  estado: String;
  usuarioAprobacion: String;
  observacion: String;
  fechaRegistro: Date;
  usuarioRegistro: String;

}

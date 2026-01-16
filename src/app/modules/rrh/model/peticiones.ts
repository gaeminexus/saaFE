import { catalogo } from "./Catalogo";
import { Empleado } from "./empleado";

export interface Peticiones {
  codigo: number;
  empleado: Empleado;
  catalogo: catalogo;
  fechaDesde: Date;
  fechaHasta: Date;
  horas: number;
  motivo: String;
  documento: String;
  estado: String;
  usuarioAprobador: String;
  observacion: String;
  fechaRegistro: Date;
  usuarioRegistro: String;

}

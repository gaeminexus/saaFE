import { Empleado } from "./empleado";

export interface Marcaciones {
  codigo: number;
  empleado: Empleado;
  fechaHora: Date;
  tipo: String;
  origen: String;
  observacion: String;
  fechaRegistro: Date;
  usuarioRegistro: String;
}

import { Empleado } from "./empleado";

export interface Historial {
  codigo: number;
  empleado: Empleado;
  departamento:DepartamentoCargo;
  cargo: Cargo;
  fechaInicio: Date;
  fechaFin: Date;
  actual: String;
  observacion: String;
  fechaRegistro: Date;
  usuarioRegistro: Date;


}

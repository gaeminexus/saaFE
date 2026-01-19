import { Cargo } from './cargo';
import { departamentocargo } from './departamento-cargo';
import { Empleado } from './empleado';

export interface Historial {
  codigo: number;
  empleado: Empleado;
  departamento: departamentocargo;
  cargo: Cargo;
  fechaInicio: Date;
  fechaFin: Date;
  actual: String;
  observacion: String;
  fechaRegistro: Date;
  usuarioRegistro: Date;
}

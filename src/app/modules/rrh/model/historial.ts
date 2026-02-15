import { Cargo } from './cargo';
import { Departamento } from './departamento';
import { Empleado } from './empleado';

export interface Historial {
  codigo: number;
  empleado: Empleado;
  departamento: Departamento;
  cargo: Cargo;
  fechaInicio: Date | string;
  fechaFin?: Date | string | null;
  actual: string | number;
  observacion?: string | null;
  fechaRegistro?: Date | string | null;
  usuarioRegistro?: string | null;
}

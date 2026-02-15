import { Cargo } from './cargo';
import { Departamento } from './departamento';

export interface DepartamentoCargo {
  codigo: number;
  Departamento: Departamento;
  Cargo: Cargo;
  estado: string;
  fechaRegistro: Date;
  usuarioRegistro: string;
}

import { Empresa } from "../../../shared/model/empresa";

export interface CentroCosto{
  codigo: number;
	nombre: string;
  numero: number;
  tipo: number;
  nivel: number;
  idPadre: number;
  estado: number;
  empresa: Empresa;
  fechaInactivo: Date | null;
  fechaIngreso: Date;
}

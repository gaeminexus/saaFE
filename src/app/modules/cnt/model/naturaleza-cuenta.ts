import { Empresa } from "../../../shared/model/empresa";

export interface NaturalezaCuenta {
  codigo: number;
	nombre: string;
	tipo: number;
  numero: number;
  estado: number;
  empresa: Empresa;
  manejaCentroCosto: number;
}

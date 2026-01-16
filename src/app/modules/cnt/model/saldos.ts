import { Empresa } from "../../../shared/model/empresa";

export interface Saldos {

  codigo: number;
  planCuenta: number;
  empresa: Empresa;
  valor: number;
  fechaIngreso: Date;
  estado: number;

}

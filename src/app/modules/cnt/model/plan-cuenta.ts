import { Empresa } from "../../../shared/model/empresa";
import { NaturalezaCuenta } from "./naturaleza-cuenta";

export interface PlanCuenta {
  codigo: number;
  naturalezaCuenta: NaturalezaCuenta;
  cuentaContable: string;
  nombre: string;
  tipo: number;
  nivel: number;
  idPadre: number;
  estado: number;
  fechaInactivo: Date;
  empresa: Empresa;
  fechaUpdate: Date;
}

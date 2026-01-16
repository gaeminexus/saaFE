import { Rubro } from "../../../shared/model/rubro";
import { Nomina } from "./nomina";

export interface ReglonNomina {
  codigo: number;
  nomina: Nomina;
  rubro: Rubro;
  cantidad: number;
  valor: number;
  imponible: String;
  orden: number;
  fechaRegistro: Date;
  usuarioRegistro: String;

}

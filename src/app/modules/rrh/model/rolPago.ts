import { Nomina } from './nomina';
export interface RolPago {
  codigo: number;
  nomina: Nomina;
  numero: String;
  fechaEmision: Date;
  rutaPdf: String;
  estado: String;
  fechaRegistro: Date;
  usuarioRegistro: String;


}

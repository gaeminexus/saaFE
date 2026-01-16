import { Empleado } from "./empleado";

export interface Nomina {
  codigo: number;
  periodoNomina: PeriodoNomina;
  empleado: Empleado;
  contrato: Contrato;
  salarioBase: number;
  totalIngresos: number;
  totalDescuentos: number;
  netoPagar: number;
  estado: String;
  fechaRegistro: Date;
  usuarioRegistro: String;
}

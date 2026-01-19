import { Contrato } from './contrato';
import { Empleado } from './empleado';
import { PeriodoNomina } from './periodo-nomina';

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

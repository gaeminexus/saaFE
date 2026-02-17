import { Empleado } from "./empleado";

export interface SaldoVacaciones {

  codigo: number;
  empleado: Empleado;
  anio: number;
  diasAsignados: number;
  diasUsados: number;
  diasPendientes: number;
  fechaRegistro: Date;
  usuarioRegistro: string;

}

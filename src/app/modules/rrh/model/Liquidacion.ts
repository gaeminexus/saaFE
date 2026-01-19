import { Empleado } from './empleado';
import { ContratoEmpleado } from './contrato-empleado';
export interface Liquidacion {
  codigo: number;
  empleado: Empleado;
  contratoEmpleado: ContratoEmpleado;
  fechaSalida: Date;
  motivo: number;
  neto:number;
  estado: String;
  fechaRegistro: Date;
  usuarioRegistro: String;

}

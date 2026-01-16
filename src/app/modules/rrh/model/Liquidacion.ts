import { Empleado } from './empleado';
import { Contrato } from './contrato';
export interface Liquidacion {
  codigo: number;
  empleado: Empleado;
  contrato: Contrato;
  fechaSalida: Date;
  motivo: number;
  neto:number;
  estado: String;
  fechaRegistro: Date;
  usuarioRegistro: String;

}

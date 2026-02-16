import { Empleado } from './empleado';
import { TipoContratoEmpleado } from './tipo-contrato-empleado';

export interface ContratoEmpleado {
  codigo: number;
  empleado: Empleado;
  tipoContratoEmpleado: TipoContratoEmpleado;
  numero: String;
  fechaInicio: Date;
  fechaFin: Date;
  salarioBase: number;
  estado: String;
  fechaFirma: Date;
  observacion: String;
  fechaRegistro: Date;
  usuarioRegistro: String;
}

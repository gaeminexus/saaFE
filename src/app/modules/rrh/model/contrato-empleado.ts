import { Empleado } from './empleado';
import { TipoContratoEmpleado } from './tipo-contrato-empleado';

export interface ContratoEmpleado {
  codigo: number;
  empleado: Empleado;
  tipoContratoEmpleado: TipoContratoEmpleado;
  numero: string;
  fechaInicio: Date;
  fechaFin: Date;
  salarioBase: number;
  estado: string;
  fechaFirma: Date;
  observacion: string;
  fechaRegistro: Date;
  usuarioRegistro: string;
}

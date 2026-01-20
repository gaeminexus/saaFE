import { Empleado } from './empleado';
import { TipoContrato } from './tipo-contrato';

export interface ContratoEmpleado {
  codigo: number;
  empleado: Empleado;
  tipoContrato: TipoContrato;
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

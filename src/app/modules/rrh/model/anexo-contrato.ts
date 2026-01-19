import { ContratoEmpleado } from './contrato-empleado';

export interface AnexoContrato {
  codigo: number;
  contratoEmpleado: ContratoEmpleado;
  tipo: string;
  fechaAnexo: Date;
  detalle: string;
  nuevoSalario: number;
  nuevaFechaFin: Date;
  fechaRegistro: Date;
  usuarioRegistro: string;
}

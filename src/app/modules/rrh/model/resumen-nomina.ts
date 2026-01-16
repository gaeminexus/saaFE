import { Empleado } from "./empleado";

export interface ResumenNomina {
  codigo: number;
  empleado: Empleado;
  fecha: Date;
  horaEntrada: Date;
  horaSalida: String;
  minutosTarde: number;
  minutosExtra: number;
  ausencia: number;
  justificado: String;
  fuente: String;
  fechaRegistro: Date;
  usuarioRegistro: String;


}

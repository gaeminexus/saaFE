import { Contrato } from './contrato';

export interface AnexoContrato {
  codigo: number;
  contrato: Contrato;
  tipo: string;
  fechaAnexo: Date;
  detalle: string;
  nuevoSalario: number;
  nuevaFechaFin: Date;
  fechaRegistro: Date;
  usuarioRegistro: string;
}

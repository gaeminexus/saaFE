import { Empresa } from "../../../shared/model/empresa";

export interface TipoAsiento{
  codigo: number;
  nombre: string;
  codigoAlterno: number;
  estado: number;
  empresa: Empresa;
  observacion: string;
  fechaInactivo: Date;
  sistema: number;
}

/**
 * Enum para estados de tipos de asientos
 */
export enum EstadoTipoAsiento {
  INACTIVO = 0,
  ACTIVO = 1
}

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
 * Modelo para Tipo de Asiento General
 */
export interface TipoAsientoGeneral {
  id: number;
  nombre: string;
  estado: number; // 1 = Activo, 0 = Inactivo
  fechaCreacion?: Date;
  fechaUpdate?: Date;
  usuarioCreacion?: string;
  usuarioUpdate?: string;
}

/**
 * Modelo para Tipo de Asiento del Sistema
 */
export interface TipoAsientoSistema {
  id: number;
  nombre: string;
  codigoAlterno: string;
  estado: number; // 1 = Activo, 0 = Inactivo
  fechaCreacion?: Date;
  fechaUpdate?: Date;
  usuarioCreacion?: string;
  usuarioUpdate?: string;
}

/**
 * Enum para estados de tipos de asientos
 */
export enum EstadoTipoAsiento {
  INACTIVO = 0,
  ACTIVO = 1
}

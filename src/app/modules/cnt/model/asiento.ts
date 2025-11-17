import { Empresa } from '../../../shared/model/empresa';
import { Mayorizacion } from './mayorizacion';
import { Periodo } from './periodo';
import { TipoAsiento } from './tipo-asiento';
import { DetalleAsiento } from './detalle-asiento';

/**
 * Enumeración de estados del asiento contable
 * 1 = activo, 2 = anulado, 3 = reversado, 4 = incompleto
 */
export enum EstadoAsiento {
  ACTIVO = 1,
  ANULADO = 2,
  REVERSADO = 3,
  INCOMPLETO = 4
}

export interface Asiento {
  codigo: number;
  empresa: Empresa;
  tipoAsiento: TipoAsiento;
  fechaAsiento: Date;
  numero: number;
  estado: EstadoAsiento;
  observaciones: string;
  nombreUsuario: string;
  idReversion?: number;
  numeroMes: number;
  numeroAnio: number;
  moneda: number;
  mayorizacion?: Mayorizacion;
  rubroModuloClienteP: number;
  rubroModuloClienteH: number;
  fechaIngreso: Date;
  periodo: Periodo;
  rubroModuloSistemaP: number;
  rubroModuloSistemaH: number;

  // Para el formulario maestro-detalle
  detalles?: DetalleAsiento[];
}

/**
 * Interface para crear un nuevo asiento
 */
export interface CrearAsiento {
  tipoAsiento: TipoAsiento;
  fechaAsiento: Date;
  observaciones: string;
  periodo: Periodo;
  detalles: CrearDetalleAsiento[];
}

/**
 * Interface para crear detalle de asiento
 */
export interface CrearDetalleAsiento {
  planCuenta: number; // código de la cuenta
  descripcion: string;
  valorDebe: number;
  valorHaber: number;
  centroCosto?: number; // código del centro de costo (opcional)
}

/**
 * Interface para filtros de búsqueda de asientos
 */
export interface FiltrosAsiento {
  fechaDesde?: Date;
  fechaHasta?: Date;
  tipoAsiento?: number;
  estado?: EstadoAsiento;
  numero?: number;
  periodo?: number;
  observaciones?: string;
}

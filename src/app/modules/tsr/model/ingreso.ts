import { Asiento } from '../../cnt/model/asiento';
import { ProductoCobro } from '../../cxc/model/producto-cobro';
import { Empresa } from '../../../shared/model/empresa';
import { CuentaBancaria } from './cuenta-bancaria';
import { Titular } from './titular';

/** Estado del ingreso de tesorería (columna INGRESTD). */
export enum EstadoIngresoTesoreria {
  ACTIVO = 1,
  ANULADO = 2,
}

/** Clases de badge compartidas con las pantallas de pagos/cobros. */
export const ESTADO_INGRESO_LABELS: Record<number, { texto: string; clase: string }> = {
  [EstadoIngresoTesoreria.ACTIVO]: { texto: 'Activo', clase: 'badge-pagada' },
  [EstadoIngresoTesoreria.ANULADO]: { texto: 'Anulado', clase: 'badge-anulado' },
};

/**
 * INGR - Ingreso de tesorería sin documento físico que lo respalde (intereses
 * ganados, créditos del banco, devoluciones).
 *
 * La cuenta contable NO se elige aquí: sale del grupo del producto CXC
 * (`producto.grupoProducto.planCuenta`).
 *
 * A diferencia del egreso, se registra cuando el dinero YA entró: en el mismo
 * paso se graban el asiento (DEBE banco / HABER cuenta del grupo) y el
 * movimiento bancario de conciliación.
 */
export interface Ingreso {
  id: number;
  empresa?: Empresa | null;
  titular?: Titular | null;
  /** Producto CXC que clasifica el ingreso; su grupo da la cuenta contable. */
  producto?: ProductoCobro | null;
  descripcion?: string | null;
  valor: number;
  fecha: any;
  /** Cuenta bancaria propia que recibió el dinero. */
  cuentaBancaria?: CuentaBancaria | null;
  referencia?: string | null;
  /** Ver {@link EstadoIngresoTesoreria}. */
  estado: number;
  asiento?: Asiento | null;
  observacion?: string | null;
  usuario?: { codigo: number; nombre?: string } | null;
  fechaRegistro?: any;
}

/** Body de POST /ingr/procesar. */
export interface RegistrarIngresoRequest {
  idEmpresa: number;
  /** Opcional: de quién vino el dinero. */
  idTitular?: number;
  idProductoCobro: number;
  descripcion: string;
  valor: number;
  /** yyyy-MM-dd. Fecha en que entró el dinero; es la fecha del asiento. */
  fecha?: string;
  idCuentaBancaria: number;
  referencia?: string;
  observacion?: string;
  idUsuario: number;
}

/** Respuesta 201 de POST /ingr/procesar: ya viene contabilizado. */
export interface RegistrarIngresoResponse {
  exito: boolean;
  mensaje: string;
  /** Id del ingreso creado. */
  ingreso?: number;
  /** Número alterno del asiento contable generado. */
  asiento?: string;
}

/** Respuesta de POST /ingr/anular/{id}. */
export interface AnularIngresoResponse {
  exito: boolean;
  mensaje: string;
  ingreso?: number;
}

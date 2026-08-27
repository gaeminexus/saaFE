import { ProductoPago } from '../../cxp/model/producto_pago';
import { Titular } from './titular';

/** Rubro 232: tipo de movimiento de caja chica. */
export enum TipoMovimientoCajaChica {
  APERTURA = 1,
  GASTO = 2,
  REPOSICION = 3,
  AJUSTE_MAS = 4,
  AJUSTE_MENOS = 5,
}

/** TSR.MVCH — un movimiento (gasto, reposición, apertura o ajuste) de una caja chica. */
export interface MovimientoCajaChica {
  codigo: number;
  cajaChica: { codigo: number };
  fecha: any;
  valor: number;
  descripcion?: string | null;
  observacion?: string | null;
  /** Solo en gastos: clasifica la cuenta contable del gasto (igual que en egresos de tesorería). */
  producto?: ProductoPago | null;
  /** Beneficiario del gasto, si aplica. */
  titular?: Titular | null;
  numeroDocumento?: string | null;
  /** Ver TipoMovimientoCajaChica (rubro 232). */
  rubroTipoMovimientoP?: number;
  rubroTipoMovimientoH?: number;
  /** Activo/anulado; ver el detalle del rubro correspondiente al tipo. */
  estado?: number;
  /** Id del pago en /pgtr, cuando el movimiento es una reposición/apertura pagada por transferencia o cheque. */
  idPago?: number | null;
  usuario?: { codigo: number; nombre?: string } | null;
  fechaRegistro?: any;
}

/** Body de POST /mvch/gasto. */
export interface GastoCajaChicaRequest {
  idCaja: number;
  /** yyyy-MM-dd. */
  fecha: string;
  valor: number;
  descripcion: string;
  observacion: string;
  idProducto: number;
  idTitular?: number;
  numeroDocumento?: string;
  idUsuario: number;
}

/** Body de POST /mvch/reposicion y de POST /mvch/apertura. */
export interface ReposicionCajaChicaRequest {
  idCaja: number;
  valor: number;
  idCuentaBancariaOrigen: number;
  /** Ver FormaPagoAplicacion (2 transferencia, 3 cheque, 4 débito automático). */
  formaPago: number;
  /** Se mantiene por compatibilidad junto a `formaPago`. */
  debitoAutomatico: boolean;
  referencia?: string;
  /** yyyy-MM-dd. */
  fecha: string;
  descripcion?: string;
  idUsuario: number;
}

/** Respuesta de POST /mvch/reposicion y de POST /mvch/apertura. */
export interface ReposicionCajaChicaResponse {
  idMovimiento: number;
  idPago?: number | null;
  estadoPago?: string | number | null;
  /** Solo cuando se pagó con cheque. */
  numeroCheque?: number | string | null;
}

/** Body de POST /mvch/anular/{id}. */
export interface AnularMovimientoCajaChicaRequest {
  motivo: string;
  idUsuario: number;
}

/** Filtros de GET /mvch/listar. `desde`/`hasta` en formato yyyy-MM-dd. */
export interface MovimientoCajaChicaFiltro {
  idCaja: number;
  desde?: string | null;
  hasta?: string | null;
  /** Ver TipoMovimientoCajaChica (rubro 232). */
  tipo?: number | null;
  estado?: number | null;
}

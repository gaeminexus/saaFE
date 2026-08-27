import { MovimientoCajaChica } from './movimiento-caja-chica';

/** Rubro 233: estado de un cierre de caja chica. */
export enum EstadoCierreCajaChica {
  BORRADOR = 1,
  CERRADO = 2,
  ANULADO = 3,
}

/** TSR.CRCH — un cierre/arqueo de caja chica. */
export interface CierreCajaChica {
  codigo: number;
  cajaChica: { codigo: number };
  fecha: any;
  saldoInicial: number;
  totalGastos: number;
  totalReposiciones: number;
  /** Lo que dicen los movimientos (saldoInicial - gastos + reposiciones). */
  saldoLibros: number;
  /** Lo contado físicamente; null mientras el cierre sigue en Borrador. */
  saldoFisico?: number | null;
  /** saldoFisico - saldoLibros. */
  diferencia?: number | null;
  /** Cuenta contable del ajuste, obligatoria si diferencia !== 0. */
  planCuentaDiferencia?: { codigo: number } | null;
  /** Ver EstadoCierreCajaChica (rubro 233). */
  rubroEstadoP?: number;
  rubroEstadoH?: number;
  observacion?: string | null;
  usuario?: { codigo: number; nombre?: string } | null;
  fechaRegistro?: any;
}

/** Body de POST /crch/preparar. */
export interface PrepararCierreRequest {
  idCaja: number;
  /** yyyy-MM-dd. */
  fecha: string;
  idUsuario: number;
}

/** Respuesta de POST /crch/preparar: el borrador del cierre y los movimientos del período. */
export interface PrepararCierreResponse {
  cierre: CierreCajaChica;
  movimientos: MovimientoCajaChica[];
}

/** Body de POST /crch/confirmar/{id}. */
export interface ConfirmarCierreRequest {
  saldoFisico: number;
  observacion?: string;
  /** Obligatorio si `saldoFisico` difiere del saldo en libros. */
  idPlanCuentaDiferencia?: number;
  idUsuario: number;
}

/** Body de POST /crch/anular/{id}. */
export interface AnularCierreRequest {
  motivo: string;
  idUsuario: number;
}

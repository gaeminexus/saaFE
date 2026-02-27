/** Modelos de Request / Response para los endpoints de Reportes Contables. */

// ── Mayor Analítico ──────────────────────────────────────────────────────────

export interface ParametrosMayorAnalitico {
  /** Fecha inicial en formato YYYY-MM-DD */
  fechaInicio: string;
  /** Fecha final en formato YYYY-MM-DD */
  fechaFin: string;
  /** ID de la empresa */
  empresa: number;
  /** Cuenta contable inicial (opcional) */
  cuentaInicio?: string | null;
  /** Cuenta contable final (opcional) */
  cuentaFin?: string | null;
  /** 0=Sin centro, 1=Centro por cuenta, 2=Cuenta por centro */
  tipoDistribucion?: number;
  /** Centro de costo inicial (opcional) */
  centroInicio?: string | null;
  /** Centro de costo final (opcional) */
  centroFin?: string | null;
  /** 0=Sin acumular, 1=Acumulado */
  tipoAcumulacion?: number;
}

export interface RespuestaMayorAnalitico {
  secuencialReporte: number | null;
  totalCabeceras: number | null;
  totalDetalles: number | null;
  fechaProceso: string | null;
  mensaje: string;
  exitoso: boolean;
}

// ── Balance Contable ─────────────────────────────────────────────────────────

export interface ParametrosBalance {
  /** Fecha inicial en formato YYYY-MM-DD */
  fechaInicio: string;
  /** Fecha final en formato YYYY-MM-DD */
  fechaFin: string;
  /** ID de la empresa */
  empresa: number;
  /** ID de parametrización del reporte */
  codigoAlterno: number;
  /** 0=Periodo, 1=Acumulado */
  acumulacion?: number;
  incluyeCentrosCosto?: boolean;
  reporteDistribuido?: boolean;
  eliminarSaldosCero?: boolean;
}

export interface RespuestaBalance {
  idEjecucion: number | null;
  totalRegistros: number | null;
  fechaProceso: string | null;
  mensaje: string;
  exitoso: boolean;
}

/** Fila del balance devuelta por GET /resultado/{idEjecucion} */
export interface BalanceItem {
  codigo?: number;
  numeroCuenta?: string;
  nombreCuenta?: string;
  nivelCuenta?: number;
  codigoAlterno?: number;
  saldoAnterior?: number;
  valorDebe?: number;
  valorHaber?: number;
  saldoActual?: number;
  centroCosto?: string;
  nombreCentroCosto?: string;
  [key: string]: any;
}

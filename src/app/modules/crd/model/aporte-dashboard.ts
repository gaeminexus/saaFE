/**
 * DTOs del dashboard de aportes.
 * Corresponden a los endpoints de agregación del backend: /aprt/kpis-globales,
 * /aprt/resumen-por-tipo, /aprt/top-entidades, /aprt/top-movimientos.
 */

export interface AporteKpiDTO {
  movimientos: number;
  tiposAporte: number;
  montoMas: number;
  montoMenos: number;
  saldoNeto: number;
}

export interface AporteResumenTipoDTO {
  tipoAporteId: number;
  tipoAporteNombre: string;
  movimientos: number;
  montoMas: number;
  montoMenos: number;
  saldoNeto: number;
  magnitudNeta: number;
  porcentajeDona: number;
}

export interface AporteTopEntidadDTO {
  tipoAporteId: number;
  entidadId: number;
  entidadNombre: string;
  movimientos: number;
  montoMas: number;
  montoMenos: number;
  saldoNeto: number;
}

export interface AporteTopMovimientoDTO {
  aporteId: number;
  tipoAporteId: number;
  tipoAporteNombre: string;
  entidadId: number;
  entidadNombre: string;
  fechaTransaccion: string; // ISO 8601: "2024-01-15T10:30:00"
  valor: number;
  magnitud: number;
}

/** Parámetros de filtro opcionales para los endpoints del dashboard. */
export interface AporteDashFiltros {
  fechaDesde?: string;
  fechaHasta?: string;
  estadoAporte?: number;
  tipoAporteId?: number;
  topN?: number;
}

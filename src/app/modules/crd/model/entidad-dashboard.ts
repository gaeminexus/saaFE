export interface EntidadResumenEstadoDTO {
  estadoId: number;
  totalEntidades: number;
}

export interface EntidadResumenPrestamosDTO {
  estadoId: number;
  totalPrestamos: number;
}

export interface EntidadResumenAportesDTO {
  estadoId: number;
  totalAportes: number;
}

export interface EntidadResumenConsolidadoDTO {
  estadoId: number;
  totalEntidades: number;
  totalPrestamos: number;
  totalAportes: number;
}

export interface EntidadDashboardFiltros {
  estados?: string;
}

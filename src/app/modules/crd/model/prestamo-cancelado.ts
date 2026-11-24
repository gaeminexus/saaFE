/**
 * Reporte de préstamos cancelados (pantalla, PDF y CSV).
 * Contrato único: docs/crd/API-REPORTE-PRESTAMOS-CANCELADOS.md (§2 y §5).
 * Todas las fechas viajan como String: `yyyy-MM-dd` (y `generado` como ISO local sin zona).
 */

/** Cuerpo de POST /prcn/consultar y /prcn/pdf (§2.1). */
export interface FiltroPrestamosCancelados {
  /** yyyy-MM-dd, obligatoria, inclusiva. */
  fechaDesde: string;
  /** yyyy-MM-dd, obligatoria, inclusiva. */
  fechaHasta: string;
  idProducto?: number | null;
  idFilial?: number | null;
  /** Subconjunto de {3,4,5,13}; null o vacío = los cuatro. */
  estados?: number[] | null;
  /** Códigos de §4; null o vacío = todas. */
  formas?: string[] | null;
  /** Solo para el encabezado del PDF. */
  usuario?: string | null;
}

/** Una fila del reporte: los 56 campos de §5, en el orden del contrato. */
export interface PrestamoCanceladoFila {
  idPrestamo: number | null;
  numeroOperacion: number | null;
  cedula: string | null;
  nombreSocio: string | null;
  filial: string | null;
  producto: string | null;
  estadoCodigo: number | null;
  estado: string | null;
  fechaCancelacion: string | null;
  origenFecha: string | null;
  forma: string | null;
  formaDescripcion: string | null;
  canal: string | null;
  fechaOtorgamiento: string | null;
  fechaInicio: string | null;
  fechaFinPlazo: string | null;
  plazo: number | null;
  tasa: number | null;
  valorCuota: number | null;
  montoSolicitado: number | null;
  montoLiquido: number | null;
  cuotasPagadas: number | null;
  cuotasCanceladasAnticipadas: number | null;
  ultimaCuotaPagada: number | null;
  numeroPagos: number | null;
  fechaPrimerPago: string | null;
  fechaUltimoPago: string | null;
  totalCapitalPagado: number | null;
  totalInteresPagado: number | null;
  totalMoraPagada: number | null;
  totalInteresVencidoPagado: number | null;
  totalDesgravamenPagado: number | null;
  totalSeguroIncendioPagado: number | null;
  totalSaldoOtrosPagado: number | null;
  totalPagado: number | null;
  totalAportesUsados: number | null;
  totalAportesGarante: number | null;
  /** «SI» / «NO». */
  tieneMigracion: string | null;
  tipoOperacionFinal: string | null;
  /** yyyy-MM-dd HH:mm */
  fechaOperacionFinal: string | null;
  valorOperacionFinal: number | null;
  efectivoOperacionFinal: number | null;
  aportesOperacionFinal: number | null;
  aportesGaranteOperacionFinal: number | null;
  valorCondonado: number | null;
  usuarioOperacionFinal: string | null;
  idEvento: number | null;
  idCobro: number | null;
  idCargaArchivo: number | null;
  idAsiento: number | null;
  idPrestamoNuevo: number | null;
  numeroOperacionNuevo: number | null;
  montoPrestamoNuevo: number | null;
  valorSustitucion: number | null;
  observacionOperacionFinal: string | null;
  observacionReporte: string | null;
}

/** Totales comunes de `resumenPorForma` y `totales` (§2.3). */
export interface TotalesPrestamosCancelados {
  cantidad: number;
  montoSolicitado: number;
  totalPagado: number;
  totalCapitalPagado: number;
  totalInteresPagado: number;
  totalMoraPagada: number;
  totalCondonado: number;
}

/** Una entrada de `resumenPorForma`: una por forma con al menos una fila. */
export interface ResumenFormaCancelacion extends TotalesPrestamosCancelados {
  forma: string;
  descripcion: string;
}

/** Respuesta de POST /prcn/consultar (§2.3). */
export interface ReportePrestamosCancelados {
  fechaDesde: string;
  fechaHasta: string;
  /** ISO local sin zona. */
  generado: string;
  cantidad: number;
  canceladosSinFecha: number;
  resumenPorForma: ResumenFormaCancelacion[];
  totales: TotalesPrestamosCancelados;
  filas: PrestamoCanceladoFila[];
}

/** Estados terminales que entran al reporte (§1.2 y §5 fila 8). */
export const ESTADOS_CANCELACION: { codigo: number; nombre: string }[] = [
  { codigo: 3, nombre: 'CANCELADO' },
  { codigo: 4, nombre: 'CANCELADO ANTICIPADO' },
  { codigo: 5, nombre: 'CANCELADO POR NOVACION' },
  { codigo: 13, nombre: 'CANCELADO POR REESTRUCTURACION' },
];

/** Formas de cancelación, en el orden de §4. */
export const FORMAS_CANCELACION: { codigo: string; descripcion: string }[] = [
  { codigo: 'PAGO_ULTIMA_CUOTA', descripcion: 'Pago de la última cuota' },
  { codigo: 'ABONO_CAPITAL', descripcion: 'Abono a capital que terminó la deuda' },
  { codigo: 'PRECANCELACION', descripcion: 'Precancelación' },
  { codigo: 'PRECANCELACION_CON_PRESTAMO', descripcion: 'Precancelado con un préstamo nuevo' },
  { codigo: 'ACUERDO_CONDONACION', descripcion: 'Acuerdo con condonación' },
  { codigo: 'NOVACION', descripcion: 'Novación' },
  { codigo: 'REESTRUCTURACION', descripcion: 'Reestructuración' },
  { codigo: 'SIN_DETERMINAR', descripcion: 'Sin operación registrada' },
];

/**
 * Modelos de la pantalla de Cierre mensual de cartera (Fase 2).
 *
 * Contrato: docs/crd/API-CIERRE-CARTERA.md (espejo del repo backend saaBE).
 * Recurso REST: /rest/cierrecartera.
 *
 * Fechas (§0.1 del contrato de bandas, mismas reglas):
 *  - SALIDA del servidor: LocalDate llega como arreglo [año, mes, día] (ej. [2026, 8, 31]);
 *    LocalDateTime como [a, m, d, h, mi, s, ns].
 *  - ENTRADA al servidor: LocalDate viaja como string ISO "yyyy-MM-dd".
 */

/** Estado de la corrida (ciclo de vida) — com.saa.rubros.EstadoCorridaCierreCartera. */
export const ESTADO_CORRIDA = {
  PREPARADA: 1,
  EJECUTADA: 2,
  REVERSADA: 3,
} as const;

export const NOMBRE_ESTADO_CORRIDA: Record<number, string> = {
  1: 'PREPARADA',
  2: 'EJECUTADA',
  3: 'REVERSADA',
};

/** Tipo de cartera — com.saa.rubros.TipoCarteraBanda: 1 POR VENCER, 2 VENCIDO. */
export const TIPO_CARTERA_CIERRE: Record<number, string> = {
  1: 'POR VENCER',
  2: 'VENCIDO',
};

/** Body de previsualizar/ejecutar (`SolicitudCierreCartera`). */
export interface SolicitudCierreCartera {
  idEmpresa: number;
  /** Año del mes a CERRAR (2000..2100). */
  anio: number;
  /** Mes a CERRAR (1..12). */
  mes: number;
  usuario?: string | null;
  ip?: string | null;
  observacion?: string | null;
}

/** Una línea contable de un sub-proceso. Los campos de banda/producto pueden venir null. */
export interface LineaAsientoCierre {
  cuenta: string;
  nombreCuenta?: string | null;
  idPlanCuenta?: number | null;
  descripcion: string;
  debe: number;
  haber: number;
  idProducto?: number | null;
  nombreProducto?: string | null;
  tipoCartera?: number | null;
  numeroBanda?: number | null;
  /** Papel de la línea (com.saa.rubros.CrdLineaAsiento); solo informativo. */
  codigoLinea?: number | null;
}

/** Un sub-proceso del cierre (uno de seis). Cada uno genera un asiento propio. */
export interface SubProcesoCierre {
  /** 1..6 (com.saa.rubros.SubProcesoCierreCartera). */
  subProceso: number;
  nombre: string;
  /** Etiqueta de referencia (①, ②, ①.1, ③, ④, ⑥). */
  referencia: string;
  fecha: number[] | null;
  glosa?: string | null;
  /** Ausente/omitido en `/consultar` (las líneas viven en el asiento contable, no duplicadas). */
  lineas?: LineaAsientoCierre[];
  totalDebe: number;
  totalHaber: number;
  /** true = no hubo nada que contabilizar; se muestra como omitido, no como error. */
  omitido: boolean;
  motivoOmision?: string | null;
  /** Informados solo tras ejecutar (o null en previsualización). */
  idAsiento?: number | null;
  numeroAsiento?: string | null;
}

/** Una fila del snapshot: capital por (producto, tipo de cartera, banda). */
export interface SnapshotBandaCierre {
  idProducto: number;
  nombreProducto: string;
  tipoCartera: number;
  nombreTipoCartera: string;
  idBanda: number;
  numeroBanda: number;
  etiquetaBanda: string;
  idPlanCuenta: number;
  cuenta: string;
  nombreCuenta: string;
  capital: number;
  cantidad: number;
}

/**
 * Una desviación entre el snapshot de la corrida anterior y lo que esa banda tendría hoy.
 * **No es un error** (§1.4): es información de lo que movieron pagos/entregas en el mes.
 *
 * El contrato solo muestra `desviaciones: []` (sin corrida anterior), así que la forma poblada
 * no está fijada; se tipa de forma permisiva y la pantalla la muestra defensivamente.
 */
export interface DesviacionCierre {
  idProducto?: number | null;
  nombreProducto?: string | null;
  tipoCartera?: number | null;
  numeroBanda?: number | null;
  cuenta?: string | null;
  nombreCuenta?: string | null;
  capitalSnapshot?: number | null;
  capitalRecalculado?: number | null;
  diferencia?: number | null;
  [clave: string]: unknown;
}

/** Respuesta de previsualizar / ejecutar / consultar (`CierreCartera`). */
export interface CierreCartera {
  /** null en previsualización; informado tras ejecutar/consultar. */
  idCorrida: number | null;
  idEmpresa: number;
  anio: number;
  mes: number;
  /** Último día del mes cerrado. */
  fechaCorte: number[] | null;
  /** Primer día del mes siguiente (fecha de 5 de los 6 asientos). */
  fechaProceso: number[] | null;
  /** Último día del mes que se abre. */
  fechaCorteApertura: number[] | null;
  idEstado: number | null;
  nombreEstado: string | null;
  capitalTotal: number;
  totalDesviacion: number;
  subProcesos: SubProcesoCierre[];
  /** Puede venir vacío o ausente según el origen (previsualizar / consultar). */
  snapshot?: SnapshotBandaCierre[];
  desviaciones?: DesviacionCierre[];
  advertencias?: string[];
}

/**
 * Entidad de corrida que devuelve GET /corridas (Jackson expande la empresa).
 * `idEstado` = ciclo de vida (1/2/3); `estado` = 1 activo / 0 inactivo de la fila. No confundir.
 */
export interface CorridaCierreCartera {
  codigo: number;
  empresa: { codigo: number; nombre?: string; [clave: string]: unknown } | null;
  anio: number;
  mes: number;
  fechaCorte: number[] | null;
  fechaProceso: number[] | null;
  idEstado: number;
  observacion?: string | null;
  fechaRegistro?: number[] | null;
  usuarioRegistro?: string | null;
  ipRegistro?: string | null;
  fechaModificacion?: number[] | null;
  usuarioModificacion?: string | null;
  ipModificacion?: string | null;
  estado: number;
}

/** Query para reversar (todos opcionales en la ruta, pero conviene informar usuario y motivo). */
export interface DatosReverso {
  usuario?: string | null;
  ip?: string | null;
  motivo?: string | null;
}

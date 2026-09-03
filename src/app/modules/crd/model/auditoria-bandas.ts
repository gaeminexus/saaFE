/**
 * Modelos del contrato de auditoría de distribución en bandas
 * (`docs/crd/API-AUDITORIA-BANDAS.md`). Reflejan el contrato 1:1 — no se agregan campos que el
 * backend no declare.
 */

export type OrigenDistribucion = 'CARGA_PETRO' | 'COBRO_INDIVIDUAL' | 'EVENTO_PRESTAMO' | 'PAGO_PENSION';

export const ORIGENES_DISTRIBUCION: OrigenDistribucion[] = [
  'CARGA_PETRO',
  'COBRO_INDIVIDUAL',
  'EVENTO_PRESTAMO',
  'PAGO_PENSION',
];

export const NOMBRE_ORIGEN_DISTRIBUCION: Record<OrigenDistribucion, string> = {
  CARGA_PETRO: 'Carga Petro',
  COBRO_INDIVIDUAL: 'Cobro individual',
  EVENTO_PRESTAMO: 'Evento de préstamo',
  PAGO_PENSION: 'Pago de pensión',
};

export type ConceptoDistribucion =
  | 'CAPITAL'
  | 'INTERES_ORDINARIO'
  | 'INTERES_MORA'
  | 'INTERES_VENCIDO'
  | 'SEGURO_DESGRAVAMEN'
  | 'SEGURO_INCENDIO'
  | 'APORTE';

export const CONCEPTOS_DISTRIBUCION: ConceptoDistribucion[] = [
  'CAPITAL',
  'INTERES_ORDINARIO',
  'INTERES_MORA',
  'INTERES_VENCIDO',
  'SEGURO_DESGRAVAMEN',
  'SEGURO_INCENDIO',
  'APORTE',
];

/**
 * ⛔ El agrupador primario es el CONCEPTO, no la cuenta contable: la mora va a la misma cuenta
 * que el interés ordinario y agrupar por cuenta las fusionaría, justo el desglose que
 * contabilidad quiere revisar (§3 del plan). La cuenta es una columna más de la fila, nunca el
 * agrupador.
 */
export const NOMBRE_CONCEPTO_DISTRIBUCION: Record<ConceptoDistribucion, string> = {
  CAPITAL: 'Capital',
  INTERES_ORDINARIO: 'Interés ordinario',
  INTERES_MORA: 'Interés de mora',
  INTERES_VENCIDO: 'Interés vencido',
  SEGURO_DESGRAVAMEN: 'Seguro de desgravamen',
  SEGURO_INCENDIO: 'Seguro de incendio',
  APORTE: 'Aporte',
};

export interface AsientoResumenDistribucion {
  idAsiento: number;
  tipo: string;
  fecha: string;
  estado: string;
}

/** `GET /dsbn/cuadre` — el encabezado. Se pinta primero, antes que nada del detalle. */
export interface CuadreDistribucionBandas {
  origen: OrigenDistribucion;
  idOrigen: number;
  descripcionOrigen: string;
  recibido: number;
  distribuido: number;
  diferencia: number;
  cuadra: boolean;
  /**
   * `false` = venta separada, contabilidad desconectada. NO es un error: oculta las columnas de
   * cuenta/asiento y el resto de la pantalla se muestra igual.
   */
  contabilidadConectada: boolean;
  asientos: AsientoResumenDistribucion[];
}

/** `POST /dsbn/detalle` — cuerpo del filtro. Los arreglos son OR interno, AND entre sí. */
export interface FiltroDetalleDistribucion {
  origen: OrigenDistribucion;
  idOrigen: number;
  conceptos?: ConceptoDistribucion[];
  idsBanda?: number[];
  idsProducto?: number[];
  idsTipoPrestamo?: number[];
  idsTipoAporte?: number[];
  idsEntidad?: number[];
  cuentasContables?: string[];
  /** `yyyy-MM-dd`. */
  fechaDesde?: string | null;
  /** `yyyy-MM-dd`. */
  fechaHasta?: string | null;
  pagina: number;
  tamanio: number;
  ordenarPor?: string;
  orden?: 'asc' | 'desc';
}

export interface ResumenPorConcepto {
  concepto: ConceptoDistribucion;
  valor: number;
  filas: number;
}

/**
 * Una fila del detalle. `cuentaContable`/`nombreCuenta`/`idAsiento` vienen `null` con
 * contabilidad desconectada — dato ausente legítimo, no un fallo. `idBanda`/`banda` solo aplican
 * a `CAPITAL`; en el resto de los conceptos vienen `null` también por diseño.
 */
export interface FilaDistribucionBanda {
  id: number;
  concepto: ConceptoDistribucion;
  valor: number;
  idEntidad: number | null;
  participe: string | null;
  cedula: string | null;
  codigoAsoprep: number | null;
  idPrestamo: number | null;
  numeroCuota: number | null;
  fechaVencimiento: string | null;
  fechaAplicacion: string | null;
  idProducto: number | null;
  producto: string | null;
  idTipoPrestamo: number | null;
  idTipoAporte: number | null;
  tipoCartera: string | null;
  dias: number | null;
  idBanda: number | null;
  banda: string | null;
  cuentaContable: string | null;
  nombreCuenta: string | null;
  idAsiento: number | null;
}

export interface RespuestaDetalleDistribucion {
  totalFilas: number;
  pagina: number;
  tamanio: number;
  totalValorFiltrado: number;
  resumenPorConcepto: ResumenPorConcepto[];
  filas: FilaDistribucionBanda[];
}

/** `GET /dsbn/origenes` — alimenta el selector. Es un filtro más, no el eje de la pantalla. */
export interface OrigenListado {
  origen: OrigenDistribucion;
  idOrigen: number;
  descripcion: string;
  fecha: string;
  distribuido: number;
  cuadra: boolean;
}

export interface FiltroOrigenes {
  origen?: OrigenDistribucion;
  fechaDesde?: string;
  fechaHasta?: string;
  limite?: number;
}

/**
 * Error normalizado del servicio (ver `AuditoriaBandasService`): nunca un `null` "exitoso" —
 * distinguirlo de "sin datos" es exactamente lo que pide la nota final del contrato.
 */
export interface ErrorAuditoriaBandas {
  mensaje: string;
  status: number;
}

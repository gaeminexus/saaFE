/**
 * Cartera por pagar y por cobrar — docs/cxp/API-CARTERA-CXP-CXC.md §4 (espejo idéntico en
 * docs/cxc/). Un solo DTO para los dos lados: los campos que solo aplican a uno van `null` en el
 * otro (`cajaChica` en CxC, `intermediario` en CxC).
 */
export type TipoCartera = 'POR_PAGAR' | 'POR_COBRAR';

/** §3.4.4: `POR_VENCER` si `diasVencido <= 0`. */
export type TramoCartera = 'POR_VENCER' | 'D1_30' | 'D31_60' | 'D61_90' | 'MAS_90';

/**
 * Una fila de `documentos` — §4. ⚠️ FCTC y LQCC tienen ids INDEPENDIENTES: la clave de un
 * documento es `tipoDocumento` + `idDocumento`, nunca el id solo (ni en un trackBy ni en un Set).
 */
export interface DocumentoCartera {
  /** 'FACTURA' | 'NOTA_VENTA' (FCTC con tipoComprobante='02') | 'LIQUIDACION'. */
  tipoDocumento: string;
  idDocumento: number;
  /** establecimiento-puntoEmision-secuencial. */
  numeroDocumento: string;
  /** LocalDate del backend: llega como arreglo [y,m,d] — normalizar con convertirFechaDesdeBackend(). */
  fechaEmision: any;
  /** null = sin plazo (§3.4.1). */
  plazoDias: number | null;
  /** LocalDate del backend, arreglo [y,m,d]. */
  fechaVencimiento: any;
  /** Negativo = faltan días para vencer. */
  diasVencido: number;
  tramo: TramoCartera;
  idTitular: number;
  identificacion: string;
  /** razonSocial del titular; si está vacía, nombre. */
  titular: string;
  total: number;
  pagado: number;
  notasCredito: number;
  retenciones: number;
  anticipos: number;
  notasDebito: number;
  /** null en CxC (el tipo 6, caja chica, no existe en CxC). */
  cajaChica: number | null;
  aplicado: number;
  saldo: number;
  /** `saldo < 0` — no se esconde, es un dato a corregir. */
  sobrepagado: boolean;
  /** Solo CxP (FCTCESIN = 1); null en CxC. */
  intermediario: boolean | null;
}

/** Una fila de `resumen`, una por titular — §4. */
export interface ResumenTitularCartera {
  idTitular: number;
  identificacion: string;
  titular: string;
  /** Cantidad de documentos de ese titular. */
  documentos: number;
  total: number;
  aplicado: number;
  saldo: number;
  porVencer: number;
  d1a30: number;
  d31a60: number;
  d61a90: number;
  mas90: number;
  /** P4 del contrato; 0 si no tiene. Es a HOY, no a la fecha de corte (§6.2). */
  anticiposDisponibles: number;
  /** `saldo − anticiposDisponibles`. */
  saldoNeto: number;
}

/** Totales del reporte completo — mismos campos que `ResumenTitularCartera` más `titulares`. */
export interface TotalesCartera {
  titulares: number;
  documentos: number;
  total: number;
  aplicado: number;
  saldo: number;
  porVencer: number;
  d1a30: number;
  d31a60: number;
  d61a90: number;
  mas90: number;
  anticiposDisponibles: number;
  saldoNeto: number;
}

/** Respuesta de GET /aplp/cartera y GET /aplc/cartera — §4. */
export interface ReporteCartera {
  tipo: TipoCartera;
  /** LocalDate del backend, arreglo [y,m,d]. */
  fechaCorte: any;
  totales: TotalesCartera;
  /** Ordenado por saldo DESC. */
  resumen: ResumenTitularCartera[];
  /** Ordenado por titular y luego por fechaEmision. */
  documentos: DocumentoCartera[];
  avisos: string[];
}

/** Query params de GET /aplp/cartera y GET /aplc/cartera. `fechaCorte` omitida = hoy; `idTitular` omitido = todos. */
export interface ParametrosCartera {
  idEmpresa: number;
  /** yyyy-MM-dd. */
  fechaCorte?: string;
  idTitular?: number;
}

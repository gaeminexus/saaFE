/**
 * Pólizas de seguro de préstamos — desgravamen, incendio, prendario (`CRD.POSG`/`PSPR`/`PSCT`).
 * Contrato congelado para la fase 1: docs/crd/API-POLIZAS-SEGURO.md.
 *
 * Las fechas de estas interfaces ya vienen convertidas a `Date` (o `null`) — el backend las manda
 * como arreglo `[2026,10,1]`, y `PolizaSeguroService` las normaliza con
 * `FuncionesDatosService.convertirFechaDesdeBackend()` antes de entregar el objeto.
 */

/** §1. */
export enum TipoSeguro {
  DESGRAVAMEN = 1,
  INCENDIO = 2,
  PRENDARIO = 3,
}

export const TEXTO_TIPO_SEGURO: Record<TipoSeguro, string> = {
  [TipoSeguro.DESGRAVAMEN]: 'Desgravamen',
  [TipoSeguro.INCENDIO]: 'Incendio',
  [TipoSeguro.PRENDARIO]: 'Prendario',
};

/** §1. */
export enum ClaseDocumentoSeguro {
  FACTURA = 1,
  NOTA_DEBITO = 2,
  NOTA_CREDITO = 3,
}

export const TEXTO_CLASE_DOCUMENTO_SEGURO: Record<ClaseDocumentoSeguro, string> = {
  [ClaseDocumentoSeguro.FACTURA]: 'Factura',
  [ClaseDocumentoSeguro.NOTA_DEBITO]: 'Nota de débito',
  [ClaseDocumentoSeguro.NOTA_CREDITO]: 'Nota de crédito',
};

/** §1, ciclo de vida del documento (§5.1 del diseño). */
export enum EstadoDocumentoSeguro {
  LISTADO_ENVIADO = 1,
  DOCUMENTO_REGISTRADO = 2,
  DISTRIBUIDO = 3,
  LIBERADO_A_PAGO = 4,
  ANULADO = 5,
}

export const TEXTO_ESTADO_DOCUMENTO_SEGURO: Record<EstadoDocumentoSeguro, string> = {
  [EstadoDocumentoSeguro.LISTADO_ENVIADO]: 'Listado enviado',
  [EstadoDocumentoSeguro.DOCUMENTO_REGISTRADO]: 'Documento registrado',
  [EstadoDocumentoSeguro.DISTRIBUIDO]: 'Distribuido',
  [EstadoDocumentoSeguro.LIBERADO_A_PAGO]: 'Liberado a pago',
  [EstadoDocumentoSeguro.ANULADO]: 'Anulado',
};

/** §1 — el rol de un préstamo dentro de un documento (`PSPR.novedad`). */
export enum NovedadPrestamoSeguro {
  ORIGINAL = 1,
  INCLUSION = 2,
  EXCLUSION = 3,
}

export const TEXTO_NOVEDAD_PRESTAMO_SEGURO: Record<NovedadPrestamoSeguro, string> = {
  [NovedadPrestamoSeguro.ORIGINAL]: 'Original',
  [NovedadPrestamoSeguro.INCLUSION]: 'Inclusión',
  [NovedadPrestamoSeguro.EXCLUSION]: 'Exclusión',
};

// ===================== §2. Suma asegurada =====================

/** Cuerpo de `PUT /posg/sumaAsegurada`. */
export interface SolicitudSumaAsegurada {
  idPrestamo: number;
  valor: number;
  usuario: string;
}

/**
 * `POST /posg/sumaAsegurada/carga` es MULTIPART (corregido 2026-10-02: el backend lee el Excel con
 * Apache POI, el frontend solo sube el archivo crudo — no hay librería de Excel en el cliente). El
 * `FormData` lleva `archivo`, `confirmar` (`"true"`/`"false"`) y `usuario`; no existe un cuerpo JSON
 * para este endpoint, así que no hay interfaz de solicitud — solo la de respuesta.
 */
export type ResultadoFilaCarga = 'OK' | 'NO_EXISTE' | 'NO_ES_HIPOTECARIO_NI_PRENDARIO' | 'VALOR_INVALIDO' | 'DUPLICADO_EN_ARCHIVO';

/** Una fila del resultado de la carga, OK o no. `fila` es el número de fila del Excel (1-based, con encabezado). */
export interface ResultadoFilaCargaSumaAsegurada {
  fila: number;
  idAsoprep: number;
  idPrestamo: number | null;
  valorAnterior: number | null;
  valor: number;
  resultado: ResultadoFilaCarga;
}

/** 200 de `/sumaAsegurada/carga`, tanto en modo preview (`confirmar:false`) como al grabar. */
export interface ResultadoCargaSumaAsegurada {
  total: number;
  ok: number;
  conError: number;
  filas: ResultadoFilaCargaSumaAsegurada[];
}

// ===================== §3. Listado =====================

/** Un préstamo elegible para el listado, con su base ya calculada (§3) — también la forma de «elegible + base» de las inclusiones (§7). */
export interface CandidatoListadoSeguro {
  idPrestamo: number;
  /** `idAsoprep ?? codigo`, ya como texto. */
  numeroPrestamo: string;
  nombreParticipe: string;
  cedula: string;
  tipoPrestamo: string;
  estadoPrestamo: number;
  base: number;
  /** Solo relevante en incendio/prendario: `true` si `PRSTVLAS` no está cargado — no se puede generar el listado mientras alguno lo tenga. */
  sinSumaAsegurada: boolean;
}

/** Cuerpo de `POST /posg/listado`. */
export interface SolicitudGenerarListadoSeguro {
  tipoSeguro: TipoSeguro;
  fechaCorte: string; // yyyy-MM-dd
  usuario: string;
  observacion?: string | null;
}

// ===================== §4. Registrar documento =====================

/** Cuerpo de `PUT /posg/{id}/documento`. */
export interface SolicitudRegistrarDocumentoSeguro {
  aseguradora: string;
  ruc: string;
  numeroPoliza: string;
  numeroDocumento: string;
  claveAcceso: string;
  fechaEmision: string; // yyyy-MM-dd
  fechaInicio: string; // yyyy-MM-dd
  fechaFin: string; // yyyy-MM-dd
  tasa: number;
  valorTotal: number;
  usuario: string;
}

// ===================== §5. Distribución =====================

export interface CuotaDistribucionSeguro {
  idCuota: number;
  numeroCuota: number;
  fechaVencimiento: Date | null;
  saldoInicialCapital: number;
  seguroAnterior: number;
  seguroNuevo: number;
}

export interface PrestamoDistribucionSeguro {
  idPrestamo: number;
  numeroPrestamo: string;
  base: number;
  mesesCubiertos: number;
  peso: number;
  valorAsignado: number;
  cuotas: CuotaDistribucionSeguro[];
}

export interface PrestamoSinCuotasVigenciaSeguro {
  idPrestamo: number;
  numeroPrestamo: string;
}

/** 200 de `GET /posg/{id}/distribucion/preview` — no graba nada. */
export interface DistribucionPreviewSeguro {
  valorTotal: number;
  sumaPrestamos: number;
  sumaCuotas: number;
  cuadra: boolean;
  prestamosSinCuotasEnVigencia: PrestamoSinCuotasVigenciaSeguro[];
  prestamos: PrestamoDistribucionSeguro[];
}

/** Cuerpo de `POST /posg/{id}/distribuir`. El backend recalcula: no se manda ningún monto. */
export interface SolicitudDistribuirSeguro {
  usuario: string;
}

// ===================== §6. Anular =====================

/** Cuerpo de `POST /posg/{id}/anular`. `motivo` obligatorio. */
export interface SolicitudAnularDocumentoSeguro {
  usuario: string;
  motivo: string;
}

// ===================== §7. Novedades =====================

export type MotivoExclusionNovedadSeguro = 'PRECANCELACION' | 'ABONO_CAPITAL' | 'PLAZO_VENCIDO';

/** Un préstamo excluido del reporte de novedades, con el motivo y la fecha del evento que lo sacó. */
export interface ExclusionNovedadSeguro extends CandidatoListadoSeguro {
  motivo: MotivoExclusionNovedadSeguro;
  fecha: Date | null;
}

/** 200 de `GET /posg/{idFactura}/novedades?desde=&hasta=`. */
export interface NovedadesSeguro {
  inclusiones: CandidatoListadoSeguro[];
  exclusiones: ExclusionNovedadSeguro[];
}

/** Cuerpo de `POST /posg/{idFactura}/nota` — registra una ND (`clase:2`) o NC (`clase:3`). */
export interface SolicitudRegistrarNotaSeguro {
  clase: ClaseDocumentoSeguro.NOTA_DEBITO | ClaseDocumentoSeguro.NOTA_CREDITO;
  prestamos: number[];
  usuario: string;
  aseguradora: string;
  ruc: string;
  numeroPoliza: string;
  numeroDocumento: string;
  claveAcceso: string;
  fechaEmision: string; // yyyy-MM-dd
  valorTotal: number;
}

// ===================== §8. Consultas =====================

/**
 * Resumen de una ND/NC asociada a una factura, dentro de `DocumentoSeguro.notas`. El contrato no
 * detalla la forma exacta (`notas: [...]`) — se modela con los campos que ya tiene cualquier
 * `DocumentoSeguro` y que la pantalla necesita para listarlas; verificar contra el backend real al
 * integrar.
 */
export interface NotaDocumentoSeguro {
  id: number;
  clase: ClaseDocumentoSeguro;
  numeroDocumento: string;
  estado: EstadoDocumentoSeguro;
  valorTotal: number;
}

/** `GET /posg/listar` y `GET /posg/{id}` (§8). Siempre un DTO, nunca la entidad `POSG` cruda. */
export interface DocumentoSeguro {
  id: number;
  tipoSeguro: TipoSeguro;
  clase: ClaseDocumentoSeguro;
  idPadre: number | null;
  estado: EstadoDocumentoSeguro;
  fechaCorte: Date | null;
  aseguradora: string | null;
  ruc: string | null;
  numeroPoliza: string | null;
  numeroDocumento: string | null;
  claveAcceso: string | null;
  fechaEmision: Date | null;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  tasa: number | null;
  valorTotal: number | null;
  idDocumentoCxp: number | null;
  cantidadPrestamos: number;
  sumaBase: number;
  sumaDistribuida: number;
  notas: NotaDocumentoSeguro[];
  /** Forma no especificada por el contrato («auditoria» a secas) — se deja genérica a propósito. */
  auditoria: Record<string, unknown> | null;
}

/** Filtros opcionales de `GET /posg/listar`. */
export interface FiltrosListarDocumentosSeguro {
  tipoSeguro?: TipoSeguro;
  estado?: EstadoDocumentoSeguro;
  clase?: ClaseDocumentoSeguro;
}

/**
 * `GET /posg/{id}/prestamos`. El contrato solo promete «número de préstamo, partícipe y cédula»;
 * los campos de `PSPR` (base/mesesCubiertos/peso/valorAsignado/novedad, diseño §5.2) se agregan
 * como opcionales porque son los únicos otros datos que tiene esa tabla y la pantalla de detalle
 * los necesita — verificar contra el backend real al integrar, pueden no venir en la fase 1.
 */
export interface PrestamoDocumentoSeguro {
  idPrestamo: number;
  numeroPrestamo: string;
  nombreParticipe: string;
  cedula: string;
  base?: number;
  mesesCubiertos?: number;
  peso?: number;
  valorAsignado?: number;
  novedad?: NovedadPrestamoSeguro;
}

// ===================== §9. Liberar a pago (fase 1: siempre 409) =====================

/**
 * Cuerpo de `POST /posg/{id}/liberar`. El contrato no da la forma exacta porque en la fase 1 el
 * endpoint solo responde 409 `INTEGRACION_CXP_PENDIENTE` — se asume el mismo patrón `{usuario}` de
 * las demás acciones; se ajusta cuando `omen-saa-2` publique su contrato.
 */
export interface SolicitudLiberarAPagoSeguro {
  usuario: string;
}

// ===================== Exportaciones a Excel (armadas por el backend) =====================

/** Un `.xlsx` descargado: el blob y el nombre sacado de `Content-Disposition`. Mismo patrón que plazo vencido. */
export interface ArchivoExcelSeguro {
  blob: Blob;
  nombreArchivo: string;
}

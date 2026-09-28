/**
 * ATS (Anexo Transaccional Simplificado) — `com.saa.ejb.sri.AtsRest` en saaBE. Contrato
 * confirmado contra docs/logica-negocio/sri/LEVANTAMIENTO-ATS-103-104.md §10.2 en saaBE y contra
 * `ResultadoGeneracionAts.java` directamente (el doc no traía el DTO completo).
 *
 * El ZIP NUNCA se validó contra el validador oficial del SRI (§10.1 en saaBE) — mostrar siempre
 * un aviso de revisarlo ahí antes de presentar, además de `avisos`.
 */
export interface GenerarAtsRequest {
  idFacturador: number;
  anio: number;
  mes: number;
}

/**
 * `avisos` no es opcional de leer: son los campos que el generador no pudo resolver (catálogos
 * del SRI sin verificar, datos faltantes en el titular/documento) — revisar siempre antes de
 * enviar el ZIP.
 */
export interface ResultadoGeneracionAts {
  nombreArchivo: string;
  /** Contenido del ZIP en base64 — no llega como octet-stream, hay que decodificarlo para descargar. */
  contenidoBase64: string;
  tamanoBytes: number;
  totalCompras: number;
  totalVentas: number;
  totalAnulados: number;
  totalVentasDeclarado: number;
  avisos: string[];
}

/**
 * Detalle del ATS en pantalla (`POST /rest/ats/detalle`), docs/cxc/API-DETALLE-ATS.md §4. Muestra
 * exactamente lo que arma `generarAts` (el mismo recorrido, descartando el XML) — no es un segundo
 * cálculo del período: por eso comparte los mismos avisos y las mismas cifras que `/ats/generar`.
 *
 * ⚠️ Todo monto ya viene pasado por `formatDecimal` en el backend (`Math.abs` + redondeo a 2
 * decimales) — es el valor DECLARADO, no el signo crudo de la tabla (§3.4/§6.2 del contrato).
 */
export interface DetalleAts {
  /** El que tendría el XML si se generara ahora — para que el usuario sepa contra cuál compara. */
  nombreArchivo: string;
  anio: number;
  mes: number;
  /** En el MISMO orden en que van al XML. */
  compras: CompraAts[];
  ventas: VentaAts[];
  anulados: AnuladoAts[];
  /** Facturas de intermediario (FCTCESIN = 1): no van al ATS. */
  excluidas: CompraExcluidaAts[];
  retencionesNoEnlazadas: RetencionNoEnlazadaAts[];
  /** Suma de las líneas de `compras`, ya redondeadas — el total del período completo, no de una página. */
  totalesCompras: TotalesComprasAts;
  totalesVentas: TotalesVentasAts;
  /** El `<totalVentas>` de la cabecera del XML. */
  totalVentasDeclarado: number;
  /** Los mismos avisos, en el mismo orden, que devolvería `/ats/generar`. */
  avisos: string[];
}

/** `detalleAir` de una retención — porcentajes del Anexo de Retenciones en la Fuente por Impuesto a la Renta. */
export interface AirAts {
  codRetAir: string;
  baseImpAir: number;
  porcentajeAir: number;
  valRetAir: number;
}

/**
 * Una línea de `<detalleCompras>`. Los seis `valRet*` son la retención de IVA por porcentaje
 * (confirmados contra `RetencionInfo`/`GeneradorAtsServiceImpl.java` en saaBE, el contrato los
 * dejaba truncados con "…"): `valRetBien10` (10%), `valRetServ20` (20%), `valorRetBienes` (30%),
 * `valRetServ50` (50%), `valorRetServicios` (70%), `valRetServ100` (100%).
 *
 * Fechas (`fechaEmision`, `fechaRegistro`, `fechaRetencion`) llegan como arreglo `[y,m,d,...]` de
 * `LocalDate` — normalizar siempre con `FuncionesDatosService.convertirFechaDesdeBackend()`.
 */
export interface CompraAts {
  origen: string;
  idDocumento: number;
  tipoComprobante: string;
  codSustento: string;
  tpIdProv: string;
  idProv: string;
  proveedor: string;
  numeroDocumento: string;
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  autorizacion: string;
  fechaEmision: any;
  /** `c.fechaRegistro`, y si es null, `c.fechaEmision` (lo mismo que escribe el XML). */
  fechaRegistro: any;
  /** false si `fechaRegistro` no estaba capturada y se usó `fechaEmision` como respaldo. */
  fechaRegistroCapturada: boolean;
  baseNoGraIva: number;
  /** Base 0%. */
  baseImponible: number;
  /** Base gravada — incluye 15%, 5% y 8% juntas. El ATS no tiene columna separada para 5%/8%. */
  baseImpGrav: number;
  baseImpExe: number;
  montoIce: number;
  montoIva: number;
  /** Suma de baseNoGraIva + baseImponible + baseImpGrav + baseImpExe + montoIce + montoIva, ya redondeada. */
  total: number;
  valRetBien10: number;
  valRetServ20: number;
  valorRetBienes: number;
  valRetServ50: number;
  valorRetServicios: number;
  valRetServ100: number;
  /** Suma de los seis `valRet*` anteriores. */
  retencionIva: number;
  air: AirAts[];
  /** Suma de `air[].valRetAir`. */
  retencionRenta: number;
  numeroRetencion: string | null;
  autorizacionRetencion: string | null;
  fechaRetencion: any;
  formasPago: string[];
  /** `total > 500` y `formasPago` no vacía: solo entonces esas formas de pago van al XML. */
  formasPagoDeclaradas: boolean;
}

/** Una línea de `<detalleVentas>` — agrupada por cliente y tipo de comprobante, NO por documento. */
export interface VentaAts {
  tpIdCliente: string;
  idCliente: string;
  cliente: string;
  tipoComprobante: string;
  numeroComprobantes: number;
  idsDocumento: number[];
  /** Siempre 0: el XML escribe "0.00" fijo para ventas. */
  baseNoGraIva: number;
  baseImponible: number;
  baseImpGrav: number;
  montoIva: number;
  montoIce: number;
  valorRetIva: number;
  valorRetRenta: number;
}

export interface AnuladoAts {
  tipoComprobante: string;
  establecimiento: string;
  puntoEmision: string;
  secuencial: string;
  autorizacion: string;
}

/** Una factura de intermediario (`FCTCESIN = 1`) — no va al ATS. */
export interface CompraExcluidaAts {
  idDocumento: number;
  tipoComprobante: string;
  idProv: string;
  proveedor: string;
  numeroDocumento: string;
  fechaEmision: any;
  subtotal: number;
  montoIva: number;
  total: number;
  motivo: string;
  /** Presente si la factura tiene una retención enlazada (caso del aviso del ÍTEM 13b). */
  numeroRetencion: string | null;
}

/** Retención de compra que no quedó enlazada a ninguna línea de compra tras `generarXml`. */
export interface RetencionNoEnlazadaAts {
  numeroRetencion: string;
  documentoSustento: string;
  autorizacion: string;
}

export interface TotalesComprasAts {
  cantidad: number;
  baseNoGraIva: number;
  baseImponible: number;
  baseImpGrav: number;
  baseImpExe: number;
  montoIce: number;
  montoIva: number;
  total: number;
  retencionIva: number;
  retencionRenta: number;
}

export interface TotalesVentasAts {
  cantidadLineas: number;
  numeroComprobantes: number;
  baseImponible: number;
  baseImpGrav: number;
  montoIva: number;
  montoIce: number;
  valorRetIva: number;
  valorRetRenta: number;
}

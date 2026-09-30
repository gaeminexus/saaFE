/**
 * Declaración de plazo vencido (`CRD.PLVN`/`CRD.DPLV`). Contrato congelado:
 * docs/crd/API-PASE-A-PLAZO-VENCIDO.md.
 *
 * Las fechas de estas interfaces ya vienen convertidas a `Date` (o `null`) — el backend las manda
 * como arreglo `[2026,6,8]`, y `PlazoVencidoService` las normaliza con
 * `FuncionesDatosService.convertirFechaDesdeBackend()` antes de entregar el objeto.
 */

/** Devengado / cobrado / saldo de un concepto del cuadro, a la fecha de corte (§2, §3). */
export interface RangoConceptoPlazoVencido {
  devengado: number;
  cobrado: number;
  saldo: number;
}

/**
 * Cuadro de un préstamo calculado a una fecha de corte: la vista previa de `/candidatos` (§3) y la
 * `cuadro` que trae la declaración completa (§9). El backend recalcula siempre — nada de esto se
 * reenvía en `/declarar`.
 */
export interface CuadroPlazoVencido {
  idPrestamo: number;
  /** `Prestamo.idAsoprep` y, si es nulo, `Prestamo.codigo`, ya como texto (§3). */
  numeroPrestamo: string;
  tipoCredito: string;
  nombreParticipe: string;
  cedula: string;
  fechaInicio: Date | null;
  fechaFin: Date | null;
  fechaUltimoCobro: Date | null;
  fechaInicioMora: Date | null;
  dividendoMensual: number;
  montoPrestamo: number;
  capital: RangoConceptoPlazoVencido;
  interes: RangoConceptoPlazoVencido;
  desgravamen: RangoConceptoPlazoVencido;
  seguroIncendio: RangoConceptoPlazoVencido;
  mora: RangoConceptoPlazoVencido;
  totalCobrado: number;
  totalPorCobrar: number;
  cuotasPlazo: number;
  cuotasCobradas: number;
  cuotasPendientes: number;
  cuotasPorVencer: number;
  /** Cuántas cuotas futuras tienen desgravamen o incendio > 0: lo que `/declarar` va a poner en cero. */
  cuotasConSeguroAAnular: number;
  /** `false` = alguna de las 5 invariantes del §2.3 no cuadra. La fila se muestra pero no se puede seleccionar. */
  valido: boolean;
  /** Texto de cada invariante que falló, solo cuando `valido = false`. */
  inconsistencias: string[];
}

/** Último PARA/CC usado, para precargar el paso 1 (§4). Los 4 campos vienen `null` si nunca se declaró nada. */
export interface UltimoEncabezadoPlazoVencido {
  paraNombre: string | null;
  paraCargo: string | null;
  ccNombre: string | null;
  ccCargo: string | null;
}

/** Un préstamo del lote a declarar (§5). */
export interface PrestamoADeclararPlazoVencido {
  idPrestamo: number;
  numeroMemorando: string;
}

/** Cuerpo de `POST /plvn/declarar` (§5). El backend recalcula: no se manda ningún monto. */
export interface SolicitudDeclararPlazoVencido {
  fechaCorte: string; // yyyy-MM-dd
  usuario: string;
  paraNombre: string;
  paraCargo: string;
  ccNombre: string;
  ccCargo: string;
  prestamos: PrestamoADeclararPlazoVencido[];
}

/** Una fila de la respuesta 201 de `/declarar` (§5). */
export interface ResultadoDeclaracionPlazoVencido {
  idDeclaracion: number;
  idPrestamo: number;
  numeroMemorando: string;
  totalPorCobrar: number;
  cuotasSinSeguro: number;
}

/** Cuerpo de `POST /plvn/{id}/liquidar` (§6). */
export interface SolicitudLiquidarPlazoVencido {
  fechaCorte: string; // yyyy-MM-dd
  usuario: string;
}

/** La `liquidacion` de una declaración (§9) — `null` mientras sigue en estado 1 DECLARADA. */
export interface LiquidacionPlazoVencido {
  fechaCorte: Date | null;
  saldoCapital: number;
  interesVencido: number;
  desgravamen: number;
  seguroIncendio: number;
  mora: number;
  total: number;
  cuotasImpagas: number;
  usuario: string;
  fecha: Date | null;
}

/** `CRD.PLVN.PLVNESTD` (§9, §11). */
export enum EstadoPlazoVencido {
  DECLARADA = 1,
  LIQUIDADA = 2,
  REVERTIDA = 3,
}

/** Texto para mostrar en pantalla; nunca el número crudo (§11). */
export const TEXTO_ESTADO_PLAZO_VENCIDO: Record<EstadoPlazoVencido, string> = {
  [EstadoPlazoVencido.DECLARADA]: 'DECLARADA',
  [EstadoPlazoVencido.LIQUIDADA]: 'LIQUIDADA',
  [EstadoPlazoVencido.REVERTIDA]: 'REVERTIDA',
};

/** La declaración completa: `/listar` y `/getId/{id}` (§9). */
export interface DeclaracionPlazoVencido {
  idDeclaracion: number;
  idPrestamo: number;
  numeroPrestamo: string;
  estado: EstadoPlazoVencido;
  numeroMemorando: string;
  fechaCorte: Date | null;
  paraNombre: string;
  paraCargo: string;
  ccNombre: string;
  ccCargo: string;
  nombreParticipe: string;
  cedula: string;
  tipoCredito: string;
  cuadro: CuadroPlazoVencido;
  liquidacion: LiquidacionPlazoVencido | null;
  usuarioDeclaracion: string;
  fechaDeclaracion: Date | null;
  usuarioReverso: string | null;
  fechaReverso: Date | null;
  motivoReverso: string | null;
}

/** Filtros opcionales de `GET /plvn/listar` (§9). */
export interface FiltrosListarPlazoVencido {
  estado?: EstadoPlazoVencido;
  desde?: string; // yyyy-MM-dd
  hasta?: string; // yyyy-MM-dd
}

/** Cuerpo de `POST /plvn/{id}/revertir` (§7). */
export interface SolicitudRevertirPlazoVencido {
  usuario: string;
  motivo: string;
}

/** Respuesta 200 de `/revertir` (§7). */
export interface ResultadoReversoPlazoVencido {
  idDeclaracion: number;
  idPrestamo: number;
  cuotasRestituidas: number;
  cuotasNoRestituidas: number;
}

/** `PDF` por defecto en el backend; el frontend siempre lo manda explícito. */
export type FormatoDocumentoPlazoVencido = 'PDF' | 'DOCX';

/** Documento descargado (§8, §8bis): el blob y el nombre sacado de `Content-Disposition`. */
export interface DocumentoPlazoVencido {
  blob: Blob;
  nombreArchivo: string;
}

/** Cuerpo de `POST /plvn/documentos` (§8bis) — descarga masiva, un solo ZIP armado por el backend. */
export interface SolicitudDocumentosMasivosPlazoVencido {
  ids: number[];
  formato: FormatoDocumentoPlazoVencido;
}

/** Máximo de `ids` por pedido de `/plvn/documentos` (§8bis) — el mismo límite que valida el backend. */
export const MAXIMO_IDS_DOCUMENTOS_MASIVOS_PLAZO_VENCIDO = 200;

/**
 * Reporte de apoyo al cuadre de los formularios 104 (IVA) y 103 (retenciones) —
 * `com.saa.ejb.sri.CuadreSriRest` / `ReporteCuadreSriServiceImpl` en saaBE. NO genera los
 * formularios: da los totales que el sistema puede calcular, para contrastar contra lo que el
 * SRI prellena en el portal. Contrato tomado directo de `ReporteCuadreSriServiceImpl.java` (el
 * endpoint responde un `Map<String,Object>` crudo, sin DTO — no hay un JSON de ejemplo publicado
 * en el plan).
 */

/**
 * Una fila de `casillas` del 104. La forma varía según cómo la arma el backend: las casillas
 * "compuestas" (401/411/421, 425/435/445, 409/419/429) traen `bruto`/`neto`/`impuesto`; el resto
 * (403-406, 500/501, 502/512/522, 507, 601 o 602) trae `valor` simple. Nunca vienen los dos
 * grupos de campos a la vez en una misma fila.
 */
export interface CasillaCuadre104 {
  casilla: string;
  concepto: string;
  bruto?: number;
  neto?: number;
  impuesto?: number;
  valor?: number;
}

/** Casilla que el sistema no puede calcular hoy — `motivo` explica por qué, nunca viene en 0. */
export interface NoDisponibleCuadre104 {
  casilla: string;
  motivo: string;
}

export interface Cuadre104Response {
  idFacturador: number;
  /** "yyyy-MM". */
  periodo: string;
  casillas: CasillaCuadre104[];
  noDisponibles: NoDisponibleCuadre104[];
  avisos: string[];
}

/**
 * Una fila de `porCodigo` del 103, agrupada por `codRetencion` tal como está en RTV2/DRV2 —
 * sin traducir a número de casilla salvo coincidencia literal. `casillaSugerida` viene `null`
 * a propósito para códigos con sufijo (303A, 304B, etc.) — no inventar la casilla.
 */
export interface PorCodigoCuadre103 {
  codRetencion: string;
  casillaSugerida: string | null;
  baseImponible: number;
  valorRetenido: number;
}

export interface Cuadre103Response {
  idFacturador: number;
  /** "yyyy-MM". */
  periodo: string;
  porCodigo: PorCodigoCuadre103[];
  avisos: string[];
}

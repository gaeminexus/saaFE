/**
 * Fila de GET /fctc/sustentoPendiente. Contra la forma proyectada que el
 * backend va a dejar (hoy todavía devuelve la entidad FacturaCompra completa,
 * 536 KB, ver aviso en la tarea) — construido a propósito contra la forma
 * final, no contra la actual.
 */
export interface FacturaSustentoPendiente {
  id: number;
  numero: string;
  fecha: unknown;
  proveedor: string;
  identificacion: string;
  total: number;
  iva: number;
  /** Código de la Tabla 5 sugerido por el sistema (IVA>0 → 01, si no → 02), o null. */
  sustentoSugerido: string | null;
}

/** GET /fctc/sustento/{id}. */
export interface SustentoFactura {
  idFactura: number;
  sustentoTributario: string | null;
  resuelto: boolean;
}

/** GET /fctc/sustentoCatalogo: código de la Tabla 5 → descripción vigente en PGS.TSRI. */
export type CatalogoSustento = Record<string, string>;

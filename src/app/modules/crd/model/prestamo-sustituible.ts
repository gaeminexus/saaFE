/** Tipo de operación del alta de un préstamo (docs/crd/API-REESTRUCTURACION-NOVACION.md §1). */
export type TipoOperacionPrestamo = 'NUEVO' | 'REESTRUCTURACION' | 'NOVACION';

/** Un elemento de `GET /prst/sustituibles/{idEntidad}?tipo=` (§2). */
export interface PrestamoSustituible {
  idPrestamo: number;
  idAsoprep: number | null;
  producto: string;
  familia: string;
  estado: number;
  /** `false` → no se puede usar; `motivo` dice por qué. */
  puede: boolean;
  motivo: string | null;
  valorSustitucion: number;
  desglose: { capital: number; interes: number; mora: number; seguros: number };
  productoSugerido: { idProducto: number; nombre: string } | null;
}

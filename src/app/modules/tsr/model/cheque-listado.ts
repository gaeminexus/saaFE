/** Tipo de documento que originó el pago con el que se giró el cheque. */
export type TipoPagoCheque = 'FACTURA' | 'EGRESO' | 'ANTICIPO' | 'EXTERNO';

/**
 * Fila de GET /dtch/listar. DTO propio del listado — no es la entidad Cheque
 * completa (ver `Cheque` en cheque.ts, usada por el CRUD legado).
 * `estado` es el código numérico del rubro 26 (etiqueta vía
 * `DetalleRubroService.getDescripcionByParentAndAlterno(26, estado)`).
 * `referenciaPago` trae el número de factura, la descripción del egreso o
 * el número del anticipo según `tipoPago`.
 */
export interface ChequeListado {
  idCheque: number;
  numero: number;
  estado: number;
  valor: number;
  beneficiario: string;
  fechaUso: any;
  fechaImpresion: any;
  fechaEntrega: any;
  numeroCuenta: string;
  banco: string;
  idPago: number | null;
  tipoPago: TipoPagoCheque | null;
  referenciaPago: string | null;
  /**
   * Id del documento origen (factura de compra, egreso o anticipo) según
   * `tipoPago` — distinto de `idPago`, que es el id del pago en /pgtr/egrs/antp.
   * Es lo que hay que usar para navegar a "Ver pago". Null cuando
   * `tipoPago = 'EXTERNO'` (no tiene pantalla propia en este frontend) o
   * cuando el pago no referencia ningún documento.
   */
  idDocumento: number | null;
  /** Etiqueta del proceso externo que originó el pago (ver `tipoPago = 'EXTERNO'`). */
  origenExterno: string | null;
  /** Id del documento en el módulo origen externo. Informativo: no navega. */
  idOrigen: number | null;
}

/** Filtros de GET /dtch/listar. `desde`/`hasta` van en formato yyyy-MM-dd. */
export interface ChequeListadoFiltro {
  idEmpresa?: number | null;
  idCuenta?: number | null;
  estado?: number | null;
  desde?: string | null;
  hasta?: string | null;
}

/** Respuesta de GET /dtch/siguiente/{idCuenta}. */
export interface ChequeSiguiente {
  idCheque: number;
  numero: number;
}

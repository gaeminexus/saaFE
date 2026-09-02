import { FilaAbono, SaldoFactura } from '../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';

/**
 * Estado de cuenta de un titular. El mismo titular puede operar con los dos
 * roles a la vez, así que la pantalla consulta un rol por vez: como CLIENTE
 * mira las cuentas por cobrar (CBR) y como PROVEEDOR las cuentas por pagar
 * (PGS). Los códigos de rol son los del selector de titulares del sistema.
 */
export enum RolTitular {
  CLIENTE = 1,
  PROVEEDOR = 2,
}

/**
 * Tipos de documento que componen el estado de cuenta. Cada uno sale de su
 * propio endpoint y se normaliza a una fila común para poder listarlos,
 * filtrarlos y exportarlos juntos.
 */
export enum TipoDocumentoEstadoCuenta {
  FACTURA = 'FACTURA',
  NOTA_CREDITO = 'NOTA_CREDITO',
  NOTA_DEBITO = 'NOTA_DEBITO',
  RETENCION = 'RETENCION',
  ANTICIPO = 'ANTICIPO',
}

export interface DefinicionTipoDocumento {
  tipo: TipoDocumentoEstadoCuenta;
  etiqueta: string;
  icono: string;
  /**
   * Cómo pesa el documento en el saldo del titular:
   *  1  aumenta la deuda (factura, nota de débito)
   * -1  la disminuye (nota de crédito, retención)
   *  0  no es deuda: es saldo a favor disponible (anticipo)
   */
  signo: 1 | -1 | 0;
}

export const TIPOS_DOCUMENTO: DefinicionTipoDocumento[] = [
  { tipo: TipoDocumentoEstadoCuenta.FACTURA, etiqueta: 'Facturas', icono: 'receipt_long', signo: 1 },
  { tipo: TipoDocumentoEstadoCuenta.NOTA_CREDITO, etiqueta: 'Notas de Crédito', icono: 'assignment_return', signo: -1 },
  { tipo: TipoDocumentoEstadoCuenta.NOTA_DEBITO, etiqueta: 'Notas de Débito', icono: 'assignment_late', signo: 1 },
  { tipo: TipoDocumentoEstadoCuenta.RETENCION, etiqueta: 'Retenciones', icono: 'description', signo: -1 },
  { tipo: TipoDocumentoEstadoCuenta.ANTICIPO, etiqueta: 'Anticipos', icono: 'savings', signo: 0 },
];

export const TIPO_DOCUMENTO_LABELS: Record<string, DefinicionTipoDocumento> =
  TIPOS_DOCUMENTO.reduce((acc, def) => ({ ...acc, [def.tipo]: def }), {});

/** De dónde salió el documento respecto de la empresa. */
export type OrigenDocumento = 'EMITIDO' | 'RECIBIDO';

/** Asiento contable asociado a un documento o a uno de sus abonos. */
export interface AsientoRelacionado {
  codigo: number;
  numeroAlterno?: string;
  fecha?: any;
  /** Qué originó el asiento: el documento mismo o uno de sus abonos. */
  origen: string;
  observaciones?: string | null;
}

/**
 * Fila unificada del estado de cuenta. `saldoPendiente` solo se conoce en las
 * facturas (lo calcula /aplp|/aplc) y en los anticipos (campo `saldo` de la
 * propia entidad); en el resto queda null porque el documento no lleva saldo
 * propio: se aplica entero contra una factura.
 */
export interface DocumentoEstadoCuenta {
  /** Clave única en la grilla: los ids se repiten entre tipos de documento. */
  clave: string;
  id: number;
  tipo: TipoDocumentoEstadoCuenta;
  origen: OrigenDocumento;
  numero: string;
  fecha: any;
  /** Valor del documento, siempre positivo. El signo lo da el tipo. */
  total: number;
  /** Aporta al saldo con el signo del tipo (0 en anticipos). */
  totalConSigno: number;
  totalAplicado?: number | null;
  saldoPendiente?: number | null;
  /** 1=Pendiente, 2=Parcial, 3=Pagada. Solo en facturas. */
  estadoPago?: number | null;
  /** Estado propio del documento (anulado, etc.). */
  estado?: number | null;
  /** Si el documento está anulado según el ciclo de estados de su fuente. */
  anulado: boolean;
  /** Etiqueta legible del `estado` crudo, según el catálogo de su fuente (CXC/CXP/Anticipo). */
  etiquetaEstado: string;
  /**
   * true cuando la factura no trae saldo porque falló la consulta a
   * aplc/aplp (no porque el documento no lleve saldo propio). Evita que un
   * fallo de red la saque de los filtros por estado de pago.
   */
  saldoDesconocido?: boolean;
  /**
   * Si la fuente de este documento tiene saldo consultable en /aplp o /aplc.
   * `false` en documentos "factura-like" sin flujo de aplicación de pagos
   * detrás (p. ej. liquidación de compra: PGS.APLP no tiene FK a LQCC) — su
   * saldo pendiente es su total, no se consulta ni se marca `saldoDesconocido`.
   */
  consultaSaldo: boolean;
  observacion?: string | null;
  asiento?: AsientoRelacionado | null;
  /** Abonos del documento; se cargan al expandir la fila. */
  abonos?: FilaAbono[];
  abonosCargados?: boolean;
  cargandoAbonos?: boolean;
  /** Entidad original, por si hace falta un dato que no se normalizó. */
  original?: any;
}

/** Totales de la cabecera, recalculados con cada cambio de filtro. */
export interface ResumenEstadoCuenta {
  totalDocumentos: number;
  totalFacturado: number;
  totalNotasCredito: number;
  totalNotasDebito: number;
  totalRetenciones: number;
  totalAbonado: number;
  saldoPendiente: number;
  saldoAnticipos: number;
  documentosPendientes: number;
}

export const RESUMEN_VACIO: ResumenEstadoCuenta = {
  totalDocumentos: 0,
  totalFacturado: 0,
  totalNotasCredito: 0,
  totalNotasDebito: 0,
  totalRetenciones: 0,
  totalAbonado: 0,
  saldoPendiente: 0,
  saldoAnticipos: 0,
  documentosPendientes: 0,
};

/** Resultado de una consulta completa del estado de cuenta de un titular. */
export interface EstadoCuentaResultado {
  documentos: DocumentoEstadoCuenta[];
  /** Endpoints que fallaron; la consulta sigue con lo que sí respondió. */
  advertencias: string[];
}

/** Saldo de una factura tal como lo devuelven /aplp/saldo y /aplc/saldo. */
export type SaldoDocumento = SaldoFactura;

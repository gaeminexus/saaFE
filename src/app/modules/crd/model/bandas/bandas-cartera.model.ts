/**
 * Modelos de la pantalla de Parametrización de bandas de cartera por producto.
 *
 * Contrato: docs/crd/API-BANDAS-PRODUCTO.md (espejo del repo backend saaBE).
 * Backend: CRD.CBPR (configuración) + CRD.BNDP (bandas).
 *
 * IMPORTANTE sobre fechas (ver §0.1 del contrato):
 *  - SALIDA del servidor: LocalDate llega como arreglo [año, mes, día] (ej. [2026, 9, 1]).
 *  - ENTRADA al servidor: LocalDate viaja como string ISO "yyyy-MM-dd".
 *    Nunca enviar un Date crudo de JavaScript ni nada terminado en "Z".
 */

/** Tipo de cartera — CHECK CK_CBPR_TPCR IN (1,2). No hay endpoint de catálogo (§4.1). */
export const TIPO_CARTERA = {
  POR_VENCER: 1,
  VENCIDO: 2,
} as const;

export type TipoCartera = (typeof TIPO_CARTERA)[keyof typeof TIPO_CARTERA];

/** Estado — com.saa.rubros.Estado: 1 = activo, 0 = inactivo. */
export const ESTADO_ACTIVO = 1;
export const ESTADO_INACTIVO = 0;

/**
 * Una banda con su rango en días YA derivado por el backend (§0.5).
 * El frontend NO recalcula diaInicio/diaFin/etiqueta: los muestra tal cual.
 * La última banda es abierta ("el resto"): periodos y diaFin llegan en null.
 */
export interface BandaProductoDetalle {
  idBanda: number;
  numero: number;
  periodos: number | null;
  diaInicio: number;
  diaFin: number | null;
  etiqueta: string;
  idPlanCuenta: number;
  cuentaContable: string;
  nombreCuenta: string;
  estado: number;
}

/** Configuración vigente (o histórica) de un producto + tipo de cartera, con sus bandas. */
export interface ConfiguracionBandaDetalle {
  idConfiguracion: number;
  idProducto: number;
  nombreProducto: string;
  idEmpresa: number;
  tipoCartera: number;
  nombreTipoCartera: string;
  fechaDesde: number[] | null;
  fechaHasta: number[] | null;
  /** true solo si la vigencia todavía no empezó a la fecha consultada → editable en el lugar (§2.1). */
  editable: boolean;
  estado: number;
  bandas: BandaProductoDetalle[];
}

/** Una fila del listado principal: un producto con sus dos configuraciones vigentes. */
export interface ProductoBandas {
  idProducto: number;
  nombreProducto: string;
  codigoSBS: string;
  nombreTipoPrestamo: string;
  estadoProducto: number;
  /** null cuando el producto no tiene configuración de esa cartera todavía. */
  porVencer: ConfiguracionBandaDetalle | null;
  vencido: ConfiguracionBandaDetalle | null;
}

/** Una banda tal como se envía al backend (solo lo que se graba). */
export interface BandaInput {
  numero: number;
  /** null = banda abierta ("el resto"); solo la última puede ser null. */
  periodos: number | null;
  idPlanCuenta: number;
}

/** Body de POST /rest/cbpr/guardarConfiguracion (§2.4). */
export interface SolicitudConfiguracionBanda {
  /** null = alta; con valor = edición en el lugar (solo si la vigencia no empezó). */
  idConfiguracion: number | null;
  idProducto: number;
  idEmpresa: number;
  tipoCartera: number;
  /** "yyyy-MM-dd" */
  fechaDesde: string;
  /** "yyyy-MM-dd" o null (vigencia abierta). */
  fechaHasta: string | null;
  usuario: string | null;
  ip: string | null;
  bandas: BandaInput[];
}

/** Body de POST /rest/cbpr/cerrarVigencia (§2.5). Producto/empresa/tipo se heredan de la vigente. */
export interface SolicitudCierreVigencia {
  idConfiguracionVigente: number;
  /** "yyyy-MM-dd"; posterior al fechaDesde de la que se cierra. */
  fechaDesdeNueva: string;
  usuario: string | null;
  ip: string | null;
  bandas: BandaInput[];
}

/** Fila del buscador de cuentas (§4.3) — solo cuentas activas y de movimiento. */
export interface CuentaBandaDisponible {
  idPlanCuenta: number;
  cuentaContable: string;
  nombre: string;
}

/** Respuesta del endpoint de verificación GET /rest/cbpr/clasificar (§3). */
export interface ClasificacionBanda {
  idConfiguracion: number;
  idProducto: number;
  idEmpresa: number;
  tipoCartera: number;
  fecha: number[];
  dias: number;
  banda: BandaProductoDetalle;
}

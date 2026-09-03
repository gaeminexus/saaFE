/**
 * Modelos del contrato de auditoría de distribución en bandas
 * (`docs/crd/API-AUDITORIA-BANDAS.md`). Reflejan el contrato 1:1 — no se agregan campos que el
 * backend no declare.
 */

export type OrigenDistribucion = 'CARGA_PETRO' | 'COBRO_INDIVIDUAL' | 'EVENTO_PRESTAMO' | 'PAGO_PENSION';

export const ORIGENES_DISTRIBUCION: OrigenDistribucion[] = [
  'CARGA_PETRO',
  'COBRO_INDIVIDUAL',
  'EVENTO_PRESTAMO',
  'PAGO_PENSION',
];

export const NOMBRE_ORIGEN_DISTRIBUCION: Record<OrigenDistribucion, string> = {
  CARGA_PETRO: 'Carga Petro',
  COBRO_INDIVIDUAL: 'Cobro individual',
  EVENTO_PRESTAMO: 'Evento de préstamo',
  PAGO_PENSION: 'Pago de pensión',
};

export type ConceptoDistribucion =
  | 'CAPITAL'
  | 'INTERES_ORDINARIO'
  | 'INTERES_MORA'
  | 'INTERES_VENCIDO'
  | 'SEGURO_DESGRAVAMEN'
  | 'SEGURO_INCENDIO'
  | 'APORTE';

export const CONCEPTOS_DISTRIBUCION: ConceptoDistribucion[] = [
  'CAPITAL',
  'INTERES_ORDINARIO',
  'INTERES_MORA',
  'INTERES_VENCIDO',
  'SEGURO_DESGRAVAMEN',
  'SEGURO_INCENDIO',
  'APORTE',
];

/**
 * ⛔ El agrupador primario es el CONCEPTO, no la cuenta contable: la mora va a la misma cuenta
 * que el interés ordinario y agrupar por cuenta las fusionaría, justo el desglose que
 * contabilidad quiere revisar (§3 del plan). La cuenta es una columna más de la fila, nunca el
 * agrupador.
 */
export const NOMBRE_CONCEPTO_DISTRIBUCION: Record<ConceptoDistribucion, string> = {
  CAPITAL: 'Capital',
  INTERES_ORDINARIO: 'Interés ordinario',
  INTERES_MORA: 'Interés de mora',
  INTERES_VENCIDO: 'Interés vencido',
  SEGURO_DESGRAVAMEN: 'Seguro de desgravamen',
  SEGURO_INCENDIO: 'Seguro de incendio',
  APORTE: 'Aporte',
};

export interface AsientoResumenDistribucion {
  idAsiento: number;
  tipo: string;
  fecha: string;
  estado: string;
}

/**
 * Una banda del catálogo REAL presente en la distribución de un origen — alimenta el filtro.
 * ⛔ NO hardcodear: `CRD.BNDP` no tiene columna de etiqueta, el rango y el nombre los deriva
 * `ClasificadorBandaService.derivarRangos` desde `numero`/`periodos`, y las bandas se configuran
 * por producto y por empresa (verificado contra `BandaProductoDetalle.java` 2026-09-02) — ni la
 * cantidad ni los rótulos son fijos.
 */
export interface BandaFiltroDistribucion {
  idBanda: number;
  numero: number;
  etiqueta: string;
  diaInicio: number | null;
  diaFin: number | null;
}

/** `GET /dsbn/cuadre` — el encabezado. Se pinta primero, antes que nada del detalle. */
export interface CuadreDistribucionBandas {
  origen: OrigenDistribucion;
  idOrigen: number;
  descripcionOrigen: string;
  /**
   * `null` cuando este origen todavía no tiene una fuente de "recibido" independiente conectada
   * — verificado contra `ResultadoCuadreDistribucionBanda.java` 2026-09-02: hoy solo
   * `CARGA_PETRO` la tiene. Es una limitación de cobertura, no un error — la pantalla no puede
   * mostrar "no cuadra" ahí, tiene que decir "sin verificación disponible".
   */
  recibido: number | null;
  distribuido: number;
  diferencia: number | null;
  cuadra: boolean | null;
  /**
   * `false` = venta separada, contabilidad desconectada. NO es un error: oculta las columnas de
   * cuenta/asiento y el resto de la pantalla se muestra igual.
   */
  contabilidadConectada: boolean;
  asientos: AsientoResumenDistribucion[];
  /** Solo las bandas que aparecen en la distribución de este origen — ver `BandaFiltroDistribucion`. */
  bandas: BandaFiltroDistribucion[];
}

/** `POST /dsbn/detalle` — cuerpo del filtro. Los arreglos son OR interno, AND entre sí. */
export interface FiltroDetalleDistribucion {
  origen: OrigenDistribucion;
  idOrigen: number;
  conceptos?: ConceptoDistribucion[];
  idsBanda?: number[];
  idsProducto?: number[];
  idsTipoPrestamo?: number[];
  idsTipoAporte?: number[];
  idsEntidad?: number[];
  cuentasContables?: string[];
  /** `yyyy-MM-dd`. */
  fechaDesde?: string | null;
  /** `yyyy-MM-dd`. */
  fechaHasta?: string | null;
  pagina: number;
  tamanio: number;
  ordenarPor?: string;
  orden?: 'asc' | 'desc';
}

export interface ResumenPorConcepto {
  concepto: ConceptoDistribucion;
  valor: number;
  filas: number;
}

/**
 * Una fila del detalle. `cuentaContable`/`nombreCuenta`/`idAsiento` vienen `null` con
 * contabilidad desconectada — dato ausente legítimo, no un fallo. `idBanda`/`banda` solo aplican
 * a `CAPITAL`; en el resto de los conceptos vienen `null` también por diseño.
 */
export interface FilaDistribucionBanda {
  id: number;
  concepto: ConceptoDistribucion;
  valor: number;
  idEntidad: number | null;
  participe: string | null;
  cedula: string | null;
  codigoAsoprep: number | null;
  idPrestamo: number | null;
  numeroCuota: number | null;
  /**
   * `LocalDate` del backend (Jackson) — llega como arreglo `[2026,7,31]`, NO como string
   * `"2026-07-31"` (verificado 2026-09-03 contra `FilaDistribucionBanda.java`: el campo es
   * `java.time.LocalDate`, y `saaBE/CLAUDE.md` § Serialización confirma sobre el cable que Jackson
   * emite `LocalDate` como arreglo). Nunca volcar crudo a una tabla o a un CSV — las comas del
   * arreglo rompen el CSV. Siempre pasar por `FuncionesDatosService.convertirFechaDesdeBackend()`.
   */
  fechaVencimiento: string | number[] | Date | null;
  fechaAplicacion: string | number[] | Date | null;
  idProducto: number | null;
  producto: string | null;
  idTipoPrestamo: number | null;
  idTipoAporte: number | null;
  /**
   * Código, NO texto — a diferencia de lo que muestra el ejemplo del contrato
   * (`"tipoCartera": "POR_VENCER"`). Verificado contra `DistribucionBanda.java`/
   * `FilaDistribucionBanda.java` del backend 2026-09-02: el campo real es `Long`, valores de
   * `com.saa.rubros.TipoCarteraBanda` (`1` = POR_VENCER, `2` = VENCIDO). Ver
   * `TIPO_CARTERA_BANDA` para la traducción — reportado al árbitro para corregir el contrato.
   */
  tipoCartera: number | null;
  dias: number | null;
  idBanda: number | null;
  banda: string | null;
  cuentaContable: string | null;
  nombreCuenta: string | null;
  idAsiento: number | null;
}

/**
 * Traducción verificada de `com.saa.rubros.TipoCarteraBanda` (backend, valores `1`/`2` — no hay
 * un tercer código "al día" en el enum real, a diferencia del ejemplo del contrato).
 */
export const TIPO_CARTERA_BANDA: Record<number, string> = {
  1: 'Por vencer',
  2: 'Vencido',
};

/**
 * Segundo nivel del resumen jerárquico: cuenta contable + banda combinadas (§ "Las DOS vistas").
 * Sin CNT conectado, `cuentaContable`/`nombreCuenta` vienen `null` y agrupa solo por banda.
 */
export interface DetalleJerarquico {
  cuentaContable: string | null;
  nombreCuenta: string | null;
  idBanda: number | null;
  banda: string | null;
  valor: number;
  filas: number;
}

/**
 * Primer nivel del resumen jerárquico — por CONCEPTO, nunca por cuenta contable (§3 del plan: la
 * mora y el interés ordinario comparten cuenta y se fusionarían). Calculado sobre el conjunto
 * FILTRADO completo, no sobre la página — igual que `totalValorFiltrado`/`resumenPorConcepto`.
 */
export interface ResumenJerarquicoConcepto {
  concepto: ConceptoDistribucion;
  valor: number;
  filas: number;
  detalle: DetalleJerarquico[];
}

export interface RespuestaDetalleDistribucion {
  totalFilas: number;
  pagina: number;
  tamanio: number;
  totalValorFiltrado: number;
  resumenPorConcepto: ResumenPorConcepto[];
  filas: FilaDistribucionBanda[];
  /**
   * Publicado por el backend 2026-09-02 (`saaBE` commit `6ceb969`), calculado con un GROUP BY
   * propio sobre el conjunto filtrado COMPLETO, sin paginar. Sigue opcional en el tipo por las
   * dudas — si algún origen viejo llegara a responder sin este campo, la pantalla debe tratar su
   * ausencia como "vista resumen no disponible todavía" y nunca aproximarlo desde la página
   * cargada: sería inventar un número que no coincide con el total filtrado real.
   */
  resumenJerarquico?: ResumenJerarquicoConcepto[];
}

/**
 * Una fila de `GET /dsbn/diferencia` — un partícipe cuyo aplicado no coincide con lo descontado.
 * `aplicadoManual`/`aplicadoAutomatico` es la columna que más importa: dice POR DÓNDE entró el
 * defecto (afectación manual mal cargada vs. flujo automático) — nunca ocultarla detrás de un
 * expandir.
 */
export interface DiferenciaParticipe {
  codigoPetro: number;
  cedula: string | null;
  participe: string | null;
  descontado: number;
  aplicadoPrestamos: number;
  aplicadoAportes: number;
  aplicadoTotal: number;
  /** `aplicadoTotal - descontado`. Positiva = recibió de más (son las que importan). */
  diferencia: number;
  aplicadoManual: number;
  aplicadoAutomatico: number;
}

/**
 * `GET /dsbn/diferencia` — "¿dónde está la diferencia?" (§4 del contrato). El cuadre ya dice QUE
 * hay diferencia; esto dice DE QUIÉN. Ordenado por `diferencia` descendente por el propio backend.
 */
export interface DiferenciaOrigen {
  origen: OrigenDistribucion;
  idOrigen: number;
  diferenciaTotal: number;
  participesConDiferencia: number;
  recibieronDeMas: number;
  recibieronDeMenos: number;
  detalle: DiferenciaParticipe[];
}

/** `GET /dsbn/origenes` — alimenta el selector. Es un filtro más, no el eje de la pantalla. */
export interface OrigenListado {
  origen: OrigenDistribucion;
  idOrigen: number;
  descripcion: string;
  fecha: string;
  distribuido: number;
  /** `null` cuando este origen no tiene fuente de "recibido" — mismo caso que en el cuadre. */
  cuadra: boolean | null;
}

export interface FiltroOrigenes {
  origen?: OrigenDistribucion;
  fechaDesde?: string;
  fechaHasta?: string;
  limite?: number;
}

/**
 * Error normalizado del servicio (ver `AuditoriaBandasService`): nunca un `null` "exitoso" —
 * distinguirlo de "sin datos" es exactamente lo que pide la nota final del contrato.
 */
export interface ErrorAuditoriaBandas {
  mensaje: string;
  status: number;
}

/**
 * Respuesta de `POST /rest/dsbn/recalcularDistribucion?origen=&idOrigen=&usuario=` (path real,
 * publicado por el backend en `adcc6b3`). Recalcula `CRD.DSBN` de un origen ya procesado leyendo
 * los pagos/aportes actuales — no toca asientos, pagos, aportes ni cuotas. Solo `CARGA_PETRO`;
 * cualquier otro origen responde 422.
 */
export interface RecalculoDistribucionBanda {
  idCarga: number;
  /** Cuántos pagos se leyeron para reconstruir la distribución — para contrastar el resultado. */
  pagosClasificados: number;
}

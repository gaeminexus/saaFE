/**
 * Modelos de la pantalla de Parametrización de la escala de calificación de riesgo.
 *
 * ⚠️ BOCETO — 2026-09-07. Todavía NO hay contrato REST acordado con el backend (el árbitro se lo
 * pidió al equipo de BE). Las columnas de abajo SÍ están confirmadas por el árbitro contra el
 * esquema real (`CRD.ESCR` / `CRD.CFCR`); lo que no está confirmado son las rutas y la forma
 * exacta del JSON — eso vive únicamente en `escala-calificacion-riesgo.service.ts`, que las aísla
 * detrás de un flag de mock. Cuando el contrato real llegue, este archivo debería necesitar como
 * mucho renombrar campos, no rediseñarse.
 *
 * Backend: `CRD.CFCR` (configuración vigente, una por producto+empresa+vigencia) +
 * `CRD.ESCR` (una fila = una categoría de la escala, FK a `CFCR`).
 *
 * Distinción con `bandas-cartera` — a propósito, NO es el mismo dominio:
 * - Bandas de cartera → clasificación CONTABLE: determina a qué CUENTA va el asiento.
 * - Escala de riesgo  → calificación REGULATORIA (SBS): determina el % de PROVISIÓN.
 * No se comparte modelo ni servicio con bandas aunque el molde de pantalla sí se copia.
 *
 * Convención de fechas (igual que el resto del módulo):
 *  - SALIDA del servidor: LocalDate llega como arreglo [año, mes, día].
 *  - ENTRADA al servidor: LocalDate viaja como string ISO "yyyy-MM-dd".
 */

/** Estado — com.saa.rubros.Estado: 1 = activo, 0 = inactivo. */
export const ESTADO_ACTIVO = 1;
export const ESTADO_INACTIVO = 0;

/**
 * Las nueve calificaciones de la escala SBS (`sql/177`), en el orden regulatorio de menor a
 * mayor riesgo. Enumeración FIJA — a diferencia de las bandas de cartera (lista de longitud
 * variable), acá NO se agregan ni se quitan filas.
 *
 * ⚠️ `ESCR` tiene una columna `orden` propia (no asumida = la posición en este array): el modelo
 * de datos no da por sentado un orden fijo. Esta constante es el orden de PRESENTACIÓN por
 * defecto; si el backend manda `orden` distinto, hay que respetarlo y no forzar este array.
 */
export const CALIFICACIONES_RIESGO = ['A1', 'A2', 'A3', 'B1', 'B2', 'C1', 'C2', 'D', 'E'] as const;
export type CalificacionRiesgo = (typeof CALIFICACIONES_RIESGO)[number];

/**
 * Una fila de la escala (`CRD.ESCR`). El rango en días es INDEPENDIENTE por fila —a diferencia de
 * `BandaProductoDetalle`, acá `diaDesde`/`diaHasta` NO se derivan por acumulación en el backend—,
 * así que nada impide estructuralmente un hueco o un solape entre filas. La pantalla tiene que
 * validarlo de verdad (ver `calcularCoberturaEscala` en el componente), no asumir que viene bien.
 *
 * ⚠️ `diaHasta === null` se interpreta como "sin límite superior" (mismo criterio que
 * `BandaProductoDetalle.diaFin`), a falta de confirmación del backend sobre si el último tramo
 * usa `null` o un número centinela grande. Si el backend confirma un centinela, ajustar acá.
 */
export interface EscalaRiesgoDetalle {
  idEscala: number;
  idConfiguracion: number;
  calificacion: CalificacionRiesgo | string;
  diaDesde: number;
  /** `null` = sin límite superior (tramo abierto). */
  diaHasta: number | null;
  porcentajeProvision: number;
  /** Orden declarado por el backend — no asumir que coincide con `CALIFICACIONES_RIESGO`. */
  orden: number;
  estado: number;
}

/** La configuración vigente (o histórica) de un producto+empresa, con sus nueve categorías. */
export interface ConfiguracionEscalaRiesgo {
  idConfiguracion: number;
  idProducto: number;
  nombreProducto: string;
  idEmpresa: number;
  nombre: string;
  fechaInicio: number[] | null;
  fechaFin: number[] | null;
  /** true solo si la vigencia todavía no empezó a la fecha consultada → editable en el lugar. */
  editable: boolean;
  estado: number;
  escalas: EscalaRiesgoDetalle[];
}

/** Una fila del listado maestro: un producto con su configuración de escala vigente (o sin ella). */
export interface ProductoEscalaRiesgo {
  idProducto: number;
  nombreProducto: string;
  codigoSBS: string;
  nombreTipoPrestamo: string;
  estadoProducto: number;
  /** `null` cuando el producto no tiene escala de riesgo configurada todavía. */
  vigente: ConfiguracionEscalaRiesgo | null;
}

/** Una fila de escala tal como se envía al backend (solo lo que se graba). */
export interface EscalaRiesgoInput {
  calificacion: string;
  diaDesde: number;
  /** `null` = sin límite superior. */
  diaHasta: number | null;
  porcentajeProvision: number;
  orden: number;
}

/** Body especulativo de guardar/crear una configuración de escala. */
export interface SolicitudConfiguracionEscalaRiesgo {
  /** `null` = alta; con valor = edición en el lugar (solo si la vigencia no empezó). */
  idConfiguracion: number | null;
  idProducto: number;
  idEmpresa: number;
  nombre: string;
  /** "yyyy-MM-dd" */
  fechaInicio: string;
  /** "yyyy-MM-dd" o null (vigencia abierta). */
  fechaFin: string | null;
  usuario: string | null;
  ip: string | null;
  escalas: EscalaRiesgoInput[];
}

/** Body especulativo de cerrar la vigencia actual y abrir una nueva desde una fecha. */
export interface SolicitudCierreVigenciaEscala {
  idConfiguracionVigente: number;
  /** "yyyy-MM-dd"; posterior al inicio de la que se cierra. */
  fechaInicioNueva: string;
  usuario: string | null;
  ip: string | null;
  escalas: EscalaRiesgoInput[];
}

/**
 * Respuesta especulativa del "probador": dado un número de días de mora, qué calificación y qué
 * % de provisión le toca. Es el precedente de `ClasificacionBanda` en bandas, y además es la
 * forma más barata de que el usuario detecte un hueco en la escala: si prueba un valor que cae en
 * ninguna fila, el backend debería devolver un error explícito, no un silencio.
 */
export interface CalificacionResultado {
  idConfiguracion: number;
  idProducto: number;
  idEmpresa: number;
  diasMora: number;
  escala: EscalaRiesgoDetalle;
}

/** Un hueco o un solape detectado entre dos filas consecutivas de la escala (orden por diaDesde). */
export interface ProblemaCobertura {
  tipo: 'hueco' | 'solape';
  desde: number;
  /** `null` en un hueco final (ninguna fila cubre "de X en adelante"). */
  hasta: number | null;
}

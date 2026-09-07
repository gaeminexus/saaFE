/**
 * Modelos de la pantalla de Parametrización de la escala de calificación de riesgo.
 *
 * Contrato REST cerrado por el árbitro (BE `3e89bb6`, 2026-09-07):
 * `docs/logica-negocio/crd/API-CALIFICACION-RIESGO.md` (en `saaBE`). Ya NO es especulativo.
 *
 * Backend: `CRD.CFCR` (configuración vigente, una por producto+empresa+vigencia) +
 * `CRD.ESCR` (una fila = una categoría de la escala, FK a `CFCR`). `/rest/escr` es SOLO LECTURA
 * (§0bis del contrato) — toda escritura pasa por `/cfcr/guardarConfiguracion` o `/cfcr/cerrarVigencia`.
 *
 * Distinción con `bandas-cartera` — a propósito, NO es el mismo dominio:
 * - Bandas de cartera → clasificación CONTABLE: determina a qué CUENTA va el asiento.
 * - Escala de riesgo  → calificación REGULATORIA (SBS): determina el % de PROVISIÓN.
 * No se comparte modelo ni servicio con bandas aunque el molde de pantalla sí se copia.
 *
 * Convención de fechas (igual que el resto del módulo):
 *  - SALIDA del servidor: LocalDate llega como arreglo [año, mes, día].
 *  - ENTRADA al servidor: LocalDate viaja como string ISO "yyyy-MM-dd".
 *
 * ⚠️ `porcentajeProvision` viaja SIEMPRE en tanto por uno (0.0099 = 0.99%), tanto en las
 * respuestas como en lo que espera `guardarConfiguracion`/`cerrarVigencia` — así lo define el
 * contrato (§5, §8). La conversión a puntos porcentuales (0-100) para que el usuario tipee "5" en
 * vez de "0.05" es una decisión de UI y vive solo en el componente, no acá.
 */

/** Estado — com.saa.rubros.Estado: 1 = activo, 0 = inactivo. */
export const ESTADO_ACTIVO = 1;
export const ESTADO_INACTIVO = 0;

/**
 * Las nueve calificaciones de la escala SBS (`sql/177`), en el orden regulatorio de menor a
 * mayor riesgo. Enumeración FIJA — a diferencia de las bandas de cartera (lista de longitud
 * variable), acá NO se agregan ni se quitan filas.
 *
 * ⛔ Este orden ES el orden que se envía al backend en `escalas` (§8 del contrato: "el orden de la
 * lista `escalas` ES el orden de evaluación", de ahí sale `ESCRORDN`) — no reordenar esta
 * constante sin revisar el servicio y el componente.
 */
export const CALIFICACIONES_RIESGO = ['A1', 'A2', 'A3', 'B1', 'B2', 'C1', 'C2', 'D', 'E'] as const;
export type CalificacionRiesgo = (typeof CALIFICACIONES_RIESGO)[number];

/**
 * Una fila de la escala tal como la devuelve el backend (`CRD.ESCR`, vía `/cfcr/vigente` |
 * `/listado` | `/historial`).
 *
 * ⛔ `diaDesde` es SOLO LECTURA acá: el servidor lo deriva (`diaHasta` de la fila anterior + 1, la
 * primera en 0 — §8 del contrato) y por eso un hueco o un solape entre filas ya no se puede ni
 * expresar. `diaHasta === null` = sin límite superior, y solo puede darse en la ÚLTIMA fila
 * (posición `CALIFICACIONES_RIESGO.length - 1`, calificación "E").
 */
export interface EscalaRiesgoDetalle {
  idEscala: number;
  calificacion: CalificacionRiesgo | string;
  diaDesde: number;
  /** `null` = sin límite superior (solo posible en la última fila). */
  diaHasta: number | null;
  /** Etiqueta de rango ya armada por el backend, p.ej. "1 - 15" o "mas de 270 (resto)". */
  etiqueta: string;
  /** Tanto por uno (0.0099 = 0.99%), NO puntos porcentuales. */
  porcentajeProvision: number;
}

/** La configuración vigente (o histórica) de un producto+empresa, con sus nueve categorías. */
export interface ConfiguracionEscalaRiesgo {
  idConfiguracion: number;
  idProducto: number;
  nombreProducto: string;
  /**
   * `null` = "cualquier empresa" (§1 del contrato) — a propósito, distinto de bandas de cartera,
   * donde la empresa es obligatoria. Así la consume `GeneracionG48ServiceImpl` para el reporte
   * regulatorio. No se puede tener vigente a la vez una configuración universal y una específica
   * del mismo producto (el backend lo valida como conflicto, §1).
   */
  idEmpresa: number | null;
  nombre: string;
  fechaDesde: number[] | null;
  fechaHasta: number[] | null;
  /** true solo si la vigencia todavía no empezó a la fecha consultada → editable en el lugar. */
  editable: boolean;
  estado: number;
  escalas: EscalaRiesgoDetalle[];
}

/** Una fila del listado maestro: un producto con su configuración de escala vigente (o sin ella). */
export interface ProductoEscalaRiesgo {
  idProducto: number;
  nombreProducto: string;
  estadoProducto: number;
  /** `null` cuando el producto no tiene escala de riesgo configurada todavía. */
  configuracion: ConfiguracionEscalaRiesgo | null;
}

/**
 * Una fila de escala tal como se ENVÍA al backend (solo lo que se graba).
 *
 * ⛔ NO lleva `diaDesde` ni `orden` (§8 del contrato): `diaDesde` lo deriva el servidor a partir
 * del `diaHasta` de la fila anterior, y el orden de evaluación es la posición de esta fila en el
 * arreglo `escalas` de la solicitud (que el componente arma siempre en el orden de
 * `CALIFICACIONES_RIESGO`).
 */
export interface EscalaRiesgoInput {
  calificacion: string;
  /** `null` = sin límite superior — el backend exige que sea así SOLO en la última línea. */
  diaHasta: number | null;
  /** Tanto por uno (0-1), no puntos porcentuales. */
  porcentajeProvision: number;
}

/** Body de guardar/crear una configuración de escala — `POST /rest/cfcr/guardarConfiguracion`. */
export interface SolicitudConfiguracionEscalaRiesgo {
  /** `null` = alta; con valor = edición en el lugar (solo si la vigencia no empezó). */
  idConfiguracion: number | null;
  idProducto: number;
  /** `null` = "cualquier empresa" — ver la nota de `ConfiguracionEscalaRiesgo.idEmpresa`. */
  idEmpresa: number | null;
  nombre: string;
  /** "yyyy-MM-dd" */
  fechaDesde: string;
  /** "yyyy-MM-dd" o null (vigencia abierta). */
  fechaHasta: string | null;
  usuario: string | null;
  escalas: EscalaRiesgoInput[];
}

/**
 * Body de cerrar la vigencia actual y abrir una nueva — `POST /rest/cfcr/cerrarVigencia`.
 * Producto, empresa y nombre se heredan de la configuración que se cierra: no se reenvían (§9).
 */
export interface SolicitudCierreVigenciaEscala {
  idConfiguracionVigente: number;
  /** "yyyy-MM-dd"; posterior al inicio de la vigencia que se cierra. */
  fechaDesdeNueva: string;
  usuario: string | null;
  escalas: EscalaRiesgoInput[];
}

/**
 * Respuesta del "probador" (`GET /rest/cfcr/probar`, §10): dado un número de días de mora, qué
 * calificación y qué % de provisión le corresponden. Usa el MISMO camino que
 * `GeneracionG48ServiceImpl` para el reporte regulatorio real (`CalificacionRiesgoService.calificar`),
 * así que nunca puede decir algo distinto de lo que va a salir en el G48.
 */
export interface CalificacionResultado {
  idConfiguracion: number;
  idEscala: number;
  calificacion: string;
  /** Tanto por uno (0-1), no puntos porcentuales. */
  porcentajeProvision: number;
  diaDesde: number;
  diaHasta: number | null;
}

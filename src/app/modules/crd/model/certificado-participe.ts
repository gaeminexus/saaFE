/**
 * Certificados de partícipe — contrato congelado en `docs/crd/API-CERTIFICADOS-PARTICIPE.md`. No
 * cambiar estos nombres de campo por cuenta propia: si algo no cuadra contra el backend real, se
 * reporta BLOQUEADA, no se adivina.
 *
 * Seis certificados que hoy se emiten a mano en Word. Cada valor impreso lleva su ORIGEN
 * (§6 del contrato) y los tres se tienen que ver distintos en pantalla: buena parte de lo que
 * estos certificados afirman no existe en el sistema (viene de DELTA21) y el operador tiene que
 * ver, sin leyenda escondida, qué está afirmando por su cuenta.
 */

/** `CrdTipoCertificado` — §1 del contrato. */
export const TIPO_CERTIFICADO = {
  AL_DIA_EN_OBLIGACIONES: 1,
  HABER_RECIBIDO_APORTES: 2,
  NO_ADEUDAR_CREDITO: 3,
  NO_ADEUDAR_GLOBAL: 4,
  LICITUD_DE_FONDOS: 5,
  APORTES_PATRONALES_SIN_JUBILACION: 6,
} as const;

export type TipoCertificado = (typeof TIPO_CERTIFICADO)[keyof typeof TIPO_CERTIFICADO];

/** Nombres tal como los espera el usuario en la opción "Impresión de certificados" (§1). */
export const NOMBRE_TIPO_CERTIFICADO: Record<number, string> = {
  [TIPO_CERTIFICADO.AL_DIA_EN_OBLIGACIONES]: 'Estar al día en obligaciones',
  [TIPO_CERTIFICADO.HABER_RECIBIDO_APORTES]: 'Haber recibido aportes',
  [TIPO_CERTIFICADO.NO_ADEUDAR_CREDITO]: 'No adeudar un crédito',
  [TIPO_CERTIFICADO.NO_ADEUDAR_GLOBAL]: 'No adeudar (global)',
  [TIPO_CERTIFICADO.LICITUD_DE_FONDOS]: 'Licitud de fondos',
  [TIPO_CERTIFICADO.APORTES_PATRONALES_SIN_JUBILACION]: 'Aportes patronales sin jubilación',
};

/**
 * Calidad del partícipe (`ESPRCDEX`, rubro no identificado por el contrato). El selector solo
 * ofrece las tres PALABRAS del certificado (§6); cada una agrupa varios alternos. Si el operador
 * no toca el selector, se manda `calidadSistema` tal cual llegó (preserva el alterno exacto). Si
 * lo cambia a otro grupo, se manda el alterno CANÓNICO de ese grupo (el primero de la lista) — es
 * la mejor lectura posible del contrato sin inventar un catálogo que no está documentado.
 */
export const GRUPOS_CALIDAD_CERTIFICADO: { label: string; alternos: number[] }[] = [
  { label: 'Partícipe', alternos: [1, 8, 9] },
  { label: 'Partícipe cesante', alternos: [2, 4, 5] },
  { label: 'Partícipe jubilado', alternos: [3, 6, 7] },
];

/** A qué grupo pertenece un alterno de calidad, para preseleccionar el grupo correcto. */
export function grupoDeCalidad(alterno: number | null | undefined): { label: string; alternos: number[] } | null {
  if (alterno == null) return null;
  return GRUPOS_CALIDAD_CERTIFICADO.find((g) => g.alternos.includes(alterno)) ?? null;
}

export type OrigenCampoCertificado = 'SISTEMA' | 'MANUAL_REQUERIDO' | 'MANUAL_EDITADO';

/** §3.1. `valor` viaja como string/number/boolean/null; fechas como `"yyyy-MM-dd"`. */
export interface CampoCertificado {
  valor: string | number | boolean | null;
  /** Cómo se imprime: "2005", "27 de octubre de 2020", "$145.728,15". */
  valorTexto: string;
  origen: OrigenCampoCertificado;
  /** false = el operador no lo puede tocar; el backend lo pisa si se manda de todos modos. */
  editable: boolean;
  fuente: string | null;
}

/** §3.1. Un solo motivo por préstamo, el más específico (§5). */
export interface MotivoBloqueo {
  codigo: string;
  mensaje: string;
  idPrestamo: number | null;
  numeroCredito: number | null;
  producto: string | null;
  estado: number | null;
  estadoTexto: string | null;
}

/** §3.1. Solo tipos 3 y 4. `idPrestamo` es lo que se manda de vuelta en la precarga/emisión. */
export interface PrestamoCertificado {
  idPrestamo: number;
  numeroCredito: number;
  producto: string;
  productoTexto: string;
  fecha: string | number[];
  estado: number;
  estadoTexto: string;
  /** true si `estado` IN (3,4,5) — solo estos se pueden elegir para el tipo 3. */
  cancelado: boolean;
}

/** §3.1. Solo tipos 2 y 5. `idLiquidacion` es lo que se manda de vuelta. */
export interface LiquidacionCertificado {
  idLiquidacion: number;
  fechaPago: string | number[];
  tipo: 'J' | 'C' | 'JP' | 'CP' | 'JRV' | 'CRV';
  tipoTexto: string;
  valor: number;
  observacion: string | null;
}

/** GET /rest/crtf/precarga/{idEntidad}/{tipo} — §3.1. */
export interface PrecargaCertificado {
  idEntidad: number;
  tipo: number;
  tipoTexto: string;
  nombre: string;
  cedula: string;
  calidadSistema: number;
  calidadSistemaTexto: string;
  /** bloqueos.length == 0 && ningún MANUAL_REQUERIDO sin valor. */
  puedeEmitir: boolean;
  bloqueos: MotivoBloqueo[];
  /** Las claves dependen del tipo — ver §4 del contrato. */
  campos: Record<string, CampoCertificado>;
  /** Solo tipos 3 y 4; en los demás []. */
  prestamos: PrestamoCertificado[];
  /** Solo tipos 2 y 5; en los demás []. */
  liquidaciones: LiquidacionCertificado[];
}

/** POST /rest/crtf/emitir — body, §3.2. Solo el valor por clave, no el CampoCertificado entero. */
export interface SolicitudEmisionCertificado {
  idEntidad: number;
  tipo: number;
  /** Obligatorio en el tipo 3; ignorado en los demás. */
  idPrestamo?: number | null;
  /** Opcional en 2 y 5: la fila de HPCS que se usó en la precarga. */
  idLiquidacion?: number | null;
  calidad: number;
  campos: Record<string, string | number | boolean | null>;
  usuario: string;
}

/** POST /rest/crtf/emitir — respuesta 200, §3.2. */
export interface ResultadoEmisionCertificado {
  idCertificado: number;
  numero: number;
  anio: number;
  /** "ASOPREP-FCPC-PARTICIPE-099-2026". */
  numeroAlterno: string;
  fechaEmision: string | number[];
  tipo: number;
  tipoTexto: string;
  calidad: number;
  calidadTexto: string;
  /** Lo que efectivamente se imprimió, con el origen FINAL (el backend no confía en el del cliente). */
  campos: Record<string, CampoCertificado>;
  /** "/rest/crtf/pdf/{idCertificado}". */
  urlPdf: string;
}

/** 1 vigente, 2 anulado (§3.3: "Certificado (estado 2)" es el resultado de anular). */
export const ESTADO_CERTIFICADO = { VIGENTE: 1, ANULADO: 2 } as const;

/**
 * Entidad `Certificado`, tal como la serializa Jackson (§3.3). `pdf` no viaja (`@JsonIgnore`).
 *
 * `tipoCertificado` y `prestamo` confirmados por el árbitro el 2026-08-29 contra la entidad JPA
 * real (`model/crd/Certificado.java`):
 * - `tipoCertificado`: `Long` plano (`@Basic CRTFTPCR`), el alterno del rubro 244 (1..6) — resolver
 *   el texto con `NOMBRE_TIPO_CERTIFICADO`, no con un campo del propio objeto.
 * - `prestamo`: objeto `Prestamo` JPA completo (`@ManyToOne`), null salvo tipo 3. Las entidades se
 *   serializan directo a JSON en este proyecto (sin capa de DTO) — no asumir qué trae adentro más
 *   allá de lo que hace falta mostrar. Leer SOLO `idAsoprep` con fallback a `codigo` (misma regla
 *   `NVL(PRSTIDAS, PRSTCDGO)` que `PrestamoCertificado.numeroCredito`).
 *   ⚠️ En ESTA entidad `idAsoprep` es el número de operación del préstamo — no confundir con
 *   `Aporte.idAsoprep`, que en esa otra entidad es el código de la carga Petro. Mismo nombre,
 *   significado distinto.
 */
export interface Certificado {
  codigo: number;
  anio: number;
  numero: number;
  numeroAlterno: string;
  /** Alterno del rubro 244 (1..6) — resolver con NOMBRE_TIPO_CERTIFICADO. */
  tipoCertificado: number;
  entidad: { codigo: number; razonSocial: string; numeroIdentificacion: string };
  /** null salvo tipo 3. Objeto Prestamo JPA completo — leer solo idAsoprep/codigo, ver comentario arriba. */
  prestamo: { idAsoprep?: number | null; codigo?: number; [key: string]: unknown } | null;
  calidad: number;
  fechaEmision: string | number[];
  usuarioEmision: string;
  /** JSON string — el snapshot `CRTFDTOS` (campos + calidad + firmante + cargo + ciudad + fuenteDatos). */
  datos: string;
  estado: number;
  usuarioAnulacion: string | null;
  fechaAnulacion: string | number[] | null;
  motivoAnulacion: string | null;
  fechaRegistro: string | number[];
}

/** POST /rest/crtf/anular/{idCertificado} — respuesta, §3.3. */
export type ResultadoAnulacionCertificado = Certificado;

import { Empleado } from './empleado';

/**
 * Registro de una salida a un organismo. Tabla `RHH.SLOF`.
 *
 * **No duplica datos.** El RDEP y el 107 se generan desde `RNGL`, `ACMN` y `LQBS`; aquí solo
 * queda constancia de que la salida se generó y, en su momento, de que se presentó.
 *
 * `fechaGeneracion` y `fechaPresentacion` son cosas distintas y ninguna sustituye a la otra: la
 * primera la pone el sistema, la segunda la escribe una persona cuando el organismo recibe,
 * junto con el `numeroComprobante`. Una salida generada y no presentada es el estado normal
 * durante días, así que la pantalla las distingue en vez de colapsarlas en «fecha».
 */
export interface SalidaOficial {
  codigo: number; // SLOFCDGO
  empresa?: { codigo: number } | null; // PJRQCDGO
  tipoSalida: number; // SLOFTPSL - rubro 223
  anio: number; // SLOFANOO
  mes?: number | null; // SLOFMESS - nulo en las anuales
  empleado?: Empleado | { codigo: number } | null; // MPLDCDGO - nulo en las consolidadas

  rutaArchivo?: string | null; // SLOFRUTA
  nombreArchivo?: string | null; // SLOFNMAR
  hash?: string | null; // SLOFHASH

  fechaGeneracion?: Date | null; // SLOFFCGN
  fechaPresentacion?: Date | null; // SLOFFCPR - nula mientras no se presente
  numeroComprobante?: string | null; // SLOFNRCM
  observaciones?: string | null; // SLOFOBSR

  estado: number; // SLOFESTD
  fechaRegistro?: Date; // SLOFFCHR
  usuarioRegistro?: string; // SLOFUSRR
}

/** Códigos alternos del rubro 223 · tipo de salida oficial. */
export class TipoSalidaOficial {
  public static readonly RDEP = 1;
  public static readonly FORMULARIO_107 = 2;
  public static readonly PLANILLA_IESS = 3;
  public static readonly MDT_DECIMO_TERCERO = 4;
  public static readonly MDT_DECIMO_CUARTO = 5;
  public static readonly MDT_UTILIDADES = 6;
  public static readonly ACTA_FINIQUITO_SUT = 7;
}

/**
 * Las salidas que el sistema sabe **generar** hoy.
 *
 * Los tipos 3 a 6 existen en el rubro para poder registrarlos en cuanto lleguen sus formatos
 * —el del IESS es un insumo pendiente del cliente—, pero todavía no se generan desde aquí: de
 * esos solo se registra la generación y la presentación.
 */
export const SALIDAS_GENERABLES = [TipoSalidaOficial.RDEP];

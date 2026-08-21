/**
 * Descarga de los reportes Jasper del módulo, compartida por las pantallas de la fase 5.
 *
 * Los cuatro reportes de nómina —rol individual, rol consolidado, provisiones y resumen de
 * aportes— no tienen endpoint propio: se piden todos por `POST /rest/rprt/generar` con
 * `modulo: 'rhh'`, a través de `JasperReportesService`.
 *
 * **Parámetros, confirmados el 2026-08-19:** los tres reportes de período llevan
 * `P_PRDN_CODIGO` y `P_USUARIO`; el rol individual lleva `P_RLPG_CODIGO` y `P_USUARIO`.
 * `P_IMAGEN` se omite a propósito: el backend inyecta el logo cuando no viene.
 */

/**
 * Nombres de las plantillas `.jrxml` publicadas en `rep/rhh/`.
 *
 * Siguen el patrón canónico de la casa —`RPRT_` más dos bloques de cuatro, como
 * `RPRT_CMPB_PGCT`—, no el nombre descriptivo largo. **Tienen que coincidir carácter por
 * carácter con el archivo del servidor**: un nombre equivocado no falla al compilar, devuelve un
 * 404 en tiempo de ejecución. Confirmados contra los entregados el 2026-08-19.
 */
export class ReportesNomina {
  public static readonly ROL_INDIVIDUAL = 'RPRT_ROLL_INDV';
  public static readonly ROL_CONSOLIDADO = 'RPRT_ROLL_CNSL';
  public static readonly PROVISIONES = 'RPRT_PRVS_PRDO';
  public static readonly RESUMEN_APORTES = 'RPRT_APRT_RSMN';
}

/** Entrega el blob al navegador como descarga. */
export function guardarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}

const MENSAJE_GENERICO = 'No se pudo generar el reporte.';

/**
 * Mensaje de un reporte que no se pudo generar.
 *
 * **El servidor explica el fallo en el cuerpo, no en el código HTTP.** Un nombre de plantilla
 * que no existe devuelve **500** —no 404— con
 * `{"exito":false,"mensaje":"...No se encontró el reporte: /rep/rhh/X.jrxml"}`, así que
 * ramificar por código dejaba fuera justo el caso más frecuente. Se muestra el `mensaje` que
 * venga, sea cual sea el estado, y el genérico solo cuando no hay ninguno.
 *
 * El cuerpo llega como `Blob` porque la petición pide `responseType: 'blob'` para recibir el
 * PDF; hay que leerlo, y por eso esto es asíncrono.
 */
export async function mensajeReporteFallido(error: any): Promise<string> {
  const cuerpo = await leerCuerpo(error?.error ?? error);
  return cuerpo || MENSAJE_GENERICO;
}

/** Extrae el `mensaje` del cuerpo del error, venga como `Blob`, como texto o ya parseado. */
async function leerCuerpo(bruto: any): Promise<string | null> {
  if (!bruto) return null;

  if (bruto instanceof Blob) {
    try {
      return textoDeJson(await bruto.text());
    } catch {
      return null;
    }
  }

  if (typeof bruto === 'string') return textoDeJson(bruto);

  return typeof bruto.mensaje === 'string' && bruto.mensaje.trim() ? bruto.mensaje.trim() : null;
}

function textoDeJson(texto: string): string | null {
  const limpio = texto.trim();
  if (!limpio) return null;

  try {
    const obj = JSON.parse(limpio);
    const mensaje = obj?.mensaje ?? obj?.message;
    return typeof mensaje === 'string' && mensaje.trim() ? mensaje.trim() : null;
  } catch {
    // Un cuerpo que no es JSON —una página de error del servidor, por ejemplo— no se muestra
    // crudo: sería ilegible y podría ser enorme.
    return null;
  }
}

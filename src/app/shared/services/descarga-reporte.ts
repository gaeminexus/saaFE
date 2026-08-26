/**
 * Entrega de un blob de reporte (Jasper u otro) al navegador como descarga, y lectura del
 * mensaje de error cuando el servidor no pudo generarlo.
 *
 * Nació en `rrh/forms/procesos/` para los reportes de nómina, pero es genérico — no depende de
 * nada de RRHH — y otros módulos (CRD) también descargan reportes Jasper. Vive junto a
 * `jasper-reportes.service.ts`, del que es el complemento natural del lado del cliente.
 */

/**
 * Entrega el blob al navegador como descarga.
 *
 * **Las dos precauciones de aquí no son adorno.**
 *
 * 1. **El enlace se inserta en el documento antes de pulsarlo.** Un `<a download>` suelto, que
 *    nunca estuvo en el DOM, funciona en Chrome pero no en todos los navegadores: Firefox exige
 *    que el elemento esté en el documento para atender el clic.
 * 2. **La URL del blob se revoca en un `setTimeout`, no en el mismo tick.** `click()` sólo
 *    *inicia* la descarga; el navegador va a buscar el contenido de la `blob:` después, ya fuera
 *    de esta tarea. Revocarla justo detrás invalida la URL antes de que nadie la lea, y el
 *    resultado es el peor posible: **la petición fue 200, no hay error, no hay aviso y no hay
 *    archivo.**
 */
export function guardarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  enlace.style.display = 'none';

  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);

  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const MENSAJE_GENERICO = 'No se pudo generar el reporte.';

/**
 * Mensaje de un reporte que no se pudo generar.
 *
 * **El servidor explica el fallo en el cuerpo, no en el código HTTP.** Un nombre de plantilla
 * que no existe devuelve **500** —no 404— con
 * `{"exito":false,"mensaje":"...No se encontró el reporte: /rep/rhh/X.jrxml"}`, así que
 * ramificar por código dejaba fuera justo el caso más frecuente. Se muestra el `mensaje` que
 * venga, sea cual sea el estado, y el genérico solo cuando no hay ninguno. **No "simplificar"
 * esto a un switch por HTTP status: perdería el caso real.**
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

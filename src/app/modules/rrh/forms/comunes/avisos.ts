import { MatSnackBarConfig } from '@angular/material/snack-bar';

/**
 * Configuración de los avisos del módulo. **Un solo sitio, a propósito.**
 *
 * Antes cada pantalla escribía su propio literal —43 copias en 35 archivos, con ocho duraciones
 * distintas— y todas ponían el aviso arriba a la derecha, que es justo donde el header lo tapa.
 * Arreglarlo pantalla por pantalla habría dejado el mismo defecto latente en la siguiente copia,
 * así que las 43 pasan por aquí.
 *
 * **Abajo y centrado, no arriba a la derecha.** El header es `position: sticky` con
 * `z-index: 9999`, y el contenedor de overlays de Material va en 1000: un aviso arriba queda
 * literalmente detrás del header. Y no basta con bajarlo — ver la nota de apilamiento en
 * `styles/styles.scss`, porque abajo también había cosas por encima.
 */

/** Un aviso de éxito es una confirmación: se lee de un vistazo y estorba si se queda. */
const DURACION_EXITO = 4000;

/** Piso de un error. Por debajo de esto no da tiempo ni a mirar. */
const DURACION_ERROR_MINIMA = 8000;

/** Techo, para que un mensaje enorme no deje el aviso clavado en pantalla. */
const DURACION_ERROR_MAXIMA = 20000;

/**
 * Tiempo muerto antes de leer: darse cuenta de que ha salido algo y llevar la vista abajo.
 * No depende del mensaje, así que se suma aparte en vez de repartirse por carácter.
 */
const MS_PARA_REPARAR_EN_EL = 5000;

/**
 * Milisegundos por carácter para estimar la lectura.
 *
 * Un mensaje de error del backend puede ser largo —el de una plantilla Jasper que no existe trae
 * la ruta entera del `.jrxml`— y con una duración fija se va de pantalla antes de haberse leído.
 * Un error que desaparece antes de leerse es tan invisible como uno que no se muestra: las dos
 * cosas se leen como «el botón no hace nada», que es el diagnóstico equivocado.
 *
 * **30 ms por carácter, no menos, y el número importa.** La primera versión de esto usaba 18 ms
 * sin tiempo base, y el test lo destapó: hacían falta **444 caracteres** para superar el suelo de
 * 8 s, así que ningún mensaje real llegaba a escalar y la fórmula era decorativa. Con el tiempo
 * base y 30 ms —unas 40 palabras por minuto, deliberadamente lento, porque esto es texto técnico
 * con rutas dentro y quien lo lee no esperaba leer nada— el mensaje de Jasper que motivó D26 ya
 * pasa del suelo.
 */
const MS_POR_CARACTER = 30;

/** Cuánto tiempo dejar un error en pantalla, según lo que cuesta leerlo. */
export function duracionError(mensaje: string): number {
  const estimada = MS_PARA_REPARAR_EN_EL + (mensaje ?? '').length * MS_POR_CARACTER;
  return Math.min(DURACION_ERROR_MAXIMA, Math.max(DURACION_ERROR_MINIMA, estimada));
}

/**
 * Opciones del `MatSnackBar` para un aviso del módulo.
 *
 * @param esError  decide color y duración.
 * @param mensaje  sólo para calcular cuánto tiempo dejarlo; no se muestra desde aquí.
 */
export function opcionesAviso(esError: boolean, mensaje = ''): MatSnackBarConfig {
  return {
    duration: esError ? duracionError(mensaje) : DURACION_EXITO,
    panelClass: [esError ? 'snackbar-error' : 'snackbar-success'],
    horizontalPosition: 'center',
    verticalPosition: 'bottom',
  };
}

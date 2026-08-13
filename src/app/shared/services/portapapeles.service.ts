import { Injectable } from '@angular/core';

/**
 * Copia texto al portapapeles funcionando también fuera de un contexto seguro.
 *
 * `navigator.clipboard` solo existe cuando la página se sirve por HTTPS o
 * desde `localhost`. Con el sistema desplegado en WildFly y accedido por IP
 * (`http://192.168.2.4:8080/Saa/...`) el navegador no expone esa API, así que
 * llamarla directamente lanza un TypeError y la copia falla en silencio —
 * mientras que en el propio servidor, entrando por `localhost`, funciona.
 *
 * Por eso el orden es: API moderna si está disponible y, si no, el método
 * legado `document.execCommand('copy')`, que sigue funcionando sobre HTTP
 * plano en todos los navegadores que usa el cliente.
 */
@Injectable({ providedIn: 'root' })
export class PortapapelesService {

  /**
   * Copia el texto y responde si lo consiguió, para que la pantalla muestre
   * un mensaje honesto en vez de dar por hecho el éxito.
   * @param texto : Contenido a copiar
   * @return      : true si el texto quedó en el portapapeles
   */
  async copiar(texto: string): Promise<boolean> {
    const contenido = (texto ?? '').toString();
    if (!contenido) return false;

    if (this.tieneApiModerna()) {
      try {
        await navigator.clipboard.writeText(contenido);
        return true;
      } catch {
        // Permiso denegado o contexto inseguro pese a existir la API:
        // se intenta igual con el método legado antes de darse por vencido.
      }
    }

    return this.copiarConExecCommand(contenido);
  }

  private tieneApiModerna(): boolean {
    return typeof navigator !== 'undefined'
      && !!navigator.clipboard
      && typeof navigator.clipboard.writeText === 'function'
      && window.isSecureContext === true;
  }

  /**
   * Respaldo para HTTP plano: se copia desde un textarea temporal fuera de
   * pantalla. Debe ejecutarse dentro del gesto del usuario (el click), que es
   * el caso en todos los botones "Copiar clave".
   */
  private copiarConExecCommand(contenido: string): boolean {
    const area = document.createElement('textarea');
    area.value = contenido;
    // Fuera de la vista y sin robar el scroll ni el zoom en móviles.
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.left = '-1000px';
    area.style.opacity = '0';

    document.body.appendChild(area);

    const seleccionPrevia = document.getSelection()?.rangeCount
      ? document.getSelection()!.getRangeAt(0)
      : null;

    try {
      area.select();
      area.setSelectionRange(0, contenido.length);
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      document.body.removeChild(area);
      // Se devuelve al usuario lo que tuviera seleccionado antes de copiar.
      if (seleccionPrevia) {
        const seleccion = document.getSelection();
        seleccion?.removeAllRanges();
        seleccion?.addRange(seleccionPrevia);
      }
    }
  }
}

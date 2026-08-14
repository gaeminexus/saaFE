import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { FileService } from '../../../shared/services/file.service';

/** Resultado de archivar un comprobante: o hay ruta, o hay un motivo por el que no se pudo. */
export interface ResultadoArchivado {
  ruta: string | null;
  error: string | null;
}

/**
 * Archivado del comprobante de respaldo de un cobro (transferencia o depósito).
 *
 * Todas las operaciones de pago del módulo —pago de cuotas, abono a capital, precancelación y
 * registro de aportes— llevan la ruta del comprobante DENTRO del request (`rutaDocumentoRespaldo`,
 * que el backend estampa en `PGPRRTRS`/`PGAPRTRS`), así que el archivo tiene que estar subido antes
 * de llamar al endpoint. Esa secuencia y el nombrado de los archivos estaban escritos solo en
 * `cobros-personales`; acá quedan en un único lugar para que los diálogos apliquen exactamente la
 * misma regla y el respaldo termine siempre en la misma carpeta.
 */
@Injectable({ providedIn: 'root' })
export class ComprobanteCobroService {
  private fileService = inject(FileService);

  /**
   * Extensiones que el comprobante puede tener. Es el subconjunto «PDF o imagen» de las que acepta
   * `FileService.EXTENSIONES_PERMITIDAS` del backend: mandar un `.webp` o un `.heic` haría que el
   * upload fallara del lado del servidor con el cobro ya registrado, así que se cortan antes.
   */
  private static readonly EXTENSIONES = /\.(pdf|png|jpe?g|gif)$/i;

  /** Valor del `accept` de los `<input type="file">` que piden un comprobante. */
  readonly extensionesAceptadas = '.pdf,.jpg,.jpeg,.png,.gif';

  /** Carpeta donde se archivan los respaldos de las operaciones de un préstamo. */
  carpetaDePrestamo(idPrestamo: number): string {
    return `CRD/PAGOS/${idPrestamo}`;
  }

  /** Carpeta de los cobros que son solo aportes del socio, sin préstamo de por medio. */
  carpetaDeAportes(idEntidad: number): string {
    return `CRD/PAGOS/APORTES/${idEntidad}`;
  }

  /**
   * Devuelve el motivo por el que el archivo no sirve como comprobante, o `null` si está bien.
   *
   * El `accept` del input es solo un filtro sugerido en el diálogo del sistema —el usuario puede
   * cambiarlo a «todos los archivos»—, así que el archivo se vuelve a verificar acá.
   */
  problemaDelArchivo(file: File): string | null {
    if (!ComprobanteCobroService.EXTENSIONES.test(file.name)) {
      return 'El comprobante debe ser un archivo PDF o una imagen (.pdf, .jpg, .png, .gif).';
    }
    if (!this.fileService.validateFileSize(file.size)) {
      return `El comprobante supera el tamaño máximo de ${this.fileService.formatFileSize(this.fileService.getMaxFileSize())}.`;
    }
    return null;
  }

  /**
   * Sube el comprobante y devuelve su ruta. Nunca lanza: el llamador ramifica por `error`.
   *
   * El nombre lleva la fecha y hora porque el archivo se sube ANTES de la operación —su ruta va
   * dentro del request— y en ese momento todavía no existe ningún id de pago con el que nombrarlo.
   * La hora además evita que dos cobros del mismo día al mismo préstamo se pisen, algo que sí
   * pasaría con un nombre fijo: el backend sobrescribe (`REPLACE_EXISTING`).
   */
  archivar(archivo: File, carpeta: string, nombreBase: string): Observable<ResultadoArchivado> {
    const problema = this.problemaDelArchivo(archivo);
    if (problema) return of({ ruta: null, error: problema });

    const extension = archivo.name.slice(archivo.name.lastIndexOf('.')).toLowerCase();
    const nombre = `${nombreBase}-${this.marcaDeTiempo()}${extension}`;

    return this.fileService.uploadFileCustomPath(archivo, carpeta, nombre).pipe(
      map((resp) =>
        resp?.success && resp.filePath
          ? { ruta: resp.filePath, error: null }
          : { ruta: null, error: resp?.message || 'El servidor no devolvió la ruta del archivo.' }
      ),
      catchError((e: Error) =>
        of({ ruta: null, error: e?.message ?? 'No se pudo contactar al servidor de archivos.' })
      )
    );
  }

  /**
   * Borra un comprobante que quedó subido pero cuya operación no llegó a registrarse. Es limpieza:
   * si falla no hay nada que avisarle al usuario, que ya tiene el error de la operación en pantalla.
   */
  descartar(ruta: string | null): void {
    if (!ruta) return;
    this.fileService.deleteFile(ruta).subscribe({ error: () => undefined });
  }

  /** Mensaje único para cuando el cobro se aborta porque el comprobante no se pudo archivar. */
  mensajeDeFallo(detalle: string): string {
    return `No se registró la operación: el comprobante no se pudo archivar. ${detalle}`;
  }

  /** `yyyyMMddHHmmss` de ahora, para que el nombre del comprobante sea único dentro de su carpeta. */
  private marcaDeTiempo(): string {
    const ahora = new Date();
    const dos = (n: number) => String(n).padStart(2, '0');
    return (
      `${ahora.getFullYear()}${dos(ahora.getMonth() + 1)}${dos(ahora.getDate())}` +
      `${dos(ahora.getHours())}${dos(ahora.getMinutes())}${dos(ahora.getSeconds())}`
    );
  }
}

import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { NovedadIess } from '../model/novedad-iess';
import { ServiciosRhh } from './ws-rrh';

/**
 * El archivo batch y lo que el servidor cuenta sobre él.
 *
 * Lo que importa no cabe en el contenido: el nombre lo decide el backend —`SAL_2026-03.txt`—, y
 * el aviso puede decir que ese archivo **no se debe subir al portal**, por ejemplo cuando se
 * generó con un tipo de empleador provisional. Un archivo así es correcto en forma y equivocado
 * en fondo: parece bueno y el IESS lo rechazaría, o peor, lo aceptaría mal.
 */
export interface ArchivoBatch {
  contenido: Blob;
  nombre: string;
  registros: number;
  /** Texto del servidor, si tiene algo que advertir. Se muestra entero. */
  aviso: string | null;
  /** El servidor dice que este archivo no debe subirse. */
  noSubir: boolean;
}

/**
 * Nombre del archivo tal como lo decidió el servidor.
 *
 * Se lee del `Content-Disposition` en vez de componerlo aquí: el patrón —código de tres letras
 * más el período— lo fija el IESS y ya vive en el backend. Si no viene, un nombre genérico es
 * mejor que inventar uno que parezca oficial sin serlo.
 */
function nombreDelArchivo(contentDisposition: string | null): string {
  const encontrado = contentDisposition?.match(/filename="?([^"]+)"?/);
  return encontrado?.[1]?.trim() || 'novedades_iess.txt';
}

/** CRUD de RHH.NVIS. */
@Injectable({
  providedIn: 'root',
})
export class NovedadIessService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<NovedadIess[] | null> {
    const url = `${ServiciosRhh.RS_NVIS}/getAll`;
    return this.http.get<NovedadIess[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<NovedadIess | null> {
    const url = `${ServiciosRhh.RS_NVIS}/getId/${id}`;
    return this.http.get<NovedadIess>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<NovedadIess | null> {
    return this.http
      .post<NovedadIess>(ServiciosRhh.RS_NVIS, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<NovedadIess | null> {
    return this.http
      .put<NovedadIess>(ServiciosRhh.RS_NVIS, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<NovedadIess[] | null> {
    const url = `${ServiciosRhh.RS_NVIS}/selectByCriteria/`;
    return this.http.post<NovedadIess[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<NovedadIess | null> {
    const url = `${ServiciosRhh.RS_NVIS}/${id}`;
    return this.http.delete<NovedadIess>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  /**
   * `POST /rest/nvis/registrar` — alta manual de una novedad.
   *
   * **No usa el `POST` del CRUD, y la diferencia es la fecha límite.** El CRUD guarda la entidad
   * tal cual: comprobado el 2026-08-21, un alta sin `fechaLimite` la deja en `null`. Y una
   * novedad sin plazo es justo la que se escapa — la pantalla la pinta con «—» en la columna que
   * existe para vigilarla, y no aparece entre las vencidas por mucho que lo esté.
   *
   * El plazo **no se calcula aquí**. Vive en `PDTRVLRN` del rubro 204 —los once tipos lo tienen
   * parametrizado, verificado— y lo resuelve `calculaFechaLimite` en el servicio del backend, que
   * es donde ya lo resuelven los generadores automáticos. Duplicarlo en el frontend pondría la
   * misma norma en dos sitios que envejecerían por separado.
   *
   * **Pendiente del backend a 2026-08-21:** el endpoint no existe todavía (405). Hasta que lo
   * publique, el alta falla con su mensaje a la vista en vez de crear novedades sin plazo, que
   * sería peor que no crearlas.
   */
  registrar(datos: any): Observable<NovedadIess | null> {
    return this.http
      .post<NovedadIess>(
        `${ServiciosRhh.RS_NVIS}/registrar`,
        { ...datos, usuario: usuarioSesion() },
        this.httpOptions,
      )
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  // ─── Ciclo de la novedad ante el IESS ──────────────────────────────────────
  //
  // Las cuatro acciones van a **endpoints de proceso** (`PUT /rest/nvis/<accion>/{id}`), no al
  // `PUT` del CRUD. La diferencia no es de estilo: **la máquina de estados vive en el servicio
  // del backend**, que rechaza la transición ilegal con el estado actual y los admitidos en el
  // mensaje. La pantalla sigue replicándola en `accionesDisponibles` para no ofrecer lo que no
  // toca, pero replicar no es impedir — y ahora quien impide es el backend.
  //
  // Migradas del `PUT` del CRUD el 2026-08-21, en cuanto el backend las publicó. Cambió el cuerpo
  // de estos cuatro métodos y nada más: ni el componente ni el modelo se enteraron.
  //
  // El cuerpo es un mapa de texto plano —el backend lo recibe como `Map<String,String>`—, y el
  // error se propaga entero para que `mensajeDeError` saque el mensaje de negocio: es el que
  // nombra la transición rechazada.

  /**
   * Registra que la novedad se envió al IESS.
   *
   * La fecha de reporte y el código IESS de la causa los sella el backend, que los vuelve a
   * resolver del rubro justo antes de guardarlos. `lote` es el número de comprobante del envío,
   * opcional mientras no haya exportador que lo genere.
   */
  marcarEnviada(novedad: NovedadIess, lote?: string): Observable<NovedadIess | null> {
    return this.proceso(novedad, 'marcarEnviada', { lote: lote?.trim() ?? '' });
  }

  /** El IESS la aceptó. La fecha de reporte no se toca: es la del envío, no la de la respuesta. */
  marcarAceptada(novedad: NovedadIess): Observable<NovedadIess | null> {
    return this.proceso(novedad, 'marcarAceptada', {});
  }

  /**
   * El IESS la devolvió. El motivo es obligatorio —lo exige el backend— porque sin él nadie sabe
   * después qué corregir. Va a `NVISRSPT`, su columna, y sustituye lo que hubiera: la respuesta
   * vigente del IESS es la última, no un historial.
   */
  marcarRechazada(novedad: NovedadIess, motivo: string): Observable<NovedadIess | null> {
    return this.proceso(novedad, 'marcarRechazada', { motivo: motivo.trim() });
  }

  /**
   * Descarta la novedad sin borrarla: el rastro explica por qué el mes se pudo cerrar.
   *
   * El backend **no admite anular una ACEPTADA**: ya existe en la historia laboral del afiliado y
   * borrarla de nuestro lado sólo lograría que los dos sistemas dejaran de coincidir. Lo que
   * corresponde entonces es reportar la novedad contraria.
   */
  anular(novedad: NovedadIess, motivo: string): Observable<NovedadIess | null> {
    return this.proceso(novedad, 'anular', { motivo: motivo.trim() });
  }

  /**
   * Lanza una de las cuatro acciones de proceso.
   *
   * `usuario` se pone aquí desde la sesión y nunca lo escribe la pantalla, igual que en el resto
   * de los procesos del módulo.
   */
  private proceso(
    novedad: NovedadIess,
    accion: string,
    datos: Record<string, string>,
  ): Observable<NovedadIess | null> {
    return this.http
      .put<NovedadIess>(
        `${ServiciosRhh.RS_NVIS}/${accion}/${novedad.codigo}`,
        { ...datos, usuario: usuarioSesion() },
        this.httpOptions,
      )
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  /**
   * `POST /rest/nvis/exportarBatch` — archivo de carga masiva de un tipo, del §2.2 de la
   * normativa.
   *
   * **El comportamiento que importa es el del error.** Mientras falte algún código de un dígito
   * del formato —los que `sql/41` deja en `'?'` porque el portal exige credenciales para
   * consultarlos—, el exportador **se niega a generar** en vez de escribir un archivo que el IESS
   * rechazaría. Ese rechazo llega como mensaje de negocio y la pantalla lo enseña **entero y sin
   * reformular**: es lo único que le dice al usuario qué falta por cerrar.
   *
   * La ventana del mes la calcula el backend a partir de `idPeriodo`, no se le mandan fechas: así
   * la definición de «qué novedades son de este mes» vive en un solo sitio y no puede divergir de
   * la que usa la regla de cierre.
   *
   * Responde `text/plain`, no JSON, y se pide como `blob` para conservar el archivo tal cual. Por
   * eso no lleva `handleError`: el error se propaga entero para que la pantalla pueda desenvolver
   * el `Blob` y sacar el texto del backend.
   */
  exportarBatch(idPeriodo: number, tipoNovedad: number): Observable<ArchivoBatch> {
    return this.http
      .post(
        `${ServiciosRhh.RS_NVIS}/exportarBatch`,
        { idPeriodo, tipoNovedad, usuario: usuarioSesion() },
        { ...this.httpOptions, responseType: 'blob', observe: 'response' },
      )
      .pipe(
        map((respuesta) => ({
          contenido: respuesta.body ?? new Blob(),
          nombre: nombreDelArchivo(respuesta.headers.get('Content-Disposition')),
          registros: Number(respuesta.headers.get('X-Saa-Registros')) || 0,
          aviso: respuesta.headers.get('X-Saa-Aviso'),
          noSubir: respuesta.headers.get('X-Saa-No-Subir') === 'true',
        })),
        catchError((error) => throwError(() => error)),
      );
  }

  // Manejo de errores HTTP (respetando patrón de of(null) con status 200)
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}

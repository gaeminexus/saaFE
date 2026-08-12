import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, from, of, switchMap, throwError } from 'rxjs';
import {
  ArchivoPetroDescargado,
  GeneracionArchivoPetro,
  ResultadoEliminacionPetro,
  ResultadoGeneracionPetro,
} from '../model/generacion-archivo-petro';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root',
})
export class GeneracionArchivoPetroService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<GeneracionArchivoPetro[] | null> {
    const url = `${ServiciosCrd.RS_GNAP}/getAll`;
    return this.http.get<GeneracionArchivoPetro[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<GeneracionArchivoPetro | null> {
    const url = `${ServiciosCrd.RS_GNAP}/getId/${id}`;
    return this.http.get<GeneracionArchivoPetro>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<GeneracionArchivoPetro | null> {
    return this.http
      .post<GeneracionArchivoPetro>(ServiciosCrd.RS_GNAP, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<GeneracionArchivoPetro | null> {
    return this.http
      .put<GeneracionArchivoPetro>(ServiciosCrd.RS_GNAP, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<GeneracionArchivoPetro[] | null> {
    const url = `${ServiciosCrd.RS_GNAP}/selectByCriteria/`;
    return this.http
      .post<GeneracionArchivoPetro[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Paso 2: arma el detalle y escribe el TXT. Es el proceso pesado y no lleva
   * body — el usuario sale de la cabecera creada en el paso 1.
   */
  generarArchivo(codigoGeneracion: number): Observable<ResultadoGeneracionPetro> {
    const url = `${ServiciosCrd.RS_GNAP}/generarArchivo/${codigoGeneracion}`;
    return this.http
      .post<ResultadoGeneracionPetro>(url, null, this.httpOptions)
      .pipe(catchError(GeneracionArchivoPetroService.errorJson));
  }

  /**
   * Paso 3: descarga el TXT por el endpoint del backend, que estampa
   * `fechaDescarga`/`usuarioDescarga`. No usar el genérico /files/download: sin
   * esa marca el sistema dejaría borrar generaciones ya entregadas a Petro.
   */
  descargarArchivo(codigoGeneracion: number, usuario?: string): Observable<ArchivoPetroDescargado> {
    const url = `${ServiciosCrd.RS_GNAP}/descargarArchivo/${codigoGeneracion}`;
    let params = new HttpParams();
    if (usuario) {
      params = params.set('usuario', usuario);
    }

    return this.http
      .get(url, { params, responseType: 'blob', observe: 'response' })
      .pipe(
        switchMap((resp) =>
          of({
            blob: resp.body ?? new Blob(),
            nombreArchivo: GeneracionArchivoPetroService.nombreDesdeContentDisposition(
              resp.headers.get('Content-Disposition')
            ),
          })
        ),
        catchError(GeneracionArchivoPetroService.errorTextoPlano)
      );
  }

  /**
   * Borra en cascada CXPG → PDGA → DTGA → GNAP y el TXT del disco. El backend
   * rechaza con 409 si la generación ya fue descargada, enviada o procesada.
   */
  eliminar(codigoGeneracion: number, usuario?: string): Observable<ResultadoEliminacionPetro> {
    const url = `${ServiciosCrd.RS_GNAP}/eliminar/${codigoGeneracion}`;
    let params = new HttpParams();
    if (usuario) {
      params = params.set('usuario', usuario);
    }

    return this.http
      .delete<ResultadoEliminacionPetro>(url, { params })
      .pipe(catchError(GeneracionArchivoPetroService.errorJson));
  }

  /** Nombre real del archivo, si el servidor expone la cabecera. */
  private static nombreDesdeContentDisposition(disposition: string | null): string {
    const match = /filename="?([^";]+)"?/.exec(disposition ?? '');
    return match ? match[1].trim() : '';
  }

  /**
   * Los endpoints de generación y eliminación devuelven el error como
   * `{ "error": "..." }`, ya redactado en español para mostrarse tal cual.
   */
  private static errorJson(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'No se pudo completar la operación.';
    const cuerpo = error.error;

    if (typeof cuerpo === 'string' && cuerpo.trim()) {
      mensaje = cuerpo;
    } else if (cuerpo?.error) {
      mensaje = cuerpo.error;
    } else if (cuerpo?.mensaje) {
      mensaje = cuerpo.mensaje;
    } else if (error.message) {
      mensaje = error.message;
    }

    return throwError(() => new Error(mensaje));
  }

  /**
   * El endpoint de descarga devuelve sus errores en texto plano, no JSON, y
   * como se pidió un blob hay que leerlo antes de poder mostrarlo.
   */
  private static errorTextoPlano(error: HttpErrorResponse): Observable<never> {
    const cuerpo = error.error;

    if (cuerpo instanceof Blob) {
      return from(cuerpo.text()).pipe(
        switchMap((texto) =>
          throwError(() => new Error(texto?.trim() || 'No se pudo descargar el archivo.'))
        )
      );
    }

    if (typeof cuerpo === 'string' && cuerpo.trim()) {
      return throwError(() => new Error(cuerpo));
    }

    return throwError(() => new Error(error.message || 'No se pudo descargar el archivo.'));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}

import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { empresaSesionCodigo } from '../../../shared/services/empresa-sesion';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import {
  CargaMarcaciones,
  ResultadoImportacionMarcaciones,
} from '../model/carga-marcaciones';
import { ServiciosRhh } from './ws-rrh';

/**
 * Importación de marcaciones del reloj biométrico (RHH.CRMR), con sus tres procesos.
 *
 * El ciclo es previsualizar → confirmar → (si hizo falta) anular. `previsualizar` **no persiste
 * nada**: devuelve el mismo recuento que devolvería `confirmar`, para poder decidir con el
 * resultado a la vista.
 */
@Injectable({
  providedIn: 'root',
})
export class CargaMarcacionesService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<CargaMarcaciones[] | null> {
    const url = `${ServiciosRhh.RS_CRMR}/getAll`;
    return this.http.get<CargaMarcaciones[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<CargaMarcaciones | null> {
    const url = `${ServiciosRhh.RS_CRMR}/getId/${id}`;
    return this.http.get<CargaMarcaciones>(url).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<CargaMarcaciones[] | null> {
    const url = `${ServiciosRhh.RS_CRMR}/selectByCriteria/`;
    return this.http.post<CargaMarcaciones[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  // ─── Procesos ──────────────────────────────────────────────────────────────

  /** POST /rest/crmr/previsualizar — no persiste: solo dice qué entraría. */
  previsualizar(archivo: File, idFormato: number): Observable<ResultadoImportacionMarcaciones> {
    const url = `${ServiciosRhh.RS_CRMR}/previsualizar`;
    return this.http
      .post<ResultadoImportacionMarcaciones>(url, this.cuerpoMultipart(archivo, idFormato))
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  /** POST /rest/crmr/confirmar?usuarioRegistro= — persiste el lote y sus marcaciones. */
  confirmar(archivo: File, idFormato: number): Observable<ResultadoImportacionMarcaciones> {
    const url = `${ServiciosRhh.RS_CRMR}/confirmar`;
    const params = new HttpParams().set('usuarioRegistro', usuarioSesion());
    return this.http
      .post<ResultadoImportacionMarcaciones>(url, this.cuerpoMultipart(archivo, idFormato), {
        params,
      })
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  /**
   * POST /rest/crmr/anular/{idCarga} — retira el lote.
   *
   * El backend **rechaza la anulación si alguna de sus marcaciones ya se consolidó**: quitarla
   * dejaría el resumen diario apoyado en datos que ya no existen.
   */
  anular(idCarga: number, motivo: string): Observable<unknown> {
    const url = `${ServiciosRhh.RS_CRMR}/anular/${idCarga}`;
    const cuerpo = { motivo, usuarioRegistro: usuarioSesion() };
    return this.http
      .post(url, cuerpo, this.httpOptions)
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  /** Sin `Content-Type`: el navegador debe poner el suyo con el boundary del multipart. */
  private cuerpoMultipart(archivo: File, idFormato: number): FormData {
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);
    formData.append('archivoNombre', archivo.name);
    formData.append('idFormato', String(idFormato));
    formData.append('idEmpresa', String(empresaSesionCodigo() ?? ''));
    return formData;
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}

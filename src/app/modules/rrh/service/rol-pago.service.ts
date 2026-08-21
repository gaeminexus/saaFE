import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { RolPago } from '../model/rolPago';
import { ServiciosRhh } from './ws-rrh';

/**
 * Rol de pago individual (RHH.RLPG): CRUD más los tres endpoints de proceso de
 * `GeneracionRolPagoService`.
 *
 * Estos tres no están en la sección 6 del documento maestro —se acordaron después, al arrancar
 * la fase 5—, así que quedan documentados aquí con su firma.
 */
@Injectable({
  providedIn: 'root',
})
export class RolPagoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<RolPago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_RLPG}${wsGetById}`;
    return this.http.get<RolPago[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<RolPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_RLPG}${wsGetById}${id}`;
    return this.http.get<RolPago>(url).pipe(catchError(this.handleError));
  }

  /** POST: add new record */
  add(datos: any): Observable<RolPago | null> {
    return this.http
      .post<RolPago>(ServiciosRhh.RS_RLPG, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** PUT: update record */
  update(datos: any): Observable<RolPago | null> {
    return this.http
      .put<RolPago>(ServiciosRhh.RS_RLPG, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<RolPago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_RLPG}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas.
        // Un período todavía sin roles generados es lo normal, no un fallo de carga.
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  /** DELETE */
  delete(id: any): Observable<RolPago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_RLPG}${wsEndpoint}`;
    return this.http.delete<RolPago>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  // ─── Procesos de GeneracionRolPagoService ──────────────────────────────────

  /**
   * POST /rest/rlpg/generar/{idPeriodo}?usuarioRegistro= — devuelve el número de roles generados.
   *
   * **La vía normal no es esta.** Los roles se generan solos al aprobar el período; este
   * endpoint es la regeneración, para un período que se reabrió y recalculó, o para uno
   * aprobado antes de que la generación existiera. Por eso la pantalla lo ofrece únicamente
   * sobre períodos ya aprobados.
   */
  generar(idPeriodo: number): Observable<number> {
    return this.proceso<number>(`/generar/${idPeriodo}`, null);
  }

  /**
   * POST /rest/rlpg/registrarRecepcion?usuarioRegistro= — deja constancia de que el colaborador
   * recibió su rol. Devuelve el número de roles marcados.
   *
   * El cuerpo es la lista de códigos de rol, así que el usuario va por query: el servidor marca
   * `recibido='S'` y sella `fechaEnvio` con la fecha del día cuando está en nulo. **La fecha no
   * se envía desde aquí.**
   */
  registrarRecepcion(codigosRol: number[]): Observable<number> {
    return this.proceso<number>('/registrarRecepcion', codigosRol);
  }

  /**
   * GET /rest/rlpg/verificar/{id} — contrasta el `hash` guardado contra los valores actuales de
   * la nómina. `false` significa que el rol entregado ya no representa lo que dice la nómina,
   * típicamente porque el período se reabrió y se recalculó después de emitirlo.
   */
  verificar(idRol: number): Observable<boolean> {
    const url = `${ServiciosRhh.RS_RLPG}/verificar/${idRol}`;
    return this.http
      .get<boolean>(url)
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  /**
   * Los procesos no devuelven listas vacías por convención, así que su error sí es un error: se
   * propaga tal cual para que la pantalla muestre el mensaje del backend.
   *
   * Los dos POST de `rlpg` llevan `?usuarioRegistro=`, que el backend lee con `@QueryParam`:
   * uno no tiene cuerpo y el otro lo tiene ocupado por la lista de ids. Alimenta `RLPGUSRR`.
   */
  private proceso<T>(ruta: string, cuerpo: unknown): Observable<T> {
    const url = `${ServiciosRhh.RS_RLPG}${ruta}`;
    const opciones = {
      ...this.httpOptions,
      params: new HttpParams().set('usuarioRegistro', usuarioSesion()),
    };

    return this.http
      .post<T>(url, cuerpo, opciones)
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}

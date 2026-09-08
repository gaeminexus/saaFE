import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import {
  AnularAprobacionSolicitudVacacionesRequest,
  AprobarSolicitudVacacionesRequest,
  RechazarSolicitudVacacionesRequest,
  SolicitudVacaciones,
} from '../model/solicitud-vacaciones';
import { ServiciosRhh } from './ws-rrh';

@Injectable({
  providedIn: 'root',
})
export class SolicitudVacacionesService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<SolicitudVacaciones[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_SLCT}${wsGetById}`;
    return this.http.get<SolicitudVacaciones[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<SolicitudVacaciones | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_SLCT}${wsGetById}${id}`;
    return this.http.get<SolicitudVacaciones>(url).pipe(catchError(this.handleError));
  }

  /** POST: add new record */
  add(datos: any): Observable<SolicitudVacaciones | null> {
    return this.http
      .post<SolicitudVacaciones>(ServiciosRhh.RS_SLCT, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** PUT: update record */
  update(datos: any): Observable<SolicitudVacaciones | null> {
    return this.http
      .put<SolicitudVacaciones>(ServiciosRhh.RS_SLCT, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<SolicitudVacaciones[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_SLCT}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  /** DELETE */
  delete(id: any): Observable<SolicitudVacaciones | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_SLCT}${wsEndpoint}`;
    return this.http
      .delete<SolicitudVacaciones>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * POST /slct/aprobar/{id} — valida días disponibles, consume el saldo FIFO y genera la novedad
   * de "Vacaciones pagadas" del período de la fecha de inicio. Devuelve la solicitud actualizada.
   */
  aprobar(id: number, datos: AprobarSolicitudVacacionesRequest): Observable<SolicitudVacaciones | null> {
    return this.http
      .post<SolicitudVacaciones>(`${ServiciosRhh.RS_SLCT}/aprobar/${id}`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** POST /slct/rechazar/{id} — no toca saldo ni novedad. */
  rechazar(id: number, datos: RechazarSolicitudVacacionesRequest): Observable<SolicitudVacaciones | null> {
    return this.http
      .post<SolicitudVacaciones>(`${ServiciosRhh.RS_SLCT}/rechazar/${id}`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * POST /slct/anularAprobacion/{id} — devuelve el saldo a los años exactos de donde salió y
   * retira la novedad. Sólo para una solicitud que YA estaba APROBADA (rechaza si la novedad ya
   * entró en un rol pagado).
   */
  anularAprobacion(
    id: number,
    datos: AnularAprobacionSolicitudVacacionesRequest,
  ): Observable<SolicitudVacaciones | null> {
    return this.http
      .post<SolicitudVacaciones>(`${ServiciosRhh.RS_SLCT}/anularAprobacion/${id}`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}

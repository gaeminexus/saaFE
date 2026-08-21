import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { TipoContratoEmpleado } from '../model/tipo-contrato-empleado';
import { ServiciosRhh } from './ws-rrh';

@Injectable({
  providedIn: 'root',
})
export class TipoContratoEmpleadoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<TipoContratoEmpleado[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_TPCE}${wsGetById}`;
    return this.http.get<TipoContratoEmpleado[]>(url, this.httpOptions).pipe(
      catchError((error) => {
        return this.handleError(error);
      }),
    );
  }

  getById(id: string): Observable<TipoContratoEmpleado | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_TPCE}${wsGetById}${id}`;
    return this.http.get<TipoContratoEmpleado>(url).pipe(catchError(this.handleError));
  }

  /** POST: add new record */
  add(datos: any): Observable<TipoContratoEmpleado | null> {
    return this.http.post<TipoContratoEmpleado>(ServiciosRhh.RS_TPCE, datos, this.httpOptions).pipe(
      catchError((error) => {
        return this.handleError(error);
      }),
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TipoContratoEmpleado | null> {
    return this.http
      .put<TipoContratoEmpleado>(ServiciosRhh.RS_TPCE, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos?: any): Observable<TipoContratoEmpleado[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_TPCE}${wsEndpoint}`;
    const payload = Array.isArray(datos) ? datos : [];
    return this.http.post<TipoContratoEmpleado[]>(url, payload, this.httpOptions).pipe(
      catchError((error) => {
        return this.handleError(error);
      }),
    );
  }

  /** DELETE */
  delete(id: any): Observable<TipoContratoEmpleado | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_TPCE}${wsEndpoint}`;
    return this.http
      .delete<TipoContratoEmpleado>(url, this.httpOptions)
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

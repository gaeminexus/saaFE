import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCrd } from './ws-crd';
import { TransaccionesAsoprep } from '../model/transacciones-asoprep';

@Injectable({
  providedIn: 'root',
})
export class TransaccionesAsoprepService {


   httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TransaccionesAsoprep[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_TRAS}${wsGetById}`;
    return this.http.get<TransaccionesAsoprep[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TransaccionesAsoprep | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_TRAS}${wsGetById}${id}`;
    return this.http.get<TransaccionesAsoprep>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TransaccionesAsoprep | null> {
    return this.http.post<TransaccionesAsoprep>(ServiciosCrd.RS_TRAS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TransaccionesAsoprep | null> {
    return this.http.put<TransaccionesAsoprep>(ServiciosCrd.RS_TRAS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TransaccionesAsoprep[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_TRAS}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TransaccionesAsoprep | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_TRAS}${wsEndpoint}`;
    return this.http.delete<TransaccionesAsoprep>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }

}

import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { SubdetalleAsiento } from '../model/subdetalle-asiento';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class SubdetalleAsientoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<SubdetalleAsiento[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_SDAS}${wsGetById}`;
    return this.http.get<SubdetalleAsiento[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<SubdetalleAsiento | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_SDAS}${wsGetById}${id}`;
    return this.http.get<SubdetalleAsiento>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: agrega un nuevo SubdetalleAsiento */
  add(datos: any): Observable<SubdetalleAsiento | null> {
    return this.http.post<SubdetalleAsiento>(ServiciosCnt.RS_SDAS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: actualiza un SubdetalleAsiento existente */
  update(datos: any): Observable<SubdetalleAsiento | null> {
    return this.http.put<SubdetalleAsiento>(ServiciosCnt.RS_SDAS, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<SubdetalleAsiento[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_SDAS}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // Sin registros (404, 204, 200-vacío) → lista vacía, sin error en consola
        if (+error.status === 200 || +error.status === 404 || +error.status === 204) {
          return of([]);
        }
        return of([]);
      })
    );
  }

  /** DELETE: elimina un SubdetalleAsiento por código */
  delete(datos: any): Observable<SubdetalleAsiento | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_SDAS}${wsGetById}`;
    return this.http.delete<SubdetalleAsiento>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  // tslint:disable-next-line: typedef
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }

}

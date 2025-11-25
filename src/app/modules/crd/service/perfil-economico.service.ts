import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PerfilEconomico } from '../model/perfil-economico';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class PerfilEconomicoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<PerfilEconomico[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_PREC}${wsGetById}`;
    return this.http.get<PerfilEconomico[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<PerfilEconomico | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_PREC}${wsGetById}${id}`;
    return this.http.get<PerfilEconomico>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<PerfilEconomico | null> {
    return this.http.post<PerfilEconomico>(ServiciosCrd.RS_PREC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<PerfilEconomico | null> {
    return this.http.put<PerfilEconomico>(ServiciosCrd.RS_PREC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<PerfilEconomico[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_PREC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<PerfilEconomico | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_PREC}${wsEndpoint}`;
    return this.http.delete<PerfilEconomico>(url, this.httpOptions).pipe(
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

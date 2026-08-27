import { HttpHeaders, HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Direccion } from '../model/direccion';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class DireccionService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Direccion[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_DRCC}${wsGetById}`;
    return this.http.get<Direccion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Direccion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_DRCC}${wsGetById}${id}`;
    return this.http.get<Direccion>(url).pipe(
      catchError(this.handleError)
    );
  }

  getByParent(id: number): Observable<Direccion[] | null> {
    const wsGetById = '/getByParent/';
    const url = `${ServiciosCrd.RS_DRCC}${wsGetById}${id}`;
    return this.http.get<Direccion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record. `usuario` (opcional): sella la auditoría de ENTD (pedido 9). */
  add(datos: any, usuario?: string): Observable<Direccion | null> {
    return this.http.post<Direccion>(ServiciosCrd.RS_DRCC, datos, { ...this.httpOptions, params: this.paramsUsuario(usuario) }).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record. `usuario` (opcional): ver `add()`. */
  update(datos: any, usuario?: string): Observable<Direccion | null> {
    return this.http.put<Direccion>(ServiciosCrd.RS_DRCC, datos, { ...this.httpOptions, params: this.paramsUsuario(usuario) }).pipe(
      catchError(this.handleError)
    );
  }

  private paramsUsuario(usuario?: string): HttpParams {
    return usuario ? new HttpParams().set('usuario', usuario) : new HttpParams();
  }

  selectByCriteria(datos: any): Observable<Direccion[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_DRCC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<Direccion | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_DRCC}${wsEndpoint}`;
    return this.http.delete<Direccion>(url, this.httpOptions).pipe(
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

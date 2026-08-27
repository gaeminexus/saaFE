import { HttpHeaders, HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Participe } from '../model/participe';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class ParticipeService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Participe[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_PRTC}${wsGetById}`;
    return this.http.get<Participe[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Participe | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_PRTC}${wsGetById}${id}`;
    return this.http.get<Participe>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record. `usuario` (opcional): sella la auditoría de ENTD (pedido 9). */
  add(datos: any, usuario?: string): Observable<Participe | null> {
    return this.http.post<Participe>(ServiciosCrd.RS_PRTC, datos, { ...this.httpOptions, params: this.paramsUsuario(usuario) }).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record. `usuario` (opcional): ver `add()`. */
  update(datos: any, usuario?: string): Observable<Participe | null> {
    return this.http.put<Participe>(ServiciosCrd.RS_PRTC, datos, { ...this.httpOptions, params: this.paramsUsuario(usuario) }).pipe(
      catchError(this.handleError)
    );
  }

  private paramsUsuario(usuario?: string): HttpParams {
    return usuario ? new HttpParams().set('usuario', usuario) : new HttpParams();
  }

  selectByCriteria(datos: any): Observable<Participe[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_PRTC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: delete record */
  delete(id: any): Observable<Participe | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCrd.RS_PRTC}${wsEndpoint}`;
    return this.http.delete<Participe>(url, this.httpOptions).pipe(
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

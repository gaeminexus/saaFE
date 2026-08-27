import { HttpHeaders, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { Conyuge } from '../model/conyuge';
import { ServiciosCrd } from './ws-crd';

@Injectable({ providedIn: 'root' })
export class ConyugeService {

  httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Conyuge[] | null> {
    return this.http.get<Conyuge[]>(`${ServiciosCrd.RS_CNYG}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<Conyuge | null> {
    return this.http.get<Conyuge>(`${ServiciosCrd.RS_CNYG}/getId/${id}`).pipe(catchError(this.handleError));
  }

  getByParent(idEntidad: number): Observable<Conyuge[] | null> {
    return this.http.get<Conyuge[]>(`${ServiciosCrd.RS_CNYG}/getByParent/${idEntidad}`).pipe(catchError(this.handleError));
  }

  /** `usuario` (opcional): sella la auditoría de ENTD (pedido 9). */
  add(datos: any, usuario?: string): Observable<Conyuge | null> {
    return this.http.post<Conyuge>(ServiciosCrd.RS_CNYG, datos, { ...this.httpOptions, params: this.paramsUsuario(usuario) }).pipe(catchError(this.handleError));
  }

  /** `usuario` (opcional): ver `add()`. */
  update(datos: any, usuario?: string): Observable<Conyuge | null> {
    return this.http.put<Conyuge>(ServiciosCrd.RS_CNYG, datos, { ...this.httpOptions, params: this.paramsUsuario(usuario) }).pipe(catchError(this.handleError));
  }

  private paramsUsuario(usuario?: string): HttpParams {
    return usuario ? new HttpParams().set('usuario', usuario) : new HttpParams();
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${ServiciosCrd.RS_CNYG}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<null> {
    return of(null);
  }
}

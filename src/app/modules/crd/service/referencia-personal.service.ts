import { HttpHeaders, HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { ReferenciaPersonal } from '../model/referencia-personal';
import { ServiciosCrd } from './ws-crd';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';

@Injectable({ providedIn: 'root' })
export class ReferenciaPersonalService {

  httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getByParent(idEntidad: number): Observable<ReferenciaPersonal[] | null> {
    return this.http.get<ReferenciaPersonal[]>(`${ServiciosCrd.RS_RRPP}/getByParent/${idEntidad}`).pipe(catchError(this.handleError));
  }

  /** `usuario` (opcional): sella la auditoría de ENTD (pedido 9). */
  add(datos: any, usuario?: string): Observable<ReferenciaPersonal | null> {
    return this.http.post<ReferenciaPersonal>(ServiciosCrd.RS_RRPP, datos, { ...this.httpOptions, params: this.paramsUsuario(usuario) }).pipe(catchError(this.handleError));
  }

  /** `usuario` (opcional): ver `add()`. */
  update(datos: any, usuario?: string): Observable<ReferenciaPersonal | null> {
    return this.http.put<ReferenciaPersonal>(ServiciosCrd.RS_RRPP, datos, { ...this.httpOptions, params: this.paramsUsuario(usuario) }).pipe(catchError(this.handleError));
  }

  private paramsUsuario(usuario?: string): HttpParams {
    // U-2: el backend exige el usuario (sellarActualizacion). Siempre el de la sesión; el parámetro
    // `usuario` se conserva por compatibilidad con los llamadores pero ya no se usa.
    return new HttpParams().set('usuario', usuarioSesion());
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${ServiciosCrd.RS_RRPP}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<null> {
    return of(null);
  }
}

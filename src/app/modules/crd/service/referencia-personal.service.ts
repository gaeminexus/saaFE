import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { ReferenciaPersonal } from '../model/referencia-personal';
import { ServiciosCrd } from './ws-crd';

@Injectable({ providedIn: 'root' })
export class ReferenciaPersonalService {

  httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getByParent(idEntidad: number): Observable<ReferenciaPersonal[] | null> {
    return this.http.get<ReferenciaPersonal[]>(`${ServiciosCrd.RS_RRPP}/getByParent/${idEntidad}`).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<ReferenciaPersonal | null> {
    return this.http.post<ReferenciaPersonal>(ServiciosCrd.RS_RRPP, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<ReferenciaPersonal | null> {
    return this.http.put<ReferenciaPersonal>(ServiciosCrd.RS_RRPP, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${ServiciosCrd.RS_RRPP}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<null> {
    return of(null);
  }
}

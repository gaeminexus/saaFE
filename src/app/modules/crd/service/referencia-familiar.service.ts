import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { ReferenciaFamiliar } from '../model/referencia-familiar';
import { ServiciosCrd } from './ws-crd';

@Injectable({ providedIn: 'root' })
export class ReferenciaFamiliarService {

  httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getByParent(idEntidad: number): Observable<ReferenciaFamiliar[] | null> {
    return this.http.get<ReferenciaFamiliar[]>(`${ServiciosCrd.RS_RRFF}/getByParent/${idEntidad}`).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<ReferenciaFamiliar | null> {
    return this.http.post<ReferenciaFamiliar>(ServiciosCrd.RS_RRFF, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<ReferenciaFamiliar | null> {
    return this.http.put<ReferenciaFamiliar>(ServiciosCrd.RS_RRFF, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${ServiciosCrd.RS_RRFF}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<null> {
    return of(null);
  }
}

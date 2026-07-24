import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { CuentaBancariaParticipe } from '../model/cuenta-bancaria-participe';
import { ServiciosCrd } from './ws-crd';

@Injectable({ providedIn: 'root' })
export class CuentaBancariaParticipeService {

  httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getByParent(idEntidad: number): Observable<CuentaBancariaParticipe[] | null> {
    return this.http.get<CuentaBancariaParticipe[]>(`${ServiciosCrd.RS_CNBP}/getByParent/${idEntidad}`).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<CuentaBancariaParticipe | null> {
    return this.http.post<CuentaBancariaParticipe>(ServiciosCrd.RS_CNBP, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<CuentaBancariaParticipe | null> {
    return this.http.put<CuentaBancariaParticipe>(ServiciosCrd.RS_CNBP, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`${ServiciosCrd.RS_CNBP}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<null> {
    return of(null);
  }
}

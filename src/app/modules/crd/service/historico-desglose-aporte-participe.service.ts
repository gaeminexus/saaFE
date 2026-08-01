import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { HistoricoDesgloseAporteParticipe } from '../model/historico-desglose-aporte-participe';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class HistoricoDesgloseAporteParticipeService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<HistoricoDesgloseAporteParticipe[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_HDAP}${wsGetById}`;
    return this.http.get<HistoricoDesgloseAporteParticipe[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<HistoricoDesgloseAporteParticipe | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_HDAP}${wsGetById}${id}`;
    return this.http.get<HistoricoDesgloseAporteParticipe>(url).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<HistoricoDesgloseAporteParticipe[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_HDAP}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
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

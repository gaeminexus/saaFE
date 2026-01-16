import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosRhh } from './ws-rrh';
import { DetalleLiquidacion } from '../model/detalle-liquidacion';

@Injectable({
  providedIn: 'root',
})
export class DetalleLiquidacionService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<DetalleLiquidacion[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosRhh.RS_TMLQ}${wsGetById}`;
    return this.http.get<DetalleLiquidacion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DetalleLiquidacion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosRhh.RS_TMLQ}${wsGetById}${id}`;
    return this.http.get<DetalleLiquidacion>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<DetalleLiquidacion | null> {
    return this.http.post<DetalleLiquidacion>(ServiciosRhh.RS_TMLQ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<DetalleLiquidacion | null> {
    return this.http.put<DetalleLiquidacion>(ServiciosRhh.RS_TMLQ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DetalleLiquidacion[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosRhh.RS_TMLQ}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<DetalleLiquidacion | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosRhh.RS_TMLQ}${wsEndpoint}`;
    return this.http.delete<DetalleLiquidacion>(url, this.httpOptions).pipe(
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


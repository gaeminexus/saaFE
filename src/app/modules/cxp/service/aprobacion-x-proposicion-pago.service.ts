import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { AprobacionXProposicionPago } from '../model/aprobacion_x_proposicion_pago'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class AprobacionXProposicionPagoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<AprobacionXProposicionPago[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_AXPR
}${wsGetById}`;
    return this.http.get<AprobacionXProposicionPago[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<AprobacionXProposicionPago | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_AXPR
}${wsGetById}${id}`;
    return this.http.get<AprobacionXProposicionPago>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<AprobacionXProposicionPago | null> {
    return this.http.post<AprobacionXProposicionPago>(ServiciosCxp.RS_AXPR
, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<AprobacionXProposicionPago | null> {
    return this.http.put<AprobacionXProposicionPago>(ServiciosCxp.RS_AXPR
, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<AprobacionXProposicionPago[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_AXPR
}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<AprobacionXProposicionPago | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_AXPR
}${wsEndpoint}`;
    return this.http.delete<AprobacionXProposicionPago>(url, this.httpOptions).pipe(
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

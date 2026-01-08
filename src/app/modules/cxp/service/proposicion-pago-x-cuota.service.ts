import { ImpuestoXGrupoCobro } from './../../cxc/model/impuesto-x-grupo-cobro';
import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ProposicionPagoXCuota } from '../model/proposicion_pago_x_cuota'
import { ServiciosCxp } from './ws-cxp';

@Injectable({
  providedIn: 'root'
})
export class ProposicionPagoXCuotaService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ProposicionPagoXCuota[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxp.RS_PRPD
}${wsGetById}`;
    return this.http.get<ProposicionPagoXCuota[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ProposicionPagoXCuota | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxp.RS_PRPD

}${wsGetById}${id}`;
    return this.http.get<ProposicionPagoXCuota>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<ProposicionPagoXCuota | null> {
    return this.http.post<ProposicionPagoXCuota>(ServiciosCxp.RS_PRPD

, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<ProposicionPagoXCuota | null> {
    return this.http.put<ProposicionPagoXCuota>(ServiciosCxp.RS_PRPD

, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ProposicionPagoXCuota[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxp.RS_PRPD

}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<ProposicionPagoXCuota | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxp.RS_PRPD

}${wsEndpoint}`;
    return this.http.delete<ProposicionPagoXCuota>(url, this.httpOptions).pipe(
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

import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';
import { TempResumenValorDocumentoCobro } from '../model/temp-resumen-valor-documento-cobro';


@Injectable({
  providedIn: 'root'
})
export class TempResumenValorDocumentoCobroService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<TempResumenValorDocumentoCobro[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCxc.RS_TRDC}${wsGetById}`;
    return this.http.get<TempResumenValorDocumentoCobro[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<TempResumenValorDocumentoCobro | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_TRDC}${wsGetById}${id}`;
    return this.http.get<TempResumenValorDocumentoCobro>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add new record */
  add(datos: any): Observable<TempResumenValorDocumentoCobro | null> {
    return this.http.post<TempResumenValorDocumentoCobro>(ServiciosCxc.RS_TRDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<TempResumenValorDocumentoCobro | null> {
    return this.http.put<TempResumenValorDocumentoCobro>(ServiciosCxc.RS_TRDC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<TempResumenValorDocumentoCobro[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_TRDC}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE */
  delete(id: any): Observable<TempResumenValorDocumentoCobro | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_TRDC}${wsEndpoint}`;
    return this.http.delete<TempResumenValorDocumentoCobro>(url, this.httpOptions).pipe(
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

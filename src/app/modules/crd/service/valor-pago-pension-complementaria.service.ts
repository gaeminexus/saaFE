import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ValorPagoPensionComplementaria } from '../model/valor-pago-pension-complementaria';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class ValorPagoPensionComplementariaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<ValorPagoPensionComplementaria[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_VPPC}${wsGetById}`;
    return this.http.get<ValorPagoPensionComplementaria[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ValorPagoPensionComplementaria | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_VPPC}${wsGetById}${id}`;
    return this.http.get<ValorPagoPensionComplementaria>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<ValorPagoPensionComplementaria | null> {
    return this.http.post<ValorPagoPensionComplementaria>(ServiciosCrd.RS_VPPC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<ValorPagoPensionComplementaria | null> {
    return this.http.put<ValorPagoPensionComplementaria>(ServiciosCrd.RS_VPPC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ValorPagoPensionComplementaria[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_VPPC}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(datos: any): Observable<ValorPagoPensionComplementaria | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCrd.RS_VPPC}${wsGetById}`;
    return this.http.delete<ValorPagoPensionComplementaria>(url, this.httpOptions).pipe(
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

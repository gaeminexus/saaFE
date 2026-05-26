import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { SaldoCuentaG42 } from '../model/saldo-cuenta-g42';
import { ServiciosRpr } from './ws-rpr';

@Injectable({
  providedIn: 'root',
})
export class SaldoCuentaG42Service {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<SaldoCuentaG42[] | null> {
    const url = `${ServiciosRpr.RS_CG42}/getAll`;
    return this.http.get<SaldoCuentaG42[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<SaldoCuentaG42 | null> {
    const url = `${ServiciosRpr.RS_CG42}/getId/${id}`;
    return this.http.get<SaldoCuentaG42>(url).pipe(catchError(this.handleError));
  }

  add(datos: SaldoCuentaG42): Observable<SaldoCuentaG42 | null> {
    return this.http
      .post<SaldoCuentaG42>(ServiciosRpr.RS_CG42, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: SaldoCuentaG42): Observable<SaldoCuentaG42 | null> {
    return this.http
      .put<SaldoCuentaG42>(ServiciosRpr.RS_CG42, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<SaldoCuentaG42 | null> {
    const url = `${ServiciosRpr.RS_CG42}/${id}`;
    return this.http.delete<SaldoCuentaG42>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<SaldoCuentaG42[] | null> {
    const url = `${ServiciosRpr.RS_CG42}/selectByCriteria`;
    return this.http
      .post<SaldoCuentaG42[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}

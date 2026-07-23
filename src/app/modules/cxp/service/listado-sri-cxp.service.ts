import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxp } from './ws-cxp';
import { ListadoSriCxp } from '../model/listado-sri-cxp';

@Injectable({
  providedIn: 'root'
})
export class ListadoSriCxpService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<ListadoSriCxp[] | null> {
    return this.http.get<ListadoSriCxp[]>(`${ServiciosCxp.RS_LSRP}/getAll`).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<ListadoSriCxp | null> {
    return this.http.get<ListadoSriCxp>(`${ServiciosCxp.RS_LSRP}/getId/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<ListadoSriCxp | null> {
    return this.http.post<ListadoSriCxp>(ServiciosCxp.RS_LSRP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<ListadoSriCxp | null> {
    return this.http.put<ListadoSriCxp>(ServiciosCxp.RS_LSRP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ListadoSriCxp[] | null> {
    return this.http.post<ListadoSriCxp[]>(`${ServiciosCxp.RS_LSRP}/selectByCriteria/`, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: number): Observable<ListadoSriCxp | null> {
    return this.http.delete<ListadoSriCxp>(`${ServiciosCxp.RS_LSRP}/${id}`, this.httpOptions).pipe(
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

import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxp } from './ws-cxp';
import { DetalleSriCxp } from '../model/detalle-sri-cxp';

@Injectable({
  providedIn: 'root'
})
export class DetalleSriCxpService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<DetalleSriCxp[] | null> {
    return this.http.get<DetalleSriCxp[]>(`${ServiciosCxp.RS_TSRP}/getAll`).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<DetalleSriCxp | null> {
    return this.http.get<DetalleSriCxp>(`${ServiciosCxp.RS_TSRP}/getId/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<DetalleSriCxp | null> {
    return this.http.post<DetalleSriCxp>(ServiciosCxp.RS_TSRP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<DetalleSriCxp | null> {
    return this.http.put<DetalleSriCxp>(ServiciosCxp.RS_TSRP, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DetalleSriCxp[] | null> {
    return this.http.post<DetalleSriCxp[]>(`${ServiciosCxp.RS_TSRP}/selectByCriteria/`, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: number): Observable<DetalleSriCxp | null> {
    return this.http.delete<DetalleSriCxp>(`${ServiciosCxp.RS_TSRP}/${id}`, this.httpOptions).pipe(
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

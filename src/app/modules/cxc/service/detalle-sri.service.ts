import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';
import { DetalleSri } from '../model/detalle-sri';

@Injectable({
  providedIn: 'root'
})
export class DetalleSriService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<DetalleSri[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosCxc.RS_TSRI}${wsGetAll}`;
    return this.http.get<DetalleSri[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<DetalleSri | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_TSRI}${wsGetById}${id}`;
    return this.http.get<DetalleSri>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<DetalleSri | null> {
    return this.http.post<DetalleSri>(ServiciosCxc.RS_TSRI, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<DetalleSri | null> {
    return this.http.put<DetalleSri>(ServiciosCxc.RS_TSRI, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DetalleSri[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_TSRI}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: number): Observable<DetalleSri | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_TSRI}${wsEndpoint}`;
    return this.http.delete<DetalleSri>(url, this.httpOptions).pipe(
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

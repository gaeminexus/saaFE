import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ServiciosCxc } from './ws-cxc';
import { ListadoSri } from '../model/listado-sri';

@Injectable({
  providedIn: 'root'
})
export class ListadoSriService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<ListadoSri[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosCxc.RS_LSRI}${wsGetAll}`;
    return this.http.get<ListadoSri[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<ListadoSri | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCxc.RS_LSRI}${wsGetById}${id}`;
    return this.http.get<ListadoSri>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<ListadoSri | null> {
    return this.http.post<ListadoSri>(ServiciosCxc.RS_LSRI, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<ListadoSri | null> {
    return this.http.put<ListadoSri>(ServiciosCxc.RS_LSRI, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ListadoSri[] | null> {
    const wsEndpoint = '/selectByCriteria/';
    const url = `${ServiciosCxc.RS_LSRI}${wsEndpoint}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: number): Observable<ListadoSri | null> {
    const wsEndpoint = '/' + id;
    const url = `${ServiciosCxc.RS_LSRI}${wsEndpoint}`;
    return this.http.delete<ListadoSri>(url, this.httpOptions).pipe(
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

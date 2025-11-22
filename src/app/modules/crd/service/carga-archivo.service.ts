import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { CargaArchivo } from '../model/carga-archivo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class CargaArchivoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<CargaArchivo[] | null> {
    const ws = '/getAll';
    const url = `${ServiciosCrd.RS_CRAR}${ws}`;
    return this.http.get<CargaArchivo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<CargaArchivo | null> {
    const ws = '/getId/';
    const url = `${ServiciosCrd.RS_CRAR}${ws}${id}`;
    return this.http.get<CargaArchivo>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<CargaArchivo | null> {
    return this.http.post<CargaArchivo>(ServiciosCrd.RS_CRAR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<CargaArchivo | null> {
    return this.http.put<CargaArchivo>(ServiciosCrd.RS_CRAR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<CargaArchivo[] | null> {
    const ws = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_CRAR}${ws}`;
    return this.http.post<CargaArchivo[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<CargaArchivo | null> {
    const ws = '/' + id;
    const url = `${ServiciosCrd.RS_CRAR}${ws}`;
    return this.http.delete<CargaArchivo>(url, this.httpOptions).pipe(
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

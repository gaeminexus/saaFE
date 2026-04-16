import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleGeneracionArchivo } from '../model/detalle-generacion-archivo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root',
})
export class DetalleGeneracionArchivoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<DetalleGeneracionArchivo[] | null> {
    const url = `${ServiciosCrd.RS_DTGA}/getAll`;
    return this.http.get<DetalleGeneracionArchivo[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<DetalleGeneracionArchivo | null> {
    const url = `${ServiciosCrd.RS_DTGA}/getId/${id}`;
    return this.http.get<DetalleGeneracionArchivo>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<DetalleGeneracionArchivo | null> {
    return this.http
      .post<DetalleGeneracionArchivo>(ServiciosCrd.RS_DTGA, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<DetalleGeneracionArchivo | null> {
    return this.http
      .put<DetalleGeneracionArchivo>(ServiciosCrd.RS_DTGA, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<DetalleGeneracionArchivo[] | null> {
    const url = `${ServiciosCrd.RS_DTGA}/selectByCriteria/`;
    return this.http
      .post<DetalleGeneracionArchivo[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: any): Observable<DetalleGeneracionArchivo | null> {
    const url = `${ServiciosCrd.RS_DTGA}/${id}`;
    return this.http.delete<DetalleGeneracionArchivo>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  getByGeneracion(codigoGeneracion: number): Observable<DetalleGeneracionArchivo[] | null> {
    const url = `${ServiciosCrd.RS_DTGA}/getByGeneracion/${codigoGeneracion}`;
    return this.http.get<DetalleGeneracionArchivo[]>(url).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}

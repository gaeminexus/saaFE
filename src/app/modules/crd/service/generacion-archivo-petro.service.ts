import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { GeneracionArchivoPetro } from '../model/generacion-archivo-petro';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root',
})
export class GeneracionArchivoPetroService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<GeneracionArchivoPetro[] | null> {
    const url = `${ServiciosCrd.RS_GNAP}/getAll`;
    return this.http.get<GeneracionArchivoPetro[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<GeneracionArchivoPetro | null> {
    const url = `${ServiciosCrd.RS_GNAP}/getId/${id}`;
    return this.http.get<GeneracionArchivoPetro>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<GeneracionArchivoPetro | null> {
    return this.http
      .post<GeneracionArchivoPetro>(ServiciosCrd.RS_GNAP, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<GeneracionArchivoPetro | null> {
    return this.http
      .put<GeneracionArchivoPetro>(ServiciosCrd.RS_GNAP, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<GeneracionArchivoPetro[] | null> {
    const url = `${ServiciosCrd.RS_GNAP}/selectByCriteria/`;
    return this.http
      .post<GeneracionArchivoPetro[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: any): Observable<GeneracionArchivoPetro | null> {
    const url = `${ServiciosCrd.RS_GNAP}/${id}`;
    return this.http.delete<GeneracionArchivoPetro>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  generarArchivo(codigoGeneracion: number, parametros: Record<string, string> = {}): Observable<any | null> {
    const url = `${ServiciosCrd.RS_GNAP}/generarArchivo/${codigoGeneracion}`;
    return this.http
      .post<any>(url, parametros, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}

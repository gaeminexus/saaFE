import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ParticipeGeneracionArchivo } from '../model/participe-generacion-archivo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root',
})
export class ParticipeGeneracionArchivoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<ParticipeGeneracionArchivo[] | null> {
    const url = `${ServiciosCrd.RS_PDGA}/getAll`;
    return this.http.get<ParticipeGeneracionArchivo[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<ParticipeGeneracionArchivo | null> {
    const url = `${ServiciosCrd.RS_PDGA}/getId/${id}`;
    return this.http.get<ParticipeGeneracionArchivo>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<ParticipeGeneracionArchivo | null> {
    return this.http
      .post<ParticipeGeneracionArchivo>(ServiciosCrd.RS_PDGA, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<ParticipeGeneracionArchivo | null> {
    return this.http
      .put<ParticipeGeneracionArchivo>(ServiciosCrd.RS_PDGA, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<ParticipeGeneracionArchivo[] | null> {
    const url = `${ServiciosCrd.RS_PDGA}/selectByCriteria/`;
    return this.http
      .post<ParticipeGeneracionArchivo[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: any): Observable<ParticipeGeneracionArchivo | null> {
    const url = `${ServiciosCrd.RS_PDGA}/${id}`;
    return this.http.delete<ParticipeGeneracionArchivo>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  getByDetalle(codigoDetalle: number): Observable<ParticipeGeneracionArchivo[] | null> {
    const url = `${ServiciosCrd.RS_PDGA}/getByDetalle/${codigoDetalle}`;
    return this.http.get<ParticipeGeneracionArchivo[]>(url).pipe(catchError(this.handleError));
  }

  previewByPeriodo(anio: number, mes: number, filial: number): Observable<ParticipeGeneracionArchivo[] | null> {
    const url = `${ServiciosCrd.RS_PDGA}/preview/${anio}/${mes}/${filial}`;
    return this.http.get<ParticipeGeneracionArchivo[]>(url).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}

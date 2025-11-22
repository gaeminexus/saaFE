import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleCargaArchivo } from '../model/detalle-carga-archivo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class DetalleCargaArchivoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<DetalleCargaArchivo[] | null> {
    const ws = '/getAll';
    const url = `${ServiciosCrd.RS_DTCA}${ws}`;
    return this.http.get<DetalleCargaArchivo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<DetalleCargaArchivo | null> {
    const ws = '/getId/';
    const url = `${ServiciosCrd.RS_DTCA}${ws}${id}`;
    return this.http.get<DetalleCargaArchivo>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<DetalleCargaArchivo | null> {
    return this.http.post<DetalleCargaArchivo>(ServiciosCrd.RS_DTCA, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<DetalleCargaArchivo | null> {
    return this.http.put<DetalleCargaArchivo>(ServiciosCrd.RS_DTCA, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<DetalleCargaArchivo[] | null> {
    const ws = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_DTCA}${ws}`;
    return this.http.post<DetalleCargaArchivo[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<DetalleCargaArchivo | null> {
    const ws = '/' + id;
    const url = `${ServiciosCrd.RS_DTCA}${ws}`;
    return this.http.delete<DetalleCargaArchivo>(url, this.httpOptions).pipe(
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

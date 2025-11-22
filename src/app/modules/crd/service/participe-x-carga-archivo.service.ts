import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ParticipeXCargaArchivo } from '../model/participe-x-carga-archivo';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class ParticipeXCargaArchivoService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<ParticipeXCargaArchivo[] | null> {
    const ws = '/getAll';
    const url = `${ServiciosCrd.RS_PXCA}${ws}`;
    return this.http.get<ParticipeXCargaArchivo[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<ParticipeXCargaArchivo | null> {
    const ws = '/getId/';
    const url = `${ServiciosCrd.RS_PXCA}${ws}${id}`;
    return this.http.get<ParticipeXCargaArchivo>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<ParticipeXCargaArchivo | null> {
    return this.http.post<ParticipeXCargaArchivo>(ServiciosCrd.RS_PXCA, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<ParticipeXCargaArchivo | null> {
    return this.http.put<ParticipeXCargaArchivo>(ServiciosCrd.RS_PXCA, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<ParticipeXCargaArchivo[] | null> {
    const ws = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_PXCA}${ws}`;
    return this.http.post<ParticipeXCargaArchivo[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<ParticipeXCargaArchivo | null> {
    const ws = '/' + id;
    const url = `${ServiciosCrd.RS_PXCA}${ws}`;
    return this.http.delete<ParticipeXCargaArchivo>(url, this.httpOptions).pipe(
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

import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Mayorizacion } from '../model/mayorizacion';
import { MayorizacionProceso, ProcesoResponse } from '../model/mayorizacion-proceso';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class MayorizacionService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Mayorizacion[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_MYRZ}${wsGetById}`;
    return this.http.get<Mayorizacion[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Mayorizacion | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_MYRZ}${wsGetById}${id}`;
    return this.http.get<Mayorizacion>(url).pipe(
      catchError(this.handleError)
    );
  }

  mayorizacion(empresa: string, periodoDesde: number, periodoHasta: number, proceso: number): Observable<void | null> {
    const wsGetById = '/mayorizacion/';
    const url = `${ServiciosCnt.RS_MYRZ}${wsGetById}${empresa}/${periodoDesde}/${periodoHasta}/${proceso}`;
    return this.http.get<void>(url).pipe(
      catchError(this.handleError)
    );
  }

  desmayorizacion(empresa: string, periodoDesde: number, periodoHasta: number, proceso: number): Observable<void | null> {
    const wsGetById = '/desmayorizacion/';
    const url = `${ServiciosCnt.RS_MYRZ}${wsGetById}${empresa}/${periodoDesde}/${periodoHasta}/${proceso}`;
    return this.http.get<void>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<Mayorizacion | null> {
    return this.http.post<Mayorizacion>(ServiciosCnt.RS_MYRZ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<Mayorizacion | null> {
    return this.http.put<Mayorizacion>(ServiciosCnt.RS_MYRZ, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Mayorizacion[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_MYRZ}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<Mayorizacion | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_MYRZ}${wsGetById}`;
    return this.http.delete<Mayorizacion>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** Ejecuta el proceso de mayorización */
  ejecutarMayorizacion(datos: MayorizacionProceso): Observable<ProcesoResponse | null> {
    const url = `${ServiciosCnt.RS_MYRZ}/proceso`;
    return this.http.post<ProcesoResponse>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** Ejecuta el proceso de desmayorización */
  ejecutarDesmayorizacion(datos: MayorizacionProceso): Observable<ProcesoResponse | null> {
    const url = `${ServiciosCnt.RS_MYRZ}/desmayorizacion`;
    return this.http.post<ProcesoResponse>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  // tslint:disable-next-line: typedef
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }

}

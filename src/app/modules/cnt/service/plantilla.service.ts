import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { Plantilla } from '../model/plantilla';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root',
})
export class PlantillaService {
  private static readonly EMPRESA_CODIGO = 280;

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Plantilla[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCnt.RS_PLNS}${wsGetById}`;
    return this.http.get<Plantilla[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<Plantilla | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCnt.RS_PLNS}${wsGetById}${id}`;
    return this.http.get<Plantilla>(url).pipe(catchError(this.handleError));
  }

  /** POST: add a new sesion to the server */
  add(datos: any): Observable<Plantilla | null> {
    return this.http
      .post<Plantilla>(ServiciosCnt.RS_PLNS, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** POST: add a new sesion to the server */
  update(datos: any): Observable<Plantilla | null> {
    return this.http
      .put<Plantilla>(ServiciosCnt.RS_PLNS, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<Plantilla[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCnt.RS_PLNS}${wsGetById}`;
    const empresaCodigo = parseInt(localStorage.getItem('idSucursal') || '280', 10);
    // Incluir filtro de empresa en el request
    const criteriosConEmpresa = { ...datos, empresa: { codigo: empresaCodigo } };
    return this.http
      .post<any>(url, criteriosConEmpresa, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** DELETE: add a new sesion to the server */
  delete(datos: any): Observable<Plantilla | null> {
    const wsGetById = '/' + datos;
    const url = `${ServiciosCnt.RS_PLNS}${wsGetById}`;
    return this.http.delete<Plantilla>(url, this.httpOptions).pipe(catchError(this.handleError));
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

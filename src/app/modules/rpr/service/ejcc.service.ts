import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { Ejcc } from '../model/ejcc';
import { ServiciosRpr } from './ws-rpr';

/** Payload para POST /ejcc/ejecutar */
export interface EjecutarReporteCarteraRequest {
  mes: number;
  anio: number;
  usuario: string;
}

/** Respuesta del endpoint ejecutar: puede ser Ejcc o un mensaje informativo */
export type EjecutarReporteCarteraResponse = Ejcc | { mensaje: string };

@Injectable({
  providedIn: 'root',
})
export class EjccService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<Ejcc[] | null> {
    const url = `${ServiciosRpr.RS_EJCC}/getAll`;
    return this.http.get<Ejcc[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<Ejcc | null> {
    const url = `${ServiciosRpr.RS_EJCC}/getId/${id}`;
    return this.http.get<Ejcc>(url).pipe(catchError(this.handleError));
  }

  getByMesAnio(mes: number, anio: number): Observable<Ejcc[] | null> {
    const url = `${ServiciosRpr.RS_EJCC}/getByMesAnio/${mes}/${anio}`;
    return this.http.get<Ejcc[]>(url).pipe(catchError(this.handleError));
  }

  add(datos: Ejcc): Observable<Ejcc | null> {
    return this.http
      .post<Ejcc>(ServiciosRpr.RS_EJCC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: Ejcc): Observable<Ejcc | null> {
    return this.http
      .put<Ejcc>(ServiciosRpr.RS_EJCC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<Ejcc | null> {
    const url = `${ServiciosRpr.RS_EJCC}/${id}`;
    return this.http
      .delete<Ejcc>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<Ejcc[] | null> {
    const url = `${ServiciosRpr.RS_EJCC}/selectByCriteria`;
    return this.http
      .post<Ejcc[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Genera los reportes CPRM, CJBM y CCPM para el mes/año indicado.
   * POST /ejcc/ejecutar
   * Respuesta puede ser un Ejcc (generación exitosa) o { mensaje } (ya existían).
   */
  ejecutar(request: EjecutarReporteCarteraRequest): Observable<EjecutarReporteCarteraResponse | null> {
    const url = `${ServiciosRpr.RS_EJCC}/ejecutar`;
    return this.http
      .post<EjecutarReporteCarteraResponse>(url, request, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}

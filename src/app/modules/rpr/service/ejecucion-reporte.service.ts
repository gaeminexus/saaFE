import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { EjecucionReporte } from '../model/ejecucion-reporte';
import { ServiciosRpr } from './ws-rpr';

/** Payload para ejecutar la generación de reportes G40-G51 */
export interface EjecutarReporteRequest {
  mes: number;
  anio: number;
  usuario: string;
}

/**
 * Respuesta cuando los reportes ya estaban generados (HTTP 200 con mensaje).
 * estado EJRC: 1=En proceso | 2=Con novedades | 3=Completo
 * tipoEjecucion: 1=Inicial | 2=Corrección
 */
export type EjecutarReporteResponse = EjecucionReporte | { mensaje: string };

@Injectable({
  providedIn: 'root',
})
export class EjecucionReporteService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<EjecucionReporte[] | null> {
    const url = `${ServiciosRpr.RS_EJRC}/getAll`;
    return this.http.get<EjecucionReporte[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<EjecucionReporte | null> {
    const url = `${ServiciosRpr.RS_EJRC}/getId/${id}`;
    return this.http.get<EjecucionReporte>(url).pipe(catchError(this.handleError));
  }

  getByMesAnio(mes: number, anio: number): Observable<EjecucionReporte[] | null> {
    const url = `${ServiciosRpr.RS_EJRC}/getByMesAnio/${mes}/${anio}`;
    return this.http.get<EjecucionReporte[]>(url).pipe(catchError(this.handleError));
  }

  add(datos: EjecucionReporte): Observable<EjecucionReporte | null> {
    return this.http
      .post<EjecucionReporte>(ServiciosRpr.RS_EJRC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: EjecucionReporte): Observable<EjecucionReporte | null> {
    return this.http
      .put<EjecucionReporte>(ServiciosRpr.RS_EJRC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<EjecucionReporte | null> {
    const url = `${ServiciosRpr.RS_EJRC}/${id}`;
    return this.http
      .delete<EjecucionReporte>(url, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(criterios: DatosBusqueda[]): Observable<EjecucionReporte[] | null> {
    const url = `${ServiciosRpr.RS_EJRC}/selectByCriteria`;
    return this.http
      .post<EjecucionReporte[]>(url, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Ejecuta la generación de reportes G40-G51 para el mes/año indicado.
   *
   * Respuestas posibles (todas HTTP 200):
   *  - EjecucionReporte: estado 1=En proceso | 2=Con novedades | 3=Completo
   *  - { mensaje: string }: ya estaban todos generados correctamente
   *
   * Si estado=2 volver a llamar con el mismo mes/anio para re-ejecutar
   * solo los G fallidos; los que ya están OK no se reprocesen.
   */
  ejecutar(request: EjecutarReporteRequest): Observable<EjecutarReporteResponse | null> {
    const url = `${ServiciosRpr.RS_EJRC}/ejecutar`;
    return this.http
      .post<EjecutarReporteResponse>(url, request, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse | any): Observable<null> {
    if (error && +error.status === 200) {
      return of(null);
    }
    return throwError(() => error ?? { message: 'Error desconocido' });
  }
}

import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { NovedadParticipeCarga } from '../model/novedad-participe-carga';
import { ServiciosCrd } from './ws-crd';

/**
 * Respuesta de `GET /rest/nvpc/estadisticas/{idCarga}` (`NovedadParticipeCargaRest.getEstadisticas`,
 * verificado leyendo el Java): `novedadesPorTipo` llega como objeto JSON con las claves de
 * `tipoNovedad` serializadas como STRING (es un `Map<Long, Integer>` de Java pasado por Jackson).
 */
export interface EstadisticasNovedadesCarga {
  idCarga: number;
  totalNovedades: number;
  novedadesPorTipo: Record<string, number>;
  totalDiferenciasMonetarias: number;
}

@Injectable({
  providedIn: 'root'
})
export class NovedadParticipeCargaService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) { }

  getAll(): Observable<NovedadParticipeCarga[] | null> {
    const ws = '/getAll';
    const url = `${ServiciosCrd.RS_NVPC}${ws}`;
    return this.http.get<NovedadParticipeCarga[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<NovedadParticipeCarga | null> {
    const ws = '/getId/';
    const url = `${ServiciosCrd.RS_NVPC}${ws}${id}`;
    return this.http.get<NovedadParticipeCarga>(url).pipe(
      catchError(this.handleError)
    );
  }

  add(datos: any): Observable<NovedadParticipeCarga | null> {
    return this.http.post<NovedadParticipeCarga>(ServiciosCrd.RS_NVPC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  update(datos: any): Observable<NovedadParticipeCarga | null> {
    return this.http.put<NovedadParticipeCarga>(ServiciosCrd.RS_NVPC, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<NovedadParticipeCarga[] | null> {
    const ws = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_NVPC}${ws}`;
    return this.http.post<NovedadParticipeCarga[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** Todas las novedades de una carga, sin el truncamiento a 20 del mensaje de error del proceso. */
  getByCargaArchivo(idCarga: number): Observable<NovedadParticipeCarga[] | null> {
    const url = `${ServiciosCrd.RS_NVPC}/getByCargaArchivo/${idCarga}`;
    return this.http.get<NovedadParticipeCarga[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** Conteos agregados de las novedades de una carga. */
  estadisticas(idCarga: number): Observable<EstadisticasNovedadesCarga | null> {
    const url = `${ServiciosCrd.RS_NVPC}/estadisticas/${idCarga}`;
    return this.http.get<EstadisticasNovedadesCarga>(url).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<NovedadParticipeCarga | null> {
    const ws = '/' + id;
    const url = `${ServiciosCrd.RS_NVPC}${ws}`;
    return this.http.delete<NovedadParticipeCarga>(url, this.httpOptions).pipe(
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

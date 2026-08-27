import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import {
  AnularCierreRequest,
  CerrarConciliacionRequest,
  CerrarConciliacionResponse,
  PartidaTransitoAntigua,
  PrepararCierreResponse,
} from '../model/conciliacion-cierre';
import { ServiciosTsr } from './ws-tsr';

/**
 * Cierre de conciliación con partidas en tránsito — `ConciliacionCierreServiceImpl`,
 * ya desplegado en el backend bajo `@Path("cnct")` (el mismo controller que el
 * resto de la conciliación contable). Contrato confirmado contra
 * docs/logica-negocio/tsr/DISENO-CONCILIACION-PARTIDAS-EN-TRANSITO.md §10.3
 * en saaBE — la ruta base es una constante aislada a propósito, para que
 * cualquier ajuste futuro del contrato siga siendo un cambio contenido.
 */
const BASE = `${ServiciosTsr.RS_CNCT}/transito`;

@Injectable({ providedIn: 'root' })
export class ConciliacionCierreService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  preparar(idCuentaBancaria: number, idPeriodo: number): Observable<PrepararCierreResponse> {
    return this.http.get<PrepararCierreResponse>(`${BASE}/preparar/${idCuentaBancaria}/${idPeriodo}`).pipe(
      catchError(this.handleError),
    );
  }

  cerrar(datos: CerrarConciliacionRequest): Observable<CerrarConciliacionResponse> {
    return this.http.post<CerrarConciliacionResponse>(`${BASE}/cerrar`, datos, this.httpOptions).pipe(
      catchError(this.handleError),
    );
  }

  anular(idCierre: number, datos: AnularCierreRequest): Observable<unknown> {
    return this.http.post(`${BASE}/anular/${idCierre}`, datos, this.httpOptions).pipe(
      catchError(this.handleError),
    );
  }

  transitoAntiguas(idEmpresa: number, dias = 60): Observable<PartidaTransitoAntigua[]> {
    const params = new HttpParams().set('dias', dias);
    return this.http.get<PartidaTransitoAntigua[]>(`${BASE}/antiguas/${idEmpresa}`, { params }).pipe(
      catchError(this.handleError),
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}

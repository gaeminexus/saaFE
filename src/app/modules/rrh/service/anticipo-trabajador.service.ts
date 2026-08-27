import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import {
  AnticipoTrabajador,
  AnularAnticipoRequest,
  AprobarAnticipoRequest,
  FiltrosListarAnticipos,
  ResultadoAprobarAnticipo,
  SolicitarAnticipoRequest,
} from '../model/anticipo-trabajador';
import { ServiciosRhh } from './ws-rrh';

@Injectable({ providedIn: 'root' })
export class AnticipoTrabajadorService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** GET /ante/listar — todos los filtros son opcionales salvo idEmpresa. */
  listar(filtros: FiltrosListarAnticipos): Observable<AnticipoTrabajador[] | null> {
    let params = new HttpParams().set('idEmpresa', filtros.idEmpresa);
    if (filtros.idEmpleado != null) params = params.set('idEmpleado', filtros.idEmpleado);
    if (filtros.estado != null) params = params.set('estado', filtros.estado);
    return this.http.get<AnticipoTrabajador[]>(`${ServiciosRhh.RS_ANTE}/listar`, { params }).pipe(
      catchError(this.handleError),
    );
  }

  /**
   * GET /ante/vigente/{idEmpleado} — el anticipo vivo del empleado, si tiene
   * uno. El backend responde 404 cuando no tiene ninguno: eso NO es un error
   * de la pantalla, es la respuesta esperada la mayoría de las veces.
   */
  vigente(idEmpleado: number): Observable<AnticipoTrabajador | null> {
    return this.http.get<AnticipoTrabajador>(`${ServiciosRhh.RS_ANTE}/vigente/${idEmpleado}`).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 404) return of(null);
        return this.handleError(error);
      }),
    );
  }

  solicitar(datos: SolicitarAnticipoRequest): Observable<AnticipoTrabajador | null> {
    return this.http.post<AnticipoTrabajador>(`${ServiciosRhh.RS_ANTE}/solicitar`, datos, this.httpOptions).pipe(
      catchError(this.handleError),
    );
  }

  aprobar(codigo: number, datos: AprobarAnticipoRequest): Observable<ResultadoAprobarAnticipo> {
    return this.http.post<ResultadoAprobarAnticipo>(
      `${ServiciosRhh.RS_ANTE}/aprobar/${codigo}`, datos, this.httpOptions,
    ).pipe(catchError((error) => this.handleError(error)));
  }

  anular(codigo: number, datos: AnularAnticipoRequest): Observable<unknown> {
    return this.http.post(`${ServiciosRhh.RS_ANTE}/anular/${codigo}`, datos, this.httpOptions).pipe(
      catchError(this.handleError),
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error);
  }
}

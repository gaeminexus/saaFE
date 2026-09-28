import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';
import { DetalleAts, GenerarAtsRequest, ResultadoGeneracionAts } from '../model/ats';
import { ServiciosCxc } from './ws-cxc';

/** Generador del ATS (Anexo Transaccional Simplificado) — ver docs/logica-negocio/sri/LEVANTAMIENTO-ATS-103-104.md §10 en saaBE. */
@Injectable({ providedIn: 'root' })
export class AtsService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  generar(datos: GenerarAtsRequest): Observable<ResultadoGeneracionAts> {
    return this.http.post<ResultadoGeneracionAts>(`${ServiciosCxc.RS_ATS}/generar`, datos, this.httpOptions).pipe(
      catchError(this.handleError),
    );
  }

  /**
   * Detalle del ATS para comparar en pantalla (docs/cxc/API-DETALLE-ATS.md). Mismo cuerpo que
   * `generar` (`idFacturador`/`anio`/`mes`); un período sin documentos responde 200 con listas
   * vacías, no es un error.
   */
  detalle(datos: GenerarAtsRequest): Observable<DetalleAts> {
    return this.http.post<DetalleAts>(`${ServiciosCxc.RS_ATS}/detalle`, datos, this.httpOptions).pipe(
      catchError(this.handleErrorDetalle),
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => new Error(mensajeDeError(error, 'No se pudo generar el ATS')));
  }

  private handleErrorDetalle(error: HttpErrorResponse): Observable<never> {
    return throwError(() => new Error(mensajeDeError(error, 'No se pudo consultar el detalle del ATS')));
  }
}

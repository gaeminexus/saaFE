import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';
import { GenerarAtsRequest, ResultadoGeneracionAts } from '../model/ats';
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

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => new Error(mensajeDeError(error, 'No se pudo generar el ATS')));
  }
}

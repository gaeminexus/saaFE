import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';

import { ActualizarGeneracionPorFaltante, EstadoGeneracionPorFaltante } from '../model/configuracion-generacion-aportes';
import { ServiciosCrd } from './ws-crd';

/** §B.2 de `docs/crd/API-INTERRUPTOR-GENERACION-POR-FALTANTE.md` — contrato de API congelado. */
@Injectable({
  providedIn: 'root',
})
export class ConfiguracionGeneracionAportesService {
  constructor(private http: HttpClient) {}

  obtenerEstado(): Observable<EstadoGeneracionPorFaltante | null> {
    return this.http
      .get<EstadoGeneracionPorFaltante>(`${ServiciosCrd.RS_CNFG}/generacionPorFaltanteAh`)
      .pipe(catchError(this.handleError));
  }

  actualizar(datos: ActualizarGeneracionPorFaltante): Observable<EstadoGeneracionPorFaltante | null> {
    return this.http
      .put<EstadoGeneracionPorFaltante>(`${ServiciosCrd.RS_CNFG}/generacionPorFaltanteAh`, datos)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}

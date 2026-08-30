import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';

import { ActualizarContabilidadCrd, EstadoContabilidadCrd } from '../model/configuracion-contabilidad';
import { ServiciosCrd } from './ws-crd';

/** §4.3 del plan de devengo (`docs/crd/PLAN-APORTES-DEVENGO-CONTRATOS.md`) — contrato de API congelado. */
@Injectable({
  providedIn: 'root',
})
export class ConfiguracionContabilidadService {
  constructor(private http: HttpClient) {}

  obtenerEstado(): Observable<EstadoContabilidadCrd | null> {
    return this.http
      .get<EstadoContabilidadCrd>(`${ServiciosCrd.RS_CNFG}/contabilidadCrd`)
      .pipe(catchError(this.handleError));
  }

  actualizar(datos: ActualizarContabilidadCrd): Observable<EstadoContabilidadCrd | null> {
    return this.http
      .put<EstadoContabilidadCrd>(`${ServiciosCrd.RS_CNFG}/contabilidadCrd`, datos)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}

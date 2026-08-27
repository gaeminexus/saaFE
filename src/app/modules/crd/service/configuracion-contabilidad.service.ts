import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, delay, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ActualizarContabilidadCrd, EstadoContabilidadCrd } from '../model/configuracion-contabilidad';
import { ServiciosCrd } from './ws-crd';

/**
 * §4.3 del plan de devengo. El backend todavía no publica `/rest/cnfg`: mientras
 * `environment.mockDevengoContratos` esté en `true`, este servicio simula el estado en memoria
 * contra el contrato congelado. Apagar el flag hace que llame al backend real sin tocar el
 * componente — la rama de mock vive entera acá adentro.
 */
@Injectable({
  providedIn: 'root',
})
export class ConfiguracionContabilidadService {
  private mockEstado: EstadoContabilidadCrd = { activa: true, motivo: null };

  constructor(private http: HttpClient) {}

  obtenerEstado(): Observable<EstadoContabilidadCrd | null> {
    if (environment.mockDevengoContratos) {
      return of({ ...this.mockEstado }).pipe(delay(300));
    }
    return this.http
      .get<EstadoContabilidadCrd>(`${ServiciosCrd.RS_CNFG}/contabilidadCrd`)
      .pipe(catchError(this.handleError));
  }

  actualizar(datos: ActualizarContabilidadCrd): Observable<EstadoContabilidadCrd | null> {
    if (environment.mockDevengoContratos) {
      this.mockEstado = { activa: datos.activa, motivo: datos.motivo };
      return of({ ...this.mockEstado }).pipe(delay(300));
    }
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

import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';

import { ContratoPorEntidadDTO, NuevaVigenciaRequest, VigenciaDTO } from '../model/vigencia-contrato';
import { ServiciosCrd } from './ws-crd';

/**
 * §4.1 del plan de devengo (`docs/crd/PLAN-APORTES-DEVENGO-CONTRATOS.md`) — contrato de API
 * congelado. `porEntidad` recibe `idContrato` solo para mantener la firma que usan los
 * llamadores; el backend resuelve por `idEntidad`.
 */
@Injectable({
  providedIn: 'root',
})
export class VigenciaContratoService {
  constructor(private http: HttpClient) {}

  porEntidad(idEntidad: number): Observable<ContratoPorEntidadDTO | null> {
    return this.http
      .get<ContratoPorEntidadDTO>(`${ServiciosCrd.RS_CNTR}/porEntidad/${idEntidad}`)
      .pipe(catchError(this.handleError));
  }

  historialPorContrato(idContrato: number): Observable<VigenciaDTO[] | null> {
    return this.http
      .get<VigenciaDTO[]>(`${ServiciosCrd.RS_VGCN}/porContrato/${idContrato}`)
      .pipe(catchError(this.handleError));
  }

  crear(datos: NuevaVigenciaRequest): Observable<VigenciaDTO | null> {
    return this.http.post<VigenciaDTO>(ServiciosCrd.RS_VGCN, datos).pipe(catchError(this.handleError));
  }

  anular(idVigencia: number): Observable<unknown> {
    return this.http
      .delete(`${ServiciosCrd.RS_VGCN}/${idVigencia}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}

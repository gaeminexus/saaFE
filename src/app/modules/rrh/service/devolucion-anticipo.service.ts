import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import {
  DevolucionAnticipo,
  RegistrarDevolucionAnticipoRequest,
  RegistrarDevolucionAnticipoResponse,
} from '../model/devolucion-anticipo';
import { ServiciosRhh } from './ws-rrh';

/**
 * Devolución de un anticipo a empleado (`RHH.DVAN`): registrar, anular y consultar.
 * `docs/rrh/API-DEVOLUCION-ANTICIPO.md` §5.
 */
@Injectable({
  providedIn: 'root',
})
export class DevolucionAnticipoService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** Captura la devolución, la contabiliza (tesorería) y ajusta las cuotas pendientes del anticipo. */
  registrar(datos: RegistrarDevolucionAnticipoRequest): Observable<RegistrarDevolucionAnticipoResponse> {
    return this.http
      .post<RegistrarDevolucionAnticipoResponse>(`${ServiciosRhh.RS_DVAN}/registrar`, datos, this.httpOptions)
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => error.error || error)));
  }

  /** Deshace todo: ingreso, cuotas devueltas a PENDIENTE, y saldos del anticipo/descuento repuestos. */
  anular(idDevolucion: number, datos: { motivo: string; idUsuario: number }): Observable<{ idDevolucion: number; estado: number; mensaje: string }> {
    return this.http
      .post<{ idDevolucion: number; estado: number; mensaje: string }>(
        `${ServiciosRhh.RS_DVAN}/anular/${idDevolucion}`,
        datos,
        this.httpOptions,
      )
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => error.error || error)));
  }

  /** Las devoluciones de un anticipo, más recientes primero. */
  porAnticipo(idAnticipo: number): Observable<DevolucionAnticipo[]> {
    return this.http
      .get<DevolucionAnticipo[]>(`${ServiciosRhh.RS_DVAN}/porAnticipo/${idAnticipo}`)
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => error.error || error)));
  }

  static mensajeError(error: any): string {
    if (typeof error === 'string' && error.trim()) return error;
    return error?.mensaje || error?.message || 'No se pudo completar la operación.';
  }
}

import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import {
  AnularDevolucionAnticipoRequest,
  AnularDevolucionAnticipoResponse,
  DevolucionAnticipoListado,
  RegistrarDevolucionAnticipoRequest,
  RegistrarDevolucionAnticipoResponse,
} from '../model/devolucion-anticipo';
import { ServiciosCxp } from './ws-cxp';

/** Devolución del saldo de anticipos de un proveedor (PGS.DVPR/DDPR) — docs/cxp/API-DEVOLUCION-ANTICIPO-PROVEEDOR.md. */
@Injectable({ providedIn: 'root' })
export class DevolucionAnticipoService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** Registra la devolución: un asiento y un movimiento bancario por el total, en una sola transacción. */
  registrar(datos: RegistrarDevolucionAnticipoRequest): Observable<RegistrarDevolucionAnticipoResponse> {
    return this.http.post<RegistrarDevolucionAnticipoResponse>(
      `${ServiciosCxp.RS_DVPR}/registrar`, datos, this.httpOptions
    ).pipe(catchError(this.handleError));
  }

  /** Anula una devolución ACTIVA que todavía no esté conciliada con el extracto. */
  anular(id: number, datos: AnularDevolucionAnticipoRequest): Observable<AnularDevolucionAnticipoResponse> {
    return this.http.post<AnularDevolucionAnticipoResponse>(
      `${ServiciosCxp.RS_DVPR}/anular/${id}`, datos, this.httpOptions
    ).pipe(catchError(this.handleError));
  }

  /** Devoluciones del proveedor, la más reciente primero. */
  listar(idEmpresa: number, idTitular: number): Observable<DevolucionAnticipoListado[]> {
    const params = new HttpParams().set('idEmpresa', idEmpresa).set('idTitular', idTitular);
    return this.http.get<DevolucionAnticipoListado[]>(`${ServiciosCxp.RS_DVPR}/listar`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'No se pudo completar la operación.';
    if (typeof error.error === 'string' && error.error.trim()) {
      mensaje = error.error;
    } else if (error.error?.mensaje) {
      mensaje = error.error.mensaje;
    } else if (error.error?.message) {
      mensaje = error.error.message;
    }
    return throwError(() => new Error(mensaje));
  }
}

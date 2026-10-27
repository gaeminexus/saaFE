import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import {
  AplicacionNotaCredito,
  CruzarNotaCreditoRequest,
  CruzarNotaCreditoResponse,
  NotaCreditoDisponible,
  NotaDebitoPendiente,
} from '../model/nota-credito-saldo';
import { ServiciosCxp } from './ws-cxp';

/** Saldo a favor de las notas de crédito de compra y su cruce contra otra factura — docs/cxp/NC-EXCEDE-SALDO-FACTURA.md §4 y §6. */
@Injectable({ providedIn: 'root' })
export class NotaCreditoSaldoService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** NC registradas y vigentes del proveedor con saldo, la más antigua primero. */
  disponibles(idTitular: number, idEmpresa: number): Observable<NotaCreditoDisponible[]> {
    return this.http.get<NotaCreditoDisponible[]>(
      `${ServiciosCxp.RS_NTCC}/disponibles/${idTitular}/${idEmpresa}`
    ).pipe(catchError(this.handleError));
  }

  /** ND registradas y vigentes del proveedor, no bloqueadas, cuya factura tiene saldo (§4.1). */
  notasDebitoPendientes(idTitular: number, idEmpresa: number): Observable<NotaDebitoPendiente[]> {
    return this.http.get<NotaDebitoPendiente[]>(
      `${ServiciosCxp.RS_NTDC}/pendientes/${idTitular}/${idEmpresa}`
    ).pipe(catchError(this.handleError));
  }

  /** Aplicaciones activas de la NC (la original y los cruces), la más antigua primero — §4.2. */
  aplicaciones(idNotaCredito: number): Observable<AplicacionNotaCredito[]> {
    return this.http.get<AplicacionNotaCredito[]>(
      `${ServiciosCxp.RS_APLP}/porNotaCredito/${idNotaCredito}`
    ).pipe(catchError(this.handleError));
  }

  /** Cruza saldo de la NC contra otra factura del mismo proveedor (sin asiento). */
  cruzar(datos: CruzarNotaCreditoRequest): Observable<CruzarNotaCreditoResponse> {
    return this.http.post<CruzarNotaCreditoResponse>(
      `${ServiciosCxp.RS_APLP}/cruzarNotaCredito`, datos, this.httpOptions
    ).pipe(catchError(this.handleError));
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

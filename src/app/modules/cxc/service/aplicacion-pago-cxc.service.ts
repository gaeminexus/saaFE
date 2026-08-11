import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { MotivoRequest, SaldoFactura } from '../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import {
  AplicacionPagoCxc,
  CobroTransferenciaRequest,
  CruceAnticipoCxcRequest,
  ResultadoAplicacionCxc,
} from '../model/aplicacion-pago-cxc';
import { ServiciosCxc } from './ws-cxc';

/** Abonos, saldo y cobros de una factura de venta (APLC). */
@Injectable({ providedIn: 'root' })
export class AplicacionPagoCxcService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** Cabecera de saldo de la factura: total, aplicado, pendiente y estadoPago. */
  getSaldo(idFactura: number): Observable<SaldoFactura> {
    return this.http.get<SaldoFactura>(`${ServiciosCxc.RS_APLC}/saldo/${idFactura}`).pipe(
      catchError(this.handleError)
    );
  }

  /** Historial de abonos de la factura. Por defecto oculta las filas reversadas. */
  getByFactura(idFactura: number, soloActivas = true): Observable<AplicacionPagoCxc[]> {
    const params = new HttpParams().set('soloActivas', soloActivas);
    return this.http.get<AplicacionPagoCxc[]>(`${ServiciosCxc.RS_APLC}/factura/${idFactura}`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /** Reversa un abono. Requiere motivo; tras el 200 hay que refrescar saldo e historial. */
  revertir(idAplicacion: number, datos: MotivoRequest): Observable<any> {
    return this.http.post<any>(`${ServiciosCxc.RS_APLC}/revertir/${idAplicacion}`, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** Cruza saldo de anticipos del cliente contra la factura. */
  cruzarAnticipo(datos: CruceAnticipoCxcRequest): Observable<ResultadoAplicacionCxc> {
    return this.http.post<ResultadoAplicacionCxc>(`${ServiciosCxc.RS_APLC}/anticipo`, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** Registra un cobro por transferencia; contabiliza en el momento de la llamada. */
  cobroTransferencia(datos: CobroTransferenciaRequest): Observable<ResultadoAplicacionCxc> {
    return this.http.post<ResultadoAplicacionCxc>(
      `${ServiciosCxc.RS_APLC}/cobroTransferencia`, datos, this.httpOptions
    ).pipe(catchError(this.handleError));
  }

  /**
   * El backend devuelve el mensaje de negocio como string JSON directo, ya
   * redactado en español para mostrarse tal cual al usuario.
   */
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

import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { MotivoRequest, SaldoFactura } from '../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import {
  AplicacionPagoCxp,
  CruceAnticipoCxpRequest,
  CruceAnticiposCxpRequest,
  ResultadoAplicacionCxp,
} from '../model/aplicacion-pago-cxp';
import { ServiciosCxp } from './ws-cxp';

/** Abonos y saldo de una factura de compra (APLP). */
@Injectable({ providedIn: 'root' })
export class AplicacionPagoCxpService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** Cabecera de saldo de la factura: total, aplicado, pendiente y estadoPago. */
  getSaldo(idFactura: number): Observable<SaldoFactura> {
    return this.http.get<SaldoFactura>(`${ServiciosCxp.RS_APLP}/saldo/${idFactura}`).pipe(
      catchError(this.handleError)
    );
  }

  /** Historial de abonos de la factura. Por defecto oculta las filas reversadas. */
  getByFactura(idFactura: number, soloActivas = true): Observable<AplicacionPagoCxp[]> {
    const params = new HttpParams().set('soloActivas', soloActivas);
    return this.http.get<AplicacionPagoCxp[]>(`${ServiciosCxp.RS_APLP}/factura/${idFactura}`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /** Reversa un abono. Requiere motivo; tras el 200 hay que refrescar saldo e historial. */
  revertir(idAplicacion: number, datos: MotivoRequest): Observable<any> {
    return this.http.post<any>(`${ServiciosCxp.RS_APLP}/revertir/${idAplicacion}`, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** Cruza saldo de anticipos del proveedor contra la factura. */
  cruzarAnticipo(datos: CruceAnticipoCxpRequest): Observable<ResultadoAplicacionCxp> {
    return this.http.post<ResultadoAplicacionCxp>(`${ServiciosCxp.RS_APLP}/anticipo`, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Cruza anticipos ESPECÍFICOS contra la factura: cada línea dice de qué
   * anticipo sale el dinero y cuánto, y genera su propia aplicación con su
   * propio asiento. Los anticipos elegibles se consultan con
   * AnticipoService.disponiblesProveedor().
   */
  cruzarAnticipos(datos: CruceAnticiposCxpRequest): Observable<ResultadoAplicacionCxp> {
    return this.http.post<ResultadoAplicacionCxp>(`${ServiciosCxp.RS_APLP}/anticipos`, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
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

import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
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

  /**
   * Cabecera de saldo de una LIQUIDACIÓN de compra (PGS.LQCC). Ruta distinta a propósito:
   * `/saldo/{id}` hace `em.find(FacturaCompra, id)`, y pasarle un id de liquidación devolvería
   * el saldo de una factura ajena que coincida en número, sin ningún error, porque FCTC y LQCC
   * tienen numeraciones IDENTITY independientes. No reusar esa ruta acá.
   *
   * ⚠️ El contrato dice "misma forma que /saldo/{id}" pero el código no coincide — verificado
   * contra `AplicacionPagoCxpServiceImpl.saldoLiquidacion:911-917` en saaBE: el backend devuelve
   * `liquidacionId`/`numeroLiquidacion`, no `facturaId`/`numeroFactura`. Se normaliza acá para
   * que el resto de la pantalla (ya escrita contra `SaldoFactura`) no tenga que conocer la
   * diferencia.
   */
  getSaldoLiquidacion(idLiquidacion: number): Observable<SaldoFactura> {
    return this.http.get<any>(`${ServiciosCxp.RS_APLP}/saldoLiquidacion/${idLiquidacion}`).pipe(
      map((s) => this.normalizarSaldo(s)),
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

  /**
   * Historial de abonos de una LIQUIDACIÓN de compra. Ruta distinta a propósito, mismo motivo
   * que `getSaldoLiquidacion()`: `/factura/{id}` resuelve contra `FacturaCompra`, y `FCTC`/`LQCC`
   * tienen numeraciones `IDENTITY` independientes. No reusar `getByFactura()` con un id de
   * liquidación por ningún motivo — devolvería el historial de una factura ajena, sin error.
   */
  getByLiquidacion(idLiquidacion: number, soloActivas = true): Observable<AplicacionPagoCxp[]> {
    const params = new HttpParams().set('soloActivas', soloActivas);
    return this.http.get<AplicacionPagoCxp[]>(`${ServiciosCxp.RS_APLP}/liquidacion/${idLiquidacion}`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /** Reversa un abono. Requiere motivo; tras el 200 hay que refrescar saldo e historial. */
  revertir(idAplicacion: number, datos: MotivoRequest): Observable<any> {
    return this.http.post<any>(`${ServiciosCxp.RS_APLP}/revertir/${idAplicacion}`, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** Cruza saldo de anticipos del proveedor contra la factura o liquidación (§ nota de arriba). */
  cruzarAnticipo(datos: CruceAnticipoCxpRequest): Observable<ResultadoAplicacionCxp> {
    return this.http.post<any>(`${ServiciosCxp.RS_APLP}/anticipo`, datos, this.httpOptions).pipe(
      map((r) => this.normalizarResultado(r)),
      catchError(this.handleError)
    );
  }

  /**
   * Cruza anticipos ESPECÍFICOS contra la factura o liquidación: cada línea dice de qué
   * anticipo sale el dinero y cuánto, y genera su propia aplicación con su
   * propio asiento. Los anticipos elegibles se consultan con
   * AnticipoService.disponiblesProveedor().
   */
  cruzarAnticipos(datos: CruceAnticiposCxpRequest): Observable<ResultadoAplicacionCxp> {
    return this.http.post<any>(`${ServiciosCxp.RS_APLP}/anticipos`, datos, this.httpOptions).pipe(
      map((r) => this.normalizarResultado(r)),
      catchError(this.handleError)
    );
  }

  /**
   * `aplicaCruces:602` en saaBE hace `resultado.putAll(... : saldoLiquidacion(...))` cuando el
   * cruce fue contra una liquidación — la respuesta trae `liquidacionId`/`numeroLiquidacion` en
   * vez de `facturaId`/`numeroFactura`, mismo desajuste que en `getSaldoLiquidacion()`. Se
   * completan los dos pares de claves sin pisar los que sí vinieron, así el resto del código
   * (que ya lee `facturaId`/`numeroFactura`) sigue funcionando para ambos casos.
   */
  private normalizarSaldo(s: any): SaldoFactura {
    return {
      ...s,
      facturaId: s?.facturaId ?? s?.liquidacionId,
      numeroFactura: s?.numeroFactura ?? s?.numeroLiquidacion,
    };
  }

  private normalizarResultado(r: any): ResultadoAplicacionCxp {
    return {
      ...r,
      facturaId: r?.facturaId ?? r?.liquidacionId,
      numeroFactura: r?.numeroFactura ?? r?.numeroLiquidacion,
    };
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

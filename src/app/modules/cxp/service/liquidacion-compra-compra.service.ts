import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';
import { LiquidacionCompraCompra } from '../model/liquidacion-compra-compra';
import { AnularDocumentoCompraResponse, AnularLiquidacionCompraRequest } from '../model/anulacion-documento-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class LiquidacionCompraCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<LiquidacionCompraCompra[] | null> {
    return this.http.get<LiquidacionCompraCompra[]>(`${ServiciosCxp.RS_LQCC}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<LiquidacionCompraCompra | null> {
    return this.http.get<LiquidacionCompraCompra>(`${ServiciosCxp.RS_LQCC}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<LiquidacionCompraCompra>): Observable<LiquidacionCompraCompra | null> {
    return this.http.post<LiquidacionCompraCompra>(ServiciosCxp.RS_LQCC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<LiquidacionCompraCompra>): Observable<LiquidacionCompraCompra | null> {
    return this.http.put<LiquidacionCompraCompra>(ServiciosCxp.RS_LQCC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<LiquidacionCompraCompra[] | null> {
    return this.http.post<LiquidacionCompraCompra[]>(`${ServiciosCxp.RS_LQCC}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<LiquidacionCompraCompra | null> {
    return this.http.delete<LiquidacionCompraCompra>(`${ServiciosCxp.RS_LQCC}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  /**
   * A diferencia de factura/NC/ND, la liquidación de compra no tiene movimientos que cascadear
   * (sin FK ni query que la relacione con pagos, verificado en backend) — no hay
   * `movimientosRelacionados` ni `anularEnCascada` para esta tabla, solo motivo + usuario.
   */
  anular(id: number, datos: AnularLiquidacionCompraRequest): Observable<AnularDocumentoCompraResponse> {
    return this.http.post<AnularDocumentoCompraResponse>(`${ServiciosCxp.RS_LQCC}/anular/${id}`, datos, this.httpOptions).pipe(
      catchError(this.handleErrorAnulacion),
    );
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }

  private handleErrorAnulacion(error: HttpErrorResponse): Observable<never> {
    const e = new Error(mensajeDeError(error, 'No se pudo completar la operación')) as Error & { status?: number };
    e.status = error.status;
    return throwError(() => e);
  }
}

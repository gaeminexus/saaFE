import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';
import { FacturaCompra } from '../model/factura-compra';
import {
  AnularDocumentoCompraRequest,
  AnularDocumentoCompraResponse,
  MovimientoRelacionadoCompra,
} from '../model/anulacion-documento-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class FacturaCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<FacturaCompra[] | null> {
    return this.http.get<FacturaCompra[]>(`${ServiciosCxp.RS_FCTC}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<FacturaCompra | null> {
    return this.http.get<FacturaCompra>(`${ServiciosCxp.RS_FCTC}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<FacturaCompra>): Observable<FacturaCompra | null> {
    return this.http.post<FacturaCompra>(ServiciosCxp.RS_FCTC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  update(datos: Partial<FacturaCompra>): Observable<FacturaCompra | null> {
    return this.http.put<FacturaCompra>(ServiciosCxp.RS_FCTC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<FacturaCompra[] | null> {
    return this.http.post<FacturaCompra[]>(`${ServiciosCxp.RS_FCTC}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<FacturaCompra | null> {
    return this.http.delete<FacturaCompra>(`${ServiciosCxp.RS_FCTC}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** Pagos/notas/retenciones/anticipos cruzados con esta factura — consultar antes de anular (§13). */
  movimientosRelacionados(id: number): Observable<MovimientoRelacionadoCompra[]> {
    return this.http.get<MovimientoRelacionadoCompra[]>(`${ServiciosCxp.RS_FCTC}/movimientosRelacionados/${id}`).pipe(
      catchError(this.handleErrorAnulacion),
    );
  }

  /**
   * 409 si tiene movimientos relacionados y se llama sin `anularEnCascada: true` — el error
   * emitido conserva `.status` (ver `handleErrorAnulacion`) para que el componente lo distinga
   * de un error genérico.
   */
  anular(id: number, datos: AnularDocumentoCompraRequest): Observable<AnularDocumentoCompraResponse> {
    return this.http.post<AnularDocumentoCompraResponse>(`${ServiciosCxp.RS_FCTC}/anular/${id}`, datos, this.httpOptions).pipe(
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

import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { FormaPagoLiquidacion } from '../../model/forma-pago-liquidacion';
import { ServiciosCxc } from '../ws-cxc';

/**
 * CBR.FPLC — formas de pago de una liquidación de compra. Endpoint `/fplc`
 * (renombrado en el backend desde `/formas-pago-liquidacion`, que no lo
 * usaba nadie). No se llama para grabar: `procesarCompleta` ya persiste las
 * formas de pago que se le manden; este servicio es para consultarlas o
 * editarlas fuera de ese flujo.
 */
@Injectable({ providedIn: 'root' })
export class FormaPagoLiquidacionService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<FormaPagoLiquidacion[] | null> {
    return this.http
      .get<FormaPagoLiquidacion[]>(ServiciosCxc.RS_FPLC)
      .pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<FormaPagoLiquidacion | null> {
    return this.http
      .get<FormaPagoLiquidacion>(`${ServiciosCxc.RS_FPLC}/${id}`)
      .pipe(catchError(this.handleError));
  }

  /** POST /fplc/buscar — no /selectByCriteria/, es el único de este módulo con ese nombre. */
  buscar(criterios: any[]): Observable<FormaPagoLiquidacion[] | null> {
    return this.http
      .post<FormaPagoLiquidacion[]>(`${ServiciosCxc.RS_FPLC}/buscar`, criterios, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}

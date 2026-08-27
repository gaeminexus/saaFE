import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PathLiquidacionCompra } from '../../model/path-liquidacion-compra';
import { ServiciosCxc } from '../ws-cxc';

/** CBR.PTLC — rutas de archivo (XML/RIDE) de una liquidación autorizada. */
@Injectable({ providedIn: 'root' })
export class PathLiquidacionCompraService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  selectByCriteria(datos: any): Observable<PathLiquidacionCompra[] | null> {
    return this.http
      .post<PathLiquidacionCompra[]>(`${ServiciosCxc.RS_PTLC}/selectByCriteria`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}

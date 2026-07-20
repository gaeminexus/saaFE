import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PathLiquidacionCompraCompra } from '../model/path-liquidacion-compra-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class PathLiquidacionCompraCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<PathLiquidacionCompraCompra[] | null> {
    return this.http.get<PathLiquidacionCompraCompra[]>(`${ServiciosCxp.RS_PLCC}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<PathLiquidacionCompraCompra | null> {
    return this.http.get<PathLiquidacionCompraCompra>(`${ServiciosCxp.RS_PLCC}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<PathLiquidacionCompraCompra>): Observable<PathLiquidacionCompraCompra | null> {
    return this.http.post<PathLiquidacionCompraCompra>(ServiciosCxp.RS_PLCC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<PathLiquidacionCompraCompra[] | null> {
    return this.http.post<PathLiquidacionCompraCompra[]>(`${ServiciosCxp.RS_PLCC}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<PathLiquidacionCompraCompra | null> {
    return this.http.delete<PathLiquidacionCompraCompra>(`${ServiciosCxp.RS_PLCC}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}

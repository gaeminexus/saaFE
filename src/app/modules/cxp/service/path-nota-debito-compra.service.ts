import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PathNotaDebitoCompra } from '../model/path-nota-debito-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class PathNotaDebitoCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<PathNotaDebitoCompra[] | null> {
    return this.http.get<PathNotaDebitoCompra[]>(`${ServiciosCxp.RS_PTDC}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<PathNotaDebitoCompra | null> {
    return this.http.get<PathNotaDebitoCompra>(`${ServiciosCxp.RS_PTDC}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<PathNotaDebitoCompra>): Observable<PathNotaDebitoCompra | null> {
    return this.http.post<PathNotaDebitoCompra>(ServiciosCxp.RS_PTDC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<PathNotaDebitoCompra[] | null> {
    return this.http.post<PathNotaDebitoCompra[]>(`${ServiciosCxp.RS_PTDC}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<PathNotaDebitoCompra | null> {
    return this.http.delete<PathNotaDebitoCompra>(`${ServiciosCxp.RS_PTDC}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}

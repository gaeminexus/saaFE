import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { PathFacturaCompra } from '../model/path-factura-compra';
import { ServiciosCxp } from './ws-cxp';

@Injectable({ providedIn: 'root' })
export class PathFacturaCompraService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  getAll(): Observable<PathFacturaCompra[] | null> {
    return this.http.get<PathFacturaCompra[]>(`${ServiciosCxp.RS_PFCC}/getAll`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<PathFacturaCompra | null> {
    return this.http.get<PathFacturaCompra>(`${ServiciosCxp.RS_PFCC}/getId/${id}`).pipe(catchError(this.handleError));
  }

  add(datos: Partial<PathFacturaCompra>): Observable<PathFacturaCompra | null> {
    return this.http.post<PathFacturaCompra>(ServiciosCxp.RS_PFCC, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<PathFacturaCompra[] | null> {
    return this.http.post<PathFacturaCompra[]>(`${ServiciosCxp.RS_PFCC}/selectByCriteria/`, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<PathFacturaCompra | null> {
    return this.http.delete<PathFacturaCompra>(`${ServiciosCxp.RS_PFCC}/${id}`, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }
}

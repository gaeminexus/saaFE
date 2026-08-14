import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { HistDetallePrestamo } from '../model/pagos/operaciones-pago';
import { ServiciosCrd } from './ws-crd';

/**
 * Cuotas historizadas (HDTP): la foto de la tabla de amortización antes de un abono a capital.
 * Solo lectura; las escribe el proceso de abono. Endpoints CRUD estándar, sin sobre de respuesta.
 */
@Injectable({ providedIn: 'root' })
export class HistDetallePrestamoService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<HistDetallePrestamo[] | null> {
    const url = `${ServiciosCrd.RS_HDTP}/getAll`;
    return this.http.get<HistDetallePrestamo[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string | number): Observable<HistDetallePrestamo | null> {
    const url = `${ServiciosCrd.RS_HDTP}/getId/${id}`;
    return this.http.get<HistDetallePrestamo>(url).pipe(catchError(this.handleError));
  }

  /** Cuotas que ese abono a capital concreto sacó de la tabla vigente. */
  porEvento(idEvento: number): Observable<HistDetallePrestamo[] | null> {
    const url = `${ServiciosCrd.RS_HDTP}/porEvento/${idEvento}`;
    return this.http.get<HistDetallePrestamo[]>(url).pipe(catchError(this.handleError));
  }

  porPrestamo(idPrestamo: number): Observable<HistDetallePrestamo[] | null> {
    const url = `${ServiciosCrd.RS_HDTP}/porPrestamo/${idPrestamo}`;
    return this.http.get<HistDetallePrestamo[]>(url).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<HistDetallePrestamo[] | null> {
    const url = `${ServiciosCrd.RS_HDTP}/selectByCriteria/`;
    return this.http.post<HistDetallePrestamo[]>(url, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}

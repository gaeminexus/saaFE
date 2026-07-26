import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DetalleExtractoBancario } from '../model/detalle-extracto-bancario';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root',
})
export class DetalleExtractoBancarioService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de DetalleExtractoBancario.
   */
  getAll(): Observable<DetalleExtractoBancario[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_DEXB}${wsGetAll}`;
    return this.http.get<DetalleExtractoBancario[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Recupera un registro de DetalleExtractoBancario por su ID.
   */
  getById(id: number): Observable<DetalleExtractoBancario | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_DEXB}${wsGetById}${id}`;
    return this.http.get<DetalleExtractoBancario>(url).pipe(catchError(this.handleError));
  }

  /**
   * Selecciona registros de DetalleExtractoBancario según criterios personalizados.
   * Usado por la pantalla de detalle para traer las filas de un extracto (por idExtracto).
   */
  selectByCriteria(datos: any): Observable<DetalleExtractoBancario[] | null> {
    const wsCriteria = '/selectByCriteria';
    const url = `${ServiciosTsr.RS_DEXB}${wsCriteria}`;
    return this.http
      .post<DetalleExtractoBancario[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Actualiza un registro existente (ej. cambiar estadoRevision manualmente).
   */
  update(datos: any): Observable<DetalleExtractoBancario | null> {
    return this.http
      .put<DetalleExtractoBancario>(ServiciosTsr.RS_DEXB, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Manejo centralizado de errores HTTP.
   */
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error);
    }
  }
}

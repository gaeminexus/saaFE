import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { ControlExtractoBancario } from '../model/control-extracto-bancario';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root',
})
export class ControlExtractoBancarioService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de ControlExtractoBancario.
   */
  getAll(): Observable<ControlExtractoBancario[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CTEB}${wsGetAll}`;
    return this.http.get<ControlExtractoBancario[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Recupera un registro de ControlExtractoBancario por su ID.
   */
  getById(id: number): Observable<ControlExtractoBancario | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CTEB}${wsGetById}${id}`;
    return this.http.get<ControlExtractoBancario>(url).pipe(catchError(this.handleError));
  }

  /**
   * Selecciona registros de ControlExtractoBancario según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<ControlExtractoBancario[] | null> {
    const wsCriteria = '/selectByCriteria';
    const url = `${ServiciosTsr.RS_CTEB}${wsCriteria}`;
    return this.http
      .post<ControlExtractoBancario[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Genera el registro de control para una empresa/periodo si todavia no existe.
   * Idempotente: si ya existe, el backend lo devuelve tal cual.
   */
  generarPeriodo(idEmpresa: number, idPeriodo: number): Observable<ControlExtractoBancario | null> {
    const url = `${ServiciosTsr.RS_CTEB}/generar/${idEmpresa}/${idPeriodo}`;
    return this.http.post<ControlExtractoBancario>(url, null).pipe(catchError(this.handleError));
  }

  /**
   * Recalcula cuantasCargadas y cuantasConciliadas de un periodo ya generado.
   */
  recalcularPeriodo(idEmpresa: number, idPeriodo: number): Observable<ControlExtractoBancario | null> {
    const url = `${ServiciosTsr.RS_CTEB}/recalcular/${idEmpresa}/${idPeriodo}`;
    return this.http.post<ControlExtractoBancario>(url, null).pipe(catchError(this.handleError));
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

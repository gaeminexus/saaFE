import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';
import { Cheque } from '../model/cheque';
import { ChequeListado, ChequeListadoFiltro, ChequeSiguiente } from '../model/cheque-listado';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root',
})
export class ChequeService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de Cheque.
   */
  getAll(): Observable<Cheque[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_DTCH}${wsGetAll}`;
    return this.http.get<Cheque[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Recupera un registro por su ID.
   */
  getById(id: string): Observable<Cheque | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_DTCH}${wsGetById}${id}`;
    return this.http.get<Cheque>(url).pipe(catchError(this.handleError));
  }

  /**
   * Crea un nuevo registro.
   */
  add(datos: any): Observable<Cheque | null> {
    return this.http
      .post<Cheque>(ServiciosTsr.RS_DTCH, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Actualiza un registro existente.
   */
  update(datos: any): Observable<Cheque | null> {
    return this.http
      .put<Cheque>(ServiciosTsr.RS_DTCH, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Selecciona registros según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<Cheque[] | null> {
    const wsCriteria = '/selectByCriteria/';
    const url = `${ServiciosTsr.RS_DTCH}${wsCriteria}`;
    return this.http
      .post<Cheque[]>(url, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Elimina un registro por su ID.
   */
  delete(id: any): Observable<Cheque | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_DTCH}${wsDelete}`;
    return this.http.delete<Cheque>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  /**
   * Siguiente cheque disponible de la cuenta (el que se girará al pagar).
   * El backend responde 404 con `{mensaje}` cuando no hay cheques disponibles
   * (chequera agotada o sin chequera activa) — se propaga el error tal cual
   * para que el formulario de pago lo muestre y bloquee el guardado.
   */
  siguiente(idCuenta: number): Observable<ChequeSiguiente> {
    return this.http.get<ChequeSiguiente>(`${ServiciosTsr.RS_DTCH}/siguiente/${idCuenta}`);
  }

  /** Listado de cheques para las pantallas de procesos y consultas. */
  listar(filtro: ChequeListadoFiltro): Observable<ChequeListado[]> {
    let params = new HttpParams();
    if (filtro.idEmpresa != null) params = params.set('idEmpresa', filtro.idEmpresa);
    if (filtro.idCuenta != null) params = params.set('idCuenta', filtro.idCuenta);
    if (filtro.estado != null) params = params.set('estado', filtro.estado);
    if (filtro.desde) params = params.set('desde', filtro.desde);
    if (filtro.hasta) params = params.set('hasta', filtro.hasta);
    return this.http.get<ChequeListado[]>(`${ServiciosTsr.RS_DTCH}/listar`, { params });
  }

  /** Anula un cheque ACTIVO. `motivo` es el código numérico del rubro 38 (1, 2 o 3). */
  anular(id: number, motivo: number, idUsuario: number): Observable<any> {
    return this.http.post(`${ServiciosTsr.RS_DTCH}/anular/${id}`, { motivo, idUsuario }, this.httpOptions);
  }

  /** Marca cheques GENERADOS como IMPRESOS. */
  imprimir(ids: number[], idUsuario: number): Observable<any> {
    return this.http.post(`${ServiciosTsr.RS_DTCH}/imprimir`, { ids, idUsuario }, this.httpOptions);
  }

  /** Marca cheques IMPRESOS como ENTREGADOS. */
  entregar(ids: number[], idUsuario: number): Observable<any> {
    return this.http.post(`${ServiciosTsr.RS_DTCH}/entregar`, { ids, idUsuario }, this.httpOptions);
  }

  /** Lee `{"mensaje": "..."}` (MensajeErrorJsonFilter) o el mensaje del HttpErrorResponse. */
  static mensajeError(error: any): string {
    return mensajeDeError(error);
  }

  /**
   * Manejo de errores HTTP.
   */
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}

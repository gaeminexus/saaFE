import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';
import {
  Chequera,
  ChequeraAnularResponse,
  ChequeraRegistrarRecepcionRequest,
  ChequeraResumen,
  ChequeraSugerirInicio,
} from '../model/chequera';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root',
})
export class ChequeraService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  /**
   * Recupera todos los registros de Chequera.
   */
  getAll(): Observable<Chequera[] | null> {
    const wsGetAll = '/getAll';
    const url = `${ServiciosTsr.RS_CHQR}${wsGetAll}`;
    return this.http.get<Chequera[]>(url).pipe(catchError(this.handleError));
  }

  /**
   * Recupera un registro por su ID.
   */
  getById(id: string): Observable<Chequera | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosTsr.RS_CHQR}${wsGetById}${id}`;
    return this.http.get<Chequera>(url).pipe(catchError(this.handleError));
  }

  /**
   * Crea un nuevo registro.
   */
  add(datos: any): Observable<Chequera | null> {
    return this.http
      .post<Chequera>(ServiciosTsr.RS_CHQR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Actualiza un registro existente.
   */
  update(datos: any): Observable<Chequera | null> {
    return this.http
      .put<Chequera>(ServiciosTsr.RS_CHQR, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Selecciona registros según criterios personalizados.
   */
  selectByCriteria(datos: any): Observable<Chequera[] | null> {
    const wsCriteria = '/selectByCriteria/';
    const url = `${ServiciosTsr.RS_CHQR}${wsCriteria}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(catchError(this.handleError));
  }

  /**
   * Elimina un registro por su ID.
   */
  delete(id: any): Observable<Chequera | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosTsr.RS_CHQR}${wsDelete}`;
    return this.http.delete<Chequera>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  /**
   * Siguiente número de cheque sugerido para iniciar una chequera nueva de
   * esta cuenta (continúa donde terminó la última recibida).
   */
  sugerirInicio(idCuenta: number): Observable<ChequeraSugerirInicio> {
    return this.http.get<ChequeraSugerirInicio>(`${ServiciosTsr.RS_CHQR}/sugerirInicio/${idCuenta}`);
  }

  /** Registra la recepción física de una chequera nueva y la deja ACTIVA. */
  registrarRecepcion(datos: ChequeraRegistrarRecepcionRequest): Observable<Chequera> {
    return this.http.post<Chequera>(`${ServiciosTsr.RS_CHQR}/registrarRecepcion`, datos, this.httpOptions);
  }

  /** Conteo de cheques por estado de una chequera (para el panel de resumen). */
  resumen(idChequera: number): Observable<ChequeraResumen> {
    return this.http.get<ChequeraResumen>(`${ServiciosTsr.RS_CHQR}/resumen/${idChequera}`);
  }

  /** Chequeras (cualquier estado) de una cuenta bancaria. */
  porCuenta(idCuenta: number): Observable<Chequera[]> {
    return this.http.get<Chequera[]>(`${ServiciosTsr.RS_CHQR}/porCuenta/${idCuenta}`);
  }

  /** Anula la chequera completa (y con ella todos sus cheques disponibles). `motivo` es texto libre. */
  anular(id: number, motivo: string, idUsuario: number): Observable<ChequeraAnularResponse> {
    return this.http.post<ChequeraAnularResponse>(
      `${ServiciosTsr.RS_CHQR}/anular/${id}`,
      { motivo, idUsuario },
      this.httpOptions
    );
  }

  /** Lee `{"mensaje": "..."}` (MensajeErrorJsonFilter) o el mensaje del HttpErrorResponse. */
  static mensajeError(error: any): string {
    return mensajeDeError(error);
  }

  /**
   * Manejo de errores HTTP.
   */
  private handleError(error: HttpErrorResponse): Observable<null> {
    // Algunos endpoints pueden responder 200 en la ruta de error
    if (+error.status === 200) {
      return of(null);
    }
    // Propagar el HttpErrorResponse completo para poder leer status en el componente
    return throwError(() => error);
  }
}

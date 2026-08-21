import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { Liquidacion } from '../model/Liquidacion';
import { ResultadoLiquidacion } from '../model/resultados-nomina';
import { ServiciosRhh } from './ws-rrh';

/**
 * Finiquitos (`RHH.LQDC`) y los cinco procesos de la fase 8.
 *
 * El ciclo es **simular → calcular → aprobar → ejecutar salida**, y contabilizar cuando el
 * período no es histórico. `simular` no persiste: es la única forma de enseñarle el finiquito al
 * colaborador antes de comprometerlo.
 *
 * Todos los POST de proceso llevan `?usuarioRegistro=`, que alimenta los campos de auditoría.
 * Se pone aquí desde la sesión, nunca lo escribe la pantalla.
 */
@Injectable({ providedIn: 'root' })
export class LiquidacionService {
  private readonly httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  getAll(): Observable<Liquidacion[] | null> {
    return this.http
      .get<Liquidacion[]>(`${ServiciosRhh.RS_LQDC}/getAll`)
      .pipe(catchError(this.handleError));
  }

  getById(id: number | string): Observable<Liquidacion | null> {
    return this.http
      .get<Liquidacion>(`${ServiciosRhh.RS_LQDC}/getId/${id}`)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<Liquidacion[] | null> {
    return this.http
      .post<Liquidacion[]>(`${ServiciosRhh.RS_LQDC}/selectByCriteria/`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<Liquidacion | null> {
    return this.http
      .post<Liquidacion>(ServiciosRhh.RS_LQDC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<Liquidacion | null> {
    return this.http
      .put<Liquidacion>(ServiciosRhh.RS_LQDC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  delete(id: any): Observable<Liquidacion | null> {
    return this.http
      .delete<Liquidacion>(`${ServiciosRhh.RS_LQDC}/${id}`, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  // ─── Procesos ──────────────────────────────────────────────────────────────

  /**
   * `POST /rest/lqdc/simular` — calcula el finiquito **sin persistirlo**.
   *
   * Devuelve el desglose por rubro con el código alterno del concepto, los años de servicio y
   * los tres totales. Es lo que se enseña antes de comprometer nada.
   */
  simular(
    idContrato: number,
    fechaSalida: string,
    idCausal: number,
  ): Observable<ResultadoLiquidacion> {
    return this.http
      .post<ResultadoLiquidacion>(
        `${ServiciosRhh.RS_LQDC}/simular`,
        { idContrato, fechaSalida, idCausal },
        this.httpOptions,
      )
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  /** `POST /rest/lqdc/calcular` — persiste el finiquito y su detalle (`TMLQ`). */
  calcular(
    idContrato: number,
    fechaSalida: string,
    idCausal: number,
    observaciones: string | null,
  ): Observable<Liquidacion> {
    return this.http
      .post<Liquidacion>(
        `${ServiciosRhh.RS_LQDC}/calcular`,
        {
          idContrato,
          fechaSalida,
          idCausal,
          observaciones,
          usuarioRegistro: usuarioSesion(),
        },
        this.httpOptions,
      )
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  /** `POST /rest/lqdc/aprobar/{id}` — deja el finiquito listo para ejecutarse. */
  aprobar(idLiquidacion: number): Observable<unknown> {
    return this.proceso(`/aprobar/${idLiquidacion}`);
  }

  /**
   * `POST /rest/lqdc/ejecutarSalida/{id}` — cierra el contrato, pasa al colaborador a CESANTE,
   * avisa al IESS, cancela los descuentos recurrentes y caduca los saldos de vacaciones.
   *
   * Exige la liquidación aprobada. Es el paso que no se deshace.
   */
  ejecutarSalida(idLiquidacion: number): Observable<unknown> {
    return this.proceso(`/ejecutarSalida/${idLiquidacion}`);
  }

  /** `POST /rest/lqdc/contabilizar/{id}` — emite el asiento del finiquito. */
  contabilizar(idLiquidacion: number): Observable<unknown> {
    return this.proceso(`/contabilizar/${idLiquidacion}`);
  }

  private proceso<T>(ruta: string): Observable<T> {
    const params = new HttpParams().set('usuarioRegistro', usuarioSesion());
    return this.http
      .post<T>(`${ServiciosRhh.RS_LQDC}${ruta}`, null, { ...this.httpOptions, params })
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  /**
   * Una búsqueda sin resultados llega como 400 con «sin registros»: es lista vacía, no error.
   * El resto se propaga con el cuerpo, que es de donde sale el mensaje del backend.
   */
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) return of(null);
    return throwError(() => error.error || error);
  }
}

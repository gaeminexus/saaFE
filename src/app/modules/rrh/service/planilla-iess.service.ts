import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import {
  ConciliarPlanillaIessResponse,
  PagarPlanillaIessRequest,
  PagarPlanillaIessResponse,
  PlanillaIess,
  RegistrarPlanillaIessRequest,
} from '../model/planilla-iess';
import { ServiciosRhh } from './ws-rrh';

/**
 * Planillas del IESS (`RHH.PLIS`): registrar, conciliar, pagar, reversar y anular.
 * `docs/rrh/API-PLANILLA-IESS.md` §5/§6.
 */
@Injectable({
  providedIn: 'root',
})
export class PlanillaIessService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  // ─── Lectura ───────────────────────────────────────────────────────────────

  /** Las hasta cuatro planillas (una por tipo) de un período. */
  porPeriodo(idPeriodo: number): Observable<PlanillaIess[]> {
    const url = `${ServiciosRhh.RS_PLIS}/porPeriodo/${idPeriodo}`;
    return this.http
      .get<PlanillaIess[]>(url)
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => error.error || error)));
  }

  /** Una planilla con sus renglones ya cargados. */
  getId(id: number): Observable<PlanillaIess | null> {
    const url = `${ServiciosRhh.RS_PLIS}/getId/${id}`;
    return this.http.get<PlanillaIess>(url).pipe(catchError(this.handleError));
  }

  // ─── Ciclo ─────────────────────────────────────────────────────────────────

  /** Captura la planilla que emitió el portal, con sus renglones. Nace en estado Registrada. */
  registrar(datos: RegistrarPlanillaIessRequest): Observable<PlanillaIess> {
    return this.http
      .post<PlanillaIess>(`${ServiciosRhh.RS_PLIS}/registrar`, datos, this.httpOptions)
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => error.error || error)));
  }

  /** Enfrenta la planilla contra la planilla de control del período. Pasa a estado Conciliada. */
  conciliar(idPlanilla: number, idUsuario: number): Observable<ConciliarPlanillaIessResponse> {
    return this.http
      .post<ConciliarPlanillaIessResponse>(
        `${ServiciosRhh.RS_PLIS}/conciliar/${idPlanilla}`,
        { idUsuario },
        this.httpOptions,
      )
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => error.error || error)));
  }

  /**
   * Registra el pago por tesorería (débito automático: el IESS ya debitó, esto no ordena nada).
   * Sólo desde estado Conciliada.
   */
  pagar(idPlanilla: number, datos: PagarPlanillaIessRequest): Observable<PagarPlanillaIessResponse> {
    return this.http
      .post<PagarPlanillaIessResponse>(`${ServiciosRhh.RS_PLIS}/pagar/${idPlanilla}`, datos, this.httpOptions)
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => error.error || error)));
  }

  /** Reversa el pago (deshace asiento y movimiento bancario) y vuelve la planilla a Conciliada. */
  reversarPago(idPlanilla: number, datos: { motivo: string; idUsuario: number }): Observable<PlanillaIess> {
    return this.http
      .post<PlanillaIess>(`${ServiciosRhh.RS_PLIS}/reversarPago/${idPlanilla}`, datos, this.httpOptions)
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => error.error || error)));
  }

  /** Sólo desde Registrada o Conciliada. Una planilla Pagada no se anula: se reversa. */
  anular(idPlanilla: number, datos: { motivo: string; idUsuario: number }): Observable<PlanillaIess> {
    return this.http
      .post<PlanillaIess>(`${ServiciosRhh.RS_PLIS}/anular/${idPlanilla}`, datos, this.httpOptions)
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => error.error || error)));
  }

  static mensajeError(error: any): string {
    if (typeof error === 'string' && error.trim()) return error;
    return error?.mensaje || error?.message || 'No se pudo completar la operación.';
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error || error);
  }
}

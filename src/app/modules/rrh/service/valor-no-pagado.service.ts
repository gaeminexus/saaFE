import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import {
  AnularValorNoPagadoRequest,
  FiltrosListarValoresNoPagados,
  RegistrarValorNoPagadoRequest,
  ValorNoPagadoListado,
} from '../model/valor-no-pagado';
import { ServiciosRhh } from './ws-rrh';

/**
 * Valores no pagados (RHH.VNPG): retener un valor del neto de un empleado en un período y
 * devolverlo completo en el pago del siguiente. Contrato:
 * `saaBE/docs/logica-negocio/rhh/PLAN-VALORES-NO-PAGADOS.md` §10.
 *
 * **Los endpoints de este servicio se están escribiendo en paralelo en el backend (2026-09-08).**
 * Implementado contra el contrato del plan; si algo no cierra al integrar, se corrige el
 * documento primero y después este archivo — no al revés.
 */
@Injectable({ providedIn: 'root' })
export class ValorNoPagadoService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /**
   * GET /vnpg/listar — filtros de servidor (plan §9: «nunca traer todo y filtrar en el
   * navegador»). `estado` es repetible.
   */
  listar(filtros: FiltrosListarValoresNoPagados): Observable<ValorNoPagadoListado[]> {
    let params = new HttpParams().set('idEmpresa', filtros.idEmpresa);
    if (filtros.idPeriodo != null) params = params.set('idPeriodo', filtros.idPeriodo);
    if (filtros.idEmpleado != null) params = params.set('idEmpleado', filtros.idEmpleado);
    for (const estado of filtros.estado ?? []) {
      params = params.append('estado', estado);
    }
    return this.http
      .get<ValorNoPagadoListado[]>(`${ServiciosRhh.RS_VNPG}/listar`, { params })
      .pipe(catchError(this.handleError));
  }

  /** POST /vnpg — registra el valor no pagado (plan §8). */
  registrar(datos: RegistrarValorNoPagadoRequest): Observable<unknown> {
    return this.http
      .post(ServiciosRhh.RS_VNPG, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** POST /vnpg/anular/{id} — sólo válido desde REGISTRADO (plan §8/§10). */
  anular(id: number, datos: AnularValorNoPagadoRequest): Observable<unknown> {
    return this.http
      .post(`${ServiciosRhh.RS_VNPG}/anular/${id}`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** Lee `{"mensaje": "..."}` (IncomeException, plan §10) o el mensaje genérico del HttpErrorResponse. */
  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error.error ?? error);
  }
}

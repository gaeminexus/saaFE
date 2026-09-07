import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { PlanillaControlIess } from '../model/planilla-control-iess';
import { ServiciosRhh } from './ws-rrh';

/**
 * Planilla de control del IESS: GET /rest/plie/getPeriodo/{idPeriodo}, ya existe y funciona.
 * Es un cálculo, no un CRUD — no hay más verbos que este.
 */
@Injectable({
  providedIn: 'root',
})
export class PlanillaControlIessService {
  constructor(private http: HttpClient) {}

  /** Genera (no cachea) la planilla de control del período: siempre recalcula sobre la nómina actual. */
  getPeriodo(idPeriodo: number): Observable<PlanillaControlIess> {
    const url = `${ServiciosRhh.RS_PLIE}/getPeriodo/${idPeriodo}`;
    return this.http
      .get<PlanillaControlIess>(url)
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => error.error || error)));
  }
}

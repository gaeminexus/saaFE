import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { PeriodoNomina } from '../model/periodo-nomina';
import {
  LineaAsientoNomina,
  ResultadoCalculoNomina,
  ResultadoCalculoPeriodo,
} from '../model/resultados-nomina';
import { ServiciosRhh } from './ws-rrh';

/**
 * Período de nómina (RHH.PRDN): CRUD más los diez endpoints de proceso que fija la sección 6
 * del documento maestro.
 *
 * La secuencia de la máquina de estados es validar → calcular → aprobar → contabilizar → cerrar.
 * `contabilizar` devuelve `null` cuando el período está en modo histórico: no es un error, es el
 * interruptor haciendo su trabajo.
 */
@Injectable({
  providedIn: 'root',
})
export class PeriodoNominaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  getById(id: string | number): Observable<PeriodoNomina | null> {
    const url = `${ServiciosRhh.RS_PRDN}/getId/${id}`;
    return this.http.get<PeriodoNomina>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<PeriodoNomina | null> {
    return this.http
      .post<PeriodoNomina>(ServiciosRhh.RS_PRDN, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<PeriodoNomina | null> {
    return this.http
      .put<PeriodoNomina>(ServiciosRhh.RS_PRDN, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<PeriodoNomina[] | null> {
    const url = `${ServiciosRhh.RS_PRDN}/selectByCriteria/`;
    return this.http.post<PeriodoNomina[]>(url, datos, this.httpOptions).pipe(
      catchError((error: HttpErrorResponse) => {
        // El backend lanza IncomeException (HTTP 400) cuando la búsqueda no devuelve filas
        if (error.status === 400) {
          return of([]);
        }
        return this.handleError(error);
      }),
    );
  }

  delete(id: any): Observable<PeriodoNomina | null> {
    const url = `${ServiciosRhh.RS_PRDN}/${id}`;
    return this.http.delete<PeriodoNomina>(url, this.httpOptions).pipe(catchError(this.handleError));
  }

  // ─── Procesos ──────────────────────────────────────────────────────────────

  /** POST /rest/prdn/validar/{id} — lista de mensajes; vacía significa que el período está listo. */
  validar(idPeriodo: number): Observable<string[]> {
    return this.proceso<string[]>(`/validar/${idPeriodo}`, null);
  }

  /** POST /rest/prdn/calcular/{id}?usuarioRegistro= — recalcula el período de forma idempotente. */
  calcular(idPeriodo: number): Observable<ResultadoCalculoPeriodo> {
    return this.proceso<ResultadoCalculoPeriodo>(`/calcular/${idPeriodo}`, null, true);
  }

  /** POST /rest/prdn/recalcularEmpleado — rehace un solo colaborador del período. */
  recalcularEmpleado(
    idPeriodo: number,
    idEmpleado: number,
    preservarManuales: boolean,
  ): Observable<ResultadoCalculoNomina> {
    return this.proceso<ResultadoCalculoNomina>('/recalcularEmpleado', {
      idPeriodo,
      idEmpleado,
      preservarManuales,
      usuarioRegistro: usuarioSesion(),
    });
  }

  /** POST /rest/prdn/simular — calcula sin persistir, para ver el rol antes de comprometerlo. */
  simular(idContrato: number, idPeriodo: number): Observable<ResultadoCalculoNomina> {
    return this.proceso<ResultadoCalculoNomina>('/simular', { idContrato, idPeriodo });
  }

  aprobar(idPeriodo: number): Observable<unknown> {
    return this.proceso<unknown>(`/aprobar/${idPeriodo}`, null, true);
  }

  reabrir(idPeriodo: number, motivo: string): Observable<unknown> {
    return this.proceso<unknown>(`/reabrir/${idPeriodo}`, {
      motivo,
      usuarioRegistro: usuarioSesion(),
    });
  }

  /**
   * POST /rest/prdn/contabilizar/{id} — asiento del **rol**, guardado en `PRDNASNT`.
   * Responde 204 sin cuerpo si el período es histórico, que llega aquí como `null`.
   */
  contabilizar(idPeriodo: number): Observable<any> {
    return this.proceso<any>(`/contabilizar/${idPeriodo}`, null, true);
  }

  /**
   * POST /rest/prdn/contabilizarProvisiones/{id} — asiento de **provisiones**, guardado en
   * `PRDNASPR`. Es un asiento distinto del rol, no una segunda parte del mismo.
   *
   * Responde 204 —`null` aquí— en dos casos que no son error: período histórico, o período sin
   * provisiones generadas.
   */
  contabilizarProvisiones(idPeriodo: number): Observable<any> {
    return this.proceso<any>(`/contabilizarProvisiones/${idPeriodo}`, null, true);
  }

  cerrar(idPeriodo: number): Observable<unknown> {
    return this.proceso<unknown>(`/cerrar/${idPeriodo}`, null, true);
  }

  excluirEmpleado(idPeriodo: number, idEmpleado: number, motivo: string): Observable<unknown> {
    return this.proceso<unknown>('/excluirEmpleado', {
      idPeriodo,
      idEmpleado,
      motivo,
      usuarioRegistro: usuarioSesion(),
    });
  }

  /** GET /rest/prdn/previsualizarAsiento/{id}/{tipo} — líneas del asiento antes de emitirlo. */
  previsualizarAsiento(idPeriodo: number, tipo: number): Observable<LineaAsientoNomina[]> {
    const url = `${ServiciosRhh.RS_PRDN}/previsualizarAsiento/${idPeriodo}/${tipo}`;
    return this.http
      .get<LineaAsientoNomina[]>(url)
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  /**
   * Los procesos no devuelven listas vacías por convención, así que su error sí es un error: se
   * propaga tal cual para que la pantalla muestre el mensaje del backend.
   *
   * `usuarioEnQuery` añade `?usuarioRegistro=`, que el backend lee con `@QueryParam`. Va así en
   * los procesos sin cuerpo JSON; los que sí lo tienen —`reabrir`, `recalcularEmpleado`,
   * `excluirEmpleado`— lo llevan como clave del cuerpo. Sin él, la auditoría del período
   * (`PRDNUSAP`, `PRDNUSCR`, `RNGLUSRR`) queda en nulo y **no da error**.
   */
  private proceso<T>(ruta: string, cuerpo: unknown, usuarioEnQuery = false): Observable<T> {
    const url = `${ServiciosRhh.RS_PRDN}${ruta}`;
    const opciones = usuarioEnQuery
      ? {
          ...this.httpOptions,
          params: new HttpParams().set('usuarioRegistro', usuarioSesion()),
        }
      : this.httpOptions;

    return this.http
      .post<T>(url, cuerpo, opciones)
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  // Manejo de errores HTTP (respetando patrón de of(null) con status 200)
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}

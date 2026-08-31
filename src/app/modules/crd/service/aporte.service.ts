import { HttpHeaders, HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { Aporte } from '../model/aporte';
import {
  AporteDashFiltros,
  AporteKpiDTO,
  AporteResumenTipoDTO,
  AporteTopEntidadDTO,
  AporteTopMovimientoDTO,
} from '../model/aporte-dashboard';
import { EstadoCuentaAportes } from '../model/estado-cuenta-aportes';
import { RespuestaJubilacion, ResultadoJubilacion, SolicitudProcesarJubilacion } from '../model/jubilacion';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class AporteService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  /**
   * ⚠️ NO usar para calcular saldos de aportes: descarga las ~980.000 filas de CRD.APRT y es la
   * causa del OutOfMemoryError de WildFly. Para saldos use
   * `OperacionesPagoPrestamoService.saldosPorEntidad(idEntidad)`, que agrega en la base de datos.
   */
  getAll(): Observable<Aporte[] | null> {
    const wsGetById = '/getAll';
    const url = `${ServiciosCrd.RS_APRT}${wsGetById}`;
    return this.http.get<Aporte[]>(url).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: string): Observable<Aporte | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_APRT}${wsGetById}${id}`;
    return this.http.get<Aporte>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new record */
  add(datos: any): Observable<Aporte | null> {
    return this.http.post<Aporte>(ServiciosCrd.RS_APRT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update record */
  update(datos: any): Observable<Aporte | null> {
    return this.http.put<Aporte>(ServiciosCrd.RS_APRT, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Aporte[] | null> {
    const wsGetById = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_APRT}${wsGetById}`;
    return this.http.post<any>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: delete record by ID */
  delete(id: any): Observable<Aporte | null> {
    const wsGetById = '/' + id;
    const url = `${ServiciosCrd.RS_APRT}${wsGetById}`;
    return this.http.delete<Aporte>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  // ── Dashboard de aportes ────────────────────────────────────────────────

  /** KPIs globales del dashboard de aportes. */
  getKpisGlobales(filtros?: AporteDashFiltros): Observable<AporteKpiDTO | null> {
    const params = this.buildDashParams(filtros);
    return this.http
      .get<AporteKpiDTO>(`${ServiciosCrd.RS_APRT}/kpis-globales`, { params })
      .pipe(catchError(this.handleError));
  }

  /** Resumen por tipo de aporte (datos para el gráfico de dona). */
  getResumenPorTipo(filtros?: AporteDashFiltros): Observable<AporteResumenTipoDTO[] | null> {
    const params = this.buildDashParams(filtros);
    return this.http
      .get<AporteResumenTipoDTO[]>(`${ServiciosCrd.RS_APRT}/resumen-por-tipo`, { params })
      .pipe(catchError(this.handleError));
  }

  /** Top entidades con mayor impacto por tipo de aporte. */
  getTopEntidades(filtros?: AporteDashFiltros): Observable<AporteTopEntidadDTO[] | null> {
    const params = this.buildDashParams(filtros);
    return this.http
      .get<AporteTopEntidadDTO[]>(`${ServiciosCrd.RS_APRT}/top-entidades`, { params })
      .pipe(catchError(this.handleError));
  }

  /** Top movimientos individuales de aporte. */
  getTopMovimientos(filtros?: AporteDashFiltros): Observable<AporteTopMovimientoDTO[] | null> {
    const params = this.buildDashParams(filtros);
    return this.http
      .get<AporteTopMovimientoDTO[]>(`${ServiciosCrd.RS_APRT}/top-movimientos`, { params })
      .pipe(catchError(this.handleError));
  }

  // ── Estado de cuenta por devengo (§4.2 del plan de devengo) ────────────

  /**
   * Estado de cuenta por periodo de devengo (§4.2 de `docs/crd/PLAN-APORTES-DEVENGO-CONTRATOS.md`
   * — contrato de API congelado). `desde`/`hasta` van en `yyyy-MM` (mes de devengo), no fechas
   * completas.
   */
  obtenerEstadoCuenta(idEntidad: number, desde: string, hasta: string): Observable<EstadoCuentaAportes | null> {
    const params = new HttpParams().set('desde', desde).set('hasta', hasta);
    return this.http
      .get<EstadoCuentaAportes>(`${ServiciosCrd.RS_APRT}/estadoCuenta/${idEntidad}`, { params })
      .pipe(catchError(this.handleError));
  }

  // ── Jubilación ───────────────────────────────────────────────────────────

  /**
   * `POST /rest/aprt/procesarJubilacion` — traslada el remanente de cesantía/jubilación del
   * partícipe a pensión complementaria y cambia su estado. NO orquesta el cruce contra préstamos
   * ni la devolución en efectivo: esos van ANTES, por separado, con lo que resulte se llama acá.
   * Responde 201 en éxito; en error, ya viene armado como `{exito:false, etapa, mensaje, error}`.
   */
  procesarJubilacion(solicitud: SolicitudProcesarJubilacion): Observable<RespuestaJubilacion<ResultadoJubilacion>> {
    const url = `${ServiciosCrd.RS_APRT}/procesarJubilacion`;
    return this.http.post<RespuestaJubilacion<ResultadoJubilacion>>(url, solicitud, this.httpOptions).pipe(
      map((cuerpo) => ({ ...cuerpo, exito: true })),
      catchError((e: HttpErrorResponse) => of(this.normalizarErrorJubilacion(e)))
    );
  }

  private normalizarErrorJubilacion(e: HttpErrorResponse): RespuestaJubilacion<never> {
    const cuerpo = e.error;
    if (cuerpo && typeof cuerpo === 'object' && 'exito' in cuerpo) {
      return { ...(cuerpo as RespuestaJubilacion<never>), exito: false, httpStatus: e.status };
    }
    return {
      exito: false,
      mensaje:
        e.status === 0
          ? 'No se pudo contactar al servidor. Verifique su conexión e intente nuevamente.'
          : `Error inesperado del servidor (HTTP ${e.status}).`,
      httpStatus: e.status,
    };
  }

  private buildDashParams(filtros?: AporteDashFiltros): HttpParams {
    let params = new HttpParams();
    if (!filtros) {
      return params;
    }
    if (filtros.fechaDesde) {
      params = params.set('fechaDesde', filtros.fechaDesde);
    }
    if (filtros.fechaHasta) {
      params = params.set('fechaHasta', filtros.fechaHasta);
    }
    if (filtros.estadoAporte != null) {
      params = params.set('estadoAporte', filtros.estadoAporte.toString());
    }
    if (filtros.tipoAporteId != null) {
      params = params.set('tipoAporteId', filtros.tipoAporteId.toString());
    }
    if (filtros.topN != null) {
      params = params.set('topN', filtros.topN.toString());
    }
    return params;
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }
}

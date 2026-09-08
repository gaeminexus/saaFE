import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import {
  GenerarLiquidacionesRequest,
  ResultadoGenerarLiquidaciones,
} from '../model/orden-beneficio-social';
import { ServiciosRhh } from './ws-rrh';

/**
 * Liquidaciones de beneficio social (RHH.LQBS): calcula/actualiza el décimo tercero, décimo
 * cuarto o fondos de reserva de un año — el paso que faltaba antes de "Generar orden"
 * (`OrdenBeneficioSocialService.generar`, RHH.ODBS), que sólo AGRUPA lo que esto ya calculó.
 * Contrato real: `LiquidacionBeneficioSocialRest.java` en saaBE, @Path("lqbs") (2026-09-08, no es
 * el contrato congelado de `orden-beneficio-social.ts` — este sí es código real, verificado).
 */
@Injectable({ providedIn: 'root' })
export class LiquidacionBeneficioSocialService {
  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** POST /lqbs/generarDecimoTercero/{anio}?idEmpresa=&usuarioRegistro= — devuelve el entero crudo generado/actualizado. */
  generarDecimoTercero(datos: GenerarLiquidacionesRequest): Observable<ResultadoGenerarLiquidaciones> {
    const params = this.paramsBase(datos);
    return this.http
      .post<ResultadoGenerarLiquidaciones>(
        `${ServiciosRhh.RS_LQBS}/generarDecimoTercero/${datos.anio}`,
        null,
        { ...this.httpOptions, params },
      )
      .pipe(catchError(this.handleError));
  }

  /**
   * POST /lqbs/generarDecimoCuarto/{anio}/{region}?idEmpresa=&usuarioRegistro= — la región va en
   * la RUTA, no como query param (única diferencia con los otros dos).
   */
  generarDecimoCuarto(datos: GenerarLiquidacionesRequest): Observable<ResultadoGenerarLiquidaciones> {
    const params = this.paramsBase(datos);
    return this.http
      .post<ResultadoGenerarLiquidaciones>(
        `${ServiciosRhh.RS_LQBS}/generarDecimoCuarto/${datos.anio}/${datos.region}`,
        null,
        { ...this.httpOptions, params },
      )
      .pipe(catchError(this.handleError));
  }

  /** POST /lqbs/generarFondosReserva/{anio}?idEmpresa=&usuarioRegistro= */
  generarFondosReserva(datos: GenerarLiquidacionesRequest): Observable<ResultadoGenerarLiquidaciones> {
    const params = this.paramsBase(datos);
    return this.http
      .post<ResultadoGenerarLiquidaciones>(
        `${ServiciosRhh.RS_LQBS}/generarFondosReserva/${datos.anio}`,
        null,
        { ...this.httpOptions, params },
      )
      .pipe(catchError(this.handleError));
  }

  private paramsBase(datos: GenerarLiquidacionesRequest): { idEmpresa: string; usuarioRegistro: string } {
    return { idEmpresa: String(datos.idEmpresa), usuarioRegistro: datos.usuarioRegistro };
  }

  /** El backend devuelve el error como texto plano (500), no `{mensaje}` — mensajeDeError() ya cubre ambos casos. */
  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error.error ?? error);
  }
}

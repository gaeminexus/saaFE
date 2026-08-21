import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { empresaSesionCodigo } from '../../../shared/services/empresa-sesion';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { SalidaOficial } from '../model/salida-oficial';
import { ServiciosRhh } from './ws-rrh';

/**
 * Salidas a los organismos (`RHH.SLOF`) y los tres procesos de la fase 9.
 *
 * `generarRdep` devuelve el **XML** para el DIMM, no JSON: se pide como `blob`. Los otros dos
 * solo dejan constancia —de que la salida se generó y de que el organismo la recibió—, que es
 * todo lo que esta tabla guarda: el contenido se reconstruye desde `RNGL`, `ACMN` y `LQBS`.
 */
@Injectable({ providedIn: 'root' })
export class SalidaOficialService {
  private readonly httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<SalidaOficial[] | null> {
    return this.http
      .get<SalidaOficial[]>(`${ServiciosRhh.RS_SLOF}/getAll`)
      .pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<SalidaOficial | null> {
    return this.http
      .get<SalidaOficial>(`${ServiciosRhh.RS_SLOF}/getId/${id}`)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<SalidaOficial[] | null> {
    return this.http
      .post<SalidaOficial[]>(`${ServiciosRhh.RS_SLOF}/selectByCriteria`, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** `POST /rest/slof/generarRdep/{anio}` — XML del RDEP del ejercicio, para el DIMM. */
  generarRdep(anio: number): Observable<Blob> {
    const params = new HttpParams()
      .set('idEmpresa', String(empresaSesionCodigo() ?? ''))
      .set('usuarioRegistro', usuarioSesion());

    return this.http.post(`${ServiciosRhh.RS_SLOF}/generarRdep/${anio}`, null, {
      params,
      responseType: 'blob',
    });
  }

  /**
   * `POST /rest/slof/registrarGeneracion` — deja constancia de una salida que se produjo por
   * otra vía, típicamente un reporte de `rprt`, que igual tiene que quedar registrada.
   */
  registrarGeneracion(datos: {
    tipoSalida: number;
    anio: number;
    mes?: number | null;
    idEmpleado?: number | null;
    nombreArchivo?: string | null;
  }): Observable<SalidaOficial> {
    const cuerpo = {
      idEmpresa: empresaSesionCodigo(),
      tipoSalida: datos.tipoSalida,
      anio: datos.anio,
      mes: datos.mes ?? null,
      idEmpleado: datos.idEmpleado ?? null,
      nombreArchivo: datos.nombreArchivo ?? null,
      usuarioRegistro: usuarioSesion(),
    };

    return this.http
      .post<SalidaOficial>(`${ServiciosRhh.RS_SLOF}/registrarGeneracion`, cuerpo, this.httpOptions)
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  /**
   * `POST /rest/slof/registrarPresentacion/{id}` — la fecha en que el organismo recibió y su
   * número de comprobante.
   *
   * `fechaPresentacion` viaja como `yyyy-MM-dd`: el backend la lee con `LocalDate.parse`, que no
   * admite hora ni zona.
   */
  registrarPresentacion(
    idSalida: number,
    fechaPresentacion: string,
    numeroComprobante: string | null,
  ): Observable<SalidaOficial> {
    const cuerpo = {
      fechaPresentacion,
      numeroComprobante,
      usuarioRegistro: usuarioSesion(),
    };

    return this.http
      .post<SalidaOficial>(
        `${ServiciosRhh.RS_SLOF}/registrarPresentacion/${idSalida}`,
        cuerpo,
        this.httpOptions,
      )
      .pipe(catchError((error) => throwError(() => error.error || error)));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) return of(null);
    return throwError(() => error.error || error);
  }
}

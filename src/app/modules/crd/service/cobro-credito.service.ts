import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import {
  CobroCredito,
  FilaBandejaAprobacion,
  ResultadoProcesoCobro,
  ResultadoRegistroCobro,
  SolicitudAprobacionCobro,
  SolicitudEdicionCobro,
  SolicitudRegistroCobro,
} from '../model/cobros/cobro-credito';
import { ServiciosCrd } from './ws-crd';

/**
 * Envoltorio LOCAL de este servicio — no es parte del contrato. El backend de `/cbcr` no usa el
 * sobre `{exito, etapa, mensaje, error, resultado}` de `RespuestaPago`/`RespuestaDevolucion`: en
 * éxito el cuerpo es el objeto directo (con tres formas distintas según el endpoint) y en error es
 * `{mensaje}` con HTTP 500 casi siempre. Se normaliza acá para que el resto de la pantalla no tenga
 * que ramificar por código HTTP en cada lugar donde se llama.
 */
export interface ResultadoOperacionCobro<T> {
  exito: boolean;
  resultado?: T;
  mensaje?: string;
  /**
   * `true` solo en el HTTP 400 de RESTEasy por una clave que el DTO no reconoce: el request nunca
   * llegó a ejecutarse. Es un bug de cliente, no un rechazo de negocio — distinguirlo ayuda a no
   * confundir "el usuario mandó algo inválido" con "el frontend armó mal el body".
   */
  errorCliente?: boolean;
}

/**
 * Circuito de cobros de crédito con aprobación de contabilidad (`CRD.CBCR`).
 * Contrato congelado: docs/crd/API-COBROS-APROBACION-CONTABILIDAD.md.
 */
@Injectable({ providedIn: 'root' })
export class CobroCreditoService {
  private http = inject(HttpClient);

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  // ===================== Lectura =====================

  /** Un cobro con su detalle. */
  getId(id: number): Observable<CobroCredito | null> {
    const url = `${ServiciosCrd.RS_CBCR}/getId/${id}`;
    return this.http.get<CobroCredito>(url).pipe(catchError(() => of(null)));
  }

  /** Cobros en un estado dado. `1` = bandeja de contabilidad, `2` = aprobados (proceso de crédito), `4` = rechazados. */
  bandeja(estado: number): Observable<CobroCredito[]> {
    const url = `${ServiciosCrd.RS_CBCR}/bandeja/${estado}`;
    return this.http.get<CobroCredito[]>(url).pipe(catchError(() => of([])));
  }

  /** La bandeja combinada de contabilidad: cobros de crédito + cargas Petro pendientes. */
  bandejaAprobacion(): Observable<FilaBandejaAprobacion[]> {
    const url = `${ServiciosCrd.RS_CBCR}/bandejaAprobacion`;
    return this.http.get<FilaBandejaAprobacion[]>(url).pipe(catchError(() => of([])));
  }

  /** Historial de cobros de un partícipe. */
  porEntidad(idEntidad: number): Observable<CobroCredito[]> {
    const url = `${ServiciosCrd.RS_CBCR}/porEntidad/${idEntidad}`;
    return this.http.get<CobroCredito[]>(url).pipe(catchError(() => of([])));
  }

  // ===================== Escritura =====================

  /** HTTP 201 con `ResultadoRegistroCobro`. */
  registrar(solicitud: SolicitudRegistroCobro): Observable<ResultadoOperacionCobro<ResultadoRegistroCobro>> {
    const url = `${ServiciosCrd.RS_CBCR}/registrar`;
    return this.http.post<ResultadoRegistroCobro>(url, solicitud, this.httpOptions).pipe(
      map((resultado) => ({ exito: true, resultado })),
      catchError((e: HttpErrorResponse) => of(this.normalizarError<ResultadoRegistroCobro>(e)))
    );
  }

  /** HTTP 200 con el `CobroCredito` completo. */
  aprobar(id: number, solicitud: SolicitudAprobacionCobro): Observable<ResultadoOperacionCobro<CobroCredito>> {
    const url = `${ServiciosCrd.RS_CBCR}/${id}/aprobar`;
    return this.http.post<CobroCredito>(url, solicitud, this.httpOptions).pipe(
      map((resultado) => ({ exito: true, resultado })),
      catchError((e: HttpErrorResponse) => of(this.normalizarError<CobroCredito>(e)))
    );
  }

  /** HTTP 200 con el `CobroCredito` completo. `motivo` obligatorio. */
  rechazar(id: number, solicitud: SolicitudAprobacionCobro): Observable<ResultadoOperacionCobro<CobroCredito>> {
    const url = `${ServiciosCrd.RS_CBCR}/${id}/rechazar`;
    return this.http.post<CobroCredito>(url, solicitud, this.httpOptions).pipe(
      map((resultado) => ({ exito: true, resultado })),
      catchError((e: HttpErrorResponse) => of(this.normalizarError<CobroCredito>(e)))
    );
  }

  /** HTTP 200 con el `CobroCredito` completo. Sobre un RECHAZADO — vuelve a REGISTRADO. */
  reenviar(id: number, solicitud: SolicitudEdicionCobro): Observable<ResultadoOperacionCobro<CobroCredito>> {
    const url = `${ServiciosCrd.RS_CBCR}/${id}/reenviar`;
    return this.http.post<CobroCredito>(url, solicitud, this.httpOptions).pipe(
      map((resultado) => ({ exito: true, resultado })),
      catchError((e: HttpErrorResponse) => of(this.normalizarError<CobroCredito>(e)))
    );
  }

  /** HTTP 200 con el `CobroCredito` completo. `motivo` obligatorio. Quien anula es CRÉDITO. */
  anular(id: number, solicitud: SolicitudAprobacionCobro): Observable<ResultadoOperacionCobro<CobroCredito>> {
    const url = `${ServiciosCrd.RS_CBCR}/${id}/anular`;
    return this.http.post<CobroCredito>(url, solicitud, this.httpOptions).pipe(
      map((resultado) => ({ exito: true, resultado })),
      catchError((e: HttpErrorResponse) => of(this.normalizarError<CobroCredito>(e)))
    );
  }

  /**
   * HTTP 200 SIEMPRE con `ResultadoProcesoCobro`, incluso cuando NO se procesó nada:
   * `procesado: false` con `estado: 4` es el rechazo automático por staleness. El HTTP 200 de acá
   * NO significa éxito de negocio — `exito` en el envoltorio solo indica "la llamada no fue un
   * error de transporte"; quien llama tiene que revisar `resultado.procesado` aparte, siempre.
   */
  procesar(id: number, solicitud: SolicitudAprobacionCobro): Observable<ResultadoOperacionCobro<ResultadoProcesoCobro>> {
    const url = `${ServiciosCrd.RS_CBCR}/${id}/procesar`;
    return this.http.post<ResultadoProcesoCobro>(url, solicitud, this.httpOptions).pipe(
      map((resultado) => ({ exito: true, resultado })),
      catchError((e: HttpErrorResponse) => of(this.normalizarError<ResultadoProcesoCobro>(e)))
    );
  }

  // ===================== utilidades =====================

  /** `yyyy-MM-dd` local, para el campo `fecha` (`LocalDate`). Nunca `toISOString()`: descarta el offset. */
  formatearFecha(fecha: Date | string | null | undefined): string | null {
    if (!fecha) return null;
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return null;
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  /**
   * Casi siempre HTTP 500 con `{mensaje}` — no hay 404 ni 409, el contrato es explícito en que no
   * los busquemos. La única excepción es el 400 de RESTEasy por una clave desconocida en el body
   * (bug de cliente, antes de entrar al método): se marca `errorCliente` para que la pantalla no lo
   * confunda con un rechazo de negocio real.
   */
  private normalizarError<T>(e: HttpErrorResponse): ResultadoOperacionCobro<T> {
    const cuerpo = e.error;
    const mensajeCuerpo =
      cuerpo && typeof cuerpo === 'object' && typeof cuerpo.mensaje === 'string' ? cuerpo.mensaje : null;

    if (e.status === 400) {
      return {
        exito: false,
        errorCliente: true,
        mensaje: mensajeCuerpo ?? 'El request no se pudo interpretar (campo inesperado en el cuerpo). Esto es un error del frontend, no del dato ingresado.',
      };
    }

    return {
      exito: false,
      mensaje:
        mensajeCuerpo ??
        (e.status === 0
          ? 'No se pudo contactar al servidor. Verifique su conexión e intente nuevamente.'
          : `Error inesperado del servidor (HTTP ${e.status}).`),
    };
  }
}

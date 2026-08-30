import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import {
  AcuerdoCondonacion,
  DesgloseConceptosPrestamo,
  RespuestaAcuerdoDetalle,
  SolicitudRegistroAcuerdo,
} from '../model/acuerdos/acuerdo-condonacion';
import { ResultadoOperacionCobro } from './cobro-credito.service';
import { ServiciosCrd } from './ws-crd';

/**
 * Acuerdos de pago con condonación (`CRD.ACCN`). Contrato congelado:
 * docs/crd/API-ACUERDOS-CONDONACION.md.
 *
 * Mismo estilo de sobre que `CobroCreditoService` (no hay `{exito,...}` del backend; se normaliza
 * acá): éxito es el objeto directo, error es casi siempre HTTP 500 con `{mensaje}`, y el único 400
 * es RESTEasy rechazando una clave desconocida en el body — un bug de cliente, no de negocio.
 */
@Injectable({ providedIn: 'root' })
export class AcuerdoCondonacionService {
  private http = inject(HttpClient);

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  // ===================== Lectura =====================

  /** El control de la pantalla: los 5 conceptos pendientes del préstamo, a una fecha. Solo lectura. */
  previsualizar(idPrestamo: number, fecha: string): Observable<DesgloseConceptosPrestamo | null> {
    const url = `${ServiciosCrd.RS_ACCN}/previsualizar/${idPrestamo}?fecha=${fecha}`;
    return this.http.get<DesgloseConceptosPrestamo>(url).pipe(catchError(() => of(null)));
  }

  getId(id: number): Observable<RespuestaAcuerdoDetalle | null> {
    const url = `${ServiciosCrd.RS_ACCN}/getId/${id}`;
    return this.http.get<RespuestaAcuerdoDetalle>(url).pipe(catchError(() => of(null)));
  }

  /** `1` VIGENTE, `2` APLICADO, `3` ANULADO. */
  bandeja(estado: number): Observable<AcuerdoCondonacion[]> {
    const url = `${ServiciosCrd.RS_ACCN}/bandeja/${estado}`;
    return this.http.get<AcuerdoCondonacion[]>(url).pipe(catchError(() => of([])));
  }

  porPrestamo(idPrestamo: number): Observable<AcuerdoCondonacion[]> {
    const url = `${ServiciosCrd.RS_ACCN}/porPrestamo/${idPrestamo}`;
    return this.http.get<AcuerdoCondonacion[]>(url).pipe(catchError(() => of([])));
  }

  porEntidad(idEntidad: number): Observable<AcuerdoCondonacion[]> {
    const url = `${ServiciosCrd.RS_ACCN}/porEntidad/${idEntidad}`;
    return this.http.get<AcuerdoCondonacion[]>(url).pipe(catchError(() => of([])));
  }

  // ===================== Escritura =====================

  /**
   * HTTP 201 con la entidad `AcuerdoCondonacion` completa, con `cobroCredito` ya enlazado: el
   * registro crea el acuerdo Y su cobro en CBCR en el mismo acto. No hay `/aprobar` ni `/rechazar`
   * (K4 derogada) — lo que sigue después es aprobar/procesar ese `cobroCredito` como cualquier otro,
   * desde las pantallas de cobros.
   */
  registrar(solicitud: SolicitudRegistroAcuerdo): Observable<ResultadoOperacionCobro<AcuerdoCondonacion>> {
    const url = `${ServiciosCrd.RS_ACCN}/registrar`;
    return this.http.post<AcuerdoCondonacion>(url, solicitud, this.httpOptions).pipe(
      map((resultado): ResultadoOperacionCobro<AcuerdoCondonacion> => ({ exito: true, resultado })),
      catchError((e: HttpErrorResponse) => of(this.normalizarError<AcuerdoCondonacion>(e)))
    );
  }

  // ===================== utilidades =====================

  /** `yyyy-MM-dd` local, para `fecha` (`LocalDate`). Nunca `toISOString()`: descarta el offset. */
  formatearFecha(fecha: Date | string | null | undefined): string | null {
    if (!fecha) return null;
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return null;
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

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

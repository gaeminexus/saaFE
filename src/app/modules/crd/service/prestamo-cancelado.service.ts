import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, from, switchMap, throwError } from 'rxjs';

import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';
import { FiltroPrestamosCancelados, ReportePrestamosCancelados } from '../model/prestamo-cancelado';
import { ServiciosCrd } from './ws-crd';

/**
 * Reporte de préstamos cancelados (docs/crd/API-REPORTE-PRESTAMOS-CANCELADOS.md §2).
 * Los errores se propagan como `Error` cuyo `message` es el `mensaje` del backend, listo para mostrar.
 */
@Injectable({ providedIn: 'root' })
export class PrestamoCanceladoService {
  private http = inject(HttpClient);

  /** POST /prcn/consultar. 400/500 traen `{"mensaje": "..."}`. */
  consultar(filtro: FiltroPrestamosCancelados): Observable<ReportePrestamosCancelados> {
    return this.http
      .post<ReportePrestamosCancelados>(`${ServiciosCrd.RS_PRCN}/consultar`, filtro)
      .pipe(catchError((e: HttpErrorResponse) => throwError(() => new Error(mensajeDeError(e, 'No se pudo consultar el reporte')))));
  }

  /** POST /prcn/pdf. Con `responseType: 'blob'` el cuerpo del error también llega como Blob: se lee como texto. */
  pdf(filtro: FiltroPrestamosCancelados): Observable<Blob> {
    return this.http.post(`${ServiciosCrd.RS_PRCN}/pdf`, filtro, { responseType: 'blob' }).pipe(
      catchError((e: HttpErrorResponse) =>
        from(this.mensajeDesdeBlob(e)).pipe(switchMap((mensaje) => throwError(() => new Error(mensaje)))),
      ),
    );
  }

  private async mensajeDesdeBlob(e: HttpErrorResponse): Promise<string> {
    const porDefecto = 'No se pudo generar el PDF';
    if (e.error instanceof Blob) {
      try {
        const texto = await e.error.text();
        try {
          const json = JSON.parse(texto);
          return mensajeDeError(json?.mensaje ? { error: json } : json, texto || porDefecto);
        } catch {
          return texto || porDefecto;
        }
      } catch {
        return porDefecto;
      }
    }
    return mensajeDeError(e, porDefecto);
  }
}

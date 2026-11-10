import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, throwError } from 'rxjs';

import { RespuestaFirma, TramiteFirma } from '../model/firma-contrato';
import { ServiciosCrd } from './ws-crd';
import { usuarioSesion } from '../../../shared/services/usuario-sesion';
import { mensajeDeError } from '../../../shared/utils/mensaje-error.util';

/**
 * Firma electrónica del contrato de adhesión. Contrato: saaBE docs/logica-negocio/crd/API-FIRMA-ELECTRONICA-CONTRATO.md.
 *
 * Las cuatro operaciones POST NUNCA propagan el error de HTTP: el backend responde el mismo cuerpo
 * `{exito, mensaje, error, tramite}` en 2xx, en 4xx (validaciones) y en 502 (falla del proveedor, con el
 * trámite guardado y su error). Se emite siempre `RespuestaFirma` y se ramifica por `exito`.
 */
@Injectable({ providedIn: 'root' })
export class FirmaContratoService {
  private http = inject(HttpClient);

  enviar(idContrato: number): Observable<RespuestaFirma> {
    const params = new HttpParams().set('idContrato', idContrato).set('usuario', usuarioSesion());
    return this.post(`${ServiciosCrd.RS_FRCN}/enviar`, params);
  }

  reintentar(idFirma: number): Observable<RespuestaFirma> {
    return this.post(`${ServiciosCrd.RS_FRCN}/reintentar/${idFirma}`, this.soloUsuario());
  }

  actualizar(idFirma: number): Observable<RespuestaFirma> {
    return this.post(`${ServiciosCrd.RS_FRCN}/actualizar/${idFirma}`, this.soloUsuario());
  }

  anular(idFirma: number, motivo: string): Observable<RespuestaFirma> {
    const params = new HttpParams().set('motivo', motivo).set('usuario', usuarioSesion());
    return this.post(`${ServiciosCrd.RS_FRCN}/anular/${idFirma}`, params);
  }

  /** Historial de trámites del contrato, el más reciente primero. */
  porContrato(idContrato: number): Observable<TramiteFirma[]> {
    return this.http.get<TramiteFirma[]>(`${ServiciosCrd.RS_FRCN}/contrato/${idContrato}`).pipe(
      map((lista) => lista ?? []),
      catchError((error: HttpErrorResponse) =>
        throwError(() => mensajeDeError(error, 'No se pudo consultar la firma electrónica del contrato'))
      )
    );
  }

  /** PDF del trámite (`ORIGINAL` o `FIRMADO`). */
  descargar(idFirma: number, tipo: 'ORIGINAL' | 'FIRMADO'): Observable<Blob> {
    const params = new HttpParams().set('tipo', tipo);
    return this.http.get(`${ServiciosCrd.RS_FRCN}/descargar/${idFirma}`, { params, responseType: 'blob' }).pipe(
      catchError((error: HttpErrorResponse) => {
        // Con responseType blob el cuerpo del error también llega como Blob: se lee su texto.
        if (error.error instanceof Blob) {
          return new Observable<never>((obs) => {
            error.error.text().then(
              (texto: string) => obs.error(this.mensajeDeTexto(texto, error)),
              () => obs.error(mensajeDeError(error, 'No se pudo descargar el PDF'))
            );
          });
        }
        return throwError(() => mensajeDeError(error, 'No se pudo descargar el PDF'));
      })
    );
  }

  private soloUsuario(): HttpParams {
    return new HttpParams().set('usuario', usuarioSesion());
  }

  private post(url: string, params: HttpParams): Observable<RespuestaFirma> {
    return this.http.post<RespuestaFirma>(url, null, { params }).pipe(
      catchError((error: HttpErrorResponse) => {
        const cuerpo = error?.error;
        if (cuerpo && typeof cuerpo === 'object' && 'exito' in cuerpo) {
          return of({ ...cuerpo, exito: false } as RespuestaFirma);
        }
        // 400 de usuario inválido (texto plano), backend caído, etc.
        return of({
          exito: false,
          error: 'ERROR_INTERNO',
          mensaje: mensajeDeError(error, 'No se pudo completar la operación de firma electrónica'),
          tramite: null,
        } as RespuestaFirma);
      })
    );
  }

  private mensajeDeTexto(texto: string, error: HttpErrorResponse): string {
    try {
      const json = JSON.parse(texto);
      return json?.mensaje || mensajeDeError(error, 'No se pudo descargar el PDF');
    } catch {
      return texto?.trim() || mensajeDeError(error, 'No se pudo descargar el PDF');
    }
  }
}

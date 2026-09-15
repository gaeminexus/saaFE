import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { ServiciosCxp } from '../../cxp/service/ws-cxp';
import {
  BuscarSeguimientoPagoParams,
  DetalleSeguimientoPago,
  ResumenSeguimientoPago,
} from '../model/seguimiento-pago';

/**
 * Seguimiento de un pago (docs/tsr/API-SEGUIMIENTO-PAGOS.md) — dos endpoints nuevos, solo
 * lectura, en `PagoProgramadoRest` (`@Path("pgtr")`). Las acciones (anular, revertir) no viven
 * acá: usan `PagoProgramadoService.anular()`/`.revertirConfirmado()`, que ya existen.
 */
@Injectable({ providedIn: 'root' })
export class SeguimientoPagoService {

  constructor(private http: HttpClient) {}

  /**
   * Exactamente uno de `numero` / `texto` / (`origen` + `idOrigen`) — el backend responde
   * `400 {mensaje}` si no. Sin resultados: `200 []`, no error.
   */
  buscar(filtros: BuscarSeguimientoPagoParams): Observable<ResumenSeguimientoPago[]> {
    let params = new HttpParams();
    if (filtros.numero != null) params = params.set('numero', filtros.numero);
    if (filtros.texto) params = params.set('texto', filtros.texto);
    if (filtros.origen) params = params.set('origen', filtros.origen);
    if (filtros.idOrigen != null) params = params.set('idOrigen', filtros.idOrigen);
    if (filtros.idEmpresa != null) params = params.set('idEmpresa', filtros.idEmpresa);
    return this.http.get<ResumenSeguimientoPago[]>(`${ServiciosCxp.RS_PGTR}/seguimiento`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /** `404 {mensaje}` si el pago no existe — nunca 500 (§2 del contrato). */
  detalle(idPago: number): Observable<DetalleSeguimientoPago> {
    return this.http.get<DetalleSeguimientoPago>(`${ServiciosCxp.RS_PGTR}/seguimiento/${idPago}`).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let mensaje = 'No se pudo completar la operación.';
    if (typeof error.error === 'string' && error.error.trim()) {
      mensaje = error.error;
    } else if (error.error?.mensaje) {
      mensaje = error.error.mensaje;
    } else if (error.error?.message) {
      mensaje = error.error.message;
    }
    return throwError(() => new Error(mensaje));
  }
}

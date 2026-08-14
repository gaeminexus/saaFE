import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { MotivoRequest } from '../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import {
  AnularEgresoResponse,
  Egreso,
  RegistrarEgresoRequest,
  RegistrarEgresoResponse,
} from '../model/egreso';
import { ServiciosTsr } from './ws-tsr';

/**
 * Egresos de tesorería sin documento físico (EGRS). Registrarlos crea su pago
 * en el circuito de /pgtr; el seguimiento del pago (lote, archivo, respuesta
 * del banco, reversión) se hace desde la pantalla de pagos por transferencia.
 */
@Injectable({ providedIn: 'root' })
export class EgresoService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /**
   * Registra el egreso y su pago en un solo paso. Con `debitoAutomatico` el
   * pago nace confirmado: genera asiento y movimiento bancario aquí mismo.
   */
  procesar(datos: RegistrarEgresoRequest): Observable<RegistrarEgresoResponse> {
    return this.http.post<RegistrarEgresoResponse>(
      `${ServiciosTsr.RS_EGRS}/procesar`, datos, this.httpOptions
    ).pipe(catchError(this.handleError));
  }

  /**
   * Anula un egreso pendiente y su pago. Falla si el pago ya está en un
   * archivo enviado al banco o si el egreso ya está pagado (hay que revertir
   * el pago desde /pgtr primero).
   */
  anular(idEgreso: number, datos: MotivoRequest): Observable<AnularEgresoResponse> {
    return this.http.post<AnularEgresoResponse>(
      `${ServiciosTsr.RS_EGRS}/anular/${idEgreso}`, datos, this.httpOptions
    ).pipe(catchError(this.handleError));
  }

  /** Egresos de la empresa; sin `estado` trae todos. */
  listar(idEmpresa: number, estado?: number): Observable<Egreso[]> {
    let params = new HttpParams().set('idEmpresa', idEmpresa);
    if (estado != null) {
      params = params.set('estado', estado);
    }
    return this.http.get<Egreso[]>(`${ServiciosTsr.RS_EGRS}/listar`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  getAll(): Observable<Egreso[]> {
    return this.http.get<Egreso[]>(`${ServiciosTsr.RS_EGRS}/getAll`).pipe(
      catchError(this.handleError)
    );
  }

  getById(id: number): Observable<Egreso> {
    return this.http.get<Egreso>(`${ServiciosTsr.RS_EGRS}/getId/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<Egreso[]> {
    return this.http.post<Egreso[]>(
      `${ServiciosTsr.RS_EGRS}/selectByCriteria`, datos, this.httpOptions
    ).pipe(catchError(this.handleError));
  }

  /** El backend devuelve el motivo del fallo como texto plano en el body. */
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

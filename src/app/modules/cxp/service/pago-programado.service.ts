import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { MotivoRequest } from '../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import {
  AnularPagoResponse,
  ConfirmarManualRequest,
  ConfirmarManualResponse,
  GenerarLoteRequest,
  LoteGeneradoResponse,
  PagoProgramado,
  RegistrarPagoRequest,
  RegistrarPagoResponse,
  RespuestaBancoResponse,
  RevertirPagoResponse,
} from '../model/pago-programado';
import { ServiciosCxp } from './ws-cxp';

/** Pagos a proveedores por transferencia y lotes de archivo bancario (PGTR). */
@Injectable({ providedIn: 'root' })
export class PagoProgramadoService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** Registra un pago. Queda en estado 1 y no mueve el saldo de la factura. */
  registrar(datos: RegistrarPagoRequest): Observable<RegistrarPagoResponse> {
    return this.http.post<RegistrarPagoResponse>(ServiciosCxp.RS_PGTR, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** Lista pagos de la empresa; sin `estado` trae todos (seguimiento). */
  listar(idEmpresa: number, estado?: number): Observable<PagoProgramado[]> {
    let params = new HttpParams().set('idEmpresa', idEmpresa);
    if (estado != null) {
      params = params.set('estado', estado);
    }
    return this.http.get<PagoProgramado[]>(`${ServiciosCxp.RS_PGTR}/listar`, { params }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Genera el archivo del banco con los pagos seleccionados; esto ES la
   * aprobación (no hay paso separado). Los pagos pasan a estado 2.
   */
  generarLote(datos: GenerarLoteRequest): Observable<LoteGeneradoResponse> {
    return this.http.post<LoteGeneradoResponse>(`${ServiciosCxp.RS_PGTR}/lote`, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** Vuelve a obtener el archivo de un lote ya generado. */
  getArchivoLote(idLote: number): Observable<LoteGeneradoResponse> {
    return this.http.get<LoteGeneradoResponse>(`${ServiciosCxp.RS_PGTR}/lote/${idLote}/archivo`).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Carga la respuesta del banco. Este endpoint NO es JSON: el archivo va
   * como binario crudo en el body y el usuario en la query string.
   */
  cargarRespuesta(idLote: number, idUsuario: number, contenido: ArrayBuffer): Observable<RespuestaBancoResponse> {
    const params = new HttpParams().set('idUsuario', idUsuario);
    return this.http.post<RespuestaBancoResponse>(
      `${ServiciosCxp.RS_PGTR}/lote/${idLote}/respuesta`,
      contenido,
      { headers: new HttpHeaders({ 'Content-Type': 'application/octet-stream' }), params }
    ).pipe(catchError(this.handleError));
  }

  /**
   * Confirma manualmente pagos pendientes, como si hubiera llegado la respuesta
   * del banco: genera aplicación, asiento contable y movimiento bancario.
   */
  confirmarManual(datos: ConfirmarManualRequest): Observable<ConfirmarManualResponse> {
    return this.http.post<ConfirmarManualResponse>(
      `${ServiciosCxp.RS_PGTR}/confirmarManual`, datos, this.httpOptions
    ).pipe(catchError(this.handleError));
  }

  /** Anula un pago que todavía no confirmó el banco. */
  anular(idPago: number, datos: MotivoRequest): Observable<AnularPagoResponse> {
    return this.http.post<AnularPagoResponse>(`${ServiciosCxp.RS_PGTR}/anular/${idPago}`, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** Revierte un pago ya confirmado: deshace contabilidad y devuelve saldo a la factura. */
  revertirConfirmado(idPago: number, datos: MotivoRequest): Observable<RevertirPagoResponse> {
    return this.http.post<RevertirPagoResponse>(
      `${ServiciosCxp.RS_PGTR}/revertirConfirmado/${idPago}`, datos, this.httpOptions
    ).pipe(catchError(this.handleError));
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

import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { ConciliacionContable } from '../model/conciliacion-contable';
import { DetalleAsientoConciliacion } from '../model/detalle-asiento-conciliacion';
import { DetalleExtractoBancario } from '../model/detalle-extracto-bancario';
import { GrupoConciliacionContable } from '../model/grupo-conciliacion-contable';
import { ResumenConciliacionCuenta } from '../model/resumen-conciliacion-cuenta';
import { SugerenciaConciliacionContable } from '../model/sugerencia-conciliacion-contable';
import { ServiciosTsr } from './ws-tsr';

@Injectable({
  providedIn: 'root',
})
export class ConciliacionContableService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  };

  constructor(private http: HttpClient) {}

  cabecera(idCuentaBancaria: number, idPeriodo: number): Observable<ConciliacionContable> {
    const url = `${ServiciosTsr.RS_CNCT}/cabecera/${idCuentaBancaria}/${idPeriodo}`;
    return this.http.get<ConciliacionContable>(url).pipe(catchError(this.handleError));
  }

  pendientesExtracto(idCuentaBancaria: number, idPeriodo: number): Observable<DetalleExtractoBancario[]> {
    const url = `${ServiciosTsr.RS_CNCT}/pendientesExtracto/${idCuentaBancaria}/${idPeriodo}`;
    return this.http.get<DetalleExtractoBancario[]>(url).pipe(catchError(this.handleError));
  }

  pendientesAsiento(idCuentaBancaria: number, idPeriodo: number): Observable<DetalleAsientoConciliacion[]> {
    const url = `${ServiciosTsr.RS_CNCT}/pendientesAsiento/${idCuentaBancaria}/${idPeriodo}`;
    return this.http.get<DetalleAsientoConciliacion[]>(url).pipe(catchError(this.handleError));
  }

  resumenPorPeriodo(idEmpresa: number, idPeriodo: number): Observable<ResumenConciliacionCuenta[]> {
    const url = `${ServiciosTsr.RS_CNCT}/resumenPorPeriodo/${idEmpresa}/${idPeriodo}`;
    return this.http.get<ResumenConciliacionCuenta[]>(url).pipe(catchError(this.handleError));
  }

  grupos(idConciliacionContable: number): Observable<GrupoConciliacionContable[]> {
    const url = `${ServiciosTsr.RS_CNCT}/grupos/${idConciliacionContable}`;
    return this.http.get<GrupoConciliacionContable[]>(url).pipe(catchError(this.handleError));
  }

  sugerencias(idCuentaBancaria: number, idPeriodo: number): Observable<SugerenciaConciliacionContable[]> {
    const url = `${ServiciosTsr.RS_CNCT}/sugerencias/${idCuentaBancaria}/${idPeriodo}`;
    return this.http.get<SugerenciaConciliacionContable[]>(url).pipe(catchError(this.handleError));
  }

  conciliar(
    idCuentaBancaria: number,
    idPeriodo: number,
    idsDetalleExtracto: number[],
    idsDetalleAsiento: number[],
    usuario: string
  ): Observable<GrupoConciliacionContable> {
    const url = `${ServiciosTsr.RS_CNCT}/conciliar`;
    const body = { idCuentaBancaria, idPeriodo, idsDetalleExtracto, idsDetalleAsiento, usuario };
    return this.http
      .post<GrupoConciliacionContable>(url, body, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  deshacer(idGrupo: number, usuario: string): Observable<string> {
    const url = `${ServiciosTsr.RS_CNCT}/deshacer/${idGrupo}`;
    return this.http
      .post(url, { usuario }, { ...this.httpOptions, responseType: 'text' })
      .pipe(catchError(this.handleError));
  }

  verificar(idConciliacionContable: number, usuario: string): Observable<string> {
    const url = `${ServiciosTsr.RS_CNCT}/verificar/${idConciliacionContable}`;
    return this.http
      .post(url, { usuario }, { ...this.httpOptions, responseType: 'text' })
      .pipe(catchError(this.handleError));
  }

  cerrarMes(idEmpresa: number, idPeriodo: number, usuario: string): Observable<string> {
    const url = `${ServiciosTsr.RS_CNCT}/cerrarMes/${idEmpresa}/${idPeriodo}`;
    return this.http
      .post(url, { usuario }, { ...this.httpOptions, responseType: 'text' })
      .pipe(catchError(this.handleError));
  }

  reabrirMes(idEmpresa: number, idPeriodo: number): Observable<string> {
    const url = `${ServiciosTsr.RS_CNCT}/reabrirMes/${idEmpresa}/${idPeriodo}`;
    return this.http.post(url, null, { responseType: 'text' }).pipe(catchError(this.handleError));
  }

  periodosCerrados(idEmpresa: number): Observable<number[]> {
    const url = `${ServiciosTsr.RS_CNCT}/periodosCerrados/${idEmpresa}`;
    return this.http.get<number[]>(url).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error.error || error);
  }
}

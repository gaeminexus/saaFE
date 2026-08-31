import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import {
  AfectacionValoresParticipeCarga,
  ResultadoBatchAfectacion,
  RespuestaOpcionesAporte,
} from '../model/afectacion-valores-participe-carga';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class AfectacionValoresParticipeCargaService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(private http: HttpClient) {}

  getAll(): Observable<AfectacionValoresParticipeCarga[] | null> {
    const url = `${ServiciosCrd.RS_AVPC}/getAll`;
    return this.http.get<AfectacionValoresParticipeCarga[]>(url).pipe(catchError(this.handleError));
  }

  getById(id: string): Observable<AfectacionValoresParticipeCarga | null> {
    const url = `${ServiciosCrd.RS_AVPC}/getId/${id}`;
    return this.http.get<AfectacionValoresParticipeCarga>(url).pipe(catchError(this.handleError));
  }

  add(datos: any): Observable<AfectacionValoresParticipeCarga | null> {
    return this.http
      .post<AfectacionValoresParticipeCarga>(ServiciosCrd.RS_AVPC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  update(datos: any): Observable<AfectacionValoresParticipeCarga | null> {
    return this.http
      .put<AfectacionValoresParticipeCarga>(ServiciosCrd.RS_AVPC, datos, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: any): Observable<AfectacionValoresParticipeCarga[] | null> {
    const url = `${ServiciosCrd.RS_AVPC}/selectByCriteria/`;
    return this.http.post<AfectacionValoresParticipeCarga[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  delete(id: any): Observable<AfectacionValoresParticipeCarga | null> {
    const url = `${ServiciosCrd.RS_AVPC}/${id}`;
    return this.http.delete<AfectacionValoresParticipeCarga>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * A qué tipos de aporte puede ir el excedente de esta novedad, con el saldo actual de cada uno
   * (docs/crd/API-EXCEDENTE-PETRO-A-APORTES.md §2.1). `opciones: []` no es un error: el partícipe
   * no tiene ningún tipo vigente en el mes de la CARGA de esta novedad (`mes`/`anio` de la
   * respuesta, no los de hoy) — la pantalla simplemente no ofrece la opción de aporte.
   */
  opcionesAporte(idNovedad: number): Observable<RespuestaOpcionesAporte | null> {
    const url = `${ServiciosCrd.RS_AVPC}/opcionesAporte/${idNovedad}`;
    return this.http.get<RespuestaOpcionesAporte>(url).pipe(catchError(this.handleError));
  }

  /**
   * Crea o actualiza varias filas en un solo llamado (una fila con `codigo` es una edición, sin
   * él es un alta — mismo criterio que `add`/`update` por separado). Responde 201.
   *
   * ⚠️ No rechaza el lote si el reparto de una novedad queda incompleto: cada fila se persiste en
   * su propia transacción — avisa en `advertenciasReparto`, que hay que mostrarle al operador
   * aunque el resto de la respuesta sea éxito (docs/crd/API-EXCEDENTE-PETRO-A-APORTES.md §3).
   */
  batch(filas: AfectacionValoresParticipeCarga[]): Observable<ResultadoBatchAfectacion | null> {
    const url = `${ServiciosCrd.RS_AVPC}/batch`;
    return this.http
      .post<ResultadoBatchAfectacion>(url, filas, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }

    return throwError(() => error.error);
  }
}
